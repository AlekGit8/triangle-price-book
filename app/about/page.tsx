import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-muted text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export const metadata = {
  title: `About ${siteConfig.siteName}`,
  description:
    "Triangle Price Book is a crowdsourced, anonymous record of what Triangle homeowners actually paid for home services — built by a local Triangle homeowner so nobody overpays.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">About {siteConfig.siteName}</h1>
      <p className="mt-3 text-lg text-muted">{siteConfig.tagline}</p>

      <div className="mt-8 space-y-5">
        <Section title="What this is">
          <p>
            {siteConfig.siteName} is a crowdsourced record of what homeowners in
            the NC Triangle actually paid for home services — {siteConfig.subTagline}
          </p>
          <p>
            It launched in October 2026, built by a local Triangle homeowner, and
            it is free to submit and browse. No accounts, no catch.
          </p>
        </Section>

        <Section title="Why it exists">
          <p>
            The same job can draw quotes thousands of dollars apart, and until
            now there was nowhere local to check what a fair price looks like.
            When neighbors share what they really paid, nobody has to guess —
            and nobody overpays.
          </p>
        </Section>

        <Section title="What we don't do">
          <p>
            Public entries show only the service, price, town, and date. We
            never post your name or address, and there are no
            rankings and no sponsored estimates. One exception: on verified
            entries, the business that did the work can be revealed to paying
            viewers — see How this works for details.
          </p>
          <p>
            The site may show a single banner labelled &ldquo;Sponsored&rdquo; at
            the top of the page. Sponsors pay for the banner only and get no
            influence over listings, prices, or moderation.{" "}
            <Link href="/how-it-works" className="font-semibold text-ink hover:underline">
              How this works
            </Link>{" "}
            has the full details.
          </p>
        </Section>

        <Section title="What's here">
          <p>
            Reports from Triangle homeowners across home-service categories —
            from HVAC and plumbing to roofing and tree service. Browse what
            neighbors paid, or add your own price to help the next person.
          </p>
          <p>
            <Link href="/browse" className="font-semibold text-ink hover:underline">
              Browse prices
            </Link>
            {" · "}
            <Link href="/submit" className="font-semibold text-ink hover:underline">
              Submit a price
            </Link>
            {" · "}
            <Link href="/contact" className="font-semibold text-ink hover:underline">
              Contact us
            </Link>
          </p>
        </Section>
      </div>
    </div>
  );
}
