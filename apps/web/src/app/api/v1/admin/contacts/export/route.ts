import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, contacts } from "@/lib/db";
import { isNull } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as unknown as Record<string, string>).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = await db.select().from(contacts).where(isNull(contacts.deletedAt));
  const csv = ["email,name,contact_type,status,city,state,company_name,title,work_authorization",
    ...all.map((c) => [c.email,c.name,c.contactType,c.status,c.city??"",c.state??"",c.companyName??"",c.title??"",c.workAuthorization??""].join(","))
  ].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=contacts.csv" } });
}
