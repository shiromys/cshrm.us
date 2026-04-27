"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Send, Pause, Mail, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  targetType: string;
  status: string;
  totalRecipients: number;
  deliveredCount: number;
  openedCount: number;
  bouncedCount: number;
  includeEmployerContacts: boolean;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface EmailLog {
  id: string;
  recipientEmail: string;
  status: string;
  provider: string | null;
  sentAt: string | null;
  openedAt: string | null;
  bouncedAt: string | null;
}

const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  draft: "secondary",
  scheduled: "warning",
  sending: "warning",
  sent: "success",
  paused: "outline",
  archived: "secondary",
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/campaigns/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: logsData } = useQuery<{ logs: EmailLog[]; total: number }>({
    queryKey: ["campaign-logs", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/campaigns/${id}/logs`);
      if (!res.ok) throw new Error("Failed to load logs");
      return res.json();
    },
    enabled: !!campaign && campaign.status !== "draft",
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/campaigns/${id}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      return json;
    },
    onSuccess: (data) => {
      toast.success(`Campaign sending to ${data.recipients} recipients.`);
      qc.invalidateQueries({ queryKey: ["campaign", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/campaigns/${id}/pause`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to pause");
    },
    onSuccess: () => {
      toast.success("Campaign paused");
      qc.invalidateQueries({ queryKey: ["campaign", id] });
    },
    onError: () => toast.error("Failed to pause campaign"),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return <div className="p-6 text-gray-500">Campaign not found.</div>;
  }

  const logs = logsData?.logs ?? [];

  const logStatusIcon = (status: string) => {
    if (status === "delivered") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "opened") return <Mail className="h-4 w-4 text-blue-500" />;
    if (status === "bounced") return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === "complained") return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    return <div className="h-4 w-4 rounded-full bg-gray-200" />;
  };

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/campaigns">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Campaigns
        </Link>
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={STATUS_COLORS[campaign.status] ?? "secondary"}>
              {campaign.status}
            </Badge>
            <Badge variant="outline" className="capitalize">{campaign.targetType}</Badge>
            {campaign.includeEmployerContacts && (
              <Badge variant="outline">+ My Contacts</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
              <Send className="h-4 w-4 mr-1" />
              {sendMutation.isPending ? "Sending…" : "Send Campaign"}
            </Button>
          )}
          {campaign.status === "sending" && (
            <Button variant="outline" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Recipients", value: campaign.totalRecipients, color: "text-gray-900" },
          { label: "Delivered", value: campaign.deliveredCount, color: "text-green-600" },
          { label: "Opened", value: campaign.openedCount, color: "text-blue-600" },
          { label: "Bounced", value: campaign.bouncedCount, color: "text-red-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              {campaign.totalRecipients > 0 && stat.label !== "Recipients" && (
                <p className="text-xs text-gray-400 mt-1">
                  {((stat.value / campaign.totalRecipients) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Email Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-gray-500">Subject: </span><span className="font-medium">{campaign.subject}</span></div>
          <div><span className="text-gray-500">Created: </span><span>{new Date(campaign.createdAt).toLocaleString()}</span></div>
          {campaign.sentAt && (
            <div><span className="text-gray-500">Sent: </span><span>{new Date(campaign.sentAt).toLocaleString()}</span></div>
          )}
          {campaign.scheduledAt && (
            <div><span className="text-gray-500">Scheduled: </span><span>{new Date(campaign.scheduledAt).toLocaleString()}</span></div>
          )}
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Email Log ({logsData?.total ?? 0} recipients)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Recipient</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Sent</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Opened</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{log.recipientEmail}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          {logStatusIcon(log.status)}
                          <span className="capitalize text-sm">{log.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-sm capitalize">{log.provider ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {log.openedAt ? new Date(log.openedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
