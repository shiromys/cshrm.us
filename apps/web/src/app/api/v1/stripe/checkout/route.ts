import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, STRIPE_PRICES, createCheckoutSession } from "@/lib/stripe";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, session.user.id) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!STRIPE_PRICES.STANDARD || STRIPE_PRICES.STANDARD === "price_placeholder") {
      return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const checkout = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      priceId: STRIPE_PRICES.STANDARD,
      successUrl: `${appUrl}/settings?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
