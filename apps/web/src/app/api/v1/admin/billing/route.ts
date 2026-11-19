import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, users } from "@/lib/db";
import { eq, isNotNull } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

function isAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  return (session?.user as unknown as Record<string, string>)?.role === "admin";
}

// ── GET /api/v1/admin/billing ─────────────────────────────────────────────────
// Returns:
//   summary: { mrr, totalCollected, activeStandardSubs, activeChrmnexusSubs }
//   subscriptions: per-user rows with Stripe live data
//   recentInvoices: last 50 paid invoices across all customers
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull all users who have a Stripe customer ID
  const usersWithStripe = await db.query.users.findMany({
    where: isNotNull(users.stripeCustomerId),
  });

  // ── Fetch Stripe subscriptions for each customer ─────────────────────────
  const subscriptionRows: Array<{
    userId: string;
    name: string;
    email: string;
    tier: string;
    stripeCustomerId: string;
    subscriptionId: string | null;
    subscriptionStatus: string | null;
    planName: string | null;
    amount: number | null;
    currency: string | null;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    chrmnexusSubscribed: boolean;
  }> = [];

  let mrr = 0;
  let activeStandardSubs = 0;
  let activeChrmnexusSubs = 0;

  for (const user of usersWithStripe) {
    if (!user.stripeCustomerId) continue;

    try {
      const subs = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 10,
        expand: ["data.items.data.price.product"],
      });

      if (subs.data.length === 0) {
        subscriptionRows.push({
          userId: user.id,
          name: user.name,
          email: user.email,
          tier: user.tier,
          stripeCustomerId: user.stripeCustomerId,
          subscriptionId: null,
          subscriptionStatus: null,
          planName: null,
          amount: null,
          currency: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          chrmnexusSubscribed: user.chrmnexusSubscribed,
        });
      } else {
        for (const sub of subs.data) {
          const item = sub.items.data[0];
          const price = item?.price;
          const product = price?.product as { name?: string } | null;
          const planName = product?.name ?? price?.id ?? "Unknown";
          const amount = price?.unit_amount ? price.unit_amount / 100 : null;

          if (sub.status === "active") {
            if (amount) mrr += amount;
            if (planName.toLowerCase().includes("chrmnexus")) {
              activeChrmnexusSubs++;
            } else {
              activeStandardSubs++;
            }
          }

          subscriptionRows.push({
            userId: user.id,
            name: user.name,
            email: user.email,
            tier: user.tier,
            stripeCustomerId: user.stripeCustomerId,
            subscriptionId: sub.id,
            subscriptionStatus: sub.status,
            planName,
            amount,
            currency: price?.currency ?? "usd",
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            chrmnexusSubscribed: user.chrmnexusSubscribed,
          });
        }
      }
    } catch {
      // Skip customers that error (deleted, etc.)
    }
  }

  // ── Recent invoices (last 50 paid across all) ─────────────────────────────
  let recentInvoices: Array<{
    id: string;
    customerEmail: string | null;
    customerName: string | null;
    amount: number;
    currency: string;
    status: string;
    created: number;
    invoiceUrl: string | null;
    invoicePdf: string | null;
  }> = [];

  try {
    const invoices = await stripe.invoices.list({
      status: "paid",
      limit: 50,
      expand: ["data.customer"],
    });

    recentInvoices = invoices.data.map((inv) => {
      const customer = inv.customer as { email?: string; name?: string } | null;
      return {
        id: inv.id,
        customerEmail: inv.customer_email ?? customer?.email ?? null,
        customerName: inv.customer_name ?? customer?.name ?? null,
        amount: inv.amount_paid / 100,
        currency: inv.currency,
        status: inv.status ?? "unknown",
        created: inv.created,
        invoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
      };
    });
  } catch {
    // Non-fatal — invoices section will show empty
  }

  // Total collected = sum of all paid invoices fetched
  const totalCollected = recentInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return NextResponse.json({
    summary: { mrr, totalCollected, activeStandardSubs, activeChrmnexusSubs },
    subscriptions: subscriptionRows,
    recentInvoices,
  });
}

// ── POST /api/v1/admin/billing ────────────────────────────────────────────────
// Body: { userId, tier }  — manual tier override
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, tier } = body as { userId?: string; tier?: string };

  if (!userId || !tier || !["free", "standard"].includes(tier)) {
    return NextResponse.json({ error: "userId and tier (free|standard) are required" }, { status: 400 });
  }

  await db.update(users)
    .set({ tier: tier as "free" | "standard", updatedAt: new Date() })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
