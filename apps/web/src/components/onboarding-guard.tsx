"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) return;

    const user = session.user as unknown as Record<string, string>;
    const isAdmin = user.role === "admin";
    const hasMode = !!user.operationMode;

    // Non-admin users without a mode set → send to onboarding
    if (!isAdmin && !hasMode && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [session, isPending, pathname, router]);

  // Show nothing until session is loaded (prevents flash of sidebar before redirect)
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
