"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, Plus, FileSpreadsheet } from "lucide-react";

interface EmployerContact {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
}

export default function EmployerContactsPage() {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ contacts: EmployerContact[]; total: number }>({
    queryKey: ["employer-contacts", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/v1/employer-contacts?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const contacts = data?.contacts ?? [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/v1/employer-contacts", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success(
        `Imported ${json.inserted} contact${json.inserted === 1 ? "" : "s"} successfully${json.skipped > 0 ? ` (${json.skipped} skipped — missing email or name)` : ""}.`
      );
      qc.invalidateQueries({ queryKey: ["employer-contacts"] });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Private contacts visible only to your account — {data?.total ?? 0} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            {uploading ? "Uploading…" : "Import CSV / Excel"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Contact
          </Button>
        </div>
      </div>

      {showAddForm && (
        <AddContactForm
          onSuccess={() => {
            setShowAddForm(false);
            qc.invalidateQueries({ queryKey: ["employer-contacts"] });
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Note:</strong> Imported files are reviewed by the platform admin before contacts appear here. Manually added contacts are available immediately.
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or company…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No contacts yet. Import a CSV or add contacts manually.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3 text-gray-600">{c.companyName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString()}
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

function AddContactForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    companyName: "",
    phone: "",
    city: "",
    state: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/employer-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Contact added");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add contact");
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form, label: string, required = false, type = "text") => (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="font-medium">Add Contact</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">{field("name", "Full Name", true)}</div>
          <div className="col-span-2">{field("email", "Email", true, "email")}</div>
          {field("companyName", "Company")}
          {field("phone", "Phone")}
          {field("city", "City")}
          {field("state", "State / Province")}
          <div className="col-span-2 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add Contact"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
