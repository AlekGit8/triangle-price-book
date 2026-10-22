import type { MetadataRoute } from "next";
import { siteConfig, categorySlugs } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.siteUrl;
  const now = new Date();

  const staticPages: Array<{ path: string; priority: number }> = [
    { path: "", priority: 1.0 },
    { path: "/browse", priority: 0.7 },
    { path: "/how-it-works", priority: 0.5 },
    { path: "/submit", priority: 0.7 },
    { path: "/terms", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
  ];

  const categoryPages = Object.values(categorySlugs).map((slug) => ({
    path: `/${slug}`,
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages].map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority,
  }));
}
