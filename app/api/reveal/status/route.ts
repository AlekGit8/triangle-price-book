import { NextResponse } from "next/server";
import { getRevealNameState } from "@/lib/reveal";

/**
 * GET /api/reveal/status?report_id=… — what reveal state is this
 * report in? The name itself is NEVER returned here — it only appears
 * on the buyer's private list page after payment. States:
 * - available: a real business name is stored → pay dialog.
 * - unknown: verified, but the documentation did not list a
 *   contractor ("NA") → button renders, click shows an informational
 *   message, never a payment.
 * - neither: no name row yet (not yet processed) → no button.
 * Before migration 0020 is applied the tables don't exist, the lookup
 * fails, and this safely answers "nothing available" instead of
 * erroring the page.
 */
export async function GET(req: Request) {
  const reportId = new URL(req.url).searchParams.get("report_id") ?? "";
  if (!reportId) {
    return NextResponse.json({ ok: false, error: "Missing report id." }, { status: 400 });
  }
  try {
    const { state } = await getRevealNameState(reportId);
    return NextResponse.json({
      ok: true,
      available: state === "name",
      unknown: state === "unknown",
    });
  } catch (err) {
    console.error("reveal status error:", err);
    return NextResponse.json({ ok: true, available: false, unknown: false });
  }
}
