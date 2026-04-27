import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const STANDARD_PRICE = process.env.STRIPE_PRICE_ID_STANDARD;
  const CHRMNEXUS_PRICE = process.env.STRIPE_PRICE_ID_CHRMNEXUS;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price.id;
      const isActive = sub.status === "active" || sub.status === "trialing";

      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
      if (!user) break;

      if (priceId === STANDARD_PRICE) {
        await db.update(users).set({
          tier: isActive ? "standard" : "free",
          stripeSubscriptionId: sub.id,
        }).where(eq(users.id, user.id));
      } else if (priceId === CHRMNEXUS_PRICE) {
        await db.update(users).set({
          chrmnexusSubscribed: isActive,
          chrmnexusStripeSubscriptionId: sub.id,
        }).where(eq(users.id, user.id));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price.id;

      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
      if (!user) break;

      if (priceId === STANDARD_PRICE) {
        await db.update(users).set({ tier: "free", stripeSubscriptionId: null }).where(eq(users.id, user.id));
      } else if (priceId === CHRMNEXUS_PRICE) {
        await db.update(users).set({ chrmnexusSubscribed: false, chrmnexusStripeSubscriptionId: null }).where(eq(users.id, user.id));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
