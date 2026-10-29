"use client";

import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import TipJarIcon from "@/components/TipJarIcon";
import ThemeToggle from "@/components/ThemeToggle";

const nav = [
  { href: "/browse", label: "Browse Prices" },
  { href: "/check-quote", label: "Check a Quote" },
  { href: "/how-it-works", label: "How This Works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/donate", label: "Tip Jar" },
  { href: "/submit", label: "Submit a Price" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-line bg-white/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <span className="font-serif font-bold text-ink text-lg leading-tight">
            {siteConfig.siteName}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {/* Desktop nav: hidden below lg, where the hamburger takes over.
              Eight links overflow at md widths, so the breakpoint is lg. */}
          <nav className="hidden lg:flex items-center gap-1 sm:gap-2 text-sm">
            {nav.map((item) =>
              item.href === "/submit" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-[10px] bg-black px-4 py-2 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200"
                >
                  {item.label}
                </Link>
              ) : item.href === "/donate" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="tip-jar-link whitespace-nowrap px-3 py-2 text-muted hover:text-ink font-medium flex items-center gap-1.5"
                >
                  <TipJarIcon className="h-[20px] w-[20px] shrink-0" />
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
          <ThemeToggle />
          {/* Mobile hamburger: opens a stacked menu, so the header never scrolls sideways */}
          <button
            type="button"
            className="lg:hidden rounded-[10px] px-3 py-2 text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile menu panel */}
      {open && (
        <nav className="lg:hidden border-t border-line bg-white dark:bg-neutral-900">
          <div className="mx-auto max-w-6xl px-4 py-2 flex flex-col text-sm">
            {nav.map((item) =>
              item.href === "/submit" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="mt-2 mb-2 rounded-[10px] bg-black px-4 py-3 text-center font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200"
                >
                  {item.label}
                </Link>
              ) : item.href === "/donate" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="tip-jar-link px-3 py-3 text-muted hover:text-ink font-medium flex items-center gap-1.5"
                >
                  <TipJarIcon className="h-[20px] w-[20px] shrink-0" />
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-3 text-muted hover:text-ink font-medium"
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
