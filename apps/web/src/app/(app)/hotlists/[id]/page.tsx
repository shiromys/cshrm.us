"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hotlistEntrySchema, type HotlistEntryInput } from "@/lib/schemas";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, ClipboardPaste, Eye, Send } from "lucide-react";

type TabType = "form" | "excel" | "paste" | "preview";

export default function HotlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("form");
  const [pasteText, setPasteText] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: hotlist, isLoading } = useQuery({
    queryKey: ["hotlists", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/hotlists/${id}`);
      return res.json();
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["hotlist-entries", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/hotlists/${id}/entries`);
      return res.json();
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<HotlistEntryInput>({
    resolver: zodResolver(hotlistEntrySchema),
  });

  async function addEntry(data: HotlistEntryInput) {
    const res = await fetch(`/api/v1/hotlists/${id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Failed to add entry"); return; }
    toast.success("Entry added");
    reset();
    qc.invalidateQueries({ queryKey: ["hotlist-entries", id] });
  }

  async function uploadExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/v1/hotlists/${id}/entries/excel`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { toast.error("Upload failed"); return; }
    toast.success(`Imported ${data.imported} of ${data.total} rows`);
    qc.invalidateQueries({ queryKey: ["hotlist-entries", id] });
  }

  async function parsePaste() {
    const res = await fetch(`/api/v1/hotlists/${id}/entries/paste`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pasteText, delimiter: "tab", columns: ["name", "title", "skills", "city", "state"] }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error("Parse failed"); return; }
    toast.success(`Parsed ${data.parsed} of ${data.lines} rows`);
    setPasteText("");
    qc.invalidateQueries({ queryKey: ["hotlist-entries", id] });
  }

  async function loadPreview() {
    const res = await fetch(`/api/v1/hotlists/${id}/preview`);
    const html = await res.text();
    setPreviewHtml(html);
    setActiveTab("preview");
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{hotlist?.name ?? "Hotlist"}</h1>
          <p className="text-muted-foreground">{entries.length} candidates &bull; {hotlist?.visibleColumns?.join(", ")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPreview}><Eye className="w-4 h-4 mr-2" />Preview Table</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        {(["form", "excel", "paste", "preview"] as TabType[]).map((tab) => (
          <button key={tab} onClick={() => tab === "preview" ? loadPreview() : setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === tab ? "bg-white shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === "form" ? "Manual Entry" : tab === "excel" ? "Excel Upload" : tab === "paste" ? "Copy-Paste" : "Preview"}
          </button>
        ))}
      </div>

      {activeTab === "form" && (
        <Card>
          <CardHeader><CardTitle>Add Candidate</CardTitle><CardDescription>Enter candidate details manually</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(addEntry)} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input {...register("rawName")} placeholder="Alex Booth / Alex / A.B." />
                {errors.rawName && <p className="text-xs text-destructive">{errors.rawName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input {...register("title")} placeholder="Senior Java Developer" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input {...register("city")} placeholder="Dallas" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input {...register("state")} placeholder="TX" />
              </div>
              <div className="space-y-2">
                <Label>Work Authorization</Label>
                <Input {...register("workAuthorization")} placeholder="H1B, OPT, US Citizen..." />
              </div>
              <div className="space-y-2">
                <Label>Availability</Label>
                <Input {...register("availability")} placeholder="Immediate / 2 weeks" />
              </div>
              <div className="space-y-2">
                <Label>Rate / Salary</Label>
                <Input {...register("rateSalary")} placeholder="$85/hr or $120k" />
              </div>
              <div className="space-y-2">
                <Label>Contact Email (optional)</Label>
                <Input {...register("contactEmail")} type="email" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Profile Summary (max 300 chars)</Label>
                <Textarea {...register("profileSummary")} maxLength={300} rows={2} />
              </div>
              <div className="col-span-2">
                <Button type="submit" disabled={isSubmitting}><Plus className="w-4 h-4 mr-2" />Add Entry</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "excel" && (
        <Card>
          <CardHeader><CardTitle>Upload Excel File</CardTitle><CardDescription>Upload .xlsx or .xls file. Columns: name, title, skills, city, state, work_auth, availability, rate, email, phone</CardDescription></CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Click to upload or drag & drop</p>
              <p className="text-sm text-muted-foreground mt-1">.xlsx, .xls files up to 5MB</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={uploadExcel} />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "paste" && (
        <Card>
          <CardHeader><CardTitle>Copy-Paste</CardTitle><CardDescription>Paste tab-separated data. Expected columns: Name, Title, Skills, City, State</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={8} placeholder={"Alex Booth\tSenior Java Dev\tJava, Spring Boot\tDallas\tTX\nJane Smith\tReact Developer\tReact, TypeScript\tAustin\tTX"} className="font-mono text-sm" />
            <Button onClick={parsePaste} disabled={!pasteText.trim()}><ClipboardPaste className="w-4 h-4 mr-2" />Parse & Add</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "preview" && (
        <Card>
          <CardHeader><CardTitle>Email Preview</CardTitle><CardDescription>This is how your hotlist will look in the email</CardDescription></CardHeader>
          <CardContent>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} className="overflow-auto" />
          </CardContent>
        </Card>
      )}

      {/* Entries List */}
      {entries.length > 0 && activeTab !== "preview" && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Candidates ({entries.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {entries.map((e: Record<string, unknown>) => (
                <div key={e.id as string} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{e.displayName as string}</p>
                    <p className="text-xs text-muted-foreground">{e.title as string} {e.city ? `· ${e.city}, ${e.state}` : ""}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {(e.workAuthorization as string) && <Badge variant="outline" className="text-xs">{e.workAuthorization as string}</Badge>}
                    <Badge variant="secondary" className="text-xs">{e.source as string}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
