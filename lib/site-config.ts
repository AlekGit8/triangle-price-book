/**
 * CENTRALIZED BRANDING — rename the site by editing ONLY this file.
 * The name is currently being verified for trademark/domain availability,
 * so every component, page, and piece of metadata reads from here.
 */
export const siteConfig = {
  /** Public brand name shown everywhere (header, hero, footer, metadata). */
  siteName: "Triangle Price Book",

  /** Short tagline under the hero headline. */
  tagline: "What do home services actually cost in the NC Triangle?",

  /** Supporting line under the tagline. */
  subTagline:
    "Real prices paid by your neighbors — not national averages, not sponsored estimates.",

  /** Placeholder until a real domain is registered. */
  domainPlaceholder: "trianglepricebook.com",

  /**
   * Canonical base URL used for sitemap.xml, robots.txt, and metadata.
   * Custom domain connected Oct 22, 2026 — apex 308-redirects to www.
   */
  siteUrl: "https://www.trianglepricebook.com",

  /** Human-readable region label used in copy. */
  regionName: "the Triangle",

  /** Region long name for SEO/legal copy. */
  regionLongName: "Raleigh-Durham Triangle, North Carolina",

  /** Report categories. Keep in sync with the DB check constraint in 0001_init.sql. */
  categories: ["HVAC", "Plumbing", "Electrical", "Roofing", "Windows & Doors", "Painting", "Flooring", "Landscaping", "Fencing", "Tree Service", "Pools", "Septic Systems", "Garage Doors", "Crawl Spaces", "Gutter Guards", "Chimneys", "Garage Floors", "Concrete", "Handyman/Other"] as const,

  /** Legal operator of the site, named in Terms, Privacy Policy, and footer. */
  operatorName: "Longsite Labs LLC",

  /** Contact email placeholder (replace once a real inbox exists). */
  contactEmail: "hello@trianglepricebook.com",

  /**
   * Stripe Payment Link for tips (created Oct 25, 2026, livemode,
   * Longsite Labs LLC). One link, donor chooses the amount ($1–$500,
   * preset $5 — changed from $10 on Oct 27, 2026; the $10 price is
   * immutable, so this is a new price + new link and the old ones are
   * deactivated). Price: price_1UVLJRAJQeL1alfkRrU6DOKA;
   * link: plink_1UVLMgAJQeL1alfk1EJpOGfy.
   */
  donateUrl: "https://donate.stripe.com/7sYeVcdn55KM2sfeHb73G02",

  /** One-line description for meta tags. */
  metaDescription:
    "Crowdsourced, anonymized home-services prices for the Raleigh-Durham Triangle. See what neighbors actually paid for HVAC, plumbing, electrical and more.",
} as const;

/**
 * Sponsor banner config (Oct 26, 2026).
 *
 * One active sponsor at a time. The banner (components/SponsorBanner)
 * shows only while `activeSponsor` is set AND today is inside its
 * flight (startsAt inclusive, endsAt exclusive). With `null` the
 * banner renders nothing — no placeholder, no empty slot.
 *
 * A flight is sold as 2 weeks at the $15/week founding rate ($30
 * total). To start one, fill in the real sponsor's slug (lowercase,
 * hyphens), name, one-line headline, destination URL, and flight
 * dates, then redeploy. Clicks are counted by the /go/<slug>
 * redirect (sponsor_clicks table); impressions are human page views
 * from analytics_page_views while the banner is live; the report is
 * in /admin under the Sponsors tab. Sponsors get zero influence over
 * listings, prices, or moderation.
 */
export interface Sponsor {
  slug: string;
  name: string;
  headline: string;
  destinationUrl: string;
  /** ISO timestamp, flight start (inclusive). The report uses the UTC calendar dates of these timestamps, so set them at midnight UTC for a clean date range. */
  startsAt: string;
  /** ISO timestamp, flight end (exclusive). */
  endsAt: string;
}

/**
 * No active sponsor — the banner is hidden. Set this to a sponsor
 * object (see the Sponsor interface above) to start a flight.
 */
export const activeSponsor: Sponsor | null = null;

