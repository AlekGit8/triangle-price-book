/**
 * Server-side bot detection for the first-party analytics ingest.
 * A visit is a bot when its user agent matches a known crawler, or
 * when there is no user agent at all (a script, not a browser), or
 * when the browser reports webdriver (headless automation).
 * This is a heuristic, not a verdict — a real visitor with an odd
 * user agent lands in the human bucket unless something matches.
 */

const BOT_SUBSTRINGS = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "sogou",
  "exabot",
  "facebot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "applebot",
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "petalbot",
  "bytespider",
  "gptbot",
  "chatgpt-user",
  "claudebot",
  "anthropic-ai",
  "perplexitybot",
  "ccbot",
  "rogerbot",
  "omgili",
  "crawl",
  "spider",
  "scraper",
  "headless",
  "phantomjs",
  "selenium",
  "python-requests",
  "python-urllib",
  "go-http-client",
  "java/",
  "curl",
  "wget",
  // Link-preview / uptime / email-scanner agents that carry no "bot"
  // word the old regex could catch.
  "whatsapp",
  "pingdom",
  "lighthouse",
  "slack",
  "discord",
  "telegram",
];

/**
 * Generic bot substrings — a plain substring check, not a word-boundary
 * regex: "Slackbot", "Discordbot", "Amazonbot" and friends contain "bot"
 * mid-word, so \bbot\b never matched them.
 */
const GENERIC_BOT_SUBSTRINGS = [
  "bot",
  "crawl",
  "spider",
  "scrap",
  "fetch",
  "preview",
  "monitor",
  "lighthouse",
];

export function isBotUserAgent(ua: string | null, webdriver = false): boolean {
  if (webdriver) return true;
  if (!ua || ua.trim() === "") return true;
  const lower = ua.toLowerCase();
  if (BOT_SUBSTRINGS.some((p) => lower.includes(p))) return true;
  return GENERIC_BOT_SUBSTRINGS.some((p) => lower.includes(p));
}
