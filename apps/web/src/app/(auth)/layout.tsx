import { Providers } from "../providers";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Providers>
      <main id="main" className="flex h-dvh flex-col overflow-hidden">
        {children}
      </main>
    </Providers>
  );
}
