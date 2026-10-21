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

export interface ServiceAggregate {
  service_name: string;
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
