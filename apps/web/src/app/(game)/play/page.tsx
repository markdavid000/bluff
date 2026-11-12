import type { Metadata } from "next";
import { LobbyWelcome } from "@/features/account";

export const metadata: Metadata = { title: "Lobby", robots: { index: false } };

export default function PlayPage() {
  return <LobbyWelcome />;
}
