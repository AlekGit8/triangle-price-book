import { NextResponse } from "next/server";
import { getBusinessName } from "@/lib/reveal";

/**
 * GET /api/reveal/status?report_id=… — does this report have a stored
 * business name, so the reveal button renders? The name itself is NEVER
 * returned here — it only appears on the buyer's private list page
 * after payment. Before migration 0020 is applied the tables don't
 * exist, the lookup fails, and this safely answers "nothing available"
 * instead of erroring the page.
 */
export async function GET(req: Request) {
  const reportId = new URL(req.url).searchParams.get("report_id") ?? "";
  if (!reportId) {
    return NextResponse.json({ ok: false, error: "Missing report id." }, { status: 400 });
  }
  try {
    const name = await getBusinessName(reportId);
    return NextResponse.json({ ok: true, available: !!name });
  } catch (err) {
    console.error("reveal status error:", err);
    return NextResponse.json({ ok: true, available: false });
  }
}
