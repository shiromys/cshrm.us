import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl mb-4">
              <img src="/logo.png" alt="CloudSourceHRM" width={36} height={36} className="rounded-lg shrink-0" />
              <span className="text-white">CloudSource</span>
              <span className="text-pub-400">HRM</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              The recruiter member portal for the CHRM NEXUS ecosystem. Manage contacts, run campaigns, and build hotlists — all from one place.
            </p>
            <p className="text-xs mt-4 text-slate-500">
              A product of{" "}
              <a href="https://shirotechnologies.com" target="_blank" className="text-pub-400 hover:text-pub-300">
                SHIRO Technologies LLC
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Get started</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Sign in</Link></li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Ecosystem</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://www.cloudsourcehrm.com" target="_blank" className="hover:text-white transition-colors">
                  CHRM NEXUS Platform
                </a>
              </li>
              <li>
                <a href="https://cloudsourcehrm.net" target="_blank" className="hover:text-white transition-colors">
                  CloudSourceHRM.net
                </a>
              </li>
              <li>
                <a href="https://www.cloudsourcehrm.com/api" target="_blank" className="hover:text-white transition-colors">
                  API Access
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SHIRO Technologies LLC. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
