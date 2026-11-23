import type { Metadata } from "next";
import { HowToPlay } from "@/features/rules";

export const metadata: Metadata = {
  title: "How to play",
  description:
    "The rules of Bluff: roll in secret, guess how many dice show a number, and call out the liars.",
};

export default function HowToPlayPage() {
  return <HowToPlay />;
}
