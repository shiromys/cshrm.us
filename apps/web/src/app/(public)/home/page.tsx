import Link from "next/link";
import {
  Mail, List, Users, Building2, Zap, ArrowRight,
  CheckCircle2, BarChart3, FileText, Calculator, Globe, Shield
} from "lucide-react";

export default function HomePage() {
  return (
    <div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e0e7ff_1px,transparent_1px),linear-gradient(to_bottom,#e0e7ff_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-pub-50 via-white to-white" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-pub-50 border border-pub-200 rounded-full px-4 py-1.5 text-xs font-semibold text-pub-700 mb-8">
            <span className="w-1.5 h-1.5 bg-pub-500 rounded-full animate-pulse" />
            Part of the CHRM NEXUS Ecosystem · By SHIRO Technologies
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
            Everything Staffing.<br />
            <span className="text-pub-600">One Platform.</span>
          </h1>

          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            CloudSourceHRM is a state-of-the-art staffing and recruitment platform built specifically for staffing companies. Stop juggling job emails, rate calculations, Word agreements, and vendor threads — and start running your entire operation from a single, unified workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-pub-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-pub-700 transition-colors text-base shadow-lg shadow-pub-200"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 font-semibold px-8 py-4 rounded-xl hover:bg-slate-50 transition-colors text-base"
            >
              View pricing
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-400">Free plan available · No credit card required to sign up</p>
        </div>

        {/* Mock dashboard */}
        <div className="relative max-w-5xl mx-auto px-6 pb-0">
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/60 bg-white">
            <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 bg-slate-700 rounded px-24 py-1 text-xs text-slate-400">cshrmus.us/dashboard</div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-pub-50 p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Active Campaigns", value: "12", color: "text-pub-700" },
                { label: "Platform Contacts", value: "3,400+", color: "text-emerald-700" },
                { label: "Hotlists Built", value: "28", color: "text-amber-700" },
                { label: "Emails Delivered", value: "94.2%", color: "text-sky-700" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs text-center text-slate-400 uppercase tracking-widest font-semibold mb-8">Built for every role in the staffing lifecycle</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Users, label: "Job Seekers", desc: "Browse opportunities and connect with recruiters directly through the CHRM NEXUS ecosystem." },
              { icon: Building2, label: "Recruiters", desc: "Manage contacts, run targeted email campaigns, and build polished candidate hotlists." },
              { icon: Zap, label: "Staffing Companies", desc: "Centralise vendor coordination, rate management, and team outreach in one platform." },
              { icon: Globe, label: "Vendors", desc: "Stay connected with staffing firms and respond to requirements faster than ever before." },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-pub-100 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-pub-600" />
                  </div>
                  <p className="font-bold text-slate-900 text-sm mb-1">{r.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pain → Solution ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-pub-600 font-semibold text-sm uppercase tracking-wider mb-3">The problem we solve</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6 leading-tight">
                Staffing is complex.<br />Your tools shouldn't be.
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Recruiters today spend hours juggling hundreds of job emails, performing manual rate calculations in spreadsheets, editing Word agreements one by one, and coordinating with vendors across scattered email threads. It's slow, error-prone, and exhausting.
              </p>
              <p className="text-slate-500 leading-relaxed">
                CloudSourceHRM was designed from the ground up for staffing companies — not adapted from a generic CRM. Every feature addresses a real workflow pain that recruiters face every single day.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { before: "Hundreds of job emails, manually sorted", after: "Centralised contact database with smart targeting" },
                { before: "Rate calculations done in spreadsheets", after: "Built-in rate logic, no more manual errors" },
                { before: "Word agreements edited one by one", after: "Streamlined document workflows" },
                { before: "Vendor coordination through email threads", after: "Unified vendor and supplier communication" },
              ].map((row) => (
                <div key={row.before} className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
                    <span className="text-xs font-bold text-red-400 block mb-1">BEFORE</span>
                    {row.before}
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">
                    <span className="text-xs font-bold text-emerald-400 block mb-1">AFTER</span>
                    {row.after}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-pub-600 font-semibold text-sm uppercase tracking-wider mb-3">Platform features</p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Every tool you need. Nothing you don't.</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">Designed specifically for staffing — not stitched together from generic software.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Mail,
                color: "bg-pub-50 text-pub-600",
                title: "Email Campaigns",
                desc: "Send targeted outreach to your full contact database. Choose platform contacts, your private employer list, or both. Track delivery, opens, and bounces in real time.",
              },
              {
                icon: List,
                color: "bg-emerald-50 text-emerald-600",
                title: "Candidate Hotlists",
                desc: "Build polished candidate presentations in minutes. Import from Excel, paste from text, or add manually. Share instantly with clients.",
              },
              {
                icon: Users,
                color: "bg-sky-50 text-sky-600",
                title: "Platform Contact Database",
                desc: "Access the CloudSourceHRM employer and candidate database. Thousands of real contacts, ready to target for every job requirement.",
              },
              {
                icon: Building2,
                color: "bg-amber-50 text-amber-600",
                title: "Private Employer CRM",
                desc: "Maintain your own private employer contact list alongside the platform database. Import from CSV, organise by status, and keep it completely private.",
              },
              {
                icon: Calculator,
                color: "bg-violet-50 text-violet-600",
                title: "Rate & Workflow Automation",
                desc: "Replace manual spreadsheet rate calculations with built-in logic. Reduce errors and speed up placements.",
              },
              {
                icon: FileText,
                color: "bg-rose-50 text-rose-600",
                title: "Document Management",
                desc: "Stop editing Word agreements one by one. Manage agreements and vendor documents from a central, organised workspace.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group p-6 rounded-2xl border border-slate-100 hover:border-pub-200 hover:shadow-lg hover:shadow-pub-50 transition-all bg-white">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.color} mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CHRM NEXUS integration ───────────────────────────────────────────── */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-pub-900/50 border border-pub-700 rounded-full px-4 py-1.5 text-xs font-semibold text-pub-300 mb-6">
              <Zap className="w-3 h-3" /> Ecosystem integration
            </div>
            <h2 className="text-4xl font-extrabold mb-5 leading-tight">
              Connected to the<br />
              <span className="text-pub-400">CHRM NEXUS Platform</span>
            </h2>
            <p className="text-slate-400 leading-relaxed mb-6">
              CloudSourceHRM is part of the SHIRO Technologies ecosystem. Your member portal connects directly to CHRM NEXUS — the global hub for recruitment market intelligence — giving you access to thousands of live job requirements and enabling you to apply directly from within your workspace.
            </p>
            <div className="flex gap-4">
              <a href="https://www.cloudsourcehrm.com" target="_blank" className="flex items-center gap-2 border border-slate-700 text-slate-300 font-medium px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-sm">
                Explore CHRM NEXUS <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, label: "4,220+ live jobs", sub: "Updated in real time" },
              { icon: Shield, label: "100% anonymized", sub: "Full recruiter privacy" },
              { icon: Globe, label: "Global reach", sub: "Recruiters worldwide" },
              { icon: Zap, label: "AI-powered", sub: "Gemini 2.5 Flash" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <Icon className="w-5 h-5 text-pub-400 mb-3" />
                  <p className="font-bold text-white text-sm">{s.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-pub-600 font-semibold text-sm uppercase tracking-wider mb-3">Getting started</p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Up and running in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create your free account", desc: "Sign up with your work email. No credit card needed. Your account is your dedicated sending address — keeping your outreach clean and deliverable." },
              { step: "02", title: "Import your contacts", desc: "Upload a CSV of your employer contacts, access the platform database, or add contacts manually. Your private list stays completely yours." },
              { step: "03", title: "Run your first campaign", desc: "Compose, preview, and send targeted outreach. Track opens, delivery, and bounces from your dashboard in real time." },
            ].map((s) => (
              <div key={s.step} className="text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-pub-600 text-white text-lg font-extrabold flex items-center justify-center mx-auto mb-5">
                  {s.step}
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing strip ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-pub-50 border-y border-pub-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Simple, transparent pricing</h2>
          <p className="text-slate-500 mb-10">Start free. Upgrade to Standard when you're ready to scale your outreach.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-8">
            {[
              { plan: "Free", price: "$0/mo", items: ["Platform contacts access", "Hotlists", "CHRM NEXUS job browsing"] },
              { plan: "Standard", price: "$95/mo", items: ["Everything in Free", "Unlimited campaigns", "Private CRM + CSV import"] },
            ].map((p) => (
              <div key={p.plan} className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 text-left shadow-sm">
                <p className="font-bold text-slate-900 mb-1">{p.plan}</p>
                <p className="text-2xl font-extrabold text-pub-600 mb-4">{p.price}</p>
                <ul className="space-y-2">
                  {p.items.map((i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-pub-500 shrink-0" />{i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="text-pub-600 font-semibold hover:underline text-sm">
            See full pricing and feature comparison →
          </Link>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-pub-600 text-center px-6">
        <h2 className="text-4xl font-extrabold text-white mb-4">
          One platform for your entire staffing operation.
        </h2>
        <p className="text-pub-200 text-lg mb-8 max-w-xl mx-auto">
          Join recruiters, staffing companies, and vendors already using CloudSourceHRM to simplify their workflow.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="bg-white text-pub-700 font-bold px-8 py-4 rounded-xl hover:bg-pub-50 transition-colors">
            Create free account
          </Link>
          <Link href="/login" className="border border-pub-400 text-white font-semibold px-8 py-4 rounded-xl hover:bg-pub-700 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

    </div>
  );
}
