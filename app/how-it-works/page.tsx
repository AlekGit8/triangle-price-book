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
            Prices come from neighbors in {siteConfig.regionLongName} who submit what
            they <strong>paid</strong> or were <strong>quoted</strong> — every entry is
            labeled one or the other. We also seed the database with public permit
            valuations where available, clearly labeled as such.
          </p>
          <p>
            We never scrape prices from business websites, never invent entries, and
            never present a national average as a local price.
          </p>
        </Section>

        <Section n="2" title="The anonymity model">
          <p>
            <strong>We don’t collect business names at all.</strong> The submission
            form asks for the service, the price, the town, and the date — nothing
            that identifies who did the work or who paid for it.
          </p>
          <p>
            Public entries are attributed only as “reported by a verified homeowner
            in {`{town}`},” never by name, address, or contact info. There is no
            business directory here, no rankings, no profiles — just prices.
          </p>
        </Section>

        <Section n="3" title="Verification">
          <p>
            Entries marked <strong>Verified</strong> had an invoice or receipt uploaded
            and checked by a moderator: the amount, service, and date match the entry.
            Invoices stay private — only moderators ever see them.
          </p>
          <p>
            Entries without an invoice are published as <strong>unverified community
            reports</strong>, clearly labeled. We’d rather show an honest unverified
            report than hide useful data.
          </p>
        </Section>

        <Section n="4" title="How aggregates work">
          <p>
            Per-service cards show the <strong>range, median, and count</strong> of
            verified reports — computed directly from the database, no editorial
            judgment. Paid prices and quotes are counted separately and labeled.
          </p>
          <p>
            That’s the whole product: what a service costs around here, from real
            reports. No business comparisons, no leaderboards — we deliberately
            don’t track who charged what.
          </p>
        </Section>

        <Section n="5" title="For businesses">
          <p>
            There are no business profiles, no dispute flows, and no owner responses —
            the site doesn’t track businesses at all, so there’s nothing to claim or
            dispute. A business that believes a specific entry is false can still
            contact us and we’ll review it under the takedown process in our Terms
            of Service.
          </p>
        </Section>

        <Section n="6" title="Money and independence">
          <p>
            The site runs with <strong>no ads and no pay-to-play placement</strong>.
            There is nothing for a business to buy here — no rankings, no profiles,
            no featured slots tied to price data.
          </p>
          <p>
            If sponsored placements ever exist in the future, they will be{" "}
            <strong>clearly labeled as sponsored</strong> and will never affect price
            data. The numbers stay independent — full stop.
          </p>
        </Section>

        <Section n="7" title="The legal basis, in plain English">
          <p>
            Sharing a price you paid or were quoted is sharing <strong>your own
            experience</strong> — not a trade secret. In the U.S., truthful price
            reporting is protected speech.
          </p>
          <p>
            The federal <strong>Consumer Review Fairness Act (2016)</strong> makes it
            illegal for businesses to use form contracts to gag honest customer reviews.
            As a platform for user-submitted content, the site is shielded by{" "}
            <strong>Section 230</strong> of the Communications Decency Act.
          </p>
          <p>
            That protection doesn’t cover falsehoods: entries proven false are removed,
            and submitters attest under the Terms of Service that their entries are
            truthful.
          </p>
        </Section>

        <Section n="8" title="What we don't do">
          <ul className="list-disc pl-5 space-y-1">
            <li>We never publish homeowners’ personal data — no names, addresses, or phone numbers.</li>
            <li>We never sell personal data to anyone.</li>
            <li>We don’t run fake entries, and moderated-out fakes never reach the public site.</li>
            <li>We don’t edit user entries — we remove or keep them.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
