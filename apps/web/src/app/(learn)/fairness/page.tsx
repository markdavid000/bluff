import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { FairnessPage } from "@/features/fairness";

export const metadata: Metadata = pageMetadata({
  title: "Why it's fair",
  description:
    "How Bluff keeps every die secret until a bluff is called, with Zama's encryption, and how to check it yourself.",
  path: "/fairness",
});

export default function Fairness() {
  return <FairnessPage />;
}
