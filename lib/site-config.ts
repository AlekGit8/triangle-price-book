/**
 * CENTRALIZED BRANDING — rename the site by editing ONLY this file.
 * The name is currently being verified for trademark/domain availability,
 * so every component, page, and piece of metadata reads from here.
 */
export const siteConfig = {
  /** Public brand name shown everywhere (header, hero, footer, metadata). */
  siteName: "Triangle Price Book",

  /** Short tagline under the hero headline. */
  tagline: "What do home services actually cost in the Triangle?",

  /** Supporting line under the tagline. */
  subTagline:
    "Real prices paid by your neighbors — not national averages, not sponsored estimates.",

  /** Placeholder until a real domain is registered. */
  domainPlaceholder: "trianglepricebook.com",

  /** Human-readable region label used in copy. */
  regionName: "the Triangle",

  /** Region long name for SEO/legal copy. */
  regionLongName: "Raleigh-Durham Triangle, North Carolina",

  /** Report categories. Keep in sync with the DB check constraint in 0001_init.sql. */
  categories: ["HVAC", "Plumbing", "Electrical", "Roofing", "Windows & Doors", "Painting", "Flooring", "Landscaping", "Fencing", "Tree Service", "Septic Systems", "Handyman/Other"] as const,

  /** Contact email placeholder (replace once a real inbox exists). */
  contactEmail: "hello@trianglepricebook.com",

  /** One-line description for meta tags. */
  metaDescription:
    "Crowdsourced, anonymized home-services prices for the Raleigh-Durham Triangle. See what neighbors actually paid for HVAC, plumbing, electrical and more.",
} as const;

export type Category = (typeof siteConfig.categories)[number];

/** URL slugs for per-category landing pages (/hvac, /plumbing, …). */
export const categorySlugs = {
  HVAC: "hvac",
  Plumbing: "plumbing",
  Electrical: "electrical",
  Roofing: "roofing",
  "Windows & Doors": "windows-doors",
  Painting: "painting",
  Flooring: "flooring",
  Landscaping: "landscaping",
  Fencing: "fencing",
  "Tree Service": "tree-service",
  "Septic Systems": "septic-systems",
  "Handyman/Other": "handyman",
} as const satisfies Record<Category, string>;

export function categoryFromSlug(slug: string): Category | undefined {
  const entry = (Object.entries(categorySlugs) as Array<[Category, string]>).find(
    ([, s]) => s === slug
  );
  return entry?.[0];
}
