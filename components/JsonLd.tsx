/**
 * Renders a JSON-LD structured-data script tag. The data comes from
 * lib/seo.ts helpers — never hand-write a JSON-LD blob in a page.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
