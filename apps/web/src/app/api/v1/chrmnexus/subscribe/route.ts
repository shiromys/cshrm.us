import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession, STRIPE_PRICES } from "@/lib/stripe";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.chrmnexusSubscribed) {
      return NextResponse.json({ error: "Already subscribed to CHRMNEXUS" }, { status: 400 });
    }

    if ((session.user as unknown as Record<string, string>).tier === "free") {
      return NextResponse.json(
        { error: "CHRMNEXUS add-on requires an active Standard subscription" },
        { status: 400 }
      );
    }

    // Fetch the user so we can pass their existing Stripe customer ID.
    // This ensures both subscriptions appear under the same customer in Stripe
    // and are visible together in the billing portal.
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, session.user.id),
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const stripeSession = await createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      customerId: user.stripeCustomerId ?? undefined,
      priceId: STRIPE_PRICES.CHRMNEXUS,
      successUrl: `${appUrl}/settings?chrmnexus=1&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/settings#chrmnexus`,
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create checkout session";
    console.error("[chrmnexus/subscribe]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
