"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

type LeadType = "employers" | "candidates";

export default function AdminLeadsPage() {
  const [tab, setTab] = useState<LeadType>("employers");
  const qc = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-leads", tab],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/leads/${tab}?status=pending`);
      return res.json();
    },
  });

  async function approve(id: string) {
    const res = await fetch(`/api/v1/admin/leads/${tab}/${id}/approve`, { method: "POST" });
    if (res.ok) { toast.success("Lead approved"); qc.invalidateQueries({ queryKey: ["admin-leads"] }); }
    else toast.error("Approval failed");
  }

  async function reject(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    const res = await fetch(`/api/v1/admin/leads/${tab}/${id}/reject`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
    });
    if (res.ok) { toast.success("Lead rejected"); qc.invalidateQueries({ queryKey: ["admin-leads"] }); }
    else toast.error("Rejection failed");
  }

  async function migrate(id: string) {
    const res = await fetch(`/api/v1/admin/leads/${tab}/${id}/migrate`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { toast.success(`Migrated to contacts (ID: ${data.contactId})`); qc.invalidateQueries({ queryKey: ["admin-leads"] }); }
    else toast.error(data.error ?? "Migration failed");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Leads Management</h1>

      <div className="flex gap-2 mb-6">
        {(["employers", "candidates"] as LeadType[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t === "employers" ? "Employer Leads" : "Candidate Leads"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center py-12 text-muted-foreground">Loading...</p>
      ) : leads.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No pending {tab} leads</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {leads.map((lead: Record<string, unknown>) => (
            <Card key={lead.id as string}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold">{lead.name as string}</p>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{lead.email as string}</p>
                    {(lead.companyName as string) && <p className="text-sm text-muted-foreground">{lead.companyName as string}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {lead.city ? `${lead.city}, ${lead.state}` : ""} · {new Date(lead.submittedAt as string).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => approve(lead.id as string)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => reject(lead.id as string)}>
                      <XCircle className="w-3 h-3 mr-1" />Reject
                    </Button>
                    {lead.status === "approved" && (
                      <Button size="sm" onClick={() => migrate(lead.id as string)}>
                        <ArrowRight className="w-3 h-3 mr-1" />Migrate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
