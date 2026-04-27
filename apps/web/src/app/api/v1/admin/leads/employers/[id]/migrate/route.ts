import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, employerLeads, contacts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as unknown as Record<string, string>).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lead = await db.query.employerLeads.findFirst({ where: (l, { eq }) => eq(l.id, id) });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status !== "approved") return NextResponse.json({ error: "Lead must be approved first" }, { status: 400 });

  // Check for duplicate email
  const existing = await db.query.contacts.findFirst({ where: (c, { eq }) => eq(c.email, lead.email) });
  if (existing) {
    return NextResponse.json({ error: "Contact with this email already exists in platform database" }, { status: 409 });
  }

  const [contact] = await db.insert(contacts).values({
    contactType: "employer",
    source: "employer_landing",
    email: lead.email,
    name: lead.name,
    companyName: lead.companyName,
    phone: lead.phone ?? undefined,
    city: lead.city ?? undefined,
    state: lead.state ?? undefined,
    companyType: (lead.companyType as "c2c" | "direct" | "staffing" | "other") ?? undefined,
    industry: lead.industry ?? undefined,
  }).returning();

  await db.update(employerLeads).set({
    status: "migrated",
    migratedContactId: contact.id,
  }).where(eq(employerLeads.id, id));

  return NextResponse.json({ success: true, contactId: contact.id });
}
