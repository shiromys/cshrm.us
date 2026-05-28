export const dynamic = "force-dynamic"; // always fetch fresh counts

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, campaigns, emailLogs, hotlists, contacts, employerContacts } from "@/lib/db";
import { eq, and, isNull, count, gte, sum } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Mail, List, Users, Building2, TrendingUp, PlusCircle, ArrowRight, CheckCircle2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const userId = session.user.id;
  const tier = (session.user as unknown as Record<string, string>).tier ?? "free";

  // Stats
  const [campaignCount] = await db.select({ count: count() }).from(campaigns)
    .where(and(eq(campaigns.userId, userId), isNull(campaigns.deletedAt)));
  const [hotlistCount] = await db.select({ count: count() }).from(hotlists)
    .where(and(eq(hotlists.userId, userId), isNull(hotlists.deletedAt)));
  const [contactCount] = await db.select({ count: count() }).from(contacts).where(isNull(contacts.deletedAt));
  const [myContactCount] = await db.select({ count: count() }).from(employerContacts).where(eq(employerContacts.userId, userId));

  const recentCampaigns = await db.select().from(campaigns)
    .where(and(eq(campaigns.userId, userId), isNull(campaigns.deletedAt)))
    .orderBy(campaigns.createdAt)
    .limit(5);

  // Overall email stats for this user's sent campaigns
  const [myEmailStats] = await db.select({
    totalSent:      sum(campaigns.totalRecipients),
    totalDelivered: sum(campaigns.deliveredCount),
    totalOpened:    sum(campaigns.openedCount),
  }).from(campaigns).where(and(eq(campaigns.userId, userId), isNull(campaigns.deletedAt)));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {session.user.name}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/campaigns/new">
            <Button size="sm"><PlusCircle className="w-4 h-4 mr-2" />New Requirement</Button>
          </Link>
          <Link href="/hotlists/new">
            <Button size="sm" variant="outline"><PlusCircle className="w-4 h-4 mr-2" />New Hotlist</Button>
          </Link>
        </div>
      </div>

      {/* ── Setup guide — shown until Platform Contacts has data ── */}
      {(contactCount?.count ?? 0) === 0 && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-6">
          <h2 className="text-base font-bold text-blue-900 mb-1">Get started — 3 steps to your first requirement</h2>
          <p className="text-sm text-blue-700 mb-5">Global Directory is empty. Follow these steps and this banner disappears.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                done: false,
                title: "Add contacts to Global Directory",
                body: "Go to Global Directory → click Import CSV/Excel, choose Employer or Candidate from the dropdown, then upload your file. Or use Add Contact to add one at a time.",
                href: "/contacts",
                cta: "Go to Global Directory →",
              },
              {
                step: "2",
                done: (myContactCount?.count ?? 0) > 0,
                title: "Optionally add private My Contacts",
                body: "My Contacts is your personal employer/hiring-manager CRM. Import a spreadsheet or add contacts one by one. Only you can see these.",
                href: "/employer-contacts",
                cta: "Go to My Contacts →",
              },
              {
                step: "3",
                done: (campaignCount?.count ?? 0) > 0,
                title: "Create and send a requirement",
                body: "Create a requirement, pick Employer Contacts or Candidate Contacts as the target, and hit Send. Contacts you added in step 1 (and 2) will receive it.",
                href: "/campaigns/new",
                cta: "New Requirement →",
              },
            ].map(({ step, done, title, body, href, cta }) => (
              <div key={step} className={`rounded-lg bg-white border p-4 flex flex-col gap-2 ${done ? "border-green-200" : "border-blue-100"}`}>
                <div className="flex items-center gap-2">
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    : <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
                  }
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed flex-1">{body}</p>
                <Link href={href} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mt-1">
                  {cta} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {tier === "free" && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-800">
            You&apos;re on the <strong>Free tier</strong>. Upgrade to Standard ($95/month) to unlock campaigns, hotlists, and unlimited contacts.
          </p>
          <Link href="/settings#upgrade">
            <Button size="sm">Upgrade Now</Button>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      {(() => {
        const totalSent      = Number(myEmailStats?.totalSent ?? 0);
        const totalDelivered = Number(myEmailStats?.totalDelivered ?? 0);
        const totalOpened    = Number(myEmailStats?.totalOpened ?? 0);
        const deliveryRate   = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : null;
        const openRate       = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : null;
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg"><Mail className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <p className="text-2xl font-bold">{campaignCount?.count ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Requirements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg"><List className="w-5 h-5 text-purple-600" /></div>
                    <div>
                      <p className="text-2xl font-bold">{hotlistCount?.count ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Hotlists</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg"><Users className="w-5 h-5 text-green-600" /></div>
                    <div>
                      <p className="text-2xl font-bold">{contactCount?.count ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Global Directory</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-100 rounded-lg"><Building2 className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <p className="text-2xl font-bold">{myContactCount?.count ?? 0}</p>
                      <p className="text-sm text-muted-foreground">My Contacts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Email performance mini-row — only if any emails have been sent */}
            {totalSent > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="border-dashed">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-lg font-bold">{totalSent.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total emails sent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-green-500 shrink-0" />
                      <div>
                        <p className="text-lg font-bold">{deliveryRate ? `${deliveryRate}%` : "—"}</p>
                        <p className="text-xs text-muted-foreground">Delivery rate ({totalDelivered.toLocaleString()} delivered)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <MousePointerClick className="w-4 h-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-lg font-bold">{openRate ? `${openRate}%` : "—"}</p>
                        <p className="text-xs text-muted-foreground">Open rate ({totalOpened.toLocaleString()} opens)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {totalSent === 0 && <div className="mb-8" />}
          </>
        );
      })()}

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requirements</CardTitle>
          <CardDescription>Your latest sent requirements</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No requirements yet.</p>
              <Link href="/campaigns/new" className="text-primary hover:underline text-sm">Create your first requirement →</Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentCampaigns.map((c) => {
                const delivRate = c.totalRecipients > 0 ? ((c.deliveredCount / c.totalRecipients) * 100).toFixed(0) : null;
                const opnRate   = c.deliveredCount > 0 ? ((c.openedCount / c.deliveredCount) * 100).toFixed(0) : null;
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="py-3 flex items-center justify-between hover:bg-muted/30 px-1 rounded-lg transition-colors block">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-xs text-muted-foreground">{c.totalRecipients} sent</span>
                      {c.status === "sent" && delivRate !== null && (
                        <span className="text-xs text-green-600 font-medium">{delivRate}% del.</span>
                      )}
                      {c.status === "sent" && opnRate !== null && (
                        <span className="text-xs text-blue-600 font-medium">{opnRate}% open</span>
                      )}
                      <Badge variant={
                        c.status === "sent" ? "success" :
                        c.status === "sending" ? "secondary" :
                        c.status === "draft" ? "outline" : "warning"
                      }>{c.status}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