/**
 * Outreach links (Oct 26, 2026) — one tracked link per company in
 * the sponsorship cold-outreach emails. Each link goes through
 * /go/<slug>, which logs one anonymous click to sponsor_clicks and
 * 302-redirects to the homepage. Unlike sponsor banner links, these
 * have no flight dates: they stay live so follow-up emails and late
 * clicks keep counting. Check clicks in /admin under the Sponsors
 * tab by entering the slug (e.g. outreach-blaze) — the report works
 * for any slug, not just the active sponsor. Slugs are prefixed
 * "outreach-" so they never collide with a sponsor slug and are
 * easy to tell apart in the clicks table.
 */
export const outreachLinks: Record<
  string,
  { company: string; destinationUrl: string; group: "contractors" | "news" | "plumbing" }
> = {
  "outreach-blaze": {
    company: "Blaze Heating, Cooling, Electrical & Plumbing",
    destinationUrl: siteConfig.siteUrl,
    group: "contractors",
  },
  "outreach-cr3": {
    company: "CR3 American Exteriors",
    destinationUrl: siteConfig.siteUrl,
    group: "contractors",
  },
  "outreach-faircloth": {
    company: "Faircloth Roofing",
    destinationUrl: siteConfig.siteUrl,
    group: "contractors",
  },
  "outreach-roof-medic": {
    company: "Roof Medic",
    destinationUrl: siteConfig.siteUrl,
    group: "contractors",
  },
  "outreach-big-bear": {
    company: "Big Bear Roofing",
    destinationUrl: siteConfig.siteUrl,
    group: "contractors",
  },
  // News outlets (Oct 26, 2026) — one tracked link per outlet in the
  // news-outreach drafts, so a click tells you which outlet visited.
  // outreach-news-observer is for the held N&O draft (do not send yet);
  // the link is ready if that draft is ever un-held.
  "outreach-wral": {
    company: "WRAL-TV",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-abc11": {
    company: "ABC11 / WTVD",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-cbs17": {
    company: "CBS 17 / WNCN",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-spectrum": {
    company: "Spectrum News 1 North Carolina",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-news-observer": {
    company: "The News & Observer",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-tbj": {
    company: "Triangle Business Journal",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-axios": {
    company: "Axios Raleigh",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-indyweek": {
    company: "Indy Week",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-assembly": {
    company: "The Assembly",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-raleigh-convergence": {
    company: "Raleigh Convergence",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-wunc": {
    company: "WUNC",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-cary-citizen": {
    company: "Cary Citizen",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-raleigh-magazine": {
    company: "Raleigh Magazine",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-cary-magazine": {
    company: "Cary Magazine",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-wake-weekly": {
    company: "Wake Weekly",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  "outreach-main-broad": {
    company: "Main & Broad",
    destinationUrl: siteConfig.siteUrl,
    group: "news",
  },
  // Plumbing companies (Oct 27, 2026) — one tracked link per company
  // in the plumbing-outreach drafts. All 6 emails verified on the
  // companies' own sites Oct 27 (see plumbing-outreach-drafts-2026-10-27.md).
  "outreach-pooles": {
    company: "Poole's Plumbing",
    destinationUrl: siteConfig.siteUrl,
    group: "plumbing",
  },
  "outreach-silver-brook": {
    company: "Silver Brook Plumbing",
    destinationUrl: siteConfig.siteUrl,
    group: "plumbing",
  },
  "outreach-cks": {
    company: "CK's Plumbing & Backflow",
    destinationUrl: siteConfig.siteUrl,
    group: "plumbing",
  },
  "outreach-a-team": {
    company: "A-Team Plumbing & Drain",
    destinationUrl: siteConfig.siteUrl,
    group: "plumbing",
  },
  "outreach-full-stack": {
    company: "Full Stack Plumbing & Well",
    destinationUrl: siteConfig.siteUrl,
    group: "plumbing",
  },
  "outreach-peak-durham": {
    company: "Peak Durham Plumbers",
    destinationUrl: siteConfig.siteUrl,
    group: "plumbing",
  },
};

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
  "Pools": "pools",
  "Septic Systems": "septic-systems",
  "Garage Doors": "garage-doors",
  "Crawl Spaces": "crawl-spaces",
  "Gutter Guards": "gutter-guards",
  "Chimneys": "chimneys",
  "Garage Floors": "garage-floors",
  "Concrete": "concrete",
  "Handyman/Other": "handyman",
} as const satisfies Record<Category, string>;

export function categoryFromSlug(slug: string): Category | undefined {
  const entry = (Object.entries(categorySlugs) as Array<[Category, string]>).find(
    ([, s]) => s === slug
  );
  return entry?.[0];
}
