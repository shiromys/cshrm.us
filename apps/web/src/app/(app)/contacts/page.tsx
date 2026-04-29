"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Search, Download, Plus, FileSpreadsheet, Building2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

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

const EMPTY_FORM = { name: "", email: "", contactType: "employer" as "employer" | "candidate", companyName: "", title: "", phone: "", city: "", state: "" };

export default function ContactsPage() {
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [importType, setImportType] = useState<"employer" | "candidate">("employer");
  const [uploading, setUploading]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = (session?.user as unknown as Record<string, string>)?.role === "admin";

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("contactType", importType);
    try {
      const res = await fetch("/api/v1/contacts", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success(`Imported ${json.inserted} ${importType} contact${json.inserted === 1 ? "" : "s"}${json.skipped > 0 ? ` (${json.skipped} skipped)` : ""}.`);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Contact added to platform");
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (c: Contact) => {
    if (c.bouncedAt) return <Badge variant="destructive">Bounced</Badge>;
    if (c.unsubscribed) return <Badge variant="warning">Unsubscribed</Badge>;
    if (c.status === "inactive") return <Badge variant="secondary">Inactive</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Platform Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} contacts in the shared database — visible to all users for campaigns
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/v1/admin/contacts/export" download>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </a>
          </Button>
          {isAdmin && (
            <>
              {/* Import type selector + button */}
              <div className="flex items-center gap-1 border rounded-md overflow-hidden">
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as "employer" | "candidate")}
                  className="text-sm px-2 py-1.5 bg-white border-r text-gray-700 focus:outline-none"
                >
                  <option value="employer">Employer</option>
                  <option value="candidate">Candidate</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-none h-full"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  {uploading ? "Importing…" : "Import CSV / Excel"}
                </Button>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Contact
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Manual add form */}
      {isAdmin && showAddForm && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-medium">Add Contact to Platform</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddContact} className="grid grid-cols-2 gap-4">
              {/* Contact type selector */}
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Contact Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: "employer",  label: "Employer / Hiring Manager", icon: Building2 },
                    { value: "candidate", label: "Candidate / Job Seeker",    icon: Users },
                  ] as const).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, contactType: value }))}
                      className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors text-left
                        ${form.contactType === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
                <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
                <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Company</label>
                <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Title / Role</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">State / Province</label>
                <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add Contact"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* How to populate — shown only when empty */}
      {!isLoading && contacts.length === 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Platform Contacts is empty</p>
          <p>As admin, you can populate it two ways:</p>
          <ul className="list-disc ml-4 mt-1 space-y-0.5">
            <li><strong>Import CSV / Excel</strong> — select Employer or Candidate from the dropdown, then upload your file.</li>
            <li><strong>Add Contact</strong> — manually add one contact at a time with a type selector.</li>
          </ul>
          <p className="mt-2 text-blue-600">Once contacts are here, campaigns targeting "Employer Contacts" or "Candidate Contacts" will reach them.</p>
        </div>
      )}

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
            <div className="p-8 text-center text-gray-500">No contacts match your search.</div>
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
                        <Link href={`/contacts/${c.id}`} className="hover:text-blue-600">{c.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{c.contactType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.companyName ?? "—"}</td>
                      <td className="px-4 py-3">{statusBadge(c)}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
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
