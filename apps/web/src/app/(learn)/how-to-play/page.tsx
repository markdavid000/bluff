import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { HowToPlay } from "@/features/rules";

export const metadata: Metadata = pageMetadata({
  title: "How to play",
  description:
    "The rules of Bluff: roll in secret, guess how many dice show a number, and call out the liars.",
  path: "/how-to-play",
});

export default function HowToPlayPage() {
  return <HowToPlay />;
}
