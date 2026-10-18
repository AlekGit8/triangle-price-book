/** Format integer cents as USD, e.g. 525336 -> "$5,253.36" */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Format an ISO date string as "Jul 2026". Returns "" for null/empty. */
export function formatMonthYear(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const d = new Date(isoDate + (isoDate.length === 10 ? "T12:00:00" : ""));
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
