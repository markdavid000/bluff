import type { Metadata, Viewport } from "next";
import { Irish_Grover, Nunito } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const irishGrover = Irish_Grover({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-irish-grover",
});

const nunito = Nunito({ subsets: ["latin"], display: "swap", variable: "--font-nunito" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efe3cf" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a33" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${irishGrover.variable} ${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
