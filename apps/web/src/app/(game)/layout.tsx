import { AppHeader } from "@/components/layout/app-header";
import { Providers } from "../providers";

export default function GameLayout({ children }: LayoutProps<"/">) {
  return (
    <Providers>
      <AppHeader />
      <main id="main" className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
        {children}
      </main>
    </Providers>
  );
}
