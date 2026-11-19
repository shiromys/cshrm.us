"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, DollarSign, CreditCard, Star,
  ExternalLink, FileText, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionRow {
  userId: string;
  name: string;
  email: string;
  tier: string;
  stripeCustomerId: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  planName: string | null;
  amount: number | null;
  currency: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  chrmnexusSubscribed: boolean;
}

interface InvoiceRow {
  id: string;
  customerEmail: string | null;
  customerName: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  invoiceUrl: string | null;
  invoicePdf: string | null;
}

interface BillingData {
  summary: {
    mrr: number;
    totalCollected: number;
    activeStandardSubs: number;
    activeChrmnexusSubs: number;
  };
  subscriptions: SubscriptionRow[];
  recentInvoices: InvoiceRow[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status: string | null) {
  if (!status) return <Badge variant="secondary" className="text-xs">No sub</Badge>;
  const map: Record<string, string> = {
    active:            "bg-green-100 text-green-700 border-green-200",
    trialing:          "bg-blue-100 text-blue-700 border-blue-200",
    past_due:          "bg-yellow-100 text-yellow-700 border-yellow-200",
    canceled:          "bg-red-100 text-red-700 border-red-200",
    incomplete:        "bg-orange-100 text-orange-700 border-orange-200",
    incomplete_expired:"bg-gray-100 text-gray-600 border-gray-200",
    unpaid:            "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", map[status] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
      {status}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminBillingPage() {
  const qc = useQueryClient();
  const [tierTarget, setTierTarget] = useState<{ userId: string; email: string } | null>(null);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<BillingData>({
    queryKey: ["admin-billing"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/billing");
      if (!res.ok) throw new Error("Failed to load billing data");
      return res.json();
    },
    staleTime: 60_000, // 1 min
  });

  const tierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      const res = await fetch("/api/v1/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update tier");
      return json;
    },
    onSuccess: () => {
      toast.success("Tier updated");
      setTierTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-billing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = data?.summary;
  const subs    = data?.subscriptions ?? [];
  const invoices = data?.recentInvoices ?? [];
  const visibleInvoices = showAllInvoices ? invoices : invoices.slice(0, 10);

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing &amp; Payments</h1>
          <p className="text-muted-foreground">Live Stripe data — subscriptions, invoices, and revenue</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load billing data. Make sure <code className="font-mono">STRIPE_SECRET_KEY</code> is set.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard
          icon={TrendingUp} color="bg-green-100 text-green-600"
          label="Live MRR" value={isLoading ? "—" : fmt(summary?.mrr ?? 0)}
          sub="active subscriptions only"
        />
        <SummaryCard
          icon={DollarSign} color="bg-blue-100 text-blue-600"
          label="Total Collected" value={isLoading ? "—" : fmt(summary?.totalCollected ?? 0)}
          sub="last 50 paid invoices"
        />
        <SummaryCard
          icon={CreditCard} color="bg-purple-100 text-purple-600"
          label="Standard Subs" value={isLoading ? "—" : (summary?.activeStandardSubs ?? 0).toString()}
          sub="active"
        />
        <SummaryCard
          icon={Star} color="bg-amber-100 text-amber-600"
          label="CHRMNEXUS Subs" value={isLoading ? "—" : (summary?.activeChrmnexusSubs ?? 0).toString()}
          sub="active"
        />
      </div>

      {/* Subscriptions table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Subscriptions by User</CardTitle>
          <CardDescription>Users with a Stripe customer ID — live subscription status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Renews</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">DB Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Override</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && subs.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No Stripe customers found.</td></tr>
                )}
                {subs.map((row, i) => (
                  <tr key={`${row.userId}-${i}`} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <p className="font-medium leading-tight">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.planName ?? "—"}</td>
                    <td className="px-4 py-2.5">{statusBadge(row.subscriptionStatus)}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {row.amount != null ? fmt(row.amount, row.currency ?? "usd") + "/mo" : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {row.currentPeriodEnd
                        ? new Date(row.currentPeriodEnd * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                      {row.cancelAtPeriodEnd && (
                        <span className="ml-1 text-orange-500 font-medium">(cancels)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={row.tier === "standard" ? "success" : "secondary"} className="text-xs">
                        {row.tier}
                      </Badge>
                      {row.chrmnexusSubscribed && (
                        <Badge variant="warning" className="text-xs ml-1">CHRMNEXUS</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {row.tier !== "standard" && (
                          <Button
                            size="sm" variant="outline"
                            className="h-6 text-xs px-2 text-green-700 border-green-300 hover:bg-green-50"
                            onClick={() => tierMutation.mutate({ userId: row.userId, tier: "standard" })}
                            disabled={tierMutation.isPending}
                          >
                            → Standard
                          </Button>
                        )}
                        {row.tier !== "free" && (
                          <Button
                            size="sm" variant="outline"
                            className="h-6 text-xs px-2 text-red-700 border-red-300 hover:bg-red-50"
                            onClick={() => tierMutation.mutate({ userId: row.userId, tier: "free" })}
                            disabled={tierMutation.isPending}
                          >
                            → Free
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`https://dashboard.stripe.com/customers/${row.stripeCustomerId}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent invoices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Paid Invoices</CardTitle>
          <CardDescription>Last 50 paid charges from Stripe</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && invoices.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No paid invoices found.</td></tr>
                )}
                {visibleInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <p className="font-medium leading-tight">{inv.customerName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{inv.customerEmail ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-green-700">
                      {fmt(inv.amount, inv.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(inv.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2">
                        {inv.invoiceUrl && (
                          <a href={inv.invoiceUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        )}
                        {inv.invoicePdf && (
                          <a href={inv.invoicePdf} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                            <FileText className="w-3 h-3" /> PDF
                          </a>
                        )}
                        {!inv.invoiceUrl && !inv.invoicePdf && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoices.length > 10 && (
            <div className="px-4 py-3 border-t">
              <button
                onClick={() => setShowAllInvoices(!showAllInvoices)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {showAllInvoices
                  ? <><ChevronUp className="w-3 h-3" /> Show less</>
                  : <><ChevronDown className="w-3 h-3" /> Show all {invoices.length} invoices</>
                }
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon, color, label, value, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-lg shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
