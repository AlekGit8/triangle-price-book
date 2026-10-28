"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Google AdSense loader (publisher ID pub-9935150237512512). Loads via
 * next/script lazyOnload — after the whole page (including LCP) has
 * loaded, not competing with the first paint — and never on /admin (no
 * ads in the moderation UI, and admin visits aren't ad traffic). Switched
 * from afterInteractive on Oct 28, 2026 (LCP): afterInteractive made
 * Next.js preload the adsbygoogle script in <head>, fetching a heavy
 * third-party script before the hero could paint on slow connections.
 * The script connects the site to the AdSense account; ads show only
 * after AdSense approves the site and Auto ads (or ad units) are enabled
 * in the AdSense dashboard.
 */
export default function AdSense() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <Script
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9935150237512512"
      strategy="lazyOnload"
      crossOrigin="anonymous"
    />
  );
}
