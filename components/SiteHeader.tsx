import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { isComingSoonGateActive } from "@/lib/coming-soon-gate";
import TipJarIcon from "@/components/TipJarIcon";

const nav = [
  { href: "/browse", label: "Browse Prices" },
  { href: "/check-quote", label: "Check a Quote" },
  { href: "/how-it-works", label: "How This Works" },
  { href: "/feedback", label: "Feedback" },
  { href: "/donate", label: "Tip Jar" },
  { href: "/submit", label: "Submit a Price" },
];

export default async function SiteHeader() {
  // While the coming-soon gate is live, every public URL rewrites to
  // /coming-soon, so these nav links are dead — hide them and show only
  // the wordmark. After launch (rewrite block removed from
  // middleware.ts) the full nav returns automatically. See
  // lib/coming-soon-gate.ts for how the gate is detected.
  const gated = await isComingSoonGateActive();

  return (
    <header className="border-b border-line bg-white/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <span className="font-serif font-bold text-ink text-lg leading-tight">
            {siteConfig.siteName}
          </span>
        </Link>
        {!gated && (
          <nav className="flex items-center gap-1 sm:gap-2 text-sm overflow-x-auto">
            {nav.map((item) =>
              item.href === "/submit" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-[10px] bg-black px-4 py-2 font-semibold text-white hover:bg-neutral-800"
                >
                  {item.label}
                </Link>
              ) : item.href === "/donate" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group whitespace-nowrap px-3 py-2 text-muted hover:text-ink font-medium flex items-center gap-1.5"
                >
                  <TipJarIcon className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap px-3 py-2 text-muted hover:text-ink font-medium"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
