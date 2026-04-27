"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

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

const TIER_VARIANT: Record<string, "default" | "success" | "warning" | "secondary" | "outline"> = {
  free: "secondary",
  standard: "success",
  admin: "warning",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

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

  const users = data?.users ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data?.total ?? 0} registered accounts
        </p>
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
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
                        <Badge variant={TIER_VARIANT[user.tier] ?? "secondary"}>
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
                            user.status === "active"
                              ? "success"
                              : user.status === "suspended"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.chrmnexusSubscribed ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
