"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { fetchAppealsByOwner } from "@/lib/genlayer";
import type { Appeal } from "@/lib/types";
import { formatGen } from "@/lib/types";
import { AppealCard } from "@/components/AppealCard";
import { Button, Card, CardContent, EmptyState, ErrorBanner, Spinner } from "@/components/ui";

export default function Dashboard() {
  const { address, connect } = useWallet();
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    fetchAppealsByOwner(address)
      .then(setAppeals)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load your appeals"));
  }, [address]);

  if (!address) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <h1 className="font-display text-3xl text-court-100">Appeal Dashboard</h1>
        <p className="mt-3 text-court-200/80">Connect your wallet to view your appeals, stakes, and outcomes.</p>
        <Button className="mt-6" onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  const stats = appeals
    ? {
        total: appeals.length,
        accepted: appeals.filter((a) => a.status === "Accepted").length,
        rejected: appeals.filter((a) => a.status === "Rejected").length,
        locked: appeals
          .filter((a) => a.stake_outcome === "Locked")
          .reduce((s, a) => s + BigInt(a.stake), 0n),
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-court-100">Appeal Dashboard</h1>
          <p className="mt-1 text-sm text-court-200/80">Your appeals, locked stakes, and consensus outcomes.</p>
        </div>
        <Link href="/appeals/new"><Button>File New Appeal</Button></Link>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total Appeals", value: String(stats.total) },
            { label: "Accepted", value: String(stats.accepted) },
            { label: "Rejected", value: String(stats.rejected) },
            { label: "GEN Locked", value: formatGen(stats.locked) },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="text-center">
                <p className="font-display text-3xl text-court-900">{s.value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-court-700">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} />}
      {!appeals && !error && <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>}
      {appeals && appeals.length === 0 && (
        <EmptyState title="You have no appeals yet" hint="File an appeal to challenge an existing verdict." />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {appeals?.map((a) => <AppealCard key={a.id} appeal={a} />)}
      </div>
    </div>
  );
}
