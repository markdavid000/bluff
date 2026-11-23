import { PublicHeader } from "@/components/layout/public-header";
import { StreetBackdrop } from "@/components/shared/street-backdrop";

export default function LearnLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 glow-backdrop" />
      <StreetBackdrop />
      <PublicHeader />
      <main
        id="main"
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4"
      >
        {children}
      </main>
    </div>
  );
}
