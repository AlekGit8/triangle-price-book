import type { Metadata } from "next";

/**
 * The admin dashboard must never be indexed: it is a client component
 * (so it can't export metadata itself), and robots.txt alone doesn't
 * prevent indexing of a URL that other pages link to.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
