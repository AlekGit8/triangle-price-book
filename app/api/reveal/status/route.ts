import { NextResponse } from "next/server";
import { findUnlock, getBusinessName, parseRevealTokens } from "@/lib/reveal";

/**
 * GET /api/reveal/status?report_id=… — does this browser hold a token
 * that unlocks this report? The business name is returned ONLY when
 * unlocked; otherwise the response carries no name at all.
 */
export async function GET(req: Request) {
  const reportId = new URL(req.url).searchParams.get("report_id") ?? "";
  if (!reportId) {
    return NextResponse.json({ ok: false, error: "Missing report id." }, { status: 400 });
  }
  try {
    const unlock = await findUnlock(parseRevealTokens(req), reportId);
    if (!unlock) return NextResponse.json({ ok: true, unlocked: false });
    const name = await getBusinessName(reportId);
    if (!name) return NextResponse.json({ ok: true, unlocked: false });
    return NextResponse.json({ ok: true, unlocked: true, business_name: name });
  } catch (err) {
    console.error("reveal status error:", err);
    return NextResponse.json({ ok: true, unlocked: false });
  }
}
