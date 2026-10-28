import type { Metadata } from "next";

/**
 * /check-quote is a client component, so it can't export metadata
 * itself — this layout carries its title, description, and canonical
 * instead.
 */
export const metadata: Metadata = {
  title: "Check a Quote | Triangle Price Book",
  description:
    "Compare a contractor's quote against real prices paid by Triangle homeowners before you sign.",
  alternates: { canonical: "/check-quote" },
  openGraph: {
    title: "Check a Quote | Triangle Price Book",
    description:
      "Compare a contractor's quote against real prices paid by Triangle homeowners before you sign.",
    url: "https://www.trianglepricebook.com/check-quote",
    type: "website",
  },
};

export default function CheckQuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
