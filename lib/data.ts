import { getServiceSupabase } from "./supabase-server";
import type { Category } from "./site-config";

export interface Report {
  id: string;
  service_name: string;
  category: Category;
  amount_cents: number;
  amount_note: string | null;
  report_type: "paid" | "quote";
  town: string;
  service_date: string | null;
  notes: string | null;
  verification_status: "unverified" | "verified" | "rejected";
  created_at: string;
}

/**
 * The date a report is ordered and displayed by: the quote/service date when
 * the submitter provided one, otherwise the date it was submitted to the site.
 * Returns YYYY-MM-DD.
 */
export function effectiveReportDate(r: Report): string {
  return r.service_date ?? r.created_at.slice(0, 10);
}

/** Newest-first by effective report date; submission recency breaks ties. */
export function sortReportsByEffectiveDate(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => {
    const byDate = effectiveReportDate(b).localeCompare(effectiveReportDate(a));
    if (byDate !== 0) return byDate;
    return b.created_at.localeCompare(a.created_at);
  });
}

export interface ServiceAggregate {  service_name: string;
  category: Category;
  report_count: number;
  verified_count: number;
  paid_count: number;
  quote_count: number;
  min_cents: number;
  max_cents: number;
  median_cents: number;
}

/**
 * All fetchers degrade to empty arrays when Supabase isn't configured
 * or unreachable, so `next build` and local dev never crash.
 */
/**
 * Reports visible to the public: verified entries plus unverified community
 * reports. Rejected entries never surface. (Currently unused by pages —
 * /browse queries Supabase directly — but kept truthful for future callers.)
 */
export async function getApprovedReports(category?: string): Promise<Report[]> {
  try {
    const sb = getServiceSupabase();
    let q = sb
      .from("reports")
      .select(
        "id, service_name, category, amount_cents, amount_note, report_type, town, service_date, notes, verification_status, created_at"
      )
      .neq("verification_status", "rejected")
      .order("created_at", { ascending: false })
      // created_at ties (e.g. the seed rows, all inserted in one migration
      // transaction) — break them by most recent service date, dateless last.
      .order("service_date", { ascending: false, nullsFirst: false })
      .limit(200);
    if (category && category !== "All") q = q.eq("category", category);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Report[];
  } catch {
    return [];
  }
}

export async function getServiceAggregates(): Promise<ServiceAggregate[]> {
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("service_aggregates")
      .select("*")
      .order("report_count", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ServiceAggregate[];
  } catch {
    return [];
  }
}
