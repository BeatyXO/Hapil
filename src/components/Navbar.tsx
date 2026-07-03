"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { WalletButton } from "./WalletButton";

const links = [
  { href: "/verdicts", label: "Verdicts" },
  { href: "/appeals", label: "Appeals" },
  { href: "/appeals/new", label: "File Appeal" },
  { href: "/evidence", label: "Evidence" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stake", label: "Stake" },
  { href: "/console", label: "Console" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-court-400/30 bg-court-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-2xl tracking-wide text-court-100">⚖ Hapil</span>
          <span className="hidden rounded bg-court-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-court-100 sm:inline">
            StudioNet
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold text-court-200 transition-colors hover:bg-court-700/50 hover:text-court-100",
                pathname === l.href && "bg-court-700 text-court-100",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}
