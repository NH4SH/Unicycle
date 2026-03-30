import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import "@/app/globals.css";
import { NavBar } from "@/components/shared/nav-bar";
import { AppProviders } from "@/components/providers/app-providers";
import { PageTransition } from "@/components/providers/page-transition";

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
  title: {
    default: "HoosFinds | UVA's fashion-first resale marketplace",
    template: "%s | HoosFinds"
  },
  description:
    "HoosFinds is UVA's fashion-first resale marketplace for student style, vintage layers, game day fits, and curated campus finds.",
  openGraph: {
    title: "HoosFinds | UVA's fashion-first resale marketplace",
    description:
      "Buy and sell the best fits on Grounds. HoosFinds brings together vintage, streetwear, outerwear, sneakers, accessories, and campus finds for fellow Hoos.",
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
  return (
    <html lang="en" className="bg-background">
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
