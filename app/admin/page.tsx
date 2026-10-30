"use client";

import { useEffect, useState } from "react";
import { formatCents, formatMonthYear } from "@/lib/format";
import AdminAnalytics from "@/components/AdminAnalytics";
import AdminSponsors from "@/components/AdminSponsors";

interface QueueReport {
  id: string;
  service_name: string;
  category: string;
  amount_cents: number;
  report_type: string;
  town: string;
  service_date: string | null;
  notes: string | null;
  verification_status: string;
  submitter_email: string | null;
  created_at: string;
  verifications: Array<{ id: string; invoice_path: string; created_at: string; signed_url?: string | null }>;
}

interface Signup {
  email: string;
  wants_updates: boolean;
  created_at: string;
}

type Action = "verify" | "publish_unverified" | "reject";

/**
 * Business-name editor for paid reveals, shown on verified published
 * reports. The name comes from the invoice the moderator already
 * checked; saving it makes the "See who did this work" button appear
 * on the public listing. Removing it hides the button again (the
 * business dispute path — used when a listing is found inaccurate).
 */
function BusinessNameEditor({ reportId, adminKey }: { reportId: string; adminKey: string }) {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/business-name?report_id=${encodeURIComponent(reportId)}`, {
      headers: { "x-admin-key": adminKey },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.business_name) {
          setValue(j.business_name as string);
          setSaved(j.business_name as string);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [reportId, adminKey]);

  async function post(name: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business-name", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ report_id: reportId, business_name: name }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed");
      setSaved(name === "" ? null : name);
      if (name === "") setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;
  return (
    <div className="mt-3 rounded-[10px] border border-dashed border-line bg-neutral-50 p-3 dark:bg-neutral-900">
      <p className="text-xs font-semibold text-muted">
        Business name for paid reveals — copy it from the verified invoice
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Acme Plumbing"
          className="flex-1 rounded-[10px] border border-line px-3 py-2 text-sm text-ink"
        />
        <button
          onClick={() => post(value)}
          disabled={busy || !value.trim()}
          className="rounded-[10px] bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Save
        </button>
        {saved && (
          <button
            onClick={() => post("")}
            disabled={busy}
            className="rounded-[10px] border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {saved && (
        <p className="mt-1 text-xs text-muted">
          Saved — the reveal button now shows on this listing.
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [published, setPublished] = useState<QueueReport[]>([]);
  const [tab, setTab] = useState<"queue" | "published" | "signups" | "analytics" | "sponsors">("queue");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [signupStats, setSignupStats] = useState({ total: 0, updatesOptIn: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [seenLoaded, setSeenLoaded] = useState(false);
  const [baselineJustSet, setBaselineJustSet] = useState(false);

  async function loadSeen(k: string) {
    try {
      const res = await fetch("/api/admin/seen", { headers: { "x-admin-key": k } });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load");
      if (json.last_seen_at) {
        setLastSeen(json.last_seen_at);
      } else {
        // First visit: establish the baseline now, so future visits
        // highlight what's new instead of flagging all 21 seed rows.
        const mark = await fetch("/api/admin/seen", { method: "POST", headers: { "x-admin-key": k } });
        const markJson = await mark.json();
        if (mark.ok && markJson.ok) {
          setLastSeen(markJson.last_seen_at);
          setBaselineJustSet(true);
        }
      }
    } catch {
      // "What's new" is a convenience — a failure here must not block
      // the rest of the admin page.
    } finally {
      setSeenLoaded(true);
    }
  }

  async function markAllSeen() {
    try {
      const res = await fetch("/api/admin/seen", { method: "POST", headers: { "x-admin-key": key } });
      const json = await res.json();
      if (res.ok && json.ok) {
        setLastSeen(json.last_seen_at);
        setBaselineJustSet(false);
      }
    } catch {
      alert("Couldn't update the marker — try again.");
    }
  }

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

  // "What's new": everything submitted after the last admin visit.
  // ISO-timestamp string comparison works because created_at comes
  // back as an ISO string from Supabase.
  const isNew = (createdAt: string) => !!lastSeen && createdAt > lastSeen;
  const newQueue = reports.filter((r) => isNew(r.created_at));
  const newPublished = published.filter((r) => isNew(r.created_at));
  const newSignups = signups.filter((s) => isNew(s.created_at));
  const newTotal =
    newQueue.length + newPublished.length + newSignups.length;

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
            loadSeen(key);
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
            className="rounded-[10px] bg-black px-4 py-2 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? "…" : "Unlock"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Moderation</h1>
        <button onClick={() => { load(key, "queue"); load(key, "published"); loadSignups(key); loadSeen(key); }} className="font-mono text-[13px] font-semibold text-ink hover:underline">
          Refresh
        </button>
      </div>
      <p className="mt-2 text-muted">
        New submissions publish instantly with a document attached. Use this page
        to review the queue and take down anything abusive.
      </p>

      {seenLoaded && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl text-ink">What&apos;s new since your last visit</h2>
              <p className="mt-1 text-sm text-muted">
                {baselineJustSet
                  ? "First time here — baseline set just now. Future visits will highlight what's new."
                  : lastSeen
                    ? `Last visit: ${new Date(lastSeen).toLocaleString()}`
                    : "Couldn't load your last visit."}
              </p>
            </div>
            {newTotal > 0 && (
              <button
                onClick={markAllSeen}
                className="whitespace-nowrap rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black"
              >
                Mark all as seen
              </button>
            )}
          </div>
          {newTotal === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing new since your last visit.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {newQueue.length > 0 && (
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                    New in review queue ({newQueue.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {newQueue.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setTab("queue")}
                        className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-2.5 text-left hover:border-black"
                      >
                        <span className="text-sm text-ink">{r.service_name} — {r.town}</span>
                        <span className="whitespace-nowrap font-mono text-sm font-bold text-ink">{formatCents(r.amount_cents)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {newPublished.length > 0 && (
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                    New published ({newPublished.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {newPublished.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setTab("published")}
                        className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-2.5 text-left hover:border-black"
                      >
                        <span className="text-sm text-ink">{r.service_name} — {r.town}</span>
                        <span className="whitespace-nowrap font-mono text-sm font-bold text-ink">{formatCents(r.amount_cents)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {newSignups.length > 0 && (
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                    New signups ({newSignups.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {newSignups.map((s) => (
                      <button
                        key={s.email}
                        onClick={() => setTab("signups")}
                        className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-2.5 text-left hover:border-black"
                      >
                        <span className="text-sm text-ink">{s.email}</span>
                        <span className="whitespace-nowrap font-mono text-xs text-muted">
                          {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(["queue", "published", "signups", "analytics", "sponsors"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "signups") loadSignups(key); else if (t === "queue" || t === "published") load(key, t); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t
                ? "bg-black text-white"
                : "border border-line bg-white text-ink hover:border-black"
            }`}
          >
            {t === "queue"
              ? `Review queue (${reports.length})${newQueue.length > 0 ? ` · ${newQueue.length} new` : ""}`
              : t === "published"
                ? `Published (${published.length})${newPublished.length > 0 ? ` · ${newPublished.length} new` : ""}`
                : t === "signups"
                  ? `Launch signups (${signupStats.total})${newSignups.length > 0 ? ` · ${newSignups.length} new` : ""}`
                  : t === "analytics"
                      ? "Analytics"
                      : "Sponsors"}
          </button>
        ))}
      </div>

      {tab === "analytics" ? (
        <AdminAnalytics adminKey={key} />
      ) : tab === "sponsors" ? (
        <AdminSponsors adminKey={key} />
      ) : tab === "signups" ? (
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
                    <span className="rounded-full bg-green-100 dark:bg-green-950 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300">
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
                  <div className="mt-1 space-y-1">
                    {r.verifications.map((v) => (
                      <p key={v.id} className="text-xs text-muted">
                        Invoice: <span className="font-mono break-all">{v.invoice_path}</span>
                        {v.signed_url ? (
                          <>
                            {" — "}
                            <a
                              href={v.signed_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-ink hover:underline"
                            >
                              View invoice
                            </a>{" "}
                            <span className="text-muted">(link expires in 5 min)</span>
                          </>
                        ) : (
                          " — view in Supabase Storage → invoices bucket"
                        )}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted">No invoice attached.</p>
                )}
              </div>
              <p className="whitespace-nowrap font-mono text-2xl font-bold text-ink">
                {formatCents(r.amount_cents)}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tab === "queue" ? (
                <>
                  <button
                    onClick={() => moderate(r.id, "verify", "queue")}
                    disabled={r.verifications.length === 0}
                    title={
                      r.verifications.length === 0
                        ? "No invoice attached — verify is unavailable"
                        : undefined
                    }
                    className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-black"
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
                    className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (confirm("Take down this published entry? It will be hidden from the site and its invoice file deleted.")) {
                      moderate(r.id, "reject", "published");
                    }
                  }}
                  className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                >
                  Take down
                </button>
              )}
            </div>
            {tab === "published" && r.verification_status === "verified" && (
              <BusinessNameEditor reportId={r.id} adminKey={key} />
            )}
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
