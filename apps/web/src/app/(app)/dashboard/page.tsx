import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, campaigns, emailLogs, hotlists, contacts, employerContacts } from "@/lib/db";
import { eq, and, isNull, count, gte } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Mail, List, Users, Building2, TrendingUp, PlusCircle, ArrowRight, CheckCircle2 } from "lucide-react";
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {session.user.name}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/campaigns/new">
            <Button size="sm"><PlusCircle className="w-4 h-4 mr-2" />New Campaign</Button>
          </Link>
          <Link href="/hotlists/new">
            <Button size="sm" variant="outline"><PlusCircle className="w-4 h-4 mr-2" />New Hotlist</Button>
          </Link>
        </div>
      </div>

      {/* ── Setup guide — shown until Platform Contacts has data ── */}
      {(contactCount?.count ?? 0) === 0 && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-6">
          <h2 className="text-base font-bold text-blue-900 mb-1">Get started — 3 steps to your first campaign</h2>
          <p className="text-sm text-blue-700 mb-5">Platform Contacts is empty. Follow these steps and this banner disappears.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                done: false,
                title: "Add contacts to Platform Contacts",
                body: "Go to Platform Contacts → click Import CSV/Excel, choose Employer or Candidate from the dropdown, then upload your file. Or use Add Contact to add one at a time.",
                href: "/contacts",
                cta: "Go to Platform Contacts →",
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
                title: "Create and send a campaign",
                body: "Create a campaign, pick Employer Contacts or Candidate Contacts as the target, and hit Send. Contacts you added in step 1 (and 2) will receive it.",
                href: "/campaigns/new",
                cta: "New Campaign →",
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg"><Mail className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{campaignCount?.count ?? 0}</p>
                <p className="text-sm text-muted-foreground">Campaigns</p>
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
                <p className="text-sm text-muted-foreground">Platform Contacts</p>
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

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>Your latest email campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No campaigns yet.</p>
              <Link href="/campaigns/new" className="text-primary hover:underline text-sm">Create your first campaign →</Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentCampaigns.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{c.totalRecipients} recipients</span>
                    <Badge variant={
                      c.status === "sent" ? "success" :
                      c.status === "sending" ? "secondary" :
                      c.status === "draft" ? "outline" : "warning"
                    }>{c.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
