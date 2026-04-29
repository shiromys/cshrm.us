import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, contacts } from "@/lib/db";
import { eq, and, isNull, ilike, or } from "drizzle-orm";
import { headers } from "next/headers";
import type { NewContact } from "@cloudsourcehrm/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type") as "employer" | "candidate" | null;
  const status = searchParams.get("status") as "active" | "inactive" | null;

  const conditions = [isNull(contacts.deletedAt)];
  if (type) conditions.push(eq(contacts.contactType, type));
  if (status) conditions.push(eq(contacts.status, status));

  let list = await db.select().from(contacts).where(and(...conditions));

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.companyName ?? "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ contacts: list, total: list.length });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";

  // CSV / XLSX bulk import
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contactType = (formData.get("contactType") as string) ?? "employer";
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (contactType !== "employer" && contactType !== "candidate") {
      return NextResponse.json({ error: "contactType must be employer or candidate" }, { status: 400 });
    }

    const XLSX = await import("xlsx");
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

    const get = (row: Record<string, unknown>, ...keys: string[]) => {
      for (const k of keys) {
        const val = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
        if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
      }
      return undefined;
    };

    const toInsert: NewContact[] = rows
      .map((row) => ({
        email: get(row, "email", "Email", "EMAIL", "e-mail"),
        name:  get(row, "name", "Name", "NAME", "full_name", "Full Name"),
        phone: get(row, "phone", "Phone", "mobile", "Mobile"),
        companyName: get(row, "company", "Company", "company_name", "Company Name"),
        title: get(row, "title", "Title", "job_title", "Job Title"),
        city:  get(row, "city", "City"),
        state: get(row, "state", "State", "province"),
        industry: get(row, "industry", "Industry"),
        contactType: contactType as "employer" | "candidate",
        source: "csv_import" as const,
      }))
      .filter((r): r is NewContact => !!(r.email && r.name));

    if (toInsert.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found. File must have 'email' and 'name' columns." },
        { status: 422 }
      );
    }

    const CHUNK = 250;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await db.insert(contacts).values(toInsert.slice(i, i + CHUNK)).onConflictDoNothing();
      inserted += toInsert.slice(i, i + CHUNK).length;
    }
    return NextResponse.json({ inserted, skipped: rows.length - inserted }, { status: 201 });
  }

  // Single manual contact
  const body = await request.json();
  if (!body.email || !body.name || !body.contactType) {
    return NextResponse.json({ error: "name, email, and contactType are required" }, { status: 400 });
  }
  const [contact] = await db.insert(contacts).values({
    ...body,
    source: "manual",
  }).returning();
  return NextResponse.json(contact, { status: 201 });
}
