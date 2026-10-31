import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: `Privacy Policy | ${siteConfig.siteName}`,
  description: `Privacy Policy for ${siteConfig.siteName}.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: October 30, 2026</p>
      <p className="mt-4 text-[15px] leading-relaxed text-ink">
        {siteConfig.siteName} is operated by {siteConfig.operatorName} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;).
      </p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink">
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="text-lg font-bold text-ink">The short version</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>No account or login is needed to browse or submit.</li>
            <li>Public entries show only the <strong>service, price, town, and date</strong> — never your name or address. Contractor names appear only on verified entries, and only to paying viewers (see Section 2).</li>
            <li>Quotes and invoices stay private. Only moderators see them, and only to verify an entry — except that a document you ask us to read is also sent to Google&rsquo;s Gemini AI to extract the service details and price from it (see Section 2).</li>
            <li>We never sell or share your submission, uploaded documents, or email with advertisers.</li>
            <li>The Site runs ads, and the ad provider may use cookies (see Section 6).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">1. Anonymous by default</h2>
          <p className="mt-2">
            Browsing {siteConfig.siteName} requires no account and no login. Public price
            entries are attributed only as &ldquo;reported by a homeowner in {`{town}`},&rdquo;
            never by name, address, phone number, or any other identifier.
            The one exception is the contractor&rsquo;s business name on verified
            entries, which paying viewers can reveal (Section 2) — the homeowner
            is never identified.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">2. Information we collect</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><strong>Price report details:</strong> service, category, amount, whether it was paid or quoted, town, date, and optional notes. These are published anonymously. Please don&rsquo;t put names, addresses, phone numbers, or business names in notes; we remove them when we find them.</li>
            <li><strong>Business names (verified entries only):</strong> when a document verifies an entry, we may store the business name from it, separately from the public listing. It is shown only to a visitor who pays for the reveal ($1.99 for one job, $4.99 for all verified listings — both one-time purchases). A business that believes a listing is inaccurate can contact us to dispute it.</li>
            <li><strong>Quote or invoice uploads (optional):</strong> these documents may contain names, addresses, and business details. They are stored privately, visible only to moderators, and used only to verify the entry. They are never published. If you use the upload-and-auto-fill option, the document is also sent to Google&rsquo;s Gemini AI service to read the service details and price from it; Google processes it only to return that extraction to us.</li>
            <li><strong>Email address (optional):</strong> used only to follow up about your submission if needed.</li>
            <li><strong>Technical information:</strong> such as IP address, browser and device type, and pages visited, collected automatically by our hosting, analytics, and security tools.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">3. How we use information</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>To publish price reports and verify entries.</li>
            <li>To operate paid business-name reveals on verified entries.</li>
            <li>To prevent spam, fraud, and abuse.</li>
            <li>To follow up about a submission, if you gave an email.</li>
            <li>To understand how the Site is used and keep it running and improving.</li>
            <li>To comply with the law and respond to legal requests.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">4. What we never do</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>We never sell or share your submission, uploaded documents, or email address with advertisers or anyone else.</li>
            <li>We never publish submitter names, addresses, phone numbers, or emails.</li>
            <li>We never share uploaded documents with anyone except site moderators, the secure service providers that store them, and Google&rsquo;s Gemini AI service when you ask us to read a document (see Section 2), unless the law requires it.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">5. Analytics and cookies</h2>
          <p className="mt-2">
            We use privacy-friendly analytics with no cross-site tracking profiles. The
            submission form may use Cloudflare Turnstile, a privacy-preserving spam
            check, which sets a short-lived security cookie. We also measure our own
            traffic — anonymous page views, time spent on a page, and whether a visit
            looks like a bot — with a first-party counter that sets no cookies and
            stores no IP addresses. A random session identifier is kept only in your
            browser tab and forgotten when you close it. Clicking a banner labelled
            &ldquo;Sponsored&rdquo; — or a link in one of our emails that goes through
            our site first — takes you through a short redirect that records one
            anonymous click — which link it was, the page you came from, and whether
            the visit looks like a bot — so we can count clicks. No IP address is
            stored for that click either. We also use Google Analytics, which sets
            cookies and collects usage information such as the pages you visit and
            your IP address; Google processes that data to show us how the Site is
            used.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">6. Advertising</h2>
          <p className="mt-2">
            The Site may run ads to help cover its costs. Our ad provider may use cookies
            or similar technologies to show ads, which may be based on your browsing. We
            do not give advertisers or ad providers your submissions, uploaded documents,
            or email address. You can manage ad personalization through your
            browser&rsquo;s cookie settings. The Site may also show a single banner
            labelled &ldquo;Sponsored&rdquo; at the top of the page, linking to a local
            sponsor&rsquo;s site. Sponsors pay for the banner only — they get no
            influence over listings, prices, or moderation, and no visitor data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">7. Service providers and legal requests</h2>
          <p className="mt-2">
            We use trusted providers for hosting, file storage, spam protection,
            AI document reading (Google Gemini), analytics, and ads. They handle data only to provide those services to us.
            We may also disclose information if required by law or to protect the Site
            and its users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">8. Data retention and deletion</h2>
          <p className="mt-2">
            Published reports are kept as long as they remain useful as historical data.
            Uploaded documents are kept up to as long as the entry remains posted on the
            site.
          </p>
          <p className="mt-2">
            You may ask us to remove your submission or delete your uploaded document at
            any time by emailing{" "}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-semibold text-ink hover:underline"
            >
              {siteConfig.contactEmail}
            </a>
            , and we will act promptly. Because entries are anonymous, we may ask for
            details such as the service, price, date, and town to find yours.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">9. Security</h2>
          <p className="mt-2">
            We use reasonable measures to protect the information we hold, including
            keeping uploaded documents in private storage. No method of storing or
            transmitting data is completely secure, so we can&rsquo;t guarantee absolute
            security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">10. Children</h2>
          <p className="mt-2">
            The Site is intended for adults. We do not knowingly collect information from
            anyone under 18.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">11. Changes</h2>
          <p className="mt-2">
            We may update this policy. Material changes will be noted on this page with
            a new revision date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">12. Contact</h2>
          <p className="mt-2">
            Privacy questions or deletion requests:{" "}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-semibold text-ink hover:underline"
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
