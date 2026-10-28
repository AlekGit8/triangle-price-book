"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Google AdSense loader (publisher ID pub-9935150237512512). Loads via
 * next/script afterInteractive — after hydration, not render-blocking —
 * and never on /admin (no ads in the moderation UI, and admin visits
 * aren't ad traffic). The script connects the site to the AdSense
 * account; ads show only after AdSense approves the site and Auto ads
 * (or ad units) are enabled in the AdSense dashboard.
 */
export default function AdSense() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <Script
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9935150237512512"
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
