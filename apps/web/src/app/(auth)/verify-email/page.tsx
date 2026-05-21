"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { MailCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resending, setResending] = useState(false);

  async function resendVerification() {
    if (!email) return;
    setResending(true);
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/login" });
      toast.success("Verification email resent — please check your inbox.");
    } catch {
      toast.error("Could not resend email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
            <MailCheck className="w-7 h-7 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-xl">Check your inbox</CardTitle>
        <CardDescription className="text-sm mt-1">
          We&apos;ve sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-gray-800">{email}</span>
          ) : (
            "your email address"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-2 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 text-left">
          <p className="font-semibold mb-1">Before you can log in:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Open the email from CloudSourceHRM</li>
            <li>Click the <strong>Verify Email Address</strong> button</li>
            <li>You&apos;ll be taken directly to the login page</li>
          </ol>
        </div>
        <p className="text-xs text-muted-foreground">
          The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
        </p>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/login">Go to Login</Link>
        </Button>
        {email && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={resendVerification}
            disabled={resending}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resending ? "animate-spin" : ""}`} />
            {resending ? "Sending…" : "Resend verification email"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">Loading…</CardContent>
        </Card>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
