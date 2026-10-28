import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

/**
 * /browse is a client component, so it can't export metadata itself —
 * this layout carries its title, description, and canonical instead.
 */
export const metadata: Metadata = {
  title: "Browse Prices | Triangle Price Book",
  description:
    "Browse every crowdsourced home-services price reported by Triangle homeowners — filter by service, town, and date.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Browse Prices | Triangle Price Book",
    description:
      "Browse every crowdsourced home-services price reported by Triangle homeowners — filter by service, town, and date.",
    url: canonicalUrl("/browse"),
    type: "website",
  },
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: siteConfig.siteUrl },
          { name: "Browse Prices", url: canonicalUrl("/browse") },
        ])}
      />
      {children}
    </>
  );
}
