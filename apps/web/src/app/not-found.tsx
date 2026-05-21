import Link from "next/link";
import { CsHrmLogo } from "@/components/cshrm-logo";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 font-bold text-xl mb-12">
        <CsHrmLogo size={40} />
        <span className="text-slate-900">CloudSource</span>
        <span className="text-pub-500">HRM</span>
      </Link>

      {/* 404 graphic */}
      <div className="relative mb-8">
        <p className="text-[9rem] font-black text-slate-100 leading-none select-none">404</p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg px-8 py-5 border border-slate-200">
            <p className="text-4xl font-bold text-slate-800">Oops!</p>
          </div>
        </div>
      </div>

      {/* Copy */}
      <h1 className="text-2xl font-bold text-slate-900 mb-3">Page not found</h1>
      <p className="text-slate-500 max-w-md mb-10 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        Head back home or check that the URL is correct.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/dashboard">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Footer note */}
      <p className="mt-16 text-xs text-slate-400">
        Need help?{" "}
        <a href="mailto:support@shirotechnologies.com" className="text-pub-500 hover:underline">
          Contact support
        </a>
      </p>
    </div>
  );
}
