import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, csvImportBatches, employerContacts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as Record<string, string>).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batch = await db.query.csvImportBatches.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status !== "pending_review") return NextResponse.json({ error: "Batch already processed" }, { status: 400 });

  const rows = (batch.parsedData as Record<string, string>[]) ?? [];
  let validCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const email = (row.email ?? row.Email ?? "").trim().toLowerCase();
    const name = (row.name ?? row.Name ?? row.contact_name ?? "").trim();
    if (!email || !name) { skippedCount++; continue; }

    // Check for duplicate
    const exists = await db.query.employerContacts.findFirst({
      where: (ec, { and, eq }) => and(eq(ec.userId, batch.userId), eq(ec.email, email)),
    });
    if (exists) { skippedCount++; continue; }

    await db.insert(employerContacts).values({
      userId: batch.userId,
      email,
      name,
      companyName: row.company_name ?? row.company ?? undefined,
      phone: row.phone ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      source: "csv_import",
      csvBatchId: batch.id,
    });
    validCount++;
  }

  await db.update(csvImportBatches).set({
    status: "approved",
    validRowCount: validCount,
    skippedRowCount: skippedCount,
    reviewedBy: session.user.id,
    reviewedAt: new Date(),
  }).where(eq(csvImportBatches.id, id));

  return NextResponse.json({ success: true, inserted: validCount, skipped: skippedCount });
}
