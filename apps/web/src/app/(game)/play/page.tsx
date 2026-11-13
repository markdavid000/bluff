import type { Metadata } from "next";
import { PlayerGreeting } from "@/features/account";
import { Lobby } from "@/features/lobby";

export const metadata: Metadata = { title: "Lobby", robots: { index: false } };

export default function PlayPage() {
  return <Lobby greeting={<PlayerGreeting />} />;
}
