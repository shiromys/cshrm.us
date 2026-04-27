import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, employerContacts, csvImportBatches } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db.select().from(employerContacts).where(eq(employerContacts.userId, session.user.id));
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";

  // Handle CSV upload (multipart form)
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[];

    // Create batch record
    const [batch] = await db.insert(csvImportBatches).values({
      userId: session.user.id,
      targetTable: "employer_contacts",
      contactType: "employer",
      originalFilename: file.name,
      rowCount: rows.length,
      parsedData: rows,
    }).returning();

    return NextResponse.json({ batchId: batch.id, rowCount: rows.length, status: "pending_review" }, { status: 201 });
  }

  // Manual single contact creation
  const body = await request.json();
  const [contact] = await db.insert(employerContacts).values({
    userId: session.user.id,
    ...body,
  }).returning();

  return NextResponse.json(contact, { status: 201 });
}
