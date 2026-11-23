import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { logActivity } from "@/lib/activity";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const STANDARD_PRICE  = process.env.STRIPE_PRICE_ID_STANDARD;
  const CHRMNEXUS_PRICE = process.env.STRIPE_PRICE_ID_CHRMNEXUS;

  switch (event.type) {

    // ── Subscription created / updated ──────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub        = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId    = sub.items.data[0]?.price.id;
      const isActive   = sub.status === "active" || sub.status === "trialing";
      const prevSub    = event.data.previous_attributes as Record<string, unknown> | undefined;
      const wasActive  = prevSub?.status === "active" || prevSub?.status === "trialing";

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

      // Log billing event
      const planName = priceId === STANDARD_PRICE ? "Standard ($95/mo)"
                     : priceId === CHRMNEXUS_PRICE ? "CHRMNEXUS"
                     : priceId ?? "Unknown plan";

      if (event.type === "customer.subscription.created") {
        void logActivity({
          userId:  user.id,
          event:   "subscription_started",
          summary: `Subscription started: ${planName}`,
          metadata: { subscriptionId: sub.id, priceId, status: sub.status, planName },
        });
      } else if (isActive && !wasActive) {
        // Reactivated / renewed
        void logActivity({
          userId:  user.id,
          event:   "subscription_renewed",
          summary: `Subscription renewed: ${planName}`,
          metadata: { subscriptionId: sub.id, priceId, status: sub.status, planName },
        });
      } else if (!isActive && wasActive) {
        // Became inactive (paused, past_due, etc.)
        void logActivity({
          userId:  user.id,
          event:   "subscription_cancelled",
          summary: `Subscription status changed to "${sub.status}": ${planName}`,
          metadata: { subscriptionId: sub.id, priceId, status: sub.status, planName },
        });
      }
      break;
    }

    // ── Subscription cancelled ───────────────────────────────────────────────
    case "customer.subscription.deleted": {
      const sub        = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId    = sub.items.data[0]?.price.id;

      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
      if (!user) break;

      if (priceId === STANDARD_PRICE) {
        await db.update(users).set({ tier: "free", stripeSubscriptionId: null }).where(eq(users.id, user.id));
      } else if (priceId === CHRMNEXUS_PRICE) {
        await db.update(users).set({ chrmnexusSubscribed: false, chrmnexusStripeSubscriptionId: null }).where(eq(users.id, user.id));
      }

      const planName = priceId === STANDARD_PRICE ? "Standard ($95/mo)"
                     : priceId === CHRMNEXUS_PRICE ? "CHRMNEXUS"
                     : priceId ?? "Unknown plan";

      void logActivity({
        userId:  user.id,
        event:   "subscription_cancelled",
        summary: `Subscription cancelled: ${planName}`,
        metadata: { subscriptionId: sub.id, priceId, planName, cancelledAt: sub.canceled_at },
      });
      break;
    }

    // ── Payment succeeded ────────────────────────────────────────────────────
    case "invoice.payment_succeeded": {
      const invoice    = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const [user]     = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
      if (!user) break;

      const amount   = (invoice.amount_paid / 100).toFixed(2);
      const currency = invoice.currency.toUpperCase();

      void logActivity({
        userId:  user.id,
        event:   "payment_succeeded",
        summary: `Payment of ${currency} ${amount} succeeded`,
        metadata: {
          invoiceId:   invoice.id,
          amount:      invoice.amount_paid,
          currency,
          invoiceUrl:  invoice.hosted_invoice_url,
          invoicePdf:  invoice.invoice_pdf,
          periodStart: invoice.period_start,
          periodEnd:   invoice.period_end,
        },
      });
      break;
    }

    // ── Payment failed ───────────────────────────────────────────────────────
    case "invoice.payment_failed": {
      const invoice    = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const [user]     = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
      if (!user) break;

      const amount   = (invoice.amount_due / 100).toFixed(2);
      const currency = invoice.currency.toUpperCase();

      void logActivity({
        userId:  user.id,
        event:   "payment_failed",
        summary: `Payment of ${currency} ${amount} failed`,
        metadata: {
          invoiceId:    invoice.id,
          amount:       invoice.amount_due,
          currency,
          attemptCount: invoice.attempt_count,
          nextAttempt:  invoice.next_payment_attempt,
        },
      });
      break;
    }

    // ── Refund issued ────────────────────────────────────────────────────────
    case "charge.refunded": {
      const charge     = event.data.object as Stripe.Charge;
      const customerId = charge.customer as string;
      if (!customerId) break;

      const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
      if (!user) break;

      const refunds    = charge.refunds?.data ?? [];
      const latestRefund = refunds[0];
      const amount   = latestRefund ? (latestRefund.amount / 100).toFixed(2) : "?";
      const currency = charge.currency.toUpperCase();

      void logActivity({
        userId:  user.id,
        event:   "refund_issued",
        summary: `Refund of ${currency} ${amount} issued`,
        metadata: {
          chargeId:   charge.id,
          refundId:   latestRefund?.id,
          amount:     latestRefund?.amount,
          currency,
          reason:     latestRefund?.reason,
          refundedAt: latestRefund?.created,
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
