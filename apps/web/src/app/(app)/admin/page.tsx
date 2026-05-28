import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, employerLeads, candidateLeads, csvImportBatches, users, campaigns, emailLogs } from "@/lib/db";
import { eq, count, and, isNull, sum, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Users, Mail, FileUp, UserCheck, TrendingUp, CreditCard,
  Star, Send, CheckCircle2, MousePointerClick, XCircle, ArrowRight
} from "lucide-react";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as unknown as Record<string, string>).role !== "admin") redirect("/dashboard");

  // ── User stats ────────────────────────────────────────────────────
  const [totalUsers]       = await db.select({ count: count() }).from(users);
  const [standardUsers]    = await db.select({ count: count() }).from(users).where(eq(users.tier, "standard"));
  const [chrmnexusUsers]   = await db.select({ count: count() }).from(users).where(eq(users.chrmnexusSubscribed, true));
  const [verifiedUsers]    = await db.select({ count: count() }).from(users).where(eq(users.emailVerified, true));

  // ── Revenue estimate ──────────────────────────────────────────────
  const standardMRR = (standardUsers?.count ?? 0) * 95;
  // CHRMNEXUS subscription price — estimate $29/mo (adjust if different)
  const chrmnexusMRR = (chrmnexusUsers?.count ?? 0) * 29;
  const estimatedMRR = standardMRR + chrmnexusMRR;

  // ── Requirement / email stats ─────────────────────────────────────
  const [totalCampaigns]   = await db.select({ count: count() }).from(campaigns).where(isNull(campaigns.deletedAt));
  const [sentCampaigns]    = await db.select({ count: count() }).from(campaigns).where(and(eq(campaigns.status, "sent"), isNull(campaigns.deletedAt)));
  const emailStats         = await db.select({
    totalSent:      sum(campaigns.totalRecipients),
    totalDelivered: sum(campaigns.deliveredCount),
    totalOpened:    sum(campaigns.openedCount),
    totalBounced:   sum(campaigns.bouncedCount),
  }).from(campaigns).where(isNull(campaigns.deletedAt));

  const totalSent      = Number(emailStats[0]?.totalSent ?? 0);
  const totalDelivered = Number(emailStats[0]?.totalDelivered ?? 0);
  const totalOpened    = Number(emailStats[0]?.totalOpened ?? 0);
  const totalBounced   = Number(emailStats[0]?.totalBounced ?? 0);
  const deliveryRate   = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : "—";
  const openRate       = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : "—";
  const bounceRate     = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : "—";

  // ── Pending review items ──────────────────────────────────────────
  const [pendingEmployerLeads]   = await db.select({ count: count() }).from(employerLeads).where(eq(employerLeads.status, "pending"));
  const [pendingCandidateLeads]  = await db.select({ count: count() }).from(candidateLeads).where(eq(candidateLeads.status, "pending"));
  const [pendingCsvBatches]      = await db.select({ count: count() }).from(csvImportBatches).where(eq(csvImportBatches.status, "pending_review"));

  // ── Recent signups (last 10) ──────────────────────────────────────
  const recentSignups = await db.select({
    id:                users.id,
    name:              users.name,
    email:             users.email,
    tier:              users.tier,
    emailVerified:     users.emailVerified,
    chrmnexusSubscribed: users.chrmnexusSubscribed,
    createdAt:         users.createdAt,
  }).from(users).orderBy(desc(users.createdAt)).limit(10);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Analytics</h1>
        <p className="text-muted-foreground">Internal dashboard</p>
      </div>

      {/* ── Subscriber stats ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Subscribers &amp; Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard icon={Users} color="bg-blue-100 text-blue-600" label="Total Users" value={totalUsers?.count ?? 0} />
          <StatCard icon={CheckCircle2} color="bg-teal-100 text-teal-600" label="Verified Users" value={verifiedUsers?.count ?? 0} sub={`${totalUsers?.count ? ((verifiedUsers?.count ?? 0) / (totalUsers?.count) * 100).toFixed(0) : 0}% verified`} />
          <StatCard icon={CreditCard} color="bg-purple-100 text-purple-600" label="Standard Subscribers" value={standardUsers?.count ?? 0} sub="$95/mo each" />
          <StatCard icon={Star} color="bg-amber-100 text-amber-600" label="CHRMNEXUS Subscribers" value={chrmnexusUsers?.count ?? 0} sub="Apply access" />
        </div>
      </div>

      {/* MRR estimate */}
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardContent className="pt-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Estimated MRR</p>
            <p className="text-3xl font-bold text-green-800">${estimatedMRR.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-0.5">
              ${standardMRR.toLocaleString()} Standard + ${chrmnexusMRR.toLocaleString()} CHRMNEXUS
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Email / requirement stats ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Requirements &amp; Email Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard icon={Send} color="bg-indigo-100 text-indigo-600" label="Total Requirements" value={totalCampaigns?.count ?? 0} sub={`${sentCampaigns?.count ?? 0} sent`} />
          <StatCard icon={Mail} color="bg-sky-100 text-sky-600" label="Emails Sent" value={totalSent.toLocaleString()} sub={`${deliveryRate}% delivery rate`} />
          <StatCard icon={MousePointerClick} color="bg-emerald-100 text-emerald-600" label="Emails Opened" value={totalOpened.toLocaleString()} sub={`${openRate}% open rate`} />
          <StatCard icon={XCircle} color="bg-red-100 text-red-600" label="Bounced" value={totalBounced.toLocaleString()} sub={`${bounceRate}% bounce rate`} />
        </div>
      </div>

      {/* ── Pending items ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Pending Review</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PendingCard href="/admin/leads" icon={UserCheck} label="Employer Leads" count={pendingEmployerLeads?.count ?? 0} />
          <PendingCard href="/admin/leads" icon={Users} label="Candidate Leads" count={pendingCandidateLeads?.count ?? 0} />
          <PendingCard href="/admin/csv-batches" icon={FileUp} label="CSV Batches" count={pendingCsvBatches?.count ?? 0} />
        </div>
      </div>

      {/* ── Quick links ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Admin Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/leads">
            <Card className="hover:shadow-md transition-shadow cursor-pointer p-4 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-primary" />
              <div><p className="font-medium">Leads Management</p><p className="text-xs text-muted-foreground">Review employer &amp; candidate leads</p></div>
            </Card>
          </Link>
          <Link href="/admin/csv-batches">
            <Card className="hover:shadow-md transition-shadow cursor-pointer p-4 flex items-center gap-3">
              <FileUp className="w-5 h-5 text-primary" />
              <div><p className="font-medium">CSV Batches</p><p className="text-xs text-muted-foreground">Approve or reject CSV uploads</p></div>
            </Card>
          </Link>
          <Link href="/admin/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div><p className="font-medium">User Management</p><p className="text-xs text-muted-foreground">View and manage accounts</p></div>
            </Card>
          </Link>
        </div>
      </div>

      {/* ── Recent signups ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Signups</CardTitle>
          <CardDescription>Last 10 registered accounts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentSignups.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex gap-1">
                        <Badge variant={u.tier === "standard" ? "success" : "secondary"} className="text-xs">
                          {u.tier}
                        </Badge>
                        {u.chrmnexusSubscribed && (
                          <Badge variant="warning" className="text-xs">CHRMNEXUS</Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {u.emailVerified
                        ? <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                        : <span className="text-xs text-amber-600 font-medium">⏳ Pending</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t">
            <Link href="/admin/users" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all users <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon, color, label, value, sub, href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
}) {
  const content = (
    <Card className={href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
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
  return href ? <Link href={href}>{content}</Link> : content;
}

function PendingCard({ href, icon: Icon, label, count }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${count > 0 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">pending review</p>
            </div>
          </div>
          <div className={`text-2xl font-bold ${count > 0 ? "text-orange-600" : "text-muted-foreground"}`}>{count}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
