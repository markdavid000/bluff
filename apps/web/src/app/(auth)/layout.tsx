import { Providers } from "../providers";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Providers>
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </Providers>
  );
}
