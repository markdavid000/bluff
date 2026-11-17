import type { Metadata } from "next";
import { HistoryScreen } from "@/features/table";

export const metadata: Metadata = { title: "Your games", robots: { index: false } };

export default function HistoryPage() {
  return <HistoryScreen />;
}
