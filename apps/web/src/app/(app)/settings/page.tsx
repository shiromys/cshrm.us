"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard, Zap, User, Lock, Mail, ExternalLink, Receipt, Briefcase, UserCheck } from "lucide-react";

// Isolated component so useSearchParams is inside a Suspense boundary (required by Next.js 15)
function PaymentVerifier() {
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    if (searchParams.get("upgraded") === "1") {
      setVerifying(true);
      fetch("/api/v1/stripe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            toast.success("🎉 Welcome to Standard! Your subscription is now active.");
            // The verify route clears the session cache cookie — a hard reload
            // will now fetch a fresh session reflecting the new tier immediately.
            window.location.replace("/settings");
          } else {
            setVerifying(false);
            toast.error(data.error ?? "Could not verify payment. Please contact support.");
          }
        })
        .catch(() => {
          setVerifying(false);
          toast.error("Could not verify payment. Please contact support.");
        });
    }

    if (searchParams.get("chrmnexus") === "1") {
      setVerifying(true);
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
            setVerifying(false);
            toast.error(data.error ?? "Could not verify CHRMNEXUS payment. Please contact support.");
          }
        })
        .catch(() => {
          setVerifying(false);
          toast.error("Could not verify payment. Please contact support.");
        });
    }
  }, [searchParams]);

  if (!verifying) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-semibold text-gray-800">Activating your subscription…</p>
        <p className="text-sm text-muted-foreground">Please wait, this only takes a moment.</p>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="p-8 max-w-3xl space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border bg-white p-6 space-y-4">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-9 bg-gray-100 rounded" />
            <div className="h-9 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const user = session?.user as unknown as Record<string, string> | undefined;

  // ── Profile state
  const [name, setName]            = useState("");
  const [companyName, setCompany]  = useState("");
  const [replyTo, setReplyTo]      = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Operation mode state
  type OperationMode = "requirements" | "hotlist";
  const [operationMode, setOperationMode] = useState<OperationMode | null>(null);
  const [savingMode, setSavingMode]       = useState(false);

  // ── Password state
  const [currentPw, setCurrentPw]  = useState("");
  const [newPw, setNewPw]          = useState("");
  const [confirmPw, setConfirmPw]  = useState("");
  const [savingPw, setSavingPw]    = useState(false);

  // Populate form once session loads
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setCompany(user.companyName ?? "");
      setReplyTo(user.replyToEmail ?? "");
      if (user.operationMode === "requirements" || user.operationMode === "hotlist") {
        setOperationMode(user.operationMode);
      }
    }
  }, [user?.name, user?.companyName, user?.replyToEmail, user?.operationMode]);

  // ── Save profile (name, company, reply-to)
  async function saveProfile() {
    setSavingProfile(true);
    const res = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, companyName, replyToEmail: replyTo }),
    });
    setSavingProfile(false);
    if (res.ok) toast.success("Profile updated.");
    else toast.error("Failed to save profile.");
  }

  // ── Save operation mode
  async function saveMode() {
    if (!operationMode) return;
    setSavingMode(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationMode }),
      });
      if (!res.ok) throw new Error();
      toast.success("Operation mode updated. Reloading…");
      // Hard reload so sidebar rebuilds from the fresh session
      setTimeout(() => window.location.replace("/settings"), 800);
    } catch {
      toast.error("Failed to update operation mode.");
      setSavingMode(false);
    }
  }

  // ── Change password
  async function changePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPw(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        revokeOtherSessions: false,
      });
      if (result.error) throw new Error(result.error.message ?? "Failed to change password.");
      toast.success("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSavingPw(false);
    }
  }

  // ── Stripe
  async function startUpgrade() {
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? "Failed to start checkout. Please try again.");
    } catch {
      toast.error("Checkout failed. Please try again.");
    }
  }

  async function openBillingPortal() {
    try {
      const res = await fetch("/api/v1/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? "Could not open billing portal. Please try again.");
    } catch {
      toast.error("Could not open billing portal. Please try again.");
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
  const chrmnexusSubscribed = user?.chrmnexusSubscribed === "true" || (user as Record<string, unknown> | undefined)?.chrmnexusSubscribed === true;

  if (sessionLoading) return <SettingsSkeleton />;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Suspense fallback={null}><PaymentVerifier /></Suspense>

      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ── Profile ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Profile</CardTitle>
          <CardDescription>Update your display name and company information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <Badge variant={tier === "standard" ? "success" : "outline"}>
              {tier === "standard" ? "Standard" : "Free"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company or agency"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="replyTo" className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Campaign Reply-To Email
            </Label>
            <p className="text-xs text-muted-foreground">
              When recipients reply to your campaigns, replies go to this address. Defaults to your account email if left blank.
            </p>
            <Input
              id="replyTo"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder={user?.email}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Operation Mode (non-admin only) ── */}
      {user?.role !== "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {operationMode === "hotlist"
                ? <UserCheck className="w-5 h-5 text-emerald-600" />
                : <Briefcase className="w-5 h-5 text-indigo-600" />}
              Operation Mode
            </CardTitle>
            <CardDescription>
              Switch how you use CloudSourceHRM. Changing this updates your sidebar and default campaign view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                {
                  value: "requirements" as const,
                  icon: Briefcase,
                  iconColor: "text-indigo-600",
                  iconBg: "bg-indigo-100",
                  selectedBorder: "border-indigo-500 bg-indigo-50",
                  title: "Send Requirements",
                  desc: "Email recruiters and vendors with your open job positions.",
                },
                {
                  value: "hotlist" as const,
                  icon: UserCheck,
                  iconColor: "text-emerald-600",
                  iconBg: "bg-emerald-100",
                  selectedBorder: "border-emerald-500 bg-emerald-50",
                  title: "Share Hotlists",
                  desc: "Email employers a formatted table of your available bench candidates.",
                },
              ]).map(({ value, icon: Icon, iconColor, iconBg, selectedBorder, title, desc }) => {
                const isSelected = operationMode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOperationMode(value)}
                    className={`group rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected ? `${selectedBorder} shadow-sm` : "border-border bg-white hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`mb-3 inline-flex p-2.5 rounded-lg ${iconBg}`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      {isSelected && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center mt-0.5">
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-1">
              <Button
                onClick={saveMode}
                disabled={savingMode || operationMode === (user?.operationMode as string)}
              >
                {savingMode ? "Saving…" : "Save Mode"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Security / Change Password ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />Security</CardTitle>
          <CardDescription>Change your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPw">Current Password</Label>
            <Input
              id="currentPw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPw">New Password</Label>
              <Input
                id="newPw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPw">Confirm New Password</Label>
              <Input
                id="confirmPw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Forgot your password? Sign out and use the{" "}
            <a href="/forgot-password" className="text-primary hover:underline">Forgot Password</a> link on the login page.
          </p>
          <div className="flex justify-end pt-1">
            <Button onClick={changePassword} disabled={savingPw} variant="outline">
              {savingPw ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Subscription ── */}
      <Card id="upgrade">
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
                  <li>✓ Unlimited campaigns &amp; hotlists</li>
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

      {/* ── Billing & Invoices ── */}
      {tier === "standard" && (
        <Card id="billing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" />Billing &amp; Invoices</CardTitle>
            <CardDescription>View past payments, download receipts, and manage your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your full billing history, PDF invoices, and payment method are managed securely through Stripe.
              Clicking below opens the Stripe billing portal — no card details are ever stored on our servers.
            </p>
            <Button variant="outline" onClick={openBillingPortal} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Open Billing Portal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── CHRMNEXUS Add-On ── */}
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
                <Button variant="outline" className="w-full mt-3" onClick={subscribeChrmnexus}>
                  Add CHRMNEXUS Apply Access
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
