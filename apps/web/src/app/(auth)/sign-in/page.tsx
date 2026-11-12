import type { Metadata } from "next";
import { SignInScene } from "@/features/account";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  return <SignInScene next={typeof next === "string" ? next : undefined} />;
}
