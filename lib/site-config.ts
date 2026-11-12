/**
 * CENTRALIZED BRANDING — rename the site by editing ONLY this file.
 * Name cleared Oct 17–21, 2026 (USPTO, NC SOS, common-law checks);
 * trianglepricebook.com bought Oct 22, 2026. Every component, page,
 * and piece of metadata reads from here.
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
  categories: ["HVAC", "Plumbing", "Electrical", "Roofing", "Windows & Doors", "Painting", "Flooring", "Landscaping", "Fencing", "Tree Service", "Pools", "Septic Systems", "Garage Doors", "Crawl Spaces", "Gutter Guards", "Chimneys", "Garage Floors", "Concrete", "Cleaning", "Nanny", "Lawn Care", "Remodeling", "Trash/Recycling", "Handyman/Other"] as const,

  /**
   * Per-category intro copy for the category pages (Oct 28, 2026 SEO;
   * `guide` added Nov 12, 2026 for the AdSense low-value-content
   * cleanup). Qualitative only — what the work covers, what drives
   * the price, and what to look for in a quote. NEVER put a price
   * range here; the numbers come from the reports themselves (the
   * summary line above the reports). Empty categories still show
   * this, so the page has substance before the first report.
   */
  categoryIntros: {
    HVAC: {
      about:
        "Heating and cooling work — installs, replacements, repairs, and maintenance for furnaces, heat pumps, air conditioners, and ductwork.",
      drivers:
        "System size and efficiency rating, ductwork changes, and whether it's a like-for-like swap or a first-time install move the price most.",
      guide:
        "Triangle summers are long and humid, so cooling reliability matters as much as heating — and heat pumps are common here, doing both jobs in one system. A good quote spells out the equipment size and efficiency rating, what happens to the old unit and any ductwork, and whether thermostat and permit costs are included. When quotes differ widely, check whether each one is pricing the same scope: a like-for-like swap and a first-time install with new ductwork are different jobs, even when the equipment looks similar.",
    },
    Plumbing: {
      about:
        "Repairs, replacements, and installs for water heaters, fixtures, pipes, drains, and sewer lines.",
      drivers:
        "Access to the work area, pipe material, and whether walls or floors have to be opened up drive the cost.",
      guide:
        "Much of the cost difference in plumbing comes down to access: work in an open crawl space or unfinished basement is a different job from work behind finished walls or under a slab. A good quote names the pipe material, what gets opened up and put back, and whether fixtures are included or supplied separately. For water heaters, check whether the quote covers disposal of the old unit and any venting or gas-line changes, not just the heater itself.",
    },
    Electrical: {
      about:
        "Panel upgrades, circuits, outlets, lighting, EV chargers, and whole-home safety work.",
      drivers:
        "Panel capacity, permit requirements, and how much wiring has to be run through finished walls matter most.",
      guide:
        "Panel capacity is the first question for most Triangle electrical work — older homes may need a panel upgrade before a new circuit, EV charger, or addition is possible. A good quote lists the panel work, the circuits being added, and whether permits and inspection are included. If quotes differ, check whether each one includes the same panel scope: an estimate that assumes spare capacity and one that includes an upgrade are not comparable.",
    },
    Roofing: {
      about:
        "Full roof replacements, repairs, flashing, and gutter work.",
      drivers:
        "Roof size and pitch, material choice, and how many layers have to come off drive the price.",
      guide:
        "Triangle roofs take summer storms, hail, and heavy pine needle and leaf fall, so flashing details and ventilation matter as much as the shingle itself. A good quote states the material and warranty, how many existing layers come off, and what happens with flashing, vents, and cleanup. Ask whether the price covers replacing damaged decking if it's found once the old roof is off, and how that extra work is priced.",
    },
    "Windows & Doors": {
      about:
        "Window and exterior door replacement and installation.",
      drivers:
        "Unit count, frame material, glass options, and whether the opening needs reframing set the cost.",
      guide:
        "Replacement windows and doors vary mostly by frame material, glass package, and whether the existing opening needs reframing or new trim. A good quote lists each unit separately, names the glass and frame, and says whether interior and exterior trim work is included. When comparing quotes, make sure each one counts the same units and the same trim scope — a lower price often means less of the opening is being rebuilt.",
    },
    Painting: {
      about:
        "Interior and exterior painting, including prep, priming, and finish coats.",
      drivers:
        "Square footage, wall condition and prep work, ceiling height, and paint quality drive the price.",
      guide:
        "Prep work is where painting quotes diverge: washing, scraping, caulking, and priming take time, and skipping them shows up fast in Triangle humidity. A good quote states how many coats, what paint is used, and exactly what prep is included for walls, trim, and ceilings. Ask how the crew protects floors and furniture, and whether the price includes touch-ups after the paint cures.",
    },
    Flooring: {
      about:
        "Hardwood, laminate, vinyl, tile, and carpet installation and refinishing.",
      drivers:
        "Material, square footage, subfloor condition, and removal of old flooring set the cost.",
      guide:
        "Subfloor condition drives more flooring surprises than the material itself — an uneven or damaged subfloor needs leveling or repair before anything goes down. A good quote names the material and underlayment, what happens to the old flooring, and how transitions and trim are handled. For refinishing, check whether sanding, staining, and the number of finish coats are all spelled out.",
    },
    Landscaping: {
      about:
        "Design, planting, grading, sod, mulch, and outdoor living work.",
      drivers:
        "Project size, plant and material choices, grading needs, and access for equipment drive the price.",
      guide:
        "Triangle landscaping has to reckon with heavy clay soil, which drains poorly and affects grading, planting, and drainage work. A good quote breaks out plants and materials separately from labor, states the grading or drainage scope, and says what happens to excavated soil and debris. Ask what is guaranteed — plant survival, drainage performance — and for how long, since those guarantees vary widely.",
    },
    Fencing: {
      about:
        "Wood, vinyl, aluminum, and chain-link fence installation and repair.",
      drivers:
        "Linear feet, height, material, gates, and slope or rock in the ground set the cost.",
      guide:
        "Fence quotes in the Triangle often hinge on the ground: clay, roots, and rock slow post-setting, and slopes mean stepped or racked panels. A good quote states the material, height, and linear footage, how many gates and of what type, and whether old fence removal and haul-away are included. Confirm who handles the property-line and HOA questions before posts go in — a fence in the wrong place is an expensive mistake to move.",
    },
    "Tree Service": {
      about:
        "Tree removal, trimming, stump grinding, and storm cleanup.",
      drivers:
        "Tree size and height, proximity to the house or power lines, and whether a crane is needed drive the price.",
      guide:
        "Tree work pricing turns on risk and access: a tree leaning toward a house or tangled near power lines needs different equipment and crew than one in open yard. A good quote says whether the price covers removal, stump grinding, and debris haul-away, or just the cut. Ask for proof of insurance before work starts, and confirm who is responsible if a limb damages a roof, fence, or neighbor's property.",
    },
    Pools: {
      about:
        "Pool installation, resurfacing, equipment replacement, and repairs.",
      drivers:
        "Pool size and type, equipment choices, and decking or plumbing changes set the cost.",
      guide:
        "Pool work ranges from equipment swaps to full resurfacing, and the quote should make clear which job it is. A good quote names the equipment or finish, what decking or plumbing changes are included, and how long the pool will be out of service. Ask about warranties separately for the finish, the equipment, and the labor — they are often different lengths and held by different parties.",
    },
    "Septic Systems": {
      about:
        "Septic installs, repairs, pumping, and inspections.",
      drivers:
        "Tank size, drain-field condition, soil and permitting, and how much digging is required drive the price.",
      guide:
        "Septic systems are common in parts of the Triangle outside municipal sewer, and the drain field — not just the tank — usually decides the scope and the permitting path. A good quote states whether it covers inspection, pumping, repair, or replacement, and what soil or site work is included. Ask whether permits and county inspections are handled by the contractor and included in the price, since that varies by company.",
    },
    "Garage Doors": {
      about:
        "Garage door and opener replacement, repair, and installation.",
      drivers:
        "Door size and material, insulation, opener features, and track or spring work set the cost.",
      guide:
        "Garage door quotes differ mainly by door construction and insulation, opener features, and whether tracks, springs, and hardware are replaced too. A good quote lists the door model and insulation, the opener and its features, and what hardware is included. Springs and cables are high-tension parts — ask whether their replacement is in the price, and confirm the warranty covers both the door and the opener.",
    },
    "Crawl Spaces": {
      about:
        "Encapsulation, vapor barriers, insulation, drainage, and dehumidifiers.",
      drivers:
        "Crawl space size, moisture damage, drainage needs, and insulation choice drive the price.",
      guide:
        "Many Triangle homes sit over crawl spaces, and humidity makes moisture control the central issue: vapor barriers, drainage, insulation, and dehumidification are often quoted together or separately. A good quote spells out each layer — barrier thickness, drainage, insulation type, dehumidifier — rather than one lump sum for 'encapsulation.' Ask what moisture level the system is designed to hold, and what maintenance the dehumidifier needs.",
    },
    "Gutter Guards": {
      about:
        "Gutter guard installation, plus gutter cleaning and repair.",
      drivers:
        "Linear feet, guard type, gutter condition, and roof height set the cost.",
      guide:
        "Gutter guard quotes turn on guard type and on the condition of the gutters underneath — guards on sagging or damaged gutters just hide the problem. A good quote states the guard type, the linear footage, and whether cleaning, repair, or realignment of the existing gutters is included. With Triangle pine needles and oak leaves, ask how the guard handles fine debris and whether the company will clear clogs under warranty.",
    },
    Chimneys: {
      about:
        "Chimney cleaning, inspection, repair, and cap installation.",
      drivers:
        "Chimney height and condition, liner needs, and masonry repairs drive the price.",
      guide:
        "Chimney work starts with condition: a cleaning and inspection is a different job from liner replacement or masonry repair, and the quote should say which it is. A good quote lists the inspection findings it is based on, the liner or repair scope, and whether a cap is included. Ask for photos or a written report of the flue condition before approving repair work — you generally cannot see the problem from the ground.",
    },
    "Garage Floors": {
      about:
        "Epoxy coatings, polished concrete, and garage floor refinishing.",
      drivers:
        "Square footage, floor condition and prep, coating type, and moisture issues set the cost.",
      guide:
        "Garage floor coatings live or die on preparation: grinding, crack repair, and moisture testing determine whether a coating stays down. A good quote states the prep method, the coating system and number of coats, and how cracks and stains are handled. Ask how the installer tests for moisture coming through the slab, since coatings applied over a damp slab tend to peel.",
    },
    Concrete: {
      about:
        "Driveways, patios, walkways, slabs, and concrete repair.",
      drivers:
        "Square footage, thickness, finish, and site prep or demolition drive the price.",
      guide:
        "Concrete pricing follows thickness, finish, and site prep — a driveway, a patio, and a walkway are different jobs even at the same square footage. A good quote states the thickness, the finish, what base preparation is included, and whether demolition and haul-away of old concrete are in the price. Ask about control joints and curing, and confirm who handles any HOA or setback questions before the pour.",
    },
    Cleaning: {
      about:
        "House cleaning, deep cleans, move-out cleans, and recurring maid service.",
      drivers:
        "Home size, bedroom and bathroom count, clean type (standard vs deep), and frequency drive the price.",
      guide:
        "Cleaning quotes vary by what 'clean' means: a standard recurring clean, a deep clean, and a move-out clean cover different tasks. A good quote lists the rooms and tasks included, whether supplies and equipment are supplied, and how bathrooms and kitchens are handled. Ask what happens if something is missed — whether the company returns to fix it — and how scheduling and cancellation work for recurring service.",
    },
    Nanny: {
      about:
        "In-home childcare — full-time, part-time, and occasional nanny care.",
      drivers:
        "Hours per week, number and ages of children, and whether household tasks are included set the rate.",
      guide:
        "Nanny rates turn on hours, the number and ages of the children, and what else the role includes beyond childcare. A good arrangement spells out the schedule, whether household tasks are part of the job, and how sick days, holidays, and schedule changes are handled. Families comparing arrangements should check whether the rate is quoted per hour or per week, and whether taxes and payroll are handled formally or left to the family.",
    },
    "Lawn Care": {
      about:
        "Mowing, edging, fertilization, weed control, and seasonal yard maintenance.",
      drivers:
        "Yard size, service frequency, terrain and slope, and whether treatments or leaf cleanup are included drive the price.",
      guide:
        "Triangle lawns sit in a transition zone, so cool-season and warm-season grasses are both common, and what a lawn service includes changes through the year. A good quote states the mowing frequency, whether edging, blowing, and trimming are included, and whether fertilization, weed control, and leaf cleanup are separate. Ask how the schedule adjusts in winter dormancy and after heavy rain, when mowing may need to shift.",
    },
    Remodeling: {
      about:
        "Kitchen, bathroom, and whole-home remodeling, including layout changes, fixtures, and finishes.",
      drivers:
        "Project scope, room size, material and fixture choices, and whether walls move or plumbing relocates drive the price.",
      guide:
        "Remodeling quotes are hard to compare unless each one prices the same scope — the same layout, materials, and fixtures, with allowances spelled out. A good quote breaks out labor, materials, and allowances separately, states what happens with permits and inspections, and names who supplies fixtures and finishes. Ask how changes mid-project are priced, since change orders are where remodeling budgets most often grow.",
    },
    "Trash/Recycling": {
      about:
        "Trash and recycling pickup, junk removal, and dumpster rental.",
      drivers:
        "Pickup frequency, bin or dumpster size, volume and weight of material, and whether items need special handling drive the price.",
      guide:
        "Trash and recycling service in the Triangle varies by provider and by whether pickup is municipal, HOA-arranged, or private — and junk removal and dumpster rental are priced differently again. A good quote states the pickup frequency, bin size, and what materials are accepted or excluded, and for dumpsters, the rental period and weight allowance. Ask about fees for overweight loads, extra pickups, and items that need special handling.",
    },
    "Handyman/Other": {
      about:
        "Small repairs, drywall, assembly, and miscellaneous home fixes.",
      drivers:
        "Job size and complexity, materials, and whether the work needs a licensed trade set the cost.",
      guide:
        "Handyman work covers the jobs too small for a trade contractor, and quotes vary by whether the job is priced by the hour or by the job. A good quote states the scope, whether materials are included or billed separately, and what happens if the job uncovers a bigger problem. For work that touches electrical, plumbing, or structural elements, ask whether a licensed trade is needed instead — the cheapest fix is not always the right trade for the job.",
    },
  } as const,

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
  { company: string; destinationUrl: string; group: "contractors" | "news" | "plumbing" | "realtor" }
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
  // Realtors (Oct 30, 2026) — one tracked link per realtor in the
  // realtor-outreach drafts. Slugs prefixed "realtor-" so they show
  // as their own group in the admin Sponsors list.
  "realtor-jami-amidon": {
    company: "Jami Amidon Real Estate",
    destinationUrl: siteConfig.siteUrl,
    group: "realtor",
  },
  "realtor-debbie-vanhorn": {
    company: "Debbie VanHorn & Co.",
    destinationUrl: siteConfig.siteUrl,
    group: "realtor",
  },
  "realtor-abshure": {
    company: "Abshure Realty Group",
    destinationUrl: siteConfig.siteUrl,
    group: "realtor",
  },
  "realtor-front-porch": {
    company: "Front Porch Realty",
    destinationUrl: siteConfig.siteUrl,
    group: "realtor",
  },
  "realtor-nexthome-rare": {
    company: "NextHome RARE Properties",
    destinationUrl: siteConfig.siteUrl,
    group: "realtor",
  },
  "realtor-hillman": {
    company: "Hillman Real Estate Group",
    destinationUrl: siteConfig.siteUrl,
    group: "realtor",
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
  "Cleaning": "cleaning",
  "Nanny": "nanny",
  "Lawn Care": "lawn-care",
  "Remodeling": "remodeling",
  "Trash/Recycling": "trash-recycling",
  "Handyman/Other": "handyman",
} as const satisfies Record<Category, string>;

export function categoryFromSlug(slug: string): Category | undefined {
  const entry = (Object.entries(categorySlugs) as Array<[Category, string]>).find(
    ([, s]) => s === slug
  );
  return entry?.[0];
}

/**
 * Minimum published reports for a category page to be indexed
 * (Nov 12, 2026 — AdSense "low value content" cleanup). Categories
 * below this threshold get robots noindex (see app/[category]/
 * page.tsx) and are left out of the sitemap (see app/sitemap.ts),
 * so search engines don't judge the site by near-empty template
 * pages. The pages stay live and shareable; they flip to indexable
 * automatically once they reach this many reports. Count lookups
 * fail open (indexable) when the database can't be reached.
 */
export const MIN_CATEGORY_REPORTS_FOR_INDEXING = 3;

