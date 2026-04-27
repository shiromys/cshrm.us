import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

// Called after Stripe redirects back with ?session_id=...
// Verifies the checkout session directly with Stripe and upgrades the user's tier
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    // Verify the checkout session with Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    // Make sure this session belongs to the logged-in user
    if (checkoutSession.metadata?.userId !== session.user.id) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    const sub = checkoutSession.subscription as { id: string; customer: string } | null;

    // Upgrade the user in the database
    await db.update(users)
      .set({
        tier: "standard",
        stripeSubscriptionId: sub?.id ?? null,
        stripeCustomerId: typeof checkoutSession.customer === "string"
          ? checkoutSession.customer
          : null,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true, tier: "standard" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
