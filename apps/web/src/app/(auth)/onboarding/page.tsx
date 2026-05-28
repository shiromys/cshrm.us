"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CsHrmLogo } from "@/components/cshrm-logo";
import { Button } from "@/components/ui/button";
import { Briefcase, UserCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "requirements" | "hotlist";

const MODES = [
  {
    value: "requirements" as Mode,
    icon: Briefcase,
    iconBg: "bg-indigo-100 group-hover:bg-indigo-200",
    iconColor: "text-indigo-600",
    selectedBorder: "border-indigo-500 bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-700",
    title: "Send Requirements",
    description:
      "You have open job positions and want to email recruiters / vendors asking them to send matching candidates your way.",
    features: ["Send job requirements to recruiters", "Target employer & candidate contacts", "Track delivery & open rates"],
    target: "Target: Recruiter & Vendor Networks",
  },
  {
    value: "hotlist" as Mode,
    icon: UserCheck,
    iconBg: "bg-emerald-100 group-hover:bg-emerald-200",
    iconColor: "text-emerald-600",
    selectedBorder: "border-emerald-500 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    title: "Share Hotlists",
    description:
      "You have candidates on your bench and want to email employers / hiring managers a formatted table of available resources.",
    features: ["Build bench candidate lists", "Send formatted hotlist tables to employers", "Manage candidate availability"],
    target: "Target: Employers & Hiring Managers",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationMode: selected }),
      });
      if (!res.ok) throw new Error("Failed to save preference");
      // Small delay so cookie bust takes effect, then hard-navigate to dashboard
      await new Promise((r) => setTimeout(r, 300));
      window.location.href = "/dashboard";
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col items-center justify-center px-6 py-12">

      {/* Logo */}
      <div className="flex items-center gap-2.5 font-bold text-xl mb-10">
        <CsHrmLogo size={40} />
        <span className="text-slate-900">CloudSource</span>
        <span className="text-pub-500">HRM</span>
      </div>

      {/* Heading */}
      <div className="text-center mb-10 max-w-lg">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-3">How will you use CloudSourceHRM?</h1>
        <p className="text-slate-500 leading-relaxed">
          Choose your primary operation. This sets up your workspace — you can only pick one, so choose what fits your day-to-day work best.
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl mb-8">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selected === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => setSelected(mode.value)}
              className={`group rounded-2xl border-2 p-6 text-left transition-all shadow-sm hover:shadow-md ${
                isSelected
                  ? `${mode.selectedBorder} shadow-md`
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className={`mb-4 inline-flex p-3 rounded-xl transition-colors ${mode.iconBg}`}>
                <Icon className={`w-6 h-6 ${mode.iconColor}`} />
              </div>

              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-lg font-bold text-slate-900">{mode.title}</h2>
                {isSelected && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 leading-relaxed mb-4">{mode.description}</p>

              <ul className="space-y-1.5 mb-4">
                {mode.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${mode.badge}`}>
                {mode.target}
              </span>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <Button
        size="lg"
        className="w-full max-w-xs gap-2"
        disabled={!selected || saving}
        onClick={handleContinue}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Setting up your workspace…</>
        ) : (
          <>Continue to Dashboard <ArrowRight className="w-4 h-4" /></>
        )}
      </Button>

      <p className="text-xs text-slate-400 mt-4 text-center">
        This preference is saved to your account and can be changed in Settings.
      </p>
    </div>
  );
}
