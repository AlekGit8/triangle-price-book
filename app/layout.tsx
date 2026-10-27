import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SponsorBanner from "@/components/SponsorBanner";
import AnalyticsBeacon from "@/components/AnalyticsBeacon";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `${siteConfig.siteName} — ${siteConfig.tagline}`,
  description: siteConfig.metaDescription,
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
    <html lang="en">
      <head>
        {/* Google AdSense — publisher ID pub-9935150237512512. The script
            connects the site to the AdSense account; ads show only after
            AdSense approves the site and Auto ads (or ad units) are
            enabled in the AdSense dashboard. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9935150237512512"
          crossOrigin="anonymous"
        />
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
      </body>
    </html>
  );
}
