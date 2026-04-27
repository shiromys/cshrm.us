"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

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
