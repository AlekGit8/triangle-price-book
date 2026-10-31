import { Suspense } from "react";
import RevealSelect from "@/components/RevealSelect";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose your reveals — Triangle Price Book",
  robots: { index: false, follow: false },
};

export default function RevealSelectPage() {
  return (
    <Suspense>
      <RevealSelect />
    </Suspense>
  );
}
