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

export default function HowItWorksPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-brand-900">How this works</h1>
      <p className="mt-3 text-stone-600">
        Full transparency on where the data comes from, what we do with it, and how
        the site stays honest. No fine print.
      </p>

      <div className="mt-8 space-y-5">
        <Section n="1" title="Where the data comes from">
          <p>
            Crowdsourcing. Neighbors in {siteConfig.regionLongName} share what
            they <strong>paid</strong> or were <strong>quoted</strong> for home
            services — every entry is labeled one or the other.
          </p>
          <p>
            The idea is simple: when everyone can see what things actually cost
            around here, we all make more informed decisions — and nobody
            overpays just because they were guessing.
          </p>
        </Section>

        <Section n="2" title="The anonymity model">
          <p>
            The submission form asks for the service, the price, the town, and
            the date. If you attach a quote or invoice, the document itself may
            contain names or other details — but none of that is ever listed
            publicly. No addresses where work was done, no customer names, no
            business names: public entries show only the price, the service,
            the town, and the date.
          </p>
          <p>
            Public entries are attributed only as “reported by a homeowner
            in {`{town}`},” never by name, address, or contact info. There is no
            business directory here, no rankings, no profiles — just prices.
          </p>
        </Section>

        <Section n="3" title="Verification">
          <p>
            Every entry marked <strong>Verified</strong> was submitted with a
            source document — a quote or invoice — attached. Documents stay
            private: only moderators ever see them.
          </p>
          <p>
            You can also submit a price <strong>without</strong> a document.
            Those entries publish instantly as <strong>unverified community
            reports</strong> — clearly labeled, and never counted in the range
            and median figures, which come from verified reports only. Our
            system checks uploaded files to make sure they’re actually
            home-services quotes or invoices with readable details — anything
            else is rejected before it can publish. Moderators spot-check
            entries and remove anything abusive or fake.
          </p>
        </Section>

        <Section n="4" title="For businesses">
          <p>
            There are no business profiles, no dispute flows, and no owner responses —
            the site doesn’t track businesses at all, so there’s nothing to claim or
            dispute. A business that believes a specific entry is false can still
            contact us and we’ll review it under the takedown process in our Terms
            of Service.
          </p>
        </Section>

        <Section n="5" title="Money and independence">
          <p>
            This site runs ads. That’s the deal that keeps it free and
            accessible to everyone — the ads simply keep the site running.
          </p>
          <p>
            Ads never affect the price data. There is nothing for a business to
            buy here: no rankings, no profiles, no featured slots tied to the
            numbers. The data stays independent — full stop.
          </p>
        </Section>

        <Section n="6" title="What we don't do">
          <ul className="list-disc pl-5 space-y-1">
            <li>We never publish homeowners’ personal data — no names, addresses, or phone numbers.</li>
            <li>We never sell personal data to anyone.</li>
            <li>We don’t edit user entries — we remove obviously fake entries, or keep real entries.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
