"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  status: string;
  company: string | null;
  chrmnexusSubscribed: boolean;
  createdAt: string;
  emailVerified: boolean;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { data, isLoading } = useQuery<{ users: User[]; total: number }>({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/v1/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
      const res = await fetch("/api/v1/admin/users/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: (_, { role }) => {
      toast.success(role === "admin" ? "User promoted to admin." : "Admin role removed.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "active" | "suspended" }) => {
      const res = await fetch("/api/v1/admin/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: (_, { status }) => {
      toast.success(status === "suspended" ? "User suspended." : "User reactivated.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const users = data?.users ?? [];
  const isBusy = promoteMutation.isPending || statusMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">{data?.total ?? 0} registered accounts</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, or company…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">CHRMNEXUS</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                          {!user.emailVerified && (
                            <span className="text-xs text-orange-500">Unverified</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.company ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={user.tier === "standard" ? "success" : "secondary"}>
                            {user.tier}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === "admin" ? "warning" : "outline"}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              user.status === "active" ? "success"
                              : user.status === "suspended" ? "destructive"
                              : "secondary"
                            }
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {user.chrmnexusSubscribed
                            ? <Badge variant="success">Active</Badge>
                            : <span className="text-gray-400 text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Promote / Demote */}
                            {user.role !== "admin" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                                disabled={isBusy}
                                title="Promote this user to admin — they will gain access to the Admin Panel and Platform Contacts management"
                                onClick={() => promoteMutation.mutate({ userId: user.id, role: "admin" })}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                Make Admin
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 text-gray-600 border-gray-200 hover:bg-gray-50"
                                disabled={isBusy || isSelf}
                                title={isSelf ? "You cannot remove your own admin role" : "Remove admin privileges — user will be downgraded to a regular account"}
                                onClick={() => promoteMutation.mutate({ userId: user.id, role: "user" })}
                              >
                                <ShieldOff className="w-3 h-3" />
                                Remove Admin
                              </Button>
                            )}

                            {/* Suspend / Activate — never on yourself */}
                            {!isSelf && (
                              user.status === "active" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={isBusy}
                                  title="Suspend this account — the user will be unable to log in until reactivated"
                                  onClick={() => statusMutation.mutate({ userId: user.id, status: "suspended" })}
                                >
                                  <UserX className="w-3 h-3" />
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                  disabled={isBusy}
                                  title="Reactivate this account — the user will be able to log in again"
                                  onClick={() => statusMutation.mutate({ userId: user.id, status: "active" })}
                                >
                                  <UserCheck className="w-3 h-3" />
                                  Activate
                                </Button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
