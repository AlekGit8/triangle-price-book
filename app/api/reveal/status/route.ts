import { NextResponse } from "next/server";
import { findUnlock, getBusinessName, parseRevealTokens } from "@/lib/reveal";

/**
 * GET /api/reveal/status?report_id=… — what should this browser see
 * for this report? `available` means an admin stored a business name
 * for it (so the button renders); the name itself is returned ONLY
 * when a token unlocks it. Before migration 0020 is applied the
 * tables don't exist, the lookups fail, and this safely answers
 * "nothing available" instead of erroring the page.
 */
export async function GET(req: Request) {
  const reportId = new URL(req.url).searchParams.get("report_id") ?? "";
  if (!reportId) {
    return NextResponse.json({ ok: false, error: "Missing report id." }, { status: 400 });
  }
  try {
    const name = await getBusinessName(reportId);
    if (!name) return NextResponse.json({ ok: true, unlocked: false, available: false });
    const unlock = await findUnlock(parseRevealTokens(req), reportId);
    if (!unlock) return NextResponse.json({ ok: true, unlocked: false, available: true });
    return NextResponse.json({ ok: true, unlocked: true, available: true, business_name: name });
  } catch (err) {
    console.error("reveal status error:", err);
    return NextResponse.json({ ok: true, unlocked: false, available: false });
  }
}
