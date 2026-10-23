import { NextResponse } from "next/server";
import { getApprovedReports } from "@/lib/data";

// TEMPORARY diagnostic — read-only. Returns what getApprovedReports sees.
// Delete after diagnosing the missing-row issue.
export async function GET() {
  const reports = await getApprovedReports();
  return NextResponse.json({
    count: reports.length,
    rows: reports.map(
      (r) => `${r.service_name} | ${r.verification_status} | ${r.service_date} | ${r.created_at}`
    ),
  });
}
