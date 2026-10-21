import { siteConfig } from "@/lib/site-config";

/**
 * DRAFT Terms of Service — plain-English first, reviewed for the
 * crowdsourced price-reporting model. Have a local attorney review
 * before public launch.
 */
export default function TermsPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto prose-stone">
      <h1 className="text-3xl font-extrabold text-brand-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-stone-500">Draft — last updated October 2026</p>

      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="text-lg font-bold text-stone-900">1. What this site is</h2>
          <p className="mt-2">
            {siteConfig.siteName} (“the Site”) is a community platform where people in{" "}
            {siteConfig.regionLongName} share prices they paid or were quoted for home
            services. Individual entries are published anonymously.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">2. Your submissions</h2>
          <p className="mt-2">By submitting a price report, you attest that:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>The price, service description, and date are truthful to the best of your knowledge.</li>
            <li>You are reporting your own experience (a price you paid or a quote you received).</li>
            <li>Any invoice or receipt you upload is genuine and unaltered.</li>
          </ul>
          <p className="mt-2">
            <strong>Fake, exaggerated, or bad-faith entries are prohibited</strong> and will be
            removed. Repeat abuse may result in blocked submissions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">3. How we handle entries</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Entries publish instantly upon submission.</li>
            <li>We publish entries as-is; we do not rewrite user content.</li>
            <li>Entries proven false are removed. See the takedown process below.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">4. Takedown and dispute process</h2>
          <p className="mt-2">
            Anyone who believes an entry is false may dispute it by contacting {siteConfig.contactEmail} with the entry details and the
            basis for the dispute. We will:
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
          <h2 className="text-lg font-bold text-stone-900">5. No professional advice</h2>
          <p className="mt-2">
            Prices on the Site are community-reported data points, not quotes, estimates,
            or professional advice. Always get your own quotes before hiring.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">6. Acceptable use</h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Submit false or misleading price reports.</li>
            <li>Attempt to manipulate aggregates or rankings (e.g., bulk fake submissions).</li>
            <li>Scrape the Site’s data at abusive volumes or republish it commercially without permission.</li>
            <li>Upload malware or content you don’t have the right to share.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">7. Limitation of liability</h2>
          <p className="mt-2">
            The Site is provided “as is.” We do our best to keep data accurate but make no
            guarantees about completeness or correctness. To the fullest extent permitted
            by law, we are not liable for decisions you make based on Site content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">8. Changes</h2>
          <p className="mt-2">
            We may update these terms; material changes will be noted here with a new
            revision date.
          </p>
        </section>
      </div>
    </div>
  );
}
