import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";

const nav = [
  { href: "/browse", label: "Browse Prices" },
  { href: "/how-it-works", label: "How This Works" },
  { href: "/submit", label: "Submit a Price" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-line bg-white/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.svg"
            alt="Triangle Price Book logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="font-bold text-ink text-lg leading-tight">
            {siteConfig.siteName}
          </span>
        </Link>
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
      </div>
    </header>
  );
}
