import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Script from "next/script";

import "@/app/globals.css";
import { NavBar } from "@/components/shared/nav-bar";
import { AppProviders } from "@/components/providers/app-providers";
import { PageTransition } from "@/components/providers/page-transition";
import { ThemeScript } from "@/components/providers/theme-script";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hoosfinds.com"),
  icons: {
    icon: "/brand/hoosfinds-logo.png",
    apple: "/brand/hoosfinds-logo.png",
    shortcut: "/brand/hoosfinds-logo.png"
  },
  title: {
    default: "HoosFinds | UVA's fashion-first resale marketplace",
    template: "%s | HoosFinds"
  },
  description:
    "HoosFinds is UVA's fashion-first resale marketplace for student style, vintage layers, outerwear, and curated Grounds finds.",
  openGraph: {
    title: "HoosFinds | UVA's fashion-first resale marketplace",
    description:
      "Buy and sell the best fits on Grounds. HoosFinds brings together vintage, streetwear, outerwear, sneakers, accessories, and Grounds finds for fellow Hoos.",
    url: "https://hoosfinds.com",
    siteName: "HoosFinds",
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "HoosFinds | UVA's fashion-first resale marketplace",
    description:
      "The stylish resale layer of UVA. Shop student style, local pickups, and curated finds on Grounds."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shouldLoadAnalytics = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <head>
        <ThemeScript />
        {shouldLoadAnalytics ? (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-YPMTH8D2RJ"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-YPMTH8D2RJ');
              `}
            </Script>
          </>
        ) : null}
      </head>
      <body className={`${manrope.variable} ${cormorant.variable}`}>
        <AppProviders>
          <NavBar />
          <main className="min-h-[calc(100vh-4rem)] pb-16">
            <PageTransition>{children}</PageTransition>
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
