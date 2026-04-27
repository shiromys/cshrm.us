import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, employerLeads, candidateLeads, csvImportBatches, users } from "@/lib/db";
import { eq, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Mail, FileUp, UserCheck } from "lucide-react";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as Record<string, string>).role !== "admin") redirect("/dashboard");

  const [pendingEmployerLeads] = await db.select({ count: count() }).from(employerLeads).where(eq(employerLeads.status, "pending"));
  const [pendingCandidateLeads] = await db.select({ count: count() }).from(candidateLeads).where(eq(candidateLeads.status, "pending"));
  const [pendingCsvBatches] = await db.select({ count: count() }).from(csvImportBatches).where(eq(csvImportBatches.status, "pending_review"));
  const [userCount] = await db.select({ count: count() }).from(users);

  const stats = [
    { label: "Pending Employer Leads", value: pendingEmployerLeads?.count ?? 0, href: "/admin/leads", icon: UserCheck, color: "text-blue-600 bg-blue-100" },
    { label: "Pending Candidate Leads", value: pendingCandidateLeads?.count ?? 0, href: "/admin/leads", icon: Users, color: "text-green-600 bg-green-100" },
    { label: "Pending CSV Batches", value: pendingCsvBatches?.count ?? 0, href: "/admin/csv-batches", icon: FileUp, color: "text-amber-600 bg-amber-100" },
    { label: "Total Users", value: userCount?.count ?? 0, href: "/admin/users", icon: Mail, color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
      <p className="text-muted-foreground mb-8">SHIRO Technologies internal dashboard</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link href={s.href} key={s.label}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${s.color}`}><Icon className="w-5 h-5" /></div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/leads">
          <Card className="hover:shadow-md transition-shadow cursor-pointer p-4 flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-primary" />
            <div><p className="font-medium">Leads Management</p><p className="text-xs text-muted-foreground">Review employer & candidate leads</p></div>
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
  );
}
