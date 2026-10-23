import { siteConfig } from "@/lib/site-config";

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="text-xl font-bold text-brand-900">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-800">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-stone-600 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function PlainSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="text-xl font-bold text-brand-900">{title}</h2>
      <div className="mt-3 space-y-3 text-stone-600 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export const metadata = {
  title: `How ${siteConfig.siteName} works`,
  description:
    "Real prices from real neighbors. How submissions, verification, and privacy work on Triangle Price Book.",
};

export default function HowItWorksPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-brand-900">How {siteConfig.siteName} works</h1>
      <p className="mt-3 text-lg text-stone-600">
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
                <tr className="border-b border-stone-200">
                  <th className="py-2 pr-4 font-semibold text-stone-400 w-28"></th>
                  <th className="py-2 pr-4 font-bold text-brand-900">Verified</th>
                  <th className="py-2 font-bold text-brand-900">Not verified</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-stone-100">
                  <td className="py-2 pr-4 font-semibold text-stone-700">What it means</td>
                  <td className="py-2 pr-4">Submitted with a quote or invoice</td>
                  <td className="py-2">Submitted without a document</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 pr-4 font-semibold text-stone-700">Published?</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2">Yes, clearly labeled</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-stone-700">Why</td>
                  <td className="py-2 pr-4">Backed by paperwork</td>
                  <td className="py-2">Still useful, and we&rsquo;d rather share it than hide it</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="font-semibold text-stone-700">
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
            We never post names, addresses, or business names, so you can share
            freely and nobody gets called out.
          </p>
        </Section>

        <PlainSection title="Why it's free">
          <p>
            This site exists for the public good: when everyone can see what
            things really cost, nobody overpays. To cover hosting costs, we run
            ads, and we hope they&rsquo;re useful ones, like local home-service
            deals. Ads are separate from the price data and have no influence on
            what gets posted.
          </p>
        </PlainSection>

        <PlainSection title="Quick answers">
          <dl className="space-y-3">
            <div>
              <dt className="font-semibold text-stone-800">Do I need an account?</dt>
              <dd>No.</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-800">Is it really free?</dt>
              <dd>Yes. Ads keep the lights on.</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-800">Can a business pay to change or remove prices?</dt>
              <dd>No. There are no business profiles, rankings, or paid placements.</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-800">Think an entry is wrong?</dt>
              <dd>Contact us and we&rsquo;ll review it.</dd>
            </div>
          </dl>
        </PlainSection>
      </div>
    </div>
  );
}
