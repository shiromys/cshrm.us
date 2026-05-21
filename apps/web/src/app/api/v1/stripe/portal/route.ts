import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPortalSession } from "@/lib/stripe";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

// Opens a Stripe Customer Portal session so the user can view invoices,
// download receipts, and manage their subscription.
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, session.user.id) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please contact support." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const portalSession = await createPortalSession(user.stripeCustomerId, `${appUrl}/settings`);

    return NextResponse.json({ url: portalSession.url });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Portal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
