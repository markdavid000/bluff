import type { Metadata } from "next";
import { WelcomeForm } from "@/features/account";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default function WelcomePage() {
  return <WelcomeForm />;
}
