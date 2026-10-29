import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export default function SiteFooter() {
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
          <nav className="flex flex-col gap-2 font-mono text-[13px]">
              <Link href="/about" className="hover:text-ink">
                About
              </Link>
              <Link href="/contact" className="hover:text-ink">
                Contact
              </Link>
              <Link href="/how-it-works" className="hover:text-ink">
                How this works &amp; transparency
              </Link>
              <Link href="/check-quote" className="hover:text-ink">
                Check a quote
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
                Tip Jar
              </Link>
            </nav>
        </div>
        <p className="mt-8 text-xs text-neutral-400">
          Operated by{" "}
          <a
            href="https://longsitelabs.com"
            className="text-inherit no-underline hover:text-inherit hover:no-underline focus:outline-none"
          >
            {siteConfig.operatorName}
          </a>
          . Prices are community-reported and anonymous; verify before
          hiring.
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          © 2026{" "}
          <a
            href="https://longsitelabs.com"
            className="text-inherit no-underline hover:text-inherit hover:no-underline focus:outline-none"
          >
            {siteConfig.operatorName}
          </a>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}
