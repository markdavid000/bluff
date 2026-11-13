import { AppHeader } from "@/components/layout/app-header";
import { StreetBackdrop } from "@/components/shared/street-backdrop";
import { WelcomeGate } from "@/features/account";
import { Providers } from "../providers";

export default function GameLayout({ children }: LayoutProps<"/">) {
  return (
    <Providers>
      <div className="relative isolate flex h-dvh flex-col overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 glow-backdrop" />
        <StreetBackdrop />
        <AppHeader />
        <main
          id="main"
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4"
        >
          <WelcomeGate>{children}</WelcomeGate>
        </main>
      </div>
    </Providers>
  );
}
