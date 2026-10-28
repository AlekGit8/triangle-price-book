import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-auth";


/**
 * GET /api/admin/reports — moderation views, gated by ADMIN_KEY.
 * ?scope=queue (default): unmoderated reports, newest first.
 * ?scope=published: recently published reports, newest first (for takedowns).
 */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const scope = new URL(req.url).searchParams.get("scope") ?? "queue";
    const sb = getServiceSupabase();
    let q = sb
      .from("reports")
      .select(
        `id, service_name, category, amount_cents, report_type, town,
         service_date, notes, verification_status, created_at,
         verifications ( id, invoice_path, created_at ),
         report_contacts ( email )`
      )
      // Newest submission first (created_at desc): a quote submitted today
      // tops the list even if the job itself is years old. Service date
      // only breaks ties — the 21 seed rows share one created_at (single
      // migration insert), so without it they read as insertion order.
      .order("created_at", { ascending: false })
      .order("service_date", { ascending: false, nullsFirst: false })
      .limit(100);
    if (scope === "published") {
      q = q.not("moderated_at", "is", null).neq("verification_status", "rejected");
    } else {
      q = q.is("moderated_at", null);
    }
    const { data, error } = await q;
    if (error) throw error;
    interface AdminReportRow {
      verifications: Array<{ id: string; invoice_path: string; created_at: string }>;
      report_contacts: { email?: string } | null;
      [key: string]: unknown;
    }
    // Flatten the private contact email onto the shape the admin UI expects.
    const reports = ((data ?? []) as unknown as AdminReportRow[]).map((r) => {
      const { report_contacts, ...rest } = r;
      return { ...rest, submitter_email: report_contacts?.email ?? null };
    });
    // Attach a short-lived signed URL per invoice so moderators can open
    // it in-app (M11). The queue card used to tell them to look under
    // `${report.id}/`, which is wrong for batch uploads (shared/<uuid>/)
    // — the real path is shown, with a View link, instead.
    const reportsWithUrls = await Promise.all(
      reports.map(async (r) => {
        const vers = (r.verifications ?? []) as Array<{
          id: string;
          invoice_path: string;
          created_at: string;
        }>;
        const withUrls = await Promise.all(
          vers.map(async (v) => {
            const { data: signed } = await sb.storage
              .from("invoices")
              .createSignedUrl(v.invoice_path, 300);
            return { ...v, signed_url: signed?.signedUrl ?? null };
          })
        );
        return { ...r, verifications: withUrls };
      })
    );
    return NextResponse.json({ ok: true, reports: reportsWithUrls });
  } catch (err) {
    console.error("admin reports error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load queue." }, { status: 500 });
  }
}
