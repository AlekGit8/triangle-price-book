"use client";

import { useState } from "react";
import { formatCents, formatMonthYear } from "@/lib/format";

interface QueueReport {
  id: string;
  service_name: string;
  category: string;
  amount_cents: number;
  amount_note: string | null;
  report_type: string;
  town: string;
  service_date: string | null;
  notes: string | null;
  verification_status: string;
  submitter_email: string | null;
  created_at: string;
  verifications: Array<{ id: string; invoice_path: string; created_at: string }>;
}

interface Signup {
  email: string;
  wants_updates: boolean;
  created_at: string;
}

type Action = "verify" | "publish_unverified" | "reject";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [published, setPublished] = useState<QueueReport[]>([]);
  const [tab, setTab] = useState<"queue" | "published" | "signups">("queue");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [signupStats, setSignupStats] = useState({ total: 0, updatesOptIn: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSignups(k: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/signups", { headers: { "x-admin-key": k } });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load");
      setSignups(json.signups);
      setSignupStats({ total: json.total, updatesOptIn: json.updatesOptIn });
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function load(k: string, scope: "queue" | "published" = "queue") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reports?scope=${scope}`, { headers: { "x-admin-key": k } });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load");
      if (scope === "published") {
        setPublished(json.reports);
      } else {
        setReports(json.reports);
      }
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function moderate(id: string, action: Action, from: "queue" | "published" = "queue") {
    try {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      if (from === "published") {
        setPublished((rs) => rs.filter((r) => r.id !== id));
      } else {
        setReports((rs) => rs.filter((r) => r.id !== id));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Moderation failed");
    }
  }

  if (!unlocked) {
    return (
      <div className="py-16 max-w-sm mx-auto">
        <h1 className="font-serif text-3xl text-ink">Moderation</h1>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(key, "queue");
            load(key, "published");
            loadSignups(key);
          }}
        >
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="flex-1 rounded-[10px] border border-line px-3 py-2 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            placeholder="Admin key"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-[10px] bg-black px-4 py-2 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "…" : "Unlock"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Moderation</h1>
        <button onClick={() => { if (tab === "signups") loadSignups(key); else load(key, tab); }} className="font-mono text-[13px] font-semibold text-ink hover:underline">
          Refresh
        </button>
      </div>
      <p className="mt-2 text-muted">
        New submissions publish instantly with a document attached. Use this page
        to review the queue and take down anything abusive.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["queue", "published", "signups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "signups") loadSignups(key); else load(key, t); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t
                ? "bg-black text-white"
                : "border border-line bg-white text-ink hover:border-black"
            }`}
          >
            {t === "queue"
              ? `Review queue (${reports.length})`
              : t === "published"
                ? `Published (${published.length})`
                : `Launch signups (${signupStats.total})`}
          </button>
        ))}
      </div>

      {tab === "signups" ? (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">{signupStats.total}</p>
              <p className="mt-1 text-sm text-muted">Launch notifications</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">{signupStats.updatesOptIn}</p>
              <p className="mt-1 text-sm text-muted">Opted into updates</p>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {signups.map((s) => (
              <div key={s.email} className="flex items-center justify-between rounded-[10px] border border-line bg-white px-4 py-2.5">
                <span className="text-sm text-ink">{s.email}</span>
                <span className="flex items-center gap-3">
                  {s.wants_updates && (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      Updates
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </span>
              </div>
            ))}
            {signups.length === 0 && (
              <p className="text-muted">No signups yet.</p>
            )}
          </div>
        </div>
      ) : (
      <div className="mt-6 space-y-4">
        {(tab === "queue" ? reports : published).map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                  {r.category} · {r.report_type} · {r.verification_status}
                </p>
                <h3 className="mt-1 font-semibold text-ink">{r.service_name}</h3>
                <p className="text-sm text-muted">
                  {r.town}
                  {r.service_date ? ` · ${formatMonthYear(r.service_date)}` : ""}
                </p>
                {r.notes && <p className="mt-1 text-sm text-muted">{r.notes}</p>}
                {r.submitter_email && (
                  <p className="mt-1 font-mono text-xs text-muted">Submitter: {r.submitter_email}</p>
                )}
                {r.verifications.length > 0 ? (
                  <p className="mt-1 text-xs font-semibold text-green-700">
                    Invoice attached: {r.verifications.length} file(s) — review in Supabase
                    Storage → invoices bucket, path prefix {r.id}/
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">No invoice attached.</p>
                )}
              </div>
              <p className="whitespace-nowrap font-mono text-2xl font-bold text-ink">
                {formatCents(r.amount_cents)}
                {r.amount_note && <span className="text-sm font-medium text-muted"> {r.amount_note}</span>}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tab === "queue" ? (
                <>
                  <button
                    onClick={() => moderate(r.id, "verify", "queue")}
                    className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    Verify &amp; publish
                  </button>
                  <button
                    onClick={() => moderate(r.id, "publish_unverified", "queue")}
                    className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black"
                  >
                    Publish unverified
                  </button>
                  <button
                    onClick={() => moderate(r.id, "reject", "queue")}
                    className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (confirm("Take down this published entry? It will be hidden from the site.")) {
                      moderate(r.id, "reject", "published");
                    }
                  }}
                  className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Take down
                </button>
              )}
            </div>
          </article>
        ))}
        {(tab === "queue" ? reports : published).length === 0 && (
          <p className="text-muted">
            {tab === "queue" ? "Queue is empty. Nice." : "Nothing published yet."}
          </p>
        )}
      </div>
      )}
    </div>
  );
}
