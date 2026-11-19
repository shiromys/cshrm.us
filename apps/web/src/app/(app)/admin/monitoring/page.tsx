"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Database, Mail, Server, Activity, Clock,
  Layers, TrendingUp, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface MonitoringData {
  timestamp: string;
  health: {
    database:    { ok: boolean; latencyMs: number; error?: string };
    mailerCloud: { ok: boolean; configured: boolean; error?: string };
    postmark:    { ok: boolean; configured: boolean; latencyMs?: number; error?: string };
  };
  recentEmails: {
    id: string;
    campaignId: string;
    recipientEmail: string;
    status: string;
    provider: string | null;
    sentAt: string | null;
    errorMessage: string | null;
    createdAt: string;
  }[];
  providerStats: Record<string, { sent: number; failed: number; other: number }>;
  usage: {
    todayDate: string;
    dailyCampaignTotal: number;
    dailyEmailTotal: number;
    activeUsersToday: number;
  };
  queueDepth: { name: string; count: number }[];
  lastEmailActivity: string | null;
  app: {
    nodeEnv: string;
    appUrl: string;
    railway: boolean;
    railwayEnv: string | null;
    envVarStatus: Record<string, boolean>;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ ok, warn = false }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (warn) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

function emailStatusColor(status: string): string {
  const map: Record<string, string> = {
    sent:        "bg-green-100 text-green-700",
    delivered:   "bg-teal-100 text-teal-700",
    opened:      "bg-blue-100 text-blue-700",
    queued:      "bg-gray-100 text-gray-600",
    failed:      "bg-red-100 text-red-700",
    bounced:     "bg-orange-100 text-orange-700",
    unsubscribed:"bg-purple-100 text-purple-700",
    complained:  "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

function relativeTime(isoStr: string | null): string {
  if (!isoStr) return "never";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminMonitoringPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery<MonitoringData>({
    queryKey: ["admin-monitoring"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/monitoring");
      if (!res.ok) throw new Error("Failed to load monitoring data");
      return res.json();
    },
    refetchInterval: autoRefresh ? 30_000 : false,
    staleTime: 10_000,
  });

  const h = data?.health;

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground text-sm">
            {dataUpdatedAt
              ? `Last refreshed ${relativeTime(new Date(dataUpdatedAt).toISOString())}`
              : "Database, SMTP, app health and email observability"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load monitoring data. Check server logs.
        </div>
      )}

      {/* ── Health cards ── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Service Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Database */}
          <HealthCard
            icon={Database}
            title="Database (PostgreSQL)"
            ok={!isLoading && (h?.database.ok ?? false)}
            loading={isLoading}
            detail={
              h?.database.ok
                ? `Latency: ${h.database.latencyMs}ms`
                : h?.database.error ?? "Unreachable"
            }
            badge={h?.database.ok ? "Connected" : "Error"}
          />

          {/* MailerCloud */}
          <HealthCard
            icon={Mail}
            title="MailerCloud (Primary SMTP)"
            ok={!isLoading && (h?.mailerCloud.ok ?? false)}
            warn={!isLoading && !h?.mailerCloud.configured}
            loading={isLoading}
            detail={
              !h?.mailerCloud.configured
                ? "MAILERCLOUD_API_KEY not set"
                : h?.mailerCloud.ok
                  ? "API key present"
                  : h?.mailerCloud.error ?? "Error"
            }
            badge={
              !h?.mailerCloud.configured ? "Not configured"
                : h?.mailerCloud.ok ? "Configured" : "Error"
            }
          />

          {/* Postmark */}
          <HealthCard
            icon={Mail}
            title="Postmark (Fallback SMTP)"
            ok={!isLoading && (h?.postmark.ok ?? false)}
            warn={!isLoading && !h?.postmark.configured}
            loading={isLoading}
            detail={
              !h?.postmark.configured
                ? "POSTMARK_SERVER_TOKEN not set"
                : h?.postmark.ok
                  ? `Latency: ${h.postmark.latencyMs}ms`
                  : h?.postmark.error ?? "Error"
            }
            badge={
              !h?.postmark.configured ? "Not configured"
                : h?.postmark.ok ? "Reachable" : "Error"
            }
          />
        </div>
      </div>

      {/* ── App info + env vars ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Application</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isLoading ? <Skeleton /> : (
              <>
                <InfoRow label="Environment" value={data?.app.nodeEnv ?? "—"} />
                <InfoRow label="App URL" value={data?.app.appUrl ?? "—"} />
                <InfoRow label="Railway" value={data?.app.railway ? `Yes (${data.app.railwayEnv})` : "No"} />
                <InfoRow label="Last email activity" value={relativeTime(data?.lastEmailActivity ?? null)} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Environment Variables</CardTitle>
            </div>
            <CardDescription className="text-xs">Required env vars — set or missing</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton /> : (
              <div className="grid grid-cols-1 gap-1.5">
                {Object.entries(data?.app.envVarStatus ?? {}).map(([key, present]) => (
                  <div key={key} className="flex items-center justify-between">
                    <code className="text-xs text-muted-foreground font-mono">{key}</code>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      present ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                    )}>
                      {present ? "✓ Set" : "✗ Missing"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Today's usage + queue depth ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Today&apos;s Usage ({data?.usage.todayDate ?? "—"})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isLoading ? <Skeleton /> : (
              <>
                <InfoRow label="Campaigns sent today" value={String(data?.usage.dailyCampaignTotal ?? 0)} />
                <InfoRow label="Emails sent today" value={String(data?.usage.dailyEmailTotal ?? 0)} />
                <InfoRow label="Active users today" value={String(data?.usage.activeUsersToday ?? 0)} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Queue Depth (pg-boss)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {isLoading ? <Skeleton /> : (
              (data?.queueDepth.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-xs">All queues empty.</p>
              ) : (
                <div className="space-y-2">
                  {data?.queueDepth.map((q) => (
                    <div key={q.name} className="flex items-center justify-between">
                      <code className="text-xs font-mono text-muted-foreground">{q.name}</code>
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        q.count > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700",
                      )}>
                        {q.count} jobs
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Provider success rates ── */}
      {!isLoading && Object.keys(data?.providerStats ?? {}).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Provider Success Rates (All Time)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(data!.providerStats).map(([provider, stats]) => {
                const total = stats.sent + stats.failed + stats.other;
                const rate = total > 0 ? Math.round((stats.sent / total) * 100) : 0;
                return (
                  <div key={provider} className="rounded-lg border p-4">
                    <p className="text-sm font-semibold capitalize mb-2">{provider}</p>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-2xl font-bold text-green-600">{rate}%</span>
                      <span className="text-xs text-muted-foreground mb-1">success</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="flex justify-between"><span>Sent/delivered</span><span className="font-medium text-foreground">{stats.sent.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Failed/bounced</span><span className="font-medium text-red-600">{stats.failed.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Other</span><span className="font-medium text-foreground">{stats.other.toLocaleString()}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent email sends ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Recent Email Sends</CardTitle>
          </div>
          <CardDescription className="text-xs">Last 50 email log entries across all campaigns</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Recipient</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sent</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && (data?.recentEmails.length ?? 0) === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No email logs yet.</td></tr>
                )}
                {data?.recentEmails.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{row.recipientEmail}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", emailStatusColor(row.status))}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{row.provider ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {row.sentAt ? relativeTime(row.sentAt) : relativeTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-red-600 max-w-xs truncate">
                      {row.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HealthCard({
  icon: Icon, title, ok, warn = false, loading, detail, badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  ok: boolean;
  warn?: boolean;
  loading: boolean;
  detail: string;
  badge: string;
}) {
  return (
    <Card className={cn(
      "border-2 transition-colors",
      loading ? "border-border"
        : ok ? "border-green-200 bg-green-50/30"
        : warn ? "border-yellow-200 bg-yellow-50/30"
        : "border-red-200 bg-red-50/30",
    )}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              loading ? "bg-muted" : ok ? "bg-green-100" : warn ? "bg-yellow-100" : "bg-red-100",
            )}>
              <Icon className={cn("w-4 h-4", loading ? "text-muted-foreground" : ok ? "text-green-600" : warn ? "text-yellow-600" : "text-red-600")} />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{loading ? "Checking…" : detail}</p>
            </div>
          </div>
          {!loading && <StatusIcon ok={ok} warn={warn} />}
        </div>
        {!loading && (
          <div className="mt-3">
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              ok ? "bg-green-100 text-green-700" : warn ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700",
            )}>
              {badge}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
      ))}
    </div>
  );
}
