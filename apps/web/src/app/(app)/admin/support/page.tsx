"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, RefreshCw, MessageSquare, ChevronRight,
  Clock, CheckCircle2, AlertCircle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────
interface Ticket {
  id: string;
  source: string;
  status: string;
  priority: string;
  submitterName: string;
  submitterEmail: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  replies: { id: string; isStaff: boolean }[];
  assignedUser: { id: string; name: string } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  open:        { label: "Open",        color: "bg-blue-100 text-blue-700",   icon: AlertCircle   },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700", icon: Clock       },
  resolved:    { label: "Resolved",    color: "bg-green-100 text-green-700", icon: CheckCircle2  },
  closed:      { label: "Closed",      color: "bg-gray-100 text-gray-600",   icon: XCircle       },
};

const PRIORITY_COLOR: Record<string, string> = {
  low:    "bg-gray-100 text-gray-500",
  normal: "bg-blue-50 text-blue-600",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminSupportPage() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ["admin-tickets", search, statusFilter],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (search)       p.set("search", search);
      if (statusFilter) p.set("status", statusFilter);
      const res = await fetch(`/api/v1/support/tickets?${p}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 15_000,
  });

  const tickets = data?.tickets ?? [];
  const openCount       = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground text-sm">
            {openCount > 0 && <span className="text-blue-600 font-medium">{openCount} open</span>}
            {openCount > 0 && inProgressCount > 0 && " · "}
            {inProgressCount > 0 && <span className="text-yellow-600 font-medium">{inProgressCount} in progress</span>}
            {openCount === 0 && inProgressCount === 0 && "All caught up!"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, subject…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "open", "in_progress", "resolved", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                statusFilter === s
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {s === "" ? "All" : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="px-6 py-10 text-center text-muted-foreground">Loading tickets…</div>
          )}
          {!isLoading && tickets.length === 0 && (
            <div className="px-6 py-10 text-center text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No tickets found.</p>
            </div>
          )}
          <div className="divide-y">
            {tickets.map((ticket) => {
              const sc = STATUS_CONFIG[ticket.status];
              const StatusIcon = sc?.icon ?? AlertCircle;
              const hasUnreplied = ticket.replies.length === 0 || !ticket.replies.some((r) => r.isStaff);
              return (
                <Link
                  key={ticket.id}
                  href={`/admin/support/${ticket.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group"
                >
                  <div className={cn("p-2 rounded-lg mt-0.5 shrink-0", sc?.color ?? "")}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{ticket.subject}</p>
                      {hasUnreplied && ticket.status === "open" && (
                        <span className="shrink-0 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                          Needs reply
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ticket.submitterName} · {ticket.submitterEmail}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 opacity-70">{ticket.body}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-1.5">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", PRIORITY_COLOR[ticket.priority] ?? "")}>
                      {ticket.priority}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                      <MessageSquare className="w-3 h-3" />
                      {ticket.replies.length}
                    </div>
                    <p className="text-xs text-muted-foreground">{relTime(ticket.updatedAt)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
