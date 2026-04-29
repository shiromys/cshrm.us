"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl">
          <Image src="/logo.png" alt="CloudSourceHRM" width={36} height={36} className="rounded-lg shrink-0" />
          <span className="text-slate-900">CloudSource</span>
          <span className="text-pub-600">HRM</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="/#features" className="hover:text-pub-600 transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-pub-600 transition-colors">Pricing</Link>
          <Link href="https://www.cloudsourcehrm.com" target="_blank" className="hover:text-pub-600 transition-colors">CHRM NEXUS</Link>
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-pub-600 transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link href="/register" className="text-sm font-semibold bg-pub-600 text-white px-5 py-2 rounded-lg hover:bg-pub-700 transition-colors">
            Get started free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 text-slate-600" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-4 text-sm font-medium">
          <Link href="/#features" onClick={() => setOpen(false)} className="text-slate-700 hover:text-pub-600">Features</Link>
          <Link href="/pricing" onClick={() => setOpen(false)} className="text-slate-700 hover:text-pub-600">Pricing</Link>
          <Link href="https://www.cloudsourcehrm.com" target="_blank" className="text-slate-700 hover:text-pub-600">CHRM NEXUS</Link>
          <hr className="border-slate-100" />
          <Link href="/login" onClick={() => setOpen(false)} className="text-slate-700 hover:text-pub-600">Sign in</Link>
          <Link href="/register" onClick={() => setOpen(false)} className="bg-pub-600 text-white text-center py-2.5 rounded-lg hover:bg-pub-700">Get started free</Link>
        </div>
      )}
    </nav>
  );
}
