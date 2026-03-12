import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { NavBar } from "@/components/shared/nav-bar";
import { AppProviders } from "@/components/providers/app-providers";
import { PageTransition } from "@/components/providers/page-transition";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  title: "UniCycle | UVA-only resale marketplace",
  description: "UVA's resale drops. Buy and sell on Grounds."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${spaceGrotesk.variable}`}>
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
