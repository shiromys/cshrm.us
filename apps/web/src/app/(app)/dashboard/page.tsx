import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, campaigns, emailLogs, hotlists, contacts, employerContacts } from "@/lib/db";
import { eq, and, isNull, count, gte } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Mail, List, Users, Building2, TrendingUp, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const userId = session.user.id;
  const tier = (session.user as Record<string, string>).tier ?? "free";

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
