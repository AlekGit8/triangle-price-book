import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: "Leave a tip — Triangle Price Book",
  description:
    "Triangle Price Book is built and maintained by one person. If it helped you, a tip keeps it free for Triangle homeowners.",
  alternates: { canonical: "/donate" },
};

/**
 * /donate — the tip jar. A Stripe Payment Link (donor chooses the
 * amount, $1–$500, preset $5) handles the payment on Stripe's hosted
 * page; after paying, Stripe redirects back here with ?thanks=1.
 * No account needed, no code or secrets on our side — the link is a
 * static URL in siteConfig.donateUrl.
 */
export default async function DonatePage({
  searchParams,
}: {
  searchParams: Promise<{ thanks?: string }>;
}) {
  const { thanks } = await searchParams;

  if (thanks === "1") {
    return (
      <div className="py-10 max-w-2xl mx-auto px-4 text-center">
        <h1 className="font-serif text-4xl text-ink sm:text-5xl">
          Thank you!
        </h1>
        <p className="mt-4 text-lg text-muted">
          Your tip means a lot — it goes straight toward keeping Triangle
          Price Book free for homeowners across the Triangle.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-[10px] bg-black px-6 py-3 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200"
        >
          Back to the Price Book →
        </Link>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-2xl mx-auto px-4">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">
        Keep the Price Book free
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Triangle Price Book is a free resource for homeowners across the
        Triangle — built and maintained by one person, in his spare time.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        If the site helped you feel confident about a quote, or saved you
        money on a job around the house, a tip helps cover the hosting and
        keep it free for everyone.
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-white p-6 sm:p-8 text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
          Any amount helps — most people tip $5–$15
        </p>
        <a
          href={siteConfig.donateUrl}
          className="mt-5 inline-block rounded-[10px] bg-black px-8 py-3.5 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200"
        >
          Leave a tip →
        </a>
        <p className="mt-4 text-sm text-muted">
          You&rsquo;ll go to a secure Stripe checkout page to pay by card.
          No account needed.
        </p>
      </div>
      <p className="mt-6 text-sm text-muted">
        Tips go to {siteConfig.operatorName}, which operates the site. Tips
        are voluntary and not tax-deductible.
      </p>
    </div>
  );
}
