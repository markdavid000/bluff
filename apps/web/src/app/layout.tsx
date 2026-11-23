import type { Metadata, Viewport } from "next";
import { Irish_Grover, Nunito } from "next/font/google";
import { Atmosphere } from "@/components/shared/atmosphere";
import { siteConfig } from "@/config/site";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
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
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
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
    <html
      lang="en"
      className={`${irishGrover.variable} ${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Atmosphere />
        {children}
      </body>
    </html>
  );
}
