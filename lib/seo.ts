import { siteConfig } from "./site-config";

/**
 * SEO helpers (Oct 28, 2026): canonical URLs + JSON-LD structured data.
 *
 * Only safe schemas are used: WebSite, FAQPage, and BreadcrumbList.
 * Prices are deliberately NOT marked up as Product/Offer — these are
 * historical prices paid, not things for sale, and misusing that
 * schema is a spam signal.
 */

export function canonicalUrl(path: string): string {
  return `${siteConfig.siteUrl}${path}`;
}

/** WebSite — rendered once in the root layout. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    description: siteConfig.metaDescription,
    inLanguage: "en-US",
  };
}

/** FAQPage — rendered on the homepage from the same FAQ data the page
 *  shows (lib/faq.ts), so the markup can never drift from the visible
 *  answers. */
export function faqJsonLd(
  faq: Array<{ q: string; a: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** BreadcrumbList — Home → current page. */
export function breadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}
