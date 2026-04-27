"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/schemas";
import type { z } from "zod";

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
import { forgotPassword } from "@/lib/auth-client";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit({ email }: { email: string }) {
    await forgotPassword({ email, redirectTo: "/reset-password" });
    setSent(true);
    toast.success("If that email exists, a reset link has been sent.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
      </CardHeader>
      {!sent ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{String(errors.email.message)}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
            <Link href="/login" className="text-sm text-primary hover:underline">Back to sign in</Link>
          </CardFooter>
        </form>
      ) : (
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground">Check your email for a password reset link.</p>
          <Link href="/login" className="text-sm text-primary hover:underline mt-4 block">Back to sign in</Link>
        </CardContent>
      )}
    </Card>
  );
}
