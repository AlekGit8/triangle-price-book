import Image from "next/image";
import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: `${siteConfig.siteName} — Coming Soon`,
  description: "Something useful is on the way for Triangle homeowners.",
};

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16 text-center">
      <Image
        src="/logo.svg"
        alt={`${siteConfig.siteName} logo`}
        width={88}
        height={88}
        priority
      />
      <h1 className="mt-6 text-4xl font-extrabold text-brand-900">
        {siteConfig.siteName}
      </h1>
      <p className="mt-3 max-w-md text-lg text-stone-600">{siteConfig.tagline}</p>
      <div className="mt-8 rounded-full bg-brand-100 px-6 py-2 text-sm font-bold uppercase tracking-widest text-brand-800">
        Coming soon
      </div>
      <p className="mt-6 max-w-md text-stone-500">
        We&rsquo;re putting the finishing touches on something useful for Triangle
        homeowners. Check back soon.
      </p>
    </div>
  );
}
