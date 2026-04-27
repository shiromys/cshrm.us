"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Send, Eye, BarChart2 } from "lucide-react";
import { toast } from "sonner";

function statusVariant(status: string) {
  return status === "sent" ? "success" : status === "sending" ? "secondary" : status === "draft" ? "outline" : "warning";
}

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/v1/campaigns");
      if (!res.ok) throw new Error("Failed to load campaigns");
      return res.json();
    },
  });

  async function sendCampaign(id: string) {
    const res = await fetch(`/api/v1/campaigns/${id}/send`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to send campaign");
      return;
    }
    toast.success(`Campaign launched — ${data.recipients} recipients queued`);
    refetch();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link href="/campaigns/new">
          <Button><PlusCircle className="w-4 h-4 mr-2" />New Campaign</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No campaigns yet. Create your first one.</p>
            <Link href="/campaigns/new"><Button>Create Campaign</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c: Record<string, unknown>) => (
            <Card key={c.id as string}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{c.name as string}</h3>
                      <Badge variant={statusVariant(c.status as string)}>{c.status as string}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.subject as string}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Target: {c.targetType as string}</span>
                      <span>{c.totalRecipients as number} recipients</span>
                      {(c.deliveredCount as number) > 0 && <span>{c.deliveredCount as number} delivered</span>}
                      {(c.bouncedCount as number) > 0 && <span className="text-red-500">{c.bouncedCount as number} bounced</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {c.status === "draft" && (
                      <Button size="sm" onClick={() => sendCampaign(c.id as string)}>
                        <Send className="w-3 h-3 mr-1" />Send
                      </Button>
                    )}
                    <Link href={`/campaigns/${c.id}`}>
                      <Button size="sm" variant="outline"><Eye className="w-3 h-3 mr-1" />View</Button>
                    </Link>
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
