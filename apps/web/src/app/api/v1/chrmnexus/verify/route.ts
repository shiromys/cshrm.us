import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (checkoutSession.metadata?.userId !== session.user.id) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    const sub = checkoutSession.subscription as { id: string } | null;

    await db.update(users)
      .set({
        chrmnexusSubscribed: true,
        chrmnexusStripeSubscriptionId: sub?.id ?? null,
      })
      .where(eq(users.id, session.user.id));

    // Bust the better-auth session cache so chrmnexusSubscribed is reflected
    // immediately on the next session fetch without waiting for the 5-min cache.
    const response = NextResponse.json({ success: true });
    const expired = new Date(0);
    response.cookies.set("better-auth.session_data", "", {
      expires: expired, path: "/", httpOnly: true, sameSite: "lax",
    });
    response.cookies.set("__Secure-better-auth.session_data", "", {
      expires: expired, path: "/", httpOnly: true, sameSite: "lax", secure: true,
    });
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
