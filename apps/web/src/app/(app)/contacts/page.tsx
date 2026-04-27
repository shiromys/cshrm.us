"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Search, Download } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  contactType: string;
  status: string;
  companyName: string | null;
  title: string | null;
  unsubscribed: boolean;
  bouncedAt: string | null;
  createdAt: string;
}

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{ contacts: Contact[]; total: number }>({
    queryKey: ["contacts", search, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/v1/contacts?${params}`);
      if (!res.ok) throw new Error("Failed to load contacts");
      return res.json();
    },
  });

  const contacts = data?.contacts ?? [];

  const statusBadge = (c: Contact) => {
    if (c.bouncedAt) return <Badge variant="destructive">Bounced</Badge>;
    if (c.unsubscribed) return <Badge variant="warning">Unsubscribed</Badge>;
    if (c.status === "inactive") return <Badge variant="secondary">Inactive</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Platform Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} contacts in the shared database
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/v1/admin/contacts/export" download>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or company…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border rounded-md px-3 text-sm text-gray-700"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="employer">Employer</option>
              <option value="candidate">Candidate</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading contacts…</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No contacts found. They appear here once leads are approved and migrated.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Added</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/contacts/${c.id}`} className="hover:text-blue-600">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{c.contactType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.companyName ?? "—"}</td>
                      <td className="px-4 py-3">{statusBadge(c)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/contacts/${c.id}`}>View</Link>
                        </Button>
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
