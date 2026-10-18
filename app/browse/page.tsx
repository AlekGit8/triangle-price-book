"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { siteConfig } from "@/lib/site-config";
import type { Report } from "@/lib/data";
import ReportCard from "@/components/ReportCard";

function BrowseInner() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("category") ?? "All";
  const [category, setCategory] = useState(initial);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [unconfigured, setUnconfigured] = useState(false);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) {
      setUnconfigured(true);
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await sb
        .from("reports")
        .select(
          "id, service_name, category, amount_cents, amount_note, report_type, town, service_date, notes, verification_status, created_at"
        )
        .eq("verification_status", "verified")
        .not("moderated_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error && data) setReports(data as Report[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => (category === "All" ? reports : reports.filter((r) => r.category === category)),
    [reports, category]
  );

  const chips = ["All", ...siteConfig.categories];

  return (
    <div className="py-10">
      <h1 className="text-3xl font-extrabold text-brand-900">Browse prices</h1>
      <p className="mt-2 text-stone-600">
        Every entry is anonymous — businesses are never named on individual reports.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-2 text-sm font-medium border ${
              category === c
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-stone-700 border-stone-300 hover:border-brand-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-stone-500">Loading…</p>
        ) : unconfigured ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
            <p className="font-semibold">Database not connected yet.</p>
            <p className="mt-1 text-sm">
              Add your Supabase keys to <code>.env.local</code> (see README.md) and
              redeploy to see live reports here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-stone-600">
            No reports in this category yet.{" "}
            <a href="/submit" className="font-semibold text-brand-700 hover:underline">
              Be the first to share one.
            </a>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<p className="py-10 text-stone-500">Loading…</p>}>
      <BrowseInner />
    </Suspense>
  );
}
