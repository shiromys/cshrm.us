"use client";
import { createAuthClient } from "better-auth/react";

// Use window.location.origin in the browser so the correct production URL
// is always used regardless of what was baked in at Docker build time.
// Falls back to env var (local dev) or localhost (build-time placeholder).
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export const authClient = createAuthClient({ baseURL });

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  resetPassword,
  verifyEmail,
} = authClient;

// Better Auth 1.6+ uses requestPasswordReset instead of forgotPassword
export const forgotPassword = authClient.requestPasswordReset;
