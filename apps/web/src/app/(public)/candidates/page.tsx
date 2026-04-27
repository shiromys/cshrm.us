"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { candidateLeadSchema, type CandidateLeadInput, workAuthValues } from "@/lib/schemas";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const WORK_AUTH_LABELS: Record<string, string> = {
  us_citizen: "US Citizen", green_card: "Green Card (PR)", h1b: "H1B",
  h4_ead: "H4 EAD", opt: "OPT", cpt: "CPT", tn: "TN Visa",
  l1: "L1", e3: "E3", gc_ead: "GC EAD", other: "Other / Need Sponsorship",
};

export default function CandidateLandingPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CandidateLeadInput>({
    resolver: zodResolver(candidateLeadSchema),
  });

  async function onSubmit(data: CandidateLeadInput) {
    const res = await fetch("/api/public/signup/candidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Submission failed. Please try again."); return; }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-700">
      <header className="px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold">CloudSourceHRM</h1>
          <p className="text-green-200 text-sm">Powered by SHIRO Technologies</p>
        </div>
      </header>

      <section className="px-8 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-4">Find Your Next Opportunity</h2>
          <p className="text-green-200 text-lg mb-8">Register to receive job requirements and recruiter outreach directly in your inbox.</p>
        </div>
      </section>

      <section className="px-8 pb-16">
        <div className="max-w-md mx-auto">
          {submitted ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold mb-2">You&apos;re in our talent pool!</h3>
                <p className="text-muted-foreground">Our recruiters will review your profile and reach out when suitable positions become available.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Register as a Candidate</CardTitle>
                <CardDescription>Start receiving job opportunities from our recruiter network</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input {...register("name")} placeholder="Alex Booth" />
                      {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input {...register("email")} type="email" placeholder="alex@email.com" />
                      {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input {...register("phone")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Title</Label>
                      <Input {...register("title")} placeholder="Senior Developer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input {...register("city")} placeholder="Dallas" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input {...register("state")} placeholder="TX" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Work Authorization *</Label>
                    <select {...register("workAuthorization")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                      <option value="">Select...</option>
                      {workAuthValues.map((v) => (
                        <option key={v} value={v}>{WORK_AUTH_LABELS[v]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Skills (comma-separated)</Label>
                    <Input {...register("skillsRaw")} placeholder="Java, Spring Boot, AWS, React" />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Summary (max 500 chars)</Label>
                    <Textarea {...register("profileSummary")} maxLength={500} rows={3} placeholder="Brief summary of your experience and what you're looking for..." />
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <input type="checkbox" {...register("consentGiven")} id="consent" className="mt-0.5 h-4 w-4" />
                    <label htmlFor="consent" className="text-xs text-gray-700">
                      I consent to receive job opportunities and recruitment communications. I can unsubscribe at any time.
                    </label>
                  </div>
                  {errors.consentGiven && <p className="text-xs text-destructive">{errors.consentGiven.message}</p>}
                </CardContent>
                <div className="px-6 pb-6">
                  <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Join Talent Pool"}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
