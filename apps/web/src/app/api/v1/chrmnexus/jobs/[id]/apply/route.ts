import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users, chrmnexusApplications } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, session.user.id) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.chrmnexusSubscribed) {
    return NextResponse.json({
      error: "CHRMNEXUS add-on subscription required to apply for jobs",
      upgradeUrl: "/settings#chrmnexus",
    }, { status: 403 });
  }

  const body = await request.json();

  // Log application
  const [application] = await db.insert(chrmnexusApplications).values({
    userId: session.user.id,
    jobId,
    jobTitle: body.jobTitle ?? "Unknown",
    status: "submitted",
  }).returning();

  // Forward to CHRMNEXUS API (stub for now)
  try {
    const apiUrl = process.env.CHRMNEXUS_API_URL ?? "https://www.cloudsourcehrm.com/api";
    await fetch(`${apiUrl}/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, applicantEmail: user.email }),
    });
  } catch {
    // CHRMNEXUS API not yet live — application logged locally
  }

  return NextResponse.json({ success: true, applicationId: application.id });
}
