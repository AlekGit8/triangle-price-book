import FreeRevealSelect from "@/components/FreeRevealSelect";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your free reveal — Triangle Price Book",
  robots: { index: false, follow: false },
};

/**
 * Free-reveal picker (/reveal/free/<token>). The token is a grant
 * earned by a verified submission — bearer-token access, same model
 * as the paid token pages: the link IS the reveal, no account, no
 * expiry. A literal "free" segment, so this never collides with the
 * paid /reveal/[token] page.
 */
export default async function FreeRevealPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <FreeRevealSelect token={token} />;
}
