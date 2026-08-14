"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requirementSchema, travelOptions, type RequirementInput } from "@/lib/schemas";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CheckCircle2, ChevronRight, ChevronLeft, Send, Briefcase, MapPin, Mail, Eye, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants (module-level — never recreated) ──────────────────────────────
const STEPS = [
  { id: 1, label: "Job Details",          icon: Briefcase },
  { id: 2, label: "Description & Skills", icon: MapPin },
  { id: 3, label: "Contact Details",      icon: Mail },
  { id: 4, label: "Review & Send",        icon: Eye },
];

const STEP_FIELDS: Record<number, (keyof RequirementInput)[]> = {
  1: ["jobTitle", "workSetting", "hireType", "positionType", "payFrequency", "payType"],
  2: ["jobDescription"],
  3: ["recipientEmails"],
};

// ── Pure helper functions (module-level) ─────────────────────────────────────
function workSettingLabel(v: string) {
  return ({ remote: "Remote", onsite: "On-Site", hybrid: "Hybrid" } as Record<string, string>)[v] ?? v;
}
function hireTypeLabel(v: string) {
  return ({ direct_hire: "Direct Hire", contract: "Contract" } as Record<string, string>)[v] ?? v;
}
function positionTypeLabel(v: string) {
  return ({ full_time: "Full Time", part_time: "Part Time" } as Record<string, string>)[v] ?? v;
}
function payDisplay(d: RequirementInput): string {
  const freq = d.payFrequency === "annual" ? "yr" : "hr";
  if (d.payType === "depends_on_experience") return "Depends on Experience";
  if (d.payType === "exact" && d.payExact) return `$${d.payExact.toLocaleString()} / ${freq}`;
  if (d.payType === "range" && (d.payMin || d.payMax)) {
    const min = d.payMin ? `$${d.payMin.toLocaleString()}` : "—";
    const max = d.payMax ? `$${d.payMax.toLocaleString()}` : "—";
    return `${min} – ${max} / ${freq}`;
  }
  return d.payFrequency === "annual" ? "Annual" : "Hourly";
}

// ── Shared UI components (module-level — stable references across renders) ───

