"use client";

import { useSession } from "@/lib/auth-client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard, Zap } from "lucide-react";

// Isolated component so useSearchParams is inside a Suspense boundary (required by Next.js 15)
function PaymentVerifier() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    if (searchParams.get("upgraded") === "1") {
      fetch("/api/v1/stripe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            toast.success("🎉 Welcome to Standard! Your subscription is now active.");
            window.location.replace("/settings");
          } else {
            toast.error(data.error ?? "Could not verify payment. Please contact support.");
          }
        })
        .catch(() => toast.error("Could not verify payment. Please contact support."));
    }

    if (searchParams.get("chrmnexus") === "1") {
      fetch("/api/v1/chrmnexus/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            toast.success("🎉 CHRMNEXUS Apply Access is now active!");
            window.location.replace("/settings");
          } else {
            toast.error(data.error ?? "Could not verify CHRMNEXUS payment. Please contact support.");
          }
        })
        .catch(() => toast.error("Could not verify payment. Please contact support."));
    }
  }, [searchParams]);

  return null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as unknown as Record<string, string> | undefined;
  const [replyTo, setReplyTo] = useState(user?.replyToEmail ?? "");
  const [saving, setSaving] = useState(false);

  async function saveReplyTo() {
    setSaving(true);
    const res = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyToEmail: replyTo }),
    });
    setSaving(false);
    if (res.ok) toast.success("Reply-To email saved");
    else toast.error("Failed to save");
  }

  async function startUpgrade() {
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Failed to start checkout. Please try again.");
      }
    } catch {
      toast.error("Checkout failed. Please try again.");
    }
  }

  async function subscribeChrmnexus() {
    try {
      const res = await fetch("/api/v1/chrmnexus/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? "Failed to start checkout.");
    } catch {
      toast.error("Checkout failed. Please try again.");
    }
  }

  const tier = user?.tier ?? "free";
  const chrmnexusSubscribed = user?.chrmnexusSubscribed === "true" || (user as Record<string, unknown>)?.chrmnexusSubscribed === true;

  return (
    <div className="p-8 max-w-3xl">
      {/* Suspense required by Next.js 15 for useSearchParams */}
      <Suspense fallback={null}>
        <PaymentVerifier />
      </Suspense>

      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account Info */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Badge variant={tier === "standard" ? "success" : "outline"}>
              {tier === "standard" ? "Standard" : "Free"}
            </Badge>
          </div>
          <div className="space-y-2">
            <Label>Reply-To Email</Label>
            <p className="text-xs text-muted-foreground">Campaign and hotlist replies are sent to this address</p>
            <div className="flex gap-2">
              <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder={user?.email} className="flex-1" />
              <Button onClick={saveReplyTo} disabled={saving} variant="outline">Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="mb-6" id="upgrade">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Subscription</CardTitle>
          <CardDescription>Manage your CloudSourceHRM subscription</CardDescription>
        </CardHeader>
        <CardContent>
          {tier === "standard" ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Standard Plan — $95/month</p>
                <p className="text-sm text-green-700">Unlimited campaigns, hotlists, and contacts</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Upgrade to Standard for unlimited campaigns, hotlists, and contacts.</p>
              <div className="p-4 border rounded-lg space-y-2">
                <p className="font-semibold">Standard Plan — $95/month</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Unlimited campaigns & hotlists</li>
                  <li>✓ 10 emails/day (configurable)</li>
                  <li>✓ Private employer contacts database</li>
                  <li>✓ CSV import</li>
                  <li>✓ Dual-database campaign sends</li>
                </ul>
                <Button className="w-full mt-3" onClick={startUpgrade}>Upgrade Now</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CHRMNEXUS Add-On */}
      <Card id="chrmnexus">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" />CHRMNEXUS Job Board</CardTitle>
          <CardDescription>Apply for jobs on the CHRMNEXUS board (cloudsourcehrm.com)</CardDescription>
        </CardHeader>
        <CardContent>
          {chrmnexusSubscribed ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">CHRMNEXUS Add-On Active</p>
                <p className="text-sm text-green-700">You can view and apply for jobs on the CHRMNEXUS board</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">View jobs for free. Pay to unlock applications.</p>
              <div className="p-4 border rounded-lg space-y-2">
                <p className="font-semibold">CHRMNEXUS Apply Add-On</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Submit applications directly from member portal</li>
                  <li>✓ Track application status</li>
                  <li>✓ Save jobs for later</li>
                </ul>
                <Button variant="outline" className="w-full mt-3" onClick={subscribeChrmnexus}>Add CHRMNEXUS Apply Access</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
