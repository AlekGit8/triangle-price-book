import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `${siteConfig.siteName} — ${siteConfig.tagline}`,
  description: siteConfig.metaDescription,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
