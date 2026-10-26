import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { isComingSoonGateActive } from "@/lib/coming-soon-gate";

export default async function SiteFooter() {
  // While the coming-soon gate is live, every footer link below rewrites
  // to /coming-soon, so the whole nav block is dead — hide it and keep
  // the rest of the footer. After launch (rewrite block removed from
  // middleware.ts) the nav returns automatically. See
  // lib/coming-soon-gate.ts.
  const gated = await isComingSoonGateActive();

  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div className="max-w-sm">
            <p className="font-bold text-ink">{siteConfig.siteName}</p>
            <p className="mt-2">
              Crowdsourced, anonymized home-services prices for The Triangle,
              North Carolina.
            </p>
            <p className="mt-2 italic">
              Built by a local Triangle homeowner to make all our lives easier.
            </p>
          </div>
          {!gated && (
            <nav className="flex flex-col gap-2 font-mono text-[13px]">
              <Link href="/how-it-works" className="hover:text-ink">
                How this works &amp; transparency
              </Link>
              <Link href="/check-quote" className="hover:text-ink">
                Check a quote
              </Link>
              <Link href="/feedback" className="hover:text-ink">
                Suggest a feature
              </Link>
              <Link href="/terms" className="hover:text-ink">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-ink">
                Privacy Policy
              </Link>
              <Link href="/submit" className="hover:text-ink">
                Submit a price
              </Link>
              <Link href="/donate" className="hover:text-ink">
                Tip the Price Book
              </Link>
            </nav>
          )}
        </div>
        <p className="mt-8 text-xs text-neutral-400">
          Operated by {siteConfig.operatorName}. Prices are community-reported
          and anonymous; verify before hiring.
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          © 2026 {siteConfig.operatorName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
