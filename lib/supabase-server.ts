import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * SERVER ONLY. Service-role client bypasses Row Level Security.
 * Never import this file into client components — it is only used
 * in API routes (submit, admin) and server-side helpers.
 */
export function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceKey, {
    global: {
      // Bypass Next.js Data Cache for Supabase fetches: reports must always
      // reflect the live database, never a cached response.
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

/**
 * SERVER ONLY, least-privilege. Anon-key client for PUBLIC reads —
 * respects Row Level Security, so it can only see what the site shows
 * the public (approved reports + the aggregates view). Used by
 * lib/data.ts (homepage + category pages). Writes and admin reads still
 * use the service-role client above — a public read has no business
 * holding a key that bypasses RLS (M5).
 */
export function getAnonSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createClient(url, anonKey, {
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
