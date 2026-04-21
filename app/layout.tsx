import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { LangProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export const metadata: Metadata = {
  title: "EliteTrader | Plataforma de Trading Profissional",
  description:
    "Negoceie CFDs, Forex, Ações, Ouro e Criptomoedas com a EliteTrader. Conta demo gratuita, alavancagem até 1:500, regulado pela FCA.",
  keywords:
    "trading, forex, CFD, ações, ouro, bitcoin, plataforma trading, conta demo",
  generator: "Next.js",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://elitetrader.com",
  ),
  openGraph: {
    title: "EliteTrader | Plataforma de Trading Profissional",
    description:
      "Negoceie CFDs, Forex, Ações, Ouro e Criptomoedas com a EliteTrader.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LangProvider>{children}</LangProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
