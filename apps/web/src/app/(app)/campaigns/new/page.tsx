"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { campaignSchema, type CampaignInput } from "@/lib/schemas";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Building2, List, Info, Plus, X } from "lucide-react";

interface Hotlist { id: string; name: string; }
interface PreviewCount { platform: number; myContacts: number; total: number; }

export default function NewCampaignPage() {
  const router = useRouter();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { targetType: "employer", includeEmployerContacts: true },
  });

  const targetType = watch("targetType");
  const hotlistId  = watch("hotlistId");
  const includeEC  = watch("includeEmployerContacts");

  const [hotlists, setHotlists]         = useState<Hotlist[]>([]);
  const [preview, setPreview]           = useState<PreviewCount | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addingContact, setAddingContact]   = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", companyName: "" });

  // Load hotlists once
  useEffect(() => {
    fetch("/api/v1/hotlists")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Hotlist[]) => setHotlists(data))
      .catch(() => {});
  }, []);

  // Refresh recipient preview whenever targeting options change
  useEffect(() => {
    const params = new URLSearchParams({ targetType, includeEC: String(includeEC ?? true) });
    if (hotlistId) params.set("hotlistId", hotlistId);
    setPreviewLoading(true);
    fetch(`/api/v1/campaigns/preview-recipients?${params}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  }, [targetType, hotlistId, includeEC]);

  async function handleAddContact() {
    if (!newContact.name || !newContact.email) {
      toast.error("Name and email are required");
      return;
    }
    setAddingContact(true);
    try {
      const res = await fetch("/api/v1/employer-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });
      if (!res.ok) throw new Error("Failed to add contact");
      toast.success(`${newContact.name} added to My Contacts`);
      setNewContact({ name: "", email: "", companyName: "" });
      setShowAddContact(false);
      // Refresh preview count
      const params = new URLSearchParams({ targetType, includeEC: "true" });
      const updated = await fetch(`/api/v1/campaigns/preview-recipients?${params}`).then((r) => r.json());
      setPreview(updated);
      // Also make sure includeEC is checked
      setValue("includeEmployerContacts", true);
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setAddingContact(false);
    }
  }

  async function onSubmit(data: CampaignInput) {
    const res = await fetch("/api/v1/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Failed to create campaign");
      return;
    }
    const campaign = await res.json();
    toast.success("Campaign created as draft");
    router.push(`/campaigns/${campaign.id}`);
  }

  const recipientSummary = () => {
    if (previewLoading) return "Counting recipients…";
    if (!preview) return null;
    if (preview.total === 0) return "⚠ No recipients found for this selection";
    if (targetType === "hotlist") return `${preview.platform} hotlist entries`;
    const parts: string[] = [];
    if (preview.platform > 0) parts.push(`${preview.platform} platform contacts`);
    if (preview.myContacts > 0) parts.push(`${preview.myContacts} from My Contacts`);
    return `${preview.total} recipient${preview.total === 1 ? "" : "s"} — ${parts.join(" + ")}`;
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Campaign</h1>
        <p className="text-muted-foreground">Create an email campaign to send to your contacts</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name (internal)</Label>
              <Input {...register("name")} placeholder="Q1 Job Requirements — Java" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email Subject Line</Label>
              <Input {...register("subject")} placeholder="New Java/Spring Boot Opportunities — Dallas TX" />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Body</CardTitle>
            <CardDescription>
              Write your email in HTML. Use <code className="text-xs bg-muted px-1 rounded">{"{{name}}"}</code> to personalise with the recipient's name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register("bodyHtml")}
              rows={10}
              placeholder={"<p>Hi {{name}},</p>\n\n<p>We have a new Python Developer requirement in Dallas TX (C2C/W2, 6 months).</p>\n\n<p>Please reach out if you have matching profiles.</p>\n\n<p>Best,<br/>Akash</p>"}
              className="font-mono text-sm"
            />
            {errors.bodyHtml && <p className="text-xs text-destructive">{errors.bodyHtml.message}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              Plain text version is generated automatically from your HTML for email clients that don't support HTML.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targeting</CardTitle>
            <CardDescription>Choose who will receive this campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Target type selector */}
            <div>
              <Label className="mb-2 block">Target Audience</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "employer",  label: "Employer Contacts", icon: Building2 },
                  { value: "candidate", label: "Candidate Contacts", icon: Users },
                  { value: "hotlist",   label: "Specific Hotlist", icon: List },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setValue("targetType", value); setValue("hotlistId", undefined); }}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-colors
                      ${targetType === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
              <input type="hidden" {...register("targetType")} />
            </div>

            {/* Hotlist picker */}
            {targetType === "hotlist" && (
              <div className="space-y-2">
                <Label>Select Hotlist</Label>
                {hotlists.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3">
                    No hotlists found. <a href="/hotlists" className="underline text-primary">Create a hotlist</a> first.
                  </p>
                ) : (
                  <select
                    {...register("hotlistId")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>— choose a hotlist —</option>
                    {hotlists.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* My Contacts toggle + quick-add */}
            {targetType === "employer" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 border">
                  <input
                    type="checkbox"
                    {...register("includeEmployerContacts")}
                    id="includeEC"
                    className="mt-0.5 h-4 w-4"
                    defaultChecked
                  />
                  <div className="flex-1">
                    <label htmlFor="includeEC" className="text-sm font-medium cursor-pointer">
                      Include My Contacts
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your private employer contacts are merged with platform contacts. Duplicates are removed automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddContact((v) => !v)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                  >
                    {showAddContact ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    {showAddContact ? "Cancel" : "Add contact"}
                  </button>
                </div>

                {/* Inline quick-add form */}
                {showAddContact && (
                  <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3">
                    <p className="text-sm font-medium">Quick-add to My Contacts</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name *</Label>
                        <Input
                          value={newContact.name}
                          onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                          placeholder="John Smith"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email *</Label>
                        <Input
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                          placeholder="john@company.com"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Company</Label>
                        <Input
                          value={newContact.companyName}
                          onChange={(e) => setNewContact((p) => ({ ...p, companyName: e.target.value }))}
                          placeholder="Acme Corp"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button type="button" size="sm" onClick={handleAddContact} disabled={addingContact}>
                      {addingContact ? "Adding…" : "Add to My Contacts"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      To import many contacts at once, use the <a href="/employer-contacts" className="underline text-primary">My Contacts page</a>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Live recipient count */}
            {recipientSummary() && (
              <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                preview?.total === 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-50 text-emerald-700"
              }`}>
                <Info className="h-4 w-4 shrink-0" />
                {recipientSummary()}
              </div>
            )}

          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || (targetType === "hotlist" && !hotlistId)}>
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
