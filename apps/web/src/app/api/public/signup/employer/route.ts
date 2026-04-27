import { NextRequest, NextResponse } from "next/server";
import { employerLeadSchema } from "@/lib/schemas";
import { db, employerLeads } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = employerLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;

    await db.insert(employerLeads).values({
      ...parsed.data,
      consentGiven: true,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Employer lead signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
