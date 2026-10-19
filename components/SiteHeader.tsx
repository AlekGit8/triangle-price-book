import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const nav = [
  { href: "/browse", label: "Browse Prices" },
  { href: "/how-it-works", label: "How This Works" },
  { href: "/submit", label: "Submit a Price" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white font-bold">
            $
          </span>
          <span className="font-bold text-brand-900 text-lg leading-tight">
            {siteConfig.siteName}
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm overflow-x-auto">
          {nav.map((item) =>
            item.href === "/submit" ? (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800"
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap px-3 py-2 text-stone-600 hover:text-brand-800 font-medium"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
