"use client";

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

export default function NewCampaignPage() {
  const router = useRouter();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { targetType: "employer", includeEmployerContacts: true },
  });

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
          <CardHeader><CardTitle>Email Body</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>HTML Body</Label>
              <Textarea {...register("bodyHtml")} rows={8} placeholder="<p>Hi {{name}},</p><p>We have exciting opportunities...</p>" className="font-mono text-sm" />
              {errors.bodyHtml && <p className="text-xs text-destructive">{errors.bodyHtml.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Plain Text Body (fallback)</Label>
              <Textarea {...register("bodyText")} rows={4} placeholder="Hi, we have exciting opportunities..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targeting</CardTitle>
            <CardDescription>Choose who will receive this campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <select {...register("targetType")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="employer">Employer Contacts</option>
                <option value="candidate">Candidate Contacts</option>
                <option value="hotlist">Specific Hotlist</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" {...register("includeEmployerContacts")} id="includeEC" className="h-4 w-4" defaultChecked />
              <label htmlFor="includeEC" className="text-sm">
                Include my private employer contacts (deduplication applied automatically)
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
