import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: `Terms of Service | ${siteConfig.siteName}`,
  description: `Terms of Service for ${siteConfig.siteName}.`,
};

export default function TermsPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-brand-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: October 23, 2026</p>
      <p className="mt-4 text-[15px] leading-relaxed text-stone-700">
        {siteConfig.siteName} is operated by {siteConfig.operatorName} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;).
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-stone-700">
        By using {siteConfig.siteName} (the &ldquo;Site&rdquo;), you agree to these Terms.
        If you don&rsquo;t agree, please don&rsquo;t use the Site.
      </p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="text-lg font-bold text-stone-900">1. What the Site is</h2>
          <p className="mt-2">
            {siteConfig.siteName} is a free community site where homeowners in the
            Raleigh-Durham Triangle of North Carolina share what they paid or were
            quoted for home services. You don&rsquo;t need an account to browse or
            submit. Entries are published anonymously and are never tied to a customer
            or business name or address.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">2. Who can use the Site</h2>
          <p className="mt-2">
            You must be at least 18 years old to submit a price report.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">3. Your submissions</h2>
          <p className="mt-2">When you submit a price report, you confirm that:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>The price, service description, and date are truthful to the best of your knowledge.</li>
            <li>You are reporting your own experience: a price you paid or a quote you received.</li>
            <li>Any quote or invoice you upload is genuine and unaltered.</li>
            <li>You will not put names, addresses, phone numbers, or business names in your notes. We may remove them or the entry.</li>
          </ul>
          <p className="mt-2">
            <strong>Fake, exaggerated, or bad-faith entries are prohibited</strong> and
            will be removed. Repeat abuse may result in blocked submissions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">4. Verified and unverified entries</h2>
          <p className="mt-2">
            An entry is <strong>Verified</strong> when it is submitted with a quote or
            invoice that passes our checks. Entries submitted without a document are
            still published, clearly labeled as unverified community reports.
          </p>
          <p className="mt-2 font-semibold text-stone-800">
            Price ranges and medians are calculated from Verified entries only.
          </p>
          <p className="mt-2">
            &ldquo;Verified&rdquo; means a source document was provided and checked. It
            does not guarantee that a price is right for your project.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">5. License you give us</h2>
          <p className="mt-2">
            You keep ownership of what you submit. By submitting a price report, you
            give us a free, worldwide, non-exclusive license to publish, display, and
            store the information in it (service, price, town, date, and notes) for as
            long as the entry is on the Site, and to use anonymous statistics based on
            it. Uploaded documents are used only for verification and are never
            published (see our Privacy Policy).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">6. How we handle entries</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Entries publish right away. Moderators may review them afterward.</li>
            <li>We publish entries as submitted and do not rewrite user content.</li>
            <li>We may remove entries that are false, abusive, contain personal information or business names, or otherwise break these Terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">7. Removal and dispute process</h2>
          <p className="mt-2">
            Anyone who believes an entry is false may dispute it by emailing{" "}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {siteConfig.contactEmail}
            </a>{" "}
            with the entry details and the reason for the dispute. If you submitted an
            entry yourself, you can use the same address to ask us to remove it. We will:
          </p>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Review the entry and any evidence provided within a reasonable time.</li>
            <li>Remove entries shown to be false or unverifiable.</li>
            <li>Keep a record of the dispute and our decision.</li>
          </ol>
          <p className="mt-2">
            Truthful entries are not removed because a business dislikes them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">8. No professional advice</h2>
          <p className="mt-2">
            Prices on the Site are community-reported data points. They are not quotes,
            estimates, recommendations of any business, or professional advice. Real
            prices depend on the scope of work, materials, timing, and more. Always get
            your own quotes before hiring.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">9. Ads and independence</h2>
          <p className="mt-2">
            The Site shows ads to help cover its costs. Ads are provided by third
            parties, are not endorsements, and we are not responsible for
            advertisers&rsquo; offers or products. Ads never affect the price data.
            Businesses cannot pay to add, change, remove, or promote entries.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">10. Acceptable use</h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Submit false or misleading price reports.</li>
            <li>Try to manipulate price ranges or medians, such as with bulk fake submissions.</li>
            <li>Scrape the Site&rsquo;s data at abusive volumes, or republish it commercially without permission.</li>
            <li>Upload malware or content you don&rsquo;t have the right to share.</li>
            <li>Interfere with the Site&rsquo;s security or normal operation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">11. Disclaimers and limitation of liability</h2>
          <p className="mt-2">
            The Site is provided &ldquo;as is.&rdquo; We do our best to keep data
            accurate but make no guarantees about its completeness or correctness. To
            the fullest extent permitted by law, we are not liable for decisions you
            make based on Site content, or for indirect or consequential losses arising
            from your use of the Site. Nothing in these Terms limits rights that cannot
            be limited by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">12. Governing law</h2>
          <p className="mt-2">
            These Terms are governed by the laws of the State of North Carolina.
            Disputes will be handled in the state or federal courts located in Wake
            County, North Carolina.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">13. Changes</h2>
          <p className="mt-2">
            We may update these Terms. Material changes will be noted on this page with
            a new revision date. Continuing to use the Site after a change means you
            accept the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">14. Contact</h2>
          <p className="mt-2">
            Questions about these Terms:{" "}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {siteConfig.contactEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
