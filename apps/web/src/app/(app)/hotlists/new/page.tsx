"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "title", label: "Current Title" },
  { key: "skills", label: "Skills" },
  { key: "location", label: "Location" },
  { key: "work_authorization", label: "Work Authorization" },
  { key: "availability", label: "Availability" },
  { key: "rate_salary", label: "Rate / Salary" },
  { key: "profile_summary", label: "Summary" },
  { key: "contact", label: "Contact Info" },
];

const DEFAULT_COLUMNS = ["name", "title", "skills", "location", "work_authorization"];

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  emailSubject: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewHotlistPage() {
  const router = useRouter();
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const onSubmit = async (data: FormData) => {
    if (selectedColumns.length === 0) {
      toast.error("Select at least one column");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/hotlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          emailSubject: data.emailSubject,
          visibleColumns: selectedColumns,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create hotlist");
      toast.success("Hotlist created!");
      router.push(`/hotlists/${json.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/hotlists">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Hotlists
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">New Hotlist</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a candidate hotlist to send to your employer contacts.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Hotlist Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Java Developers – April 2026"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="emailSubject">Default Email Subject</Label>
              <Input
                id="emailSubject"
                placeholder="e.g. Available Candidates from CloudSourceHRM"
                {...register("emailSubject")}
              />
              <p className="text-xs text-gray-500">
                Used as the subject line when sending this hotlist as an email.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visible Columns</CardTitle>
            <CardDescription>
              Choose which candidate fields appear in the email table.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleColumn(key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedColumns.includes(key)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedColumns.length === 0 && (
              <p className="text-sm text-red-500 mt-2">Select at least one column.</p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              {selectedColumns.length} column{selectedColumns.length !== 1 ? "s" : ""} selected
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/hotlists">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create Hotlist"}
          </Button>
        </div>
      </form>
    </div>
  );
}
