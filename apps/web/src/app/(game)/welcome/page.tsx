import type { Metadata } from "next";
import { WelcomeForm } from "@/features/account";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const { next } = await searchParams;
  return <WelcomeForm next={typeof next === "string" ? next : undefined} />;
}
