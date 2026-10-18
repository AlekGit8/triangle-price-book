import { siteConfig } from "@/lib/site-config";

/**
 * DRAFT Privacy Policy — have a local attorney review before public launch.
 */
export default function PrivacyPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-brand-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-stone-500">Draft — last updated October 2026</p>

      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="text-lg font-bold text-stone-900">1. Anonymous by default</h2>
          <p className="mt-2">
            Browsing {siteConfig.siteName} requires no account and no login. Public price
            entries are attributed only as “reported by a homeowner in {`{town}`}” — never
            by name, address, phone number, or any identifier.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">2. What we collect when you submit</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><strong>Price report details:</strong> service, category, amount, paid/quote, town, date, notes — published anonymously after moderation.</li>
            <li><strong>Business name:</strong> used only for aggregate statistics; never shown on individual entries.</li>
            <li><strong>Invoice/receipt uploads (optional):</strong> stored in a private bucket visible only to moderators; used solely to verify the entry.</li>
            <li><strong>Email (optional):</strong> used only to follow up about your submission if needed.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">3. What we never do</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>We never sell personal data to anyone.</li>
            <li>We never publish submitter names, addresses, phone numbers, or emails.</li>
            <li>We never share invoice uploads with anyone except site moderators.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">4. Analytics and cookies</h2>
          <p className="mt-2">
            We use privacy-friendly analytics (no cross-site tracking profiles). The
            submission form may use Cloudflare Turnstile, a privacy-preserving spam
            check, which sets a short-lived security cookie.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">5. Data retention and deletion</h2>
          <p className="mt-2">
            Published reports are kept as long as they remain useful historical data.
            You may request removal of your submission or deletion of your invoice upload
            at any time by contacting {siteConfig.contactEmail}; we will act promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">6. Contact</h2>
          <p className="mt-2">
            Privacy questions or deletion requests: {siteConfig.contactEmail}.
          </p>
        </section>
      </div>
    </div>
  );
}
