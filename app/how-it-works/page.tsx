import { siteConfig } from "@/lib/site-config";

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-xl font-bold text-ink">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black text-sm text-white">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-muted text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function PlainSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-muted text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export const metadata = {
  title: `How ${siteConfig.siteName} works`,
  description:
    "Real prices from real neighbors. How submissions, verification, and privacy work on Triangle Price Book.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">How {siteConfig.siteName} works</h1>
      <p className="mt-3 text-lg text-muted">
        Real prices from real neighbors. Free, no accounts, no catch.
      </p>

      <div className="mt-8 space-y-5">
        <Section n="1" title="Homeowners share what they paid">
          <p>
            Anyone in the Triangle can post what they paid or were quoted for a
            home project: HVAC, plumbing, roofing, fencing, whatever. It takes
            about a minute, and you don&rsquo;t need an account.
          </p>
        </Section>

        <Section n="2" title="Verified or not, it goes up">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-mono text-xs font-semibold uppercase tracking-wide text-muted w-28"></th>
                  <th className="py-2 pr-4 font-bold text-ink">Verified</th>
                  <th className="py-2 font-bold text-ink">Not verified</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line">
                  <td className="py-2 pr-4 font-semibold text-ink">What it means</td>
                  <td className="py-2 pr-4">Submitted with a quote or invoice</td>
                  <td className="py-2">Submitted without a document</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 pr-4 font-semibold text-ink">Published?</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2">Yes, clearly labeled</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-ink">Why</td>
                  <td className="py-2 pr-4">Backed by paperwork</td>
                  <td className="py-2">Still useful, and we&rsquo;d rather share it than hide it</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="font-semibold text-ink">
            Price ranges and medians are calculated from Verified entries only.
          </p>
          <p>
            Your document is only used to check the price is real. It&rsquo;s
            never shown publicly.
          </p>
        </Section>

        <Section n="3" title="Your privacy is protected">
          <p>
            Public entries show only the <strong>service, price, town, and date</strong>.
            Your name and address are never posted, so you can share freely
            and nobody gets called out. One exception: on verified entries,
            the name of the business that did the work can be revealed to
            paying viewers (see below) — the homeowner stays anonymous either way.
          </p>
        </Section>

        <PlainSection title="Who did the work? (paid reveal)">
          <p>
            Business and contractor names are collected <strong>only for
            verified submissions</strong> — taken from the document used to
            verify the price — and are available to view for a small fee.
            On a verified listing with a stored name, a{" "}
            <strong>&ldquo;See who did this work&rdquo;</strong> button offers
            two options: <strong>$1.99</strong> to reveal that job&rsquo;s
            business, or <strong>$4.99</strong> to reveal the businesses
            behind all verified listings.
          </p>
          <p>
            After payment, you get a private list page — no email is
            collected and no account is needed. Bookmark the link: it opens
            your list in any browser, any time. If you lose the link, the
            list is gone and you&rsquo;d need to buy it again. Both options
            are one-time purchases — no time limit, no subscription.
          </p>
          <p>
            Invoices and quotes are never shown — only the business name. A
            business that believes a listing is inaccurate can contact us to
            dispute it.
          </p>
        </PlainSection>

        <PlainSection title="Why it's free">
          <p>
            This site exists for the public good: when everyone can see what
            things really cost, nobody overpays. To cover hosting costs, we run
            ads, and we hope they&rsquo;re useful ones, like local home-service
            deals. Ads are separate from the price data and have no influence on
            what gets posted. The site may also show a single banner labelled
            &ldquo;Sponsored&rdquo; at the top of the page; sponsors pay for the
            banner only and get no influence over listings, prices, or
            moderation. Paid business-name reveals on verified listings also
            help keep the site going.
          </p>
        </PlainSection>

        <PlainSection title="Quick answers">
          <dl className="space-y-3">
            <div>
              <dt className="font-semibold text-ink">Do I need an account?</dt>
              <dd>No.</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Is it really free?</dt>
              <dd>Yes. Browsing and submitting are free; tips, ads, and optional paid reveals keep the lights on.</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Can a business pay to change or remove prices?</dt>
              <dd>No. There are no business profiles, rankings, or paid placements in listings — just one clearly labeled sponsor banner at the top of the site.</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Think an entry is wrong?</dt>
              <dd>Contact us and we&rsquo;ll review it.</dd>
            </div>
          </dl>
        </PlainSection>
      </div>
    </div>
  );
}
