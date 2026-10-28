import type { Metadata } from "next";

/**
 * /submit is a client component, so it can't export metadata itself —
 * this layout carries its title, description, and canonical instead.
 */
export const metadata: Metadata = {
  title: "Submit a Price | Triangle Price Book",
  description:
    "Share what you paid for home services — anonymously, in under a minute — and help your neighbors avoid overpaying.",
  alternates: { canonical: "/submit" },
  openGraph: {
    title: "Submit a Price | Triangle Price Book",
    description:
      "Share what you paid for home services — anonymously, in under a minute — and help your neighbors avoid overpaying.",
    url: "https://www.trianglepricebook.com/submit",
    type: "website",
  },
};

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
