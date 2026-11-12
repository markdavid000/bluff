import type { Metadata } from "next";
import { StreetBackdrop } from "@/components/shared/street-backdrop";
import { PlayerGreeting } from "@/features/account";
import { Lobby } from "@/features/lobby";

export const metadata: Metadata = { title: "Lobby", robots: { index: false } };

export default async function PlayPage({ searchParams }: PageProps<"/play">) {
  const { join } = await searchParams;
  return (
    <>
      <StreetBackdrop />
      <Lobby greeting={<PlayerGreeting />} invite={typeof join === "string" ? join : null} />
    </>
  );
}
