import type { Metadata } from "next";
import { RefreshScreen } from "@/features/account";

export const metadata: Metadata = { title: "Welcome back", robots: { index: false } };

export default async function RefreshPage({ searchParams }: PageProps<"/refresh">) {
  const { next } = await searchParams;
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <RefreshScreen next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
