import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SponsorBanner from "@/components/SponsorBanner";
import AnalyticsBeacon from "@/components/AnalyticsBeacon";
import AdSense from "@/components/AdSense";
import JsonLd from "@/components/JsonLd";
import { websiteJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: `${siteConfig.siteName} — ${siteConfig.tagline}`,
  description: siteConfig.metaDescription,
  // Canonical home is www — the apex 301-redirects there in
  // middleware, so every page has exactly one indexable URL.
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.siteName} — ${siteConfig.tagline}`,
    description: siteConfig.metaDescription,
    url: siteConfig.siteUrl,
    siteName: siteConfig.siteName,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.siteName} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.siteName} — ${siteConfig.tagline}`,
    description: siteConfig.metaDescription,
    images: ["/og.png"],
  },
};

/**
 * Marc Lou redesign type system (self-hosted at build via next/font —
 * Workers-safe, no runtime Google Fonts fetch):
 * Instrument Serif for display headlines, Inter for body/UI,
 * JetBrains Mono for prices, labels, tables and badges.
 */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme init — runs before first paint so the page never flashes
            the wrong theme. Saved choice in localStorage wins; otherwise
            the site is LIGHT — the OS dark-mode preference is ignored
            (Oct 28, 2026: light by default, every visit). Must stay a
            plain inline script (no next/script): it has to run
            synchronously in <head>. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('tpb-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        {/* Structured data — WebSite on every page (see lib/seo.ts).
            FAQPage lives on the homepage, BreadcrumbList on category
            and browse pages. */}
        <JsonLd data={websiteJsonLd()} />
        {/* Google AdSense — see components/AdSense.tsx (next/script,
            afterInteractive, skipped on /admin). */}
        {/* Google Analytics (GA4) — measurement ID G-MC0YJN4QZZ. The tag
            loads on every page via this root layout; do not add it
            anywhere else. */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-MC0YJN4QZZ"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-MC0YJN4QZZ');`,
          }}
        />
      </head>
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} min-h-screen bg-paper font-sans text-ink antialiased`}
      >
        <SiteHeader />
        <SponsorBanner />
        <main className="mx-auto max-w-6xl px-4">{children}</main>
        <SiteFooter />
        <AnalyticsBeacon />
        <AdSense />
      </body>
    </html>
  );
}
