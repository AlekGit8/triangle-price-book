/**
 * "Quick answers" Q&As — the single source of truth for the homepage
 * FAQ. The visible FAQ (components/HomepageBody) and the FAQPage
 * JSON-LD (app/page.tsx) both read from here, so the markup can never
 * drift from the answers visitors see. Edit ONLY this file to change
 * a question or answer.
 */
export const FAQ: Array<{ q: string; a: string }> = [
  { q: "Do I need an account?", a: "No." },
  { q: "Is it really free?", a: "Yes. Browsing and submitting posts are free — seeing the name of the business or contractor who did the work has a small fee." },
  {
    q: "Can a business pay to change or remove prices?",
    a: "No. There are no business profiles, rankings, or paid placements in listings — just one clearly labeled sponsor banner at the top of the site.",
  },
  { q: "Think an entry is wrong?", a: "Contact us and we'll review it." },
];
