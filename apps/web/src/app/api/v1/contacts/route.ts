import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, contacts } from "@/lib/db";
import { eq, and, isNull, ilike, or } from "drizzle-orm";
import { headers } from "next/headers";

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

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const [contact] = await db.insert(contacts).values(body).returning();
  return NextResponse.json(contact, { status: 201 });
}
