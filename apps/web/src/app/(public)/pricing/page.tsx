import Link from "next/link";
import { CheckCircle2, X, Zap } from "lucide-react";

const FREE: [string, boolean][] = [
  ["Access platform contact database (employers & candidates)", true],
  ["Browse CHRM NEXUS job requirements", true],
  ["Create and share candidate hotlists", true],
  ["Basic dashboard", true],
  ["Unlimited email campaigns", false],
  ["Private employer contacts CRM", false],
  ["CSV bulk import", false],
  ["CHRMNEXUS job applications", false],
  ["Campaign delivery & open tracking", false],
];

const STANDARD: [string, boolean][] = [
  ["Access platform contact database (employers & candidates)", true],
  ["Browse CHRM NEXUS job requirements", true],
  ["Create and share candidate hotlists", true],
  ["Full campaign analytics dashboard", true],
  ["Unlimited email campaigns", true],
  ["Private employer contacts CRM", true],
  ["CSV bulk import", true],
  ["CHRMNEXUS job applications (add-on)", true],
  ["Campaign delivery & open tracking", true],
];

export default function PricingPage() {
  return (
    <div>

      {/* Header */}
      <section className="bg-gradient-to-b from-pub-50 to-white pt-20 pb-14 text-center px-6">
        <p className="text-pub-600 font-semibold text-sm uppercase tracking-wider mb-3">Pricing</p>
        <h1 className="text-5xl font-extrabold text-slate-900 mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          One account. One sending address. Full control of your staffing workflow. Start free — upgrade when you're ready to scale.
        </p>
      </section>

      {/* Plans */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Free */}
          <div className="border border-slate-200 rounded-2xl p-10 flex flex-col bg-white">
            <div className="mb-8">
              <p className="text-slate-500 font-semibold text-sm uppercase tracking-wide mb-3">Free</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-extrabold text-slate-900">$0</span>
                <span className="text-slate-400 text-sm mb-2">/month</span>
              </div>
              <p className="text-slate-400 text-sm">Forever free · No credit card required</p>
            </div>
            <ul className="space-y-4 flex-1 mb-10">
              {FREE.map(([label, included]) => (
                <li key={label} className="flex items-start gap-3 text-sm">
                  {included
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    : <X className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />}
                  <span className={included ? "text-slate-700" : "text-slate-400"}>{label}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="block text-center border border-pub-200 text-pub-600 font-semibold py-3.5 rounded-xl hover:bg-pub-50 transition-colors">
              Get started free
            </Link>
          </div>

          {/* Standard */}
          <div className="border-2 border-pub-600 rounded-2xl p-10 flex flex-col relative bg-pub-50/30">
            <div className="absolute -top-4 left-8 bg-pub-600 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Most popular
            </div>
            <div className="mb-8">
              <p className="text-pub-600 font-semibold text-sm uppercase tracking-wide mb-3">Standard</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-extrabold text-slate-900">$95</span>
                <span className="text-slate-400 text-sm mb-2">/month</span>
              </div>
              <p className="text-slate-400 text-sm">Billed monthly · Cancel any time</p>
            </div>
            <ul className="space-y-4 flex-1 mb-10">
              {STANDARD.map(([label, included]) => (
                <li key={label} className="flex items-start gap-3 text-sm">
                  {included
                    ? <CheckCircle2 className="w-4 h-4 text-pub-500 shrink-0 mt-0.5" />
                    : <X className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />}
                  <span className={included ? "text-slate-700" : "text-slate-400"}>{label}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="block text-center bg-pub-600 text-white font-semibold py-3.5 rounded-xl hover:bg-pub-700 transition-colors shadow-lg shadow-pub-200">
              Get Standard
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-pub-600 hover:underline">Sign in and upgrade from Settings</Link>
        </p>
      </section>

      {/* One account = one email note */}
      <section className="py-10 bg-amber-50 border-y border-amber-100 px-6">
        <div className="max-w-2xl mx-auto flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 mb-1">One subscription = one sending email address</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Each CloudSourceHRM account is tied to the email address you register with. This is your dedicated sending address for all outreach and campaigns. If your staffing company needs multiple sending addresses, you'll need a separate account for each — this keeps deliverability high and sender reputation clean per identity.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-5">
            {[
              {
                q: "Who is CloudSourceHRM for?",
                a: "CloudSourceHRM is built for everyone involved in the staffing lifecycle — job seekers, independent recruiters, staffing companies, and vendors. Whether you're placing candidates or sourcing requirements, the platform has a workflow built for you.",
              },
              {
                q: "What workflows does it replace?",
                a: "CloudSourceHRM centralises job email management, recruiter rate calculations, document handling, and vendor coordination into one platform — eliminating the need for scattered spreadsheets, manual Word editing, and tangled email threads.",
              },
              {
                q: "Can I cancel my Standard subscription any time?",
                a: "Yes. Cancel any time from your account settings. Your Standard features remain active until the end of the billing period. No penalties, no lock-ins.",
              },
              {
                q: "What is the CHRMNEXUS Jobs add-on?",
                a: "All members can browse live job requirements on the CHRM NEXUS board for free. The paid add-on unlocks the ability to submit applications directly from your CloudSourceHRM member portal without leaving the platform.",
              },
              {
                q: "Is my private contacts list shared with anyone?",
                a: "Never. Your private employer contacts (My Contacts) are visible only to you. They are completely separate from the shared platform database and will never be used or distributed.",
              },
              {
                q: "How is CloudSourceHRM different from a generic CRM?",
                a: "CloudSourceHRM was designed from the ground up for staffing companies — not adapted from general-purpose CRM software. Every feature maps to a real recruiter workflow, from rate calculations to candidate hotlists to targeted campaign outreach.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <p className="font-bold text-slate-900 mb-2">{faq.q}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-pub-600 text-center px-6">
        <h2 className="text-3xl font-extrabold text-white mb-4">
          Start simplifying your staffing workflow today.
        </h2>
        <p className="text-pub-200 mb-8 max-w-lg mx-auto">
          Free to start. No credit card required. Upgrade whenever you're ready to run campaigns at scale.
        </p>
        <Link href="/register" className="inline-block bg-white text-pub-700 font-bold px-10 py-4 rounded-xl hover:bg-pub-50 transition-colors">
          Create your free account
        </Link>
      </section>

    </div>
  );
}
