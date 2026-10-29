import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework in the X-Powered-By response header.
  poweredByHeader: false,
  async headers() {
    // Public read pages may be cached (LCP, Oct 28, 2026): repeat
    // visits serve from the browser cache for 60s, and s-maxage covers
    // any future CDN cache rule. Report data changes only on publish /
    // takedown, so at most 5 min of staleness. Interactive pages
    // (/submit, /check-quote), /admin, /api/*, and /go/* are deliberately
    // NOT listed — they must never be cached.
    const cacheControl = [
      "public",
      "max-age=60",
      "s-maxage=300",
      "stale-while-revalidate=300",
    ].join(", ");
    const publicPaths = [
      "/",
      "/browse",
      "/terms",
      "/privacy",
      "/how-it-works",
      "/about",
      "/contact",
      "/donate",
      "/feedback",
      "/hvac",
      "/plumbing",
      "/electrical",
      "/roofing",
      "/windows-doors",
      "/painting",
      "/flooring",
      "/landscaping",
      "/fencing",
      "/tree-service",
      "/pools",
      "/septic-systems",
      "/garage-doors",
      "/crawl-spaces",
      "/gutter-guards",
      "/chimneys",
      "/garage-floors",
      "/concrete",
      "/handyman",
    ];
    return publicPaths.map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: cacheControl }],
    }));
  },
};
export default nextConfig;
