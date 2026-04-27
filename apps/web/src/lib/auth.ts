import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Set to true in production once RESEND_API_KEY is configured
    requireEmailVerification: process.env.NODE_ENV === "production",
    sendResetPassword: async ({ user, url }) => {
      if (!process.env.RESEND_API_KEY) return;
      const { resend } = await import("@/lib/email/resend");
      await resend.sendPasswordReset(user.email, user.name, url);
    },
  },
  emailVerification: {
    sendOnSignUp: process.env.NODE_ENV === "production",
    sendVerificationEmail: async ({ user, url }) => {
      if (!process.env.RESEND_API_KEY) return;
      const { resend } = await import("@/lib/email/resend");
      await resend.sendEmailVerification(user.email, user.name, url);
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? "build-time-placeholder-secret-do-not-use",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      companyName:                   { type: "string",  required: false },
      replyToEmail:                  { type: "string",  required: false },
      tier:                          { type: "string",  required: false, defaultValue: "free" },
      role:                          { type: "string",  required: false, defaultValue: "user" },
      status:                        { type: "string",  required: false, defaultValue: "active" },
      stripeCustomerId:              { type: "string",  required: false },
      stripeSubscriptionId:          { type: "string",  required: false },
      chrmnexusSubscribed:           { type: "boolean", required: false, defaultValue: false },
      chrmnexusStripeSubscriptionId: { type: "string",  required: false },
    },
  },
});

export type Auth = typeof auth;
