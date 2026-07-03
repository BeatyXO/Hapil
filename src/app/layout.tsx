import type { Metadata } from "next";
import { Shantell_Sans, Comic_Neue } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet";
import { Navbar } from "@/components/Navbar";

const display = Shantell_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});

const body = Comic_Neue({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Hapil — Decentralized Appeals and Evidence Consensus",
  description:
    "Hapil Protocol: stake GEN, submit new evidence, and let GenLayer validator consensus decide whether a verdict deserves reconsideration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <WalletProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl border-t border-court-400/20 px-4 py-6 text-center text-xs text-court-400">
            Hapil Protocol · Decentralized Appeals and Evidence Consensus · Powered by GenLayer StudioNet
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
