"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employerLeadSchema, type EmployerLeadInput } from "@/lib/schemas";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmployerLandingPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmployerLeadInput>({
    resolver: zodResolver(employerLeadSchema),
  });

  async function onSubmit(data: EmployerLeadInput) {
    const res = await fetch("/api/public/signup/employer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Submission failed. Please try again."); return; }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700">
      {/* Header */}
      <header className="px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold">CloudSourceHRM</h1>
          <p className="text-blue-200 text-sm">Powered by SHIRO Technologies</p>
        </div>
      </header>

      {/* Hero */}
      <section className="px-8 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-4">Receive Top Talent, Delivered to Your Inbox</h2>
          <p className="text-blue-200 text-lg mb-8">
            Register to receive curated candidate hotlists and job campaign updates from our recruiter network.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="px-8 pb-16">
        <div className="max-w-md mx-auto">
          {submitted ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold mb-2">You&apos;re registered!</h3>
                <p className="text-muted-foreground">Our team will review your submission and add you to our network. You&apos;ll start receiving talent updates soon.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Register as an Employer</CardTitle>
                <CardDescription>Start receiving candidate hotlists and talent outreach</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Contact Name *</Label>
                      <Input {...register("name")} placeholder="Jane Smith" />
                      {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Work Email *</Label>
                      <Input {...register("email")} type="email" placeholder="jane@company.com" />
                      {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input {...register("companyName")} placeholder="Acme Technologies" />
                    {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input {...register("phone")} placeholder="+1 555 000 0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input {...register("industry")} placeholder="Information Technology" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Interested In</Label>
                    <select {...register("interestedIn")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                      <option value="both">Both Hotlists & Job Campaigns</option>
                      <option value="hotlists">Candidate Hotlists Only</option>
                      <option value="campaigns">Job Campaign Updates Only</option>
                    </select>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <input type="checkbox" {...register("consentGiven")} id="consent" className="mt-0.5 h-4 w-4" />
                    <label htmlFor="consent" className="text-xs text-gray-700">
                      I consent to receive recruitment communications from CloudSourceHRM and understand I can unsubscribe at any time.
                    </label>
                  </div>
                  {errors.consentGiven && <p className="text-xs text-destructive">{errors.consentGiven.message}</p>}
                </CardContent>
                <div className="px-6 pb-6">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Register Now"}
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
