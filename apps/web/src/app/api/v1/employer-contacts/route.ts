import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, employerContacts } from "@/lib/db";
import { eq, and, or, ilike } from "drizzle-orm";
import { headers } from "next/headers";
import * as XLSX from "xlsx";
import type { NewEmployerContact } from "@cloudsourcehrm/db/schema";

// Flexible column name mapping — covers common spreadsheet header variations
function normalise(raw: Record<string, unknown>): Partial<NewEmployerContact> | null {
  const get = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const val = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
    }
    return undefined;
  };

  const email = get("email", "Email", "EMAIL", "e-mail", "E-mail");
  const name  = get("name", "Name", "NAME", "full_name", "Full Name", "fullname", "contact_name", "Contact Name");
  if (!email || !name) return null;   // email + name are required

  return {
    email,
    name,
    phone:       get("phone", "Phone", "PHONE", "mobile", "Mobile", "telephone", "Telephone"),
    companyName: get("company", "Company", "company_name", "Company Name", "CompanyName", "employer", "Employer"),
    city:        get("city", "City", "CITY"),
    state:       get("state", "State", "STATE", "province", "Province"),
    industry:    get("industry", "Industry", "INDUSTRY"),
    source:      "csv_import",
  };
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("search")?.trim();

  const where = search
    ? and(
        eq(employerContacts.userId, session.user.id),
        or(
          ilike(employerContacts.name, `%${search}%`),
          ilike(employerContacts.email, `%${search}%`),
          ilike(employerContacts.companyName, `%${search}%`),
        )
      )
    : eq(employerContacts.userId, session.user.id);

  const list = await db.select().from(employerContacts).where(where);
  return NextResponse.json({ contacts: list, total: list.length });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";

  // Handle CSV / XLSX upload (multipart form) — insert directly, no admin approval needed
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

    const toInsert: NewEmployerContact[] = rows
      .map((row) => normalise(row))
      .filter((r): r is Partial<NewEmployerContact> => r !== null)
      .map((r) => ({ ...r, userId: session.user.id } as NewEmployerContact));

    if (toInsert.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found. Make sure your file has 'email' and 'name' columns." },
        { status: 422 }
      );
    }

    // Insert in chunks to avoid large parameterised queries
    const CHUNK = 250;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      await db.insert(employerContacts).values(chunk).onConflictDoNothing();
      inserted += chunk.length;
    }

    return NextResponse.json({ inserted, skipped: rows.length - inserted }, { status: 201 });
  }

  // Manual single contact creation
  const body = await request.json();
  const [contact] = await db.insert(employerContacts).values({
    userId: session.user.id,
    ...body,
  }).returning();

  return NextResponse.json(contact, { status: 201 });
}
