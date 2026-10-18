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
  return createClient(url, serviceKey);
}
