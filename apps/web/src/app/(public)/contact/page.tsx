"use client";

import { useState } from "react";
import { Mail, MessageSquare, Clock, Send } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Get in Touch</h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          Have a question, need support, or want to discuss your account? We&apos;re here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Info cards */}
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
            <div className="w-10 h-10 bg-pub-100 rounded-lg flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-pub-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Email Us</h3>
            <p className="text-sm text-slate-500 mb-2">For general and billing enquiries:</p>
            <a href="mailto:support@shirotechnologies.com" className="text-sm text-pub-600 hover:underline font-medium">
              support@shirotechnologies.com
            </a>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
            <div className="w-10 h-10 bg-pub-100 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-pub-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Sales &amp; Partnerships</h3>
            <p className="text-sm text-slate-500 mb-2">Interested in a custom plan or integration?</p>
            <a href="mailto:info@shirotechnologies.com" className="text-sm text-pub-600 hover:underline font-medium">
              info@shirotechnologies.com
            </a>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
            <div className="w-10 h-10 bg-pub-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-pub-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Response Time</h3>
            <p className="text-sm text-slate-500">
              We typically respond within <strong className="text-slate-700">1–2 business days</strong>.
              Urgent issues are prioritised.
            </p>
          </div>
        </div>

        {/* Contact form */}
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Send us a message</h2>

            {status === "sent" ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Message sent!</h3>
                <p className="text-slate-500">Thanks for reaching out. We&apos;ll get back to you within 1–2 business days.</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-6 text-sm text-pub-600 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Alex Johnson"
                      className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pub-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="alex@company.com"
                      className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pub-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="How can we help?"
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pub-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us what you need help with..."
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pub-500 focus:border-transparent resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full bg-pub-600 text-white font-semibold py-3 rounded-lg hover:bg-pub-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status === "sending" ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
