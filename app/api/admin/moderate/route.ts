import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-auth";


type Action = "verify" | "publish_unverified" | "reject";

/**
 * POST /api/admin/moderate { id, action }
 * - verify: mark verified + publish (visible publicly, "Verified" badge)
 * - publish_unverified: publish without verification ("Unverified report" badge)
 * - reject: remove from queue, never published
 * Gated by ADMIN_KEY.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    // A moderation action is two small fields — reject giant bodies early,
    // like the other routes do.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 8 * 1024) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 413 });
    }
    const body = (await req.json()) as {
      id?: string;
      action?: Action;
      business_name?: unknown;
    };
    const { id, action } = body;
    if (!id || !["verify", "publish_unverified", "reject"].includes(action ?? ""))
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });

    // Validate the optional company name before touching anything:
    // the queue field's value becomes the paid reveal's source of
    // truth on verify. Blank (or absent) means "not yet reviewed" —
    // no name row is created. "NA" is stored as-is (unknown contractor).
    const businessName =
      typeof body.business_name === "string" ? body.business_name.trim() : null;
    if (businessName !== null && businessName.length > 200) {
      return NextResponse.json(
        { ok: false, error: "Business name is too long." },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();

    // "Verify" requires a backing invoice: a report with no verifications
    // row must never be badged Verified, no matter which button was
    // clicked. (Oct 26, 2026: a manual submission with no invoice was
    // verified by mistake from the admin queue — the entry had to be
    // flipped back to unverified by hand.)
    if (action === "verify") {
      const { data: proof, error: proofErr } = await sb
        .from("verifications")
        .select("id")
        .eq("report_id", id)
        .limit(1);
      if (proofErr) throw proofErr;
      if (!proof || proof.length === 0)
        return NextResponse.json(
          {
            ok: false,
            error:
              "Cannot verify: no invoice attached to this report. Publish it unverified instead.",
          },
          { status: 400 }
        );
    }

    const patch =
      action === "verify"
        ? { verification_status: "verified", moderated_at: new Date().toISOString() }
        : action === "publish_unverified"
          ? { verification_status: "unverified", moderated_at: new Date().toISOString() }
          : { verification_status: "rejected", moderated_at: new Date().toISOString() };

    const { error } = await sb.from("reports").update(patch).eq("id", id);
    if (error) throw error;

    // Verify with an admin-reviewed company name: save it as the paid
    // reveal's source of truth. A failed name save must not fail the
    // verification itself (the admin can still set the name on the
    // published tab), so it is reported back instead of thrown.
    let nameError: string | null = null;
    if (action === "verify" && businessName) {
      const { error: nameErr } = await sb
        .from("report_business_names")
        .upsert({
          report_id: id,
          business_name: businessName,
          updated_at: new Date().toISOString(),
        });
      if (nameErr) {
        console.error("moderate business-name error:", nameErr);
        nameError =
          "Verified, but the company name could not be saved — set it on the published tab.";
      }
    }

    // Reject also deletes the evidence (M4): the Privacy Policy says
    // documents are kept only as long as the entry remains posted, and
    // a rejected entry is never posted. Delete the report's verification
    // rows, and the stored file — but only when no other report still
    // references that path (a multi-quote document is shared by several
    // reports). Cleanup failures are logged, not fatal: the report is
    // already rejected.
    if (action === "reject") {
      try {
        const { data: vers } = await sb
          .from("verifications")
          .select("invoice_path")
          .eq("report_id", id);
        const paths = [...new Set((vers ?? []).map((v) => v.invoice_path))];
        if (paths.length > 0) {
          await sb.from("verifications").delete().eq("report_id", id);
          for (const path of paths) {
            const { data: others } = await sb
              .from("verifications")
              .select("id")
              .eq("invoice_path", path)
              .limit(1);
            if (!others || others.length === 0) {
              await sb.storage.from("invoices").remove([path]);
            }
          }
        }
      } catch (cleanupErr) {
        console.error("admin moderate cleanup error:", cleanupErr);
      }
    }

    return NextResponse.json({ ok: true, ...(nameError ? { nameError } : {}) });
  } catch (err) {
    console.error("admin moderate error:", err);
    return NextResponse.json({ ok: false, error: "Moderation failed." }, { status: 500 });
  }
}
