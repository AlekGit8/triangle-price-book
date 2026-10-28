"use client";

import { usePathname } from "next/navigation";
import { activeSponsor } from "@/lib/site-config";

/**
 * Sponsor banner (Oct 26, 2026) — the top-of-site slot sold as a
 * 2-week founding sponsorship ($30 total, $15/week).
 *
 * - Renders only while a sponsor is configured in
 *   lib/site-config.ts `activeSponsor` AND today is inside its
 *   flight (startsAt inclusive, endsAt exclusive). With no active
 *   sponsor the banner renders nothing — there is no placeholder,
 *   house ad, or empty slot.
 * - Hidden on /admin (the admin's own visits are not sponsor traffic).
 * - Clearly labeled "Sponsored". The link goes through /go/<slug>,
 *   which logs one anonymous click and redirects to the sponsor's
 *   site; rel="sponsored" marks the link for search engines.
 * - The banner never appears inside or between price listings — it
 *   is a single strip under the header. Sponsors get zero influence
 *   over listings, prices, or moderation.
 */
export default function SponsorBanner() {
  const pathname = usePathname();
  const sponsor = activeSponsor;

  if (!sponsor) return null;
  if (pathname.startsWith("/admin")) return null;

  const now = new Date();
  if (now < new Date(sponsor.startsAt) || now >= new Date(sponsor.endsAt)) return null;

  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
          Sponsored
        </span>
        <a
          href={`/go/${sponsor.slug}`}
          target="_blank"
          rel="sponsored noopener"
          className="text-sm font-semibold text-ink hover:underline"
        >
          {sponsor.name} — {sponsor.headline}
        </a>
      </div>
    </div>
  );
}
