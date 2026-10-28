import type { getServiceSupabase } from "./supabase-server";

/**
 * Retention policy (P6): analytics_page_views and sponsor_clicks are
 * kept for 180 days, then pruned. The tables are tiny today (754 views,
 * 78 clicks), so this is future-proofing, not a fire — but without a
 * policy the tables grow unbounded on the 500 MB free tier.
 *
 * The prune runs lazily from the admin routes (the only places an admin
 * looks at the data), best-effort: a failure must never break the tab.
 * The 180-day window matches the longest admin range ("6 months").
 */
export const RETENTION_DAYS = 180;

export async function pruneOldAnalyticsRows(
  sb: ReturnType<typeof getServiceSupabase>
): Promise<void> {
  const cutoff = new Date(
    Date.now() - RETENTION_DAYS * 24 * 3600 * 1000
  ).toISOString();
  try {
    await sb.from("analytics_page_views").delete().lt("entered_at", cutoff);
    await sb.from("sponsor_clicks").delete().lt("clicked_at", cutoff);
  } catch (err) {
    // Pruning is housekeeping, not the request: log and move on.
    console.error("retention prune error:", err);
  }
}
