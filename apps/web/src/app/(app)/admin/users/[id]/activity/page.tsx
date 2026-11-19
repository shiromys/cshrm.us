"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, User, LogIn, LogOut, Send, List, Settings, CreditCard,
  Upload, UserPlus, Trash2, Shield, Activity, RefreshCw, AlertCircle,
} from "lucide-react";

interface ActivityLog {
  id: string;
  event: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface ActivityResponse {
  logs: ActivityLog[];
}

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  tier: string;
  role: string;
}

const EVENT_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  login:              { icon: <LogIn  className="w-4 h-4" />, label: "Login",           color: "bg-green-100 text-green-700 border-green-200" },
  logout:             { icon: <LogOut className="w-4 h-4" />, label: "Logout",          color: "bg-slate-100 text-slate-600 border-slate-200" },
  register:           { icon: <UserPlus className="w-4 h-4" />, label: "Registered",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  password_changed:   { icon: <Shield className="w-4 h-4" />, label: "Password",        color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  email_verified:     { icon: <User   className="w-4 h-4" />, label: "Email Verified",  color: "bg-teal-100 text-teal-700 border-teal-200" },
  requirement_sent:   { icon: <Send   className="w-4 h-4" />, label: "Requirement Sent",color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  hotlist_created:    { icon: <List   className="w-4 h-4" />, label: "Hotlist Created", color: "bg-violet-100 text-violet-700 border-violet-200" },
  hotlist_sent:       { icon: <Send   className="w-4 h-4" />, label: "Hotlist Sent",    color: "bg-purple-100 text-purple-700 border-purple-200" },
  hotlist_deleted:    { icon: <Trash2 className="w-4 h-4" />, label: "Hotlist Deleted", color: "bg-red-100 text-red-600 border-red-200" },
  csv_uploaded:       { icon: <Upload className="w-4 h-4" />, label: "CSV Uploaded",    color: "bg-orange-100 text-orange-700 border-orange-200" },
  contact_added:      { icon: <UserPlus className="w-4 h-4" />, label: "Contact Added", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  contact_deleted:    { icon: <Trash2 className="w-4 h-4" />, label: "Contact Deleted", color: "bg-red-100 text-red-600 border-red-200" },
  settings_updated:   { icon: <Settings className="w-4 h-4" />, label: "Settings",      color: "bg-slate-100 text-slate-600 border-slate-200" },
  tier_upgraded:      { icon: <CreditCard className="w-4 h-4" />, label: "Upgraded",    color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  mode_changed:       { icon: <RefreshCw className="w-4 h-4" />, label: "Mode Changed", color: "bg-sky-100 text-sky-700 border-sky-200" },
  admin_tier_override:  { icon: <Shield className="w-4 h-4" />, label: "Admin Override",color: "bg-amber-100 text-amber-700 border-amber-200" },
  admin_status_change:  { icon: <Shield className="w-4 h-4" />, label: "Status Change", color: "bg-amber-100 text-amber-700 border-amber-200" },
  admin_role_change:    { icon: <Shield className="w-4 h-4" />, label: "Role Change",   color: "bg-amber-100 text-amber-700 border-amber-200" },
};

function formatTs(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatUA(ua: string | null) {
  if (!ua) return null;
  // Condense common UA strings to something readable
  if (ua.includes("Chrome"))  return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari"))  return "Safari";
  if (ua.includes("Edge"))    return "Edge";
  return ua.slice(0, 40);
}

export default function UserActivityPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const userId  = params.id;

  const { data: userData } = useQuery<UserInfo>({
    queryKey: ["admin-user", userId],
    queryFn:  async () => {
      const r = await fetch(`/api/v1/admin/users/${userId}`);
      if (!r.ok) throw new Error("Failed to load user");
      return r.json();
    },
  });

  const { data, isLoading, isError, refetch } = useQuery<ActivityResponse>({
    queryKey: ["user-activity", userId],
    queryFn:  async () => {
      const r = await fetch(`/api/v1/admin/users/${userId}/activity?limit=200`);
      if (!r.ok) throw new Error("Failed to load activity");
      return r.json();
    },
  });

  const logs = data?.logs ?? [];

  // Group by date
  const grouped = logs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
    const date = new Date(log.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Digital Footprint
          </h1>
          {userData && (
            <p className="text-sm text-gray-500 mt-1">
              {userData.name ?? "Unknown"} · {userData.email} ·{" "}
              <span className={`font-medium ${userData.tier === "standard" ? "text-emerald-600" : "text-gray-500"}`}>
                {userData.tier}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: logs.length },
          { label: "Emails Sent", value: logs.filter(l => l.event === "requirement_sent" || l.event === "hotlist_sent").length },
          { label: "Logins", value: logs.filter(l => l.event === "login").length },
          { label: "First Seen", value: logs.length ? new Date(logs[logs.length - 1].createdAt).toLocaleDateString() : "—" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading activity…</div>
      )}

      {isError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          Failed to load activity logs.
        </div>
      )}

      {!isLoading && !isError && logs.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          No activity recorded yet.
        </div>
      )}

      {Object.entries(grouped).map(([date, dayLogs]) => (
        <div key={date} className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">{date}</h2>

          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {dayLogs.map((log) => {
              const meta = EVENT_META[log.event] ?? {
                icon: <Activity className="w-4 h-4" />,
                label: log.event,
                color: "bg-gray-100 text-gray-600 border-gray-200",
              };

              return (
                <div key={log.id} className="flex items-start gap-4 px-4 py-3">
                  {/* Event badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium flex-shrink-0 mt-0.5 ${meta.color}`}>
                    {meta.icon}
                    {meta.label}
                  </div>

                  {/* Summary */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">
                      {log.summary ?? log.event}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                      <span>{formatTs(log.createdAt)}</span>
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      {log.userAgent && <span>{formatUA(log.userAgent)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
