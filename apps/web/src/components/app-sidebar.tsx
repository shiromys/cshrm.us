"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Mail, List, Briefcase,
  Settings, ShieldCheck, LogOut
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard",          icon: LayoutDashboard, label: "Dashboard" },
  { href: "/contacts",           icon: Users,           label: "Platform Contacts" },
  { href: "/employer-contacts",  icon: Building2,       label: "My Contacts" },
  { href: "/campaigns",          icon: Mail,            label: "Campaigns" },
  { href: "/hotlists",           icon: List,            label: "Hotlists" },
  { href: "/jobs",               icon: Briefcase,       label: "CHRMNEXUS Jobs" },
  { href: "/settings",           icon: Settings,        label: "Settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as unknown as Record<string, string>)?.role === "admin";

  return (
    <aside className="w-64 min-h-screen bg-brand-600 text-white flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="CloudSourceHRM" width={40} height={40} className="rounded-lg shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">CloudSourceHRM</p>
            <p className="text-xs text-blue-200 truncate">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-white/20 text-white font-medium"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-xs text-blue-300 uppercase tracking-wider px-3">Admin</p>
            </div>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-white/20 text-white font-medium"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Tier badge + sign out */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-blue-200">
            {(session?.user as unknown as Record<string, string>)?.tier === "standard" ? "Standard — $95/mo" : "Free Tier"}
          </span>
          {(session?.user as unknown as Record<string, string>)?.tier === "free" && (
            <Link href="/settings#upgrade" className="text-xs bg-white text-brand-600 px-2 py-1 rounded font-semibold hover:bg-blue-50">
              Upgrade
            </Link>
          )}
        </div>
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className="flex w-full items-center gap-2 text-blue-200 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
