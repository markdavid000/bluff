import type { Metadata } from "next";
import { DesignShowcase } from "@/features/design";
import { BoardPreview } from "@/features/table";

export const metadata: Metadata = {
  title: "Design",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <DesignShowcase board={<BoardPreview />} />
    </main>
  );
}
