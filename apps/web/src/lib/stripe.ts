import Stripe from "stripe";

// Lazy init — avoids "apiKey not provided" error during Next.js build-time static analysis
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const STRIPE_PRICES = {
  STANDARD: process.env.STRIPE_PRICE_ID_STANDARD ?? "",
  CHRMNEXUS: process.env.STRIPE_PRICE_ID_CHRMNEXUS ?? "",
  CREDITS: process.env.STRIPE_PRICE_ID_CREDITS ?? "",
};

export async function createCheckoutSession({
  userId,
  userEmail,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  userId: string;
  userEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  return getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, ...metadata },
  });
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
