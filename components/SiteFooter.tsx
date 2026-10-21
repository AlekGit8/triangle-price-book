import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-stone-600">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div className="max-w-sm">
            <p className="font-bold text-brand-900">{siteConfig.siteName}</p>
            <p className="mt-2">
              Crowdsourced, anonymized home-services prices for{" "}
              {siteConfig.regionLongName}.
            </p>
            <p className="mt-2 italic">
              Built by a local Triangle homeowner to make all our lives easier.
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            <Link href="/how-it-works" className="hover:text-brand-800">
              How this works &amp; transparency
            </Link>
            <Link href="/terms" className="hover:text-brand-800">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-brand-800">
              Privacy Policy
            </Link>
            <Link href="/submit" className="hover:text-brand-800">
              Submit a price
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-stone-400">
          Prices are community-reported; verify before hiring. Business names
          are never collected — entries are anonymous by design.
        </p>
      </div>
    </footer>
  );
}
