import { NextResponse } from "next/server";
import { getApprovedReports, sortReportsByEffectiveDate } from "@/lib/data";

// TEMPORARY diagnostic — read-only. Delete after diagnosing.
export async function GET() {
  const reports = await getApprovedReports();
  const sorted = sortReportsByEffectiveDate(reports).slice(0, 6);
  return NextResponse.json({
    rawCount: reports.length,
    rawNames: reports.map((r) => r.service_name),
    sortedCount: sorted.length,
    sortedNames: sorted.map(
      (r) => `${r.service_name} | eff=${r.service_date ?? r.created_at.slice(0, 10)}`
    ),
    nodeVersion: process.version,
  });
}
