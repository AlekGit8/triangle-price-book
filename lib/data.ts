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

export interface BusinessCount {
  id: string;
  name: string;
  category: string;
  report_count: number;
}

/**
 * All fetchers degrade to empty arrays when Supabase isn't configured
 * or unreachable, so `next build` and local dev never crash.
 */
export async function getApprovedReports(category?: string): Promise<Report[]> {
  try {
    const sb = getServiceSupabase();
    let q = sb
      .from("reports")
      .select(
        "id, service_name, category, amount_cents, amount_note, report_type, town, service_date, notes, verification_status, created_at"
      )
      .eq("verification_status", "verified")
      .not("moderated_at", "is", null)
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

export async function getBusinessReportCounts(): Promise<BusinessCount[]> {
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("business_report_counts")
      .select("*")
      .order("report_count", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BusinessCount[];
  } catch {
    return [];
  }
}