function PillGroup<T extends string>({
  options, value, onChange, cols = 3,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border-2 py-2 px-3 text-sm font-medium transition-colors",
            value === o.value
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      {([{ v: false, label: "No" }, { v: true, label: "Yes" }] as const).map(({ v, label }) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-colors",
            value === v
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground font-medium w-[42%] shrink-0">{label}</span>
      <span className="text-foreground font-semibold text-right">{value}</span>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, error, children, hint }: {
  label: string; error?: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint  && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function StepperHeader({ step }: { step: number }) {
  return (
    <div className="flex items-start gap-0 mb-8">
      {STEPS.map((s, idx) => {
        const done   = step > s.id;
        const active = step === s.id;
        const Icon   = s.icon;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors shrink-0",
                done   ? "bg-primary border-primary text-white"
                       : active ? "bg-primary/10 border-primary text-primary"
                                : "bg-white border-border text-muted-foreground",
              )}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block whitespace-nowrap text-center",
                active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground",
              )}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2 mt-[-14px]", done ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NavButtons({
  step, onBack, onNext, nextLabel = "Continue", isSubmit = false, sending = false,
}: {
  step: number;
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  isSubmit?: boolean;
  sending?: boolean;
}) {
  return (
    <div className="flex justify-between pt-6 border-t border-border mt-8">
      {step > 1 ? (
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={onBack}>Cancel</Button>
      )}
      {isSubmit ? (
        <Button type="submit" disabled={sending} className="gap-2">
          {sending ? "Sending…" : <><Send className="w-4 h-4" /> Send Requirement</>}
        </Button>
      ) : (
        <Button type="button" onClick={onNext} className="gap-2">
          {nextLabel} <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function NewRequirementPage() {
  const router = useRouter();

  const [step, setStep]               = useState(1);
  const [skillInput, setSkillInput]   = useState("");
  const [sending, setSending]         = useState(false);
  const [suggestedSkills, setSuggested] = useState<string[]>([]);
  const [suggesting, setSuggesting]   = useState(false);

  const {
    register, handleSubmit, watch, setValue, trigger,
    formState: { errors },
  } = useForm<RequirementInput>({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      workSetting:        "remote",
      hireType:           "direct_hire",
      positionType:       "full_time",
      payFrequency:       "annual",
      payType:            "range",
      travelPercentage:   "no_travel",
      allowStaffingFirms: false,
      sponsorship:        false,
      skills:             [],
      jobDescription:     "",
    },
  });

  const w = watch();

  async function goNext() {
    const fields = STEP_FIELDS[step];
    if (fields) {
      const ok = await trigger(fields);
      if (!ok) return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (step > 1) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.back();
    }
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    const current = w.skills ?? [];
    setValue("skills", [...new Set([...current, ...parts])]);
    setSkillInput("");
  }

  function removeSkill(idx: number) {
    setValue("skills", (w.skills ?? []).filter((_, i) => i !== idx));
  }

  async function suggestSkills() {
    const html = w.jobDescription;
    if (!html || html.replace(/<[^>]+>/g, "").trim().length < 30) {
      toast.error("Please write the job description first.");
      return;
    }
    setSuggesting(true);
    try {
      const res = await fetch("/api/v1/requirements/suggest-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyHtml: html }),
      });
      const json = await res.json();
      const current = new Set((w.skills ?? []).map((s) => s.toLowerCase()));
      const fresh = (json.skills as string[]).filter((s) => !current.has(s.toLowerCase()));
      setSuggested(fresh);
      if (fresh.length === 0) toast.info("No additional skills detected. Try adding them manually.");
    } catch {
      toast.error("Could not suggest skills.");
    } finally {
      setSuggesting(false);
    }
  }

  function addSuggestedSkill(skill: string) {
    const current = w.skills ?? [];
    if (!current.map((s) => s.toLowerCase()).includes(skill.toLowerCase())) {
      setValue("skills", [...current, skill]);
    }
    setSuggested((prev) => prev.filter((s) => s !== skill));
  }

  const onSubmit = handleSubmit(async (data) => {
    setSending(true);
    try {
      const res = await fetch("/api/v1/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to send requirement"); return; }
      toast.success("Requirement sent successfully!");
      router.push(`/campaigns/${json.campaignId}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  });

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Requirement</h1>
        <p className="text-muted-foreground text-sm mt-1">Fill in the job details and send to your recruiter network.</p>
      </div>

      <StepperHeader step={step} />

      <form onSubmit={onSubmit} className="bg-white border border-border rounded-xl p-6 shadow-sm">

        {/* ══ STEP 1 ══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-8">
            <Section title="Job Details">
              <Field label="Job Title *" error={errors.jobTitle?.message}>
                <Input {...register("jobTitle")} placeholder="e.g. Senior Java Developer" />
              </Field>
              <Field label="Job ID" hint="Leave blank to auto-generate on submission." error={errors.jobId?.message}>
                <Input {...register("jobId")} placeholder="e.g. JD-2026-001 (optional)" />
              </Field>
            </Section>

            <div className="border-t border-border pt-6">
              <Section title="Location" desc="Specify the preferred work setting.">
                <Field label="Work Setting *" error={errors.workSetting?.message}>
                  <PillGroup
                    options={[
                      { value: "remote" as const,  label: "Remote" },
                      { value: "onsite" as const,  label: "On-Site" },
                      { value: "hybrid" as const,  label: "Hybrid" },
                    ]}
                    value={w.workSetting}
                    onChange={(v) => setValue("workSetting", v)}
                    cols={3}
                  />
                </Field>
              </Section>
            </div>

            <div className="border-t border-border pt-6">
              <Section title="Employment Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Hire Type *" error={errors.hireType?.message}>
                    <PillGroup
                      options={[
                        { value: "direct_hire" as const, label: "Direct Hire" },
                        { value: "contract" as const,    label: "Contract" },
                      ]}
                      value={w.hireType}
                      onChange={(v) => setValue("hireType", v)}
                      cols={2}
                    />
                  </Field>
                  <Field label="Position Type *" error={errors.positionType?.message}>
                    <PillGroup
                      options={[
                        { value: "full_time" as const, label: "Full Time" },
                        { value: "part_time" as const, label: "Part Time" },
                      ]}
                      value={w.positionType}
                      onChange={(v) => setValue("positionType", v)}
                      cols={2}
                    />
                  </Field>
                </div>

                <Field label="Pay *" error={errors.payFrequency?.message}>
                  <PillGroup
                    options={[
                      { value: "annual" as const, label: "Annual" },
                      { value: "hourly" as const, label: "Hourly" },
                    ]}
                    value={w.payFrequency}
                    onChange={(v) => setValue("payFrequency", v)}
                    cols={2}
                  />
                </Field>

                <Field label="Pay Type *" error={errors.payType?.message}>
                  <PillGroup
                    options={[
                      { value: "range" as const,                 label: "Range" },
                      { value: "exact" as const,                 label: "Exact" },
                      { value: "depends_on_experience" as const, label: "Depends on Experience" },
                    ]}
                    value={w.payType}
                    onChange={(v) => setValue("payType", v)}
                    cols={3}
                  />
                </Field>

                {w.payType === "range" && (
                  <Field label={`Pay Range (USD) — ${w.payFrequency === "annual" ? "Annual" : "Hourly"}`}>
                    <div className="flex items-center gap-3">
                      <Input type="number" placeholder="Min" {...register("payMin", { valueAsNumber: true })} className="flex-1" />
                      <span className="text-muted-foreground font-medium">–</span>
                      <Input type="number" placeholder="Max" {...register("payMax", { valueAsNumber: true })} className="flex-1" />
                    </div>
                  </Field>
                )}

                {w.payType === "exact" && (
                  <Field label={`Exact Pay (USD) — ${w.payFrequency === "annual" ? "Annual" : "Hourly"}`}>
                    <Input type="number" placeholder="e.g. 120000" {...register("payExact", { valueAsNumber: true })} />
                  </Field>
                )}

                <Field label="Travel Percentage *">
                  <select
                    {...register("travelPercentage")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {travelOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Allow Staffing Firms & Recruiters to apply on behalf of a candidate">
                    <YesNo value={w.allowStaffingFirms} onChange={(v) => setValue("allowStaffingFirms", v)} />
                  </Field>
                  <Field label="Ability or willingness to provide sponsorship">
                    <YesNo value={w.sponsorship} onChange={(v) => setValue("sponsorship", v)} />
                  </Field>
                </div>
              </Section>
            </div>

            <NavButtons step={step} onBack={goBack} onNext={goNext} />
          </div>
        )}

        {/* ══ STEP 2 ══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-8">
            <Section title="Description & Skills" desc="Describe the role in detail. Clear descriptions attract better-matching candidates.">
              <Field label="Job Description *" error={errors.jobDescription?.message}>
                <RichTextEditor
                  value={w.jobDescription ?? ""}
                  onChange={(html) => setValue("jobDescription", html, { shouldValidate: true })}
                  placeholder="Describe the role, responsibilities, and requirements..."
                />
              </Field>

              {/* ── Skill Suggestions ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Required Skills</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={suggestSkills}
                    disabled={suggesting}
                    className="text-xs gap-1.5"
                  >
                    {suggesting ? "Analysing…" : "✦ Suggest Skills from JD"}
                  </Button>
                </div>

                {/* Suggestions row */}
                {suggestedSkills.length > 0 && (
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 space-y-2">
                    <p className="text-xs font-semibold text-indigo-700">Click to add suggested skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSkills.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSuggestedSkill(s)}
                          className="inline-flex items-center gap-1 bg-white border border-indigo-300 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual add */}
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    placeholder="e.g. Java, Spring Boot, AWS"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
                </div>
                <p className="text-xs text-muted-foreground">Enter skills separated by commas, or add one at a time.</p>

                {/* Added skills */}
                {(w.skills ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(w.skills ?? []).map((skill, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                        {skill}
                        <button type="button" onClick={() => removeSkill(idx)} className="hover:text-destructive transition-colors leading-none text-sm">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            <NavButtons step={step} onBack={goBack} onNext={goNext} />
          </div>
        )}

        {/* ══ STEP 3 ══════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-8">
            <Section title="Contact Details" desc="Enter the email addresses that will receive this requirement.">
              <Field
                label="To (Recipient Emails) *"
                hint="Separate multiple addresses with commas. e.g. recruiter@firm.com, vendor@agency.com"
                error={errors.recipientEmails?.message}
              >
                <Input {...register("recipientEmails")} placeholder="recruiter@firm.com, vendor@agency.com" />
              </Field>
              <Field
                label="CC Email(s)"
                hint="Optional. Comma-separated addresses to CC on every email sent."
                error={errors.ccEmails?.message}
              >
                <Input {...register("ccEmails")} placeholder="manager@company.com (optional)" />
              </Field>
            </Section>

            <NavButtons step={step} onBack={goBack} onNext={goNext} nextLabel="Review" />
          </div>
        )}

        {/* ══ STEP 4 ══════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-8">
            <Section title="Review & Send" desc="Confirm everything looks right before sending. Emails are dispatched immediately.">

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Job Details
                  </p>
                </div>
                <div className="px-4 py-1">
                  <ReviewRow label="Job Title"      value={w.jobTitle ?? "—"} />
                  {w.jobId && <ReviewRow label="Job ID"       value={w.jobId} />}
                  <ReviewRow label="Work Setting"   value={workSettingLabel(w.workSetting)} />
                  <ReviewRow label="Hire Type"      value={hireTypeLabel(w.hireType)} />
                  <ReviewRow label="Position Type"  value={positionTypeLabel(w.positionType)} />
                  <ReviewRow label="Compensation"   value={payDisplay(w)} />
                  <ReviewRow label="Travel"         value={travelOptions.find((t) => t.value === w.travelPercentage)?.label ?? "—"} />
                  <ReviewRow label="Staffing Firms" value={w.allowStaffingFirms ? "Allowed" : "Not allowed"} />
                  <ReviewRow label="Sponsorship"    value={w.sponsorship ? "Available" : "Not available"} />
                </div>
              </div>

              {(w.skills ?? []).length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Skills</p>
                  </div>
                  <div className="px-4 py-3 flex flex-wrap gap-2">
                    {(w.skills ?? []).map((s, i) => (
                      <span key={i} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full JD preview */}
              {w.jobDescription && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Description</p>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div
                    className="px-4 py-3 prose prose-sm max-w-none text-sm text-foreground"
                    dangerouslySetInnerHTML={{ __html: w.jobDescription }}
                  />
                </div>
              )}

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Recipients
                  </p>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs font-semibold uppercase">To:</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {w.recipientEmails?.split(",").map((e) => e.trim()).filter(Boolean).map((email, i) => (
                        <span key={i} className="bg-muted text-foreground text-xs px-2.5 py-1 rounded-md font-mono">{email}</span>
                      ))}
                    </div>
                  </div>
                  {w.ccEmails && (
                    <div>
                      <span className="text-muted-foreground text-xs font-semibold uppercase">CC:</span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {w.ccEmails.split(",").map((e) => e.trim()).filter(Boolean).map((email, i) => (
                          <span key={i} className="bg-muted text-foreground text-xs px-2.5 py-1 rounded-md font-mono">{email}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <strong>Ready to send?</strong> Click "Send Requirement" — emails will be dispatched immediately to all recipients listed above.
              </div>
            </Section>

            <NavButtons step={step} onBack={goBack} isSubmit sending={sending} />
          </div>
        )}

      </form>
    </div>
  );
}
