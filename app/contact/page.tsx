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
  title: `Contact ${siteConfig.siteName}`,
  description:
    "Contact Triangle Price Book by email — for corrections, questions, press, and sponsorship.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">Contact {siteConfig.siteName}</h1>
      <p className="mt-3 text-lg text-muted">
        Questions, corrections, press, or sponsorship — write to us.
      </p>

      <div className="mt-8 space-y-5">
        <Section title="Email us">
          <p>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-semibold text-ink hover:underline text-base"
            >
              {siteConfig.contactEmail}
            </a>
          </p>
          <p>
            Think an entry is wrong? Tell us which one and what should change
            and we&rsquo;ll review it. For anything else about the site — a
            question, a press inquiry, or a sponsorship — this address reaches
            us too.
          </p>
        </Section>

        <Section title="Site suggestions">
          <p>
            Have an idea for the site itself — a feature, a category, or an
            improvement? Use the{" "}
            <Link href="/feedback" className="font-semibold text-ink hover:underline">
              feedback form
            </Link>{" "}
            so suggestions stay in one place where we can track them.
          </p>
        </Section>

        <Section title="Who runs this site">
          <p>
            {siteConfig.siteName} is operated by{" "}
            <a
              href="https://longsitelabs.com"
              className="font-semibold text-ink hover:underline"
            >
              {siteConfig.operatorName}
            </a>
            . Learn more about the site on the{" "}
            <Link href="/about" className="font-semibold text-ink hover:underline">
              About page
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
