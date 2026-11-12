import type { Metadata } from "next";
import { LobbyWelcome } from "@/features/account";
import { ChipsPanel } from "@/features/chips";

export const metadata: Metadata = { title: "Lobby", robots: { index: false } };

export default function PlayPage() {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <LobbyWelcome />
      <ChipsPanel />
    </div>
  );
}
