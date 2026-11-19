"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Send, CheckCircle2, Clock, AlertCircle, XCircle,
  User, Shield, Mail, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────
interface Reply {
  id: string;
  authorId: string | null;
  authorName: string;
  isStaff: boolean;
  body: string;
  emailedAt: string | null;
  createdAt: string;
}
interface Ticket {
  id: string;
  source: string;
  status: string;
  priority: string;
  submitterName: string;
  submitterEmail: string;
  subject: string;
  body: string;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"] as const;
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"] as const;

const STATUS_COLOR: Record<string, string> = {
  open:        "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved:    "bg-green-100 text-green-700",
  closed:      "bg-gray-100 text-gray-600",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const [replyText, setReplyText]     = useState("");
  const [markAs, setMarkAs]           = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [noteEditing, setNoteEditing] = useState(false);

  const { data: ticket, isLoading, refetch } = useQuery<Ticket>({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/support/tickets/${id}`);
      if (!res.ok) throw new Error("Failed to load ticket");
      return res.json();
    },
    onSuccess: (t: Ticket) => {
      setInternalNote(t.internalNote ?? "");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/support/tickets/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText, markAs: markAs || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send reply");
      return json;
    },
    onSuccess: (data) => {
      toast.success(data.emailed ? "Reply sent and emailed to user" : "Reply saved (email failed — check logs)");
      setReplyText("");
      setMarkAs("");
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: async (update: Record<string, string>) => {
      const res = await fetch(`/api/v1/support/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ticket updated");
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return (
    <div className="p-8 text-muted-foreground">Loading ticket…</div>
  );
  if (!ticket) return (
    <div className="p-8 text-destructive">Ticket not found.</div>
  );

  return (
    <div className="p-8 max-w-4xl space-y-6">
      {/* Back */}
      <Link href="/admin/support" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to tickets
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            #{ticket.id.slice(0, 8).toUpperCase()} · from {ticket.submitterName} ({ticket.submitterEmail}) · {fmtDate(ticket.createdAt)}
          </p>
        </div>
        <span className={cn("text-xs font-medium px-3 py-1 rounded-full", STATUS_COLOR[ticket.status] ?? "")}>
          {ticket.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Thread ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Original message */}
          <MessageBubble
            name={ticket.submitterName}
            email={ticket.submitterEmail}
            isStaff={false}
            body={ticket.body}
            date={ticket.createdAt}
            source={ticket.source}
          />

          {/* Replies */}
          {ticket.replies.map((r) => (
            <MessageBubble
              key={r.id}
              name={r.authorName}
              isStaff={r.isStaff}
              body={r.body}
              date={r.createdAt}
              emailed={!!r.emailedAt}
            />
          ))}

          {/* Reply box */}
          {ticket.status !== "closed" && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Reply to {ticket.submitterName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="w-full border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[120px]"
                  placeholder="Write your reply… It will be emailed to the user automatically."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">After reply, mark as:</Label>
                    <select
                      value={markAs}
                      onChange={(e) => setMarkAs(e.target.value)}
                      className="text-xs border border-border rounded px-2 py-1 bg-background"
                    >
                      <option value="">keep current</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => replyMutation.mutate()}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {replyMutation.isPending ? "Sending…" : "Send Reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Status & priority */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select
                  value={ticket.status}
                  onChange={(e) => patchMutation.mutate({ status: e.target.value })}
                  disabled={patchMutation.isPending}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <select
                  value={ticket.priority}
                  onChange={(e) => patchMutation.mutate({ priority: e.target.value })}
                  disabled={patchMutation.isPending}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border">
                <div className="flex justify-between">
                  <span>Source</span>
                  <span className="font-medium capitalize">{ticket.source.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Replies</span>
                  <span className="font-medium">{ticket.replies.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last update</span>
                  <span className="font-medium">{fmtDate(ticket.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal note */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label className="text-xs">Internal Note (not visible to user)</Label>
              {noteEditing ? (
                <>
                  <textarea
                    className="w-full border border-border rounded-lg p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => { setInternalNote(ticket.internalNote ?? ""); setNoteEditing(false); }}
                    >Cancel</Button>
                    <Button
                      size="sm" className="text-xs h-7"
                      onClick={() => { patchMutation.mutate({ internalNote }); setNoteEditing(false); }}
                      disabled={patchMutation.isPending}
                    >Save</Button>
                  </div>
                </>
              ) : (
                <div
                  className="text-xs text-muted-foreground cursor-pointer hover:text-foreground p-2 rounded border border-dashed border-border hover:border-primary/40 min-h-[40px]"
                  onClick={() => setNoteEditing(true)}
                >
                  {internalNote || <span className="italic opacity-50">Click to add an internal note…</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
function MessageBubble({
  name, email, isStaff, body, date, emailed, source,
}: {
  name: string;
  email?: string;
  isStaff: boolean;
  body: string;
  date: string;
  emailed?: boolean;
  source?: string;
}) {
  return (
    <div className={cn("flex gap-3", isStaff ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
        isStaff ? "bg-primary/10" : "bg-muted",
      )}>
        {isStaff ? <Shield className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className={cn("max-w-[85%] space-y-1", isStaff ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold">{name}</span>
          {isStaff && <span className="text-xs text-primary font-medium">Support Staff</span>}
          {email && <span className="text-xs text-muted-foreground">{email}</span>}
          {source && <span className="text-xs text-muted-foreground capitalize">via {source.replace("_", " ")}</span>}
        </div>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
          isStaff
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm",
        )}>
          {body}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          {isStaff && emailed && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Emailed
            </span>
          )}
          {isStaff && emailed === false && (
            <span className="text-xs text-orange-500">Email failed</span>
          )}
        </div>
      </div>
    </div>
  );
}
