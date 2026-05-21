"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function EmailVerifiedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // better-auth sets an "error" param when verification fails
  const error = searchParams.get("error");
  const isSuccess = !error;

  // Auto-redirect to login after 5 seconds on success
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => router.replace("/login"), 5000);
    return () => clearTimeout(timer);
  }, [isSuccess, router]);

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-green-800">Email verified!</CardTitle>
          <CardDescription className="text-sm mt-1">
            Your email address has been successfully verified. You can now log in to your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 text-center">
            Redirecting you to login in a few seconds…
          </div>
        </CardContent>

        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">Go to Login now</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Error state — token expired, already used, or invalid link
  const errorMessage = (() => {
    switch (error) {
      case "INVALID_TOKEN":
        return "This verification link is invalid. It may have been used already or was malformed.";
      case "TOKEN_EXPIRED":
        return "This verification link has expired. Links are valid for 24 hours — please request a new one.";
      default:
        return "Something went wrong with your verification link. Please request a new one.";
    }
  })();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <CardTitle className="text-xl text-red-800">Verification failed</CardTitle>
        <CardDescription className="text-sm mt-1">{errorMessage}</CardDescription>
      </CardHeader>

      <CardFooter className="flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/register">Create a new account</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
          <Link href="/login">Back to Login</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function EmailVerifiedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">Checking verification…</CardContent>
        </Card>
      }>
        <EmailVerifiedContent />
      </Suspense>
    </div>
  );
}
