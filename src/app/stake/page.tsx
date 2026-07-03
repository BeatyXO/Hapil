"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { fetchAppealsByOwner, fetchConfig } from "@/lib/genlayer";
import type { Appeal, ContractConfig } from "@/lib/types";
import { formatGen } from "@/lib/types";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorBanner, Spinner } from "@/components/ui";

export default function StakeManagement() {
  const { address, connect } = useWallet();
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!address) return;
    fetchAppealsByOwner(address)
      .then(setAppeals)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stakes"));
  }, [address]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-court-100">Stake Management</h1>
        <p className="mt-1 text-sm text-court-200/80">
          GEN stakes are locked per appeal and settled automatically by consensus — returned on acceptance, slashed on rejection.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Minimum Stake</CardTitle></CardHeader>
          <CardContent>
            <p className="font-display text-3xl text-court-900">{config ? formatGen(config.min_stake) : "—"} GEN</p>
            <p className="mt-1 text-xs text-court-700">Required to file any appeal.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Protocol Slashed Pool</CardTitle></CardHeader>
          <CardContent>
            <p className="font-display text-3xl text-court-900">{config ? formatGen(config.slashed_pool) : "—"} GEN</p>
            <p className="mt-1 text-xs text-court-700">Total GEN forfeited by rejected appeals.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Appeals</CardTitle></CardHeader>
          <CardContent>
            <p className="font-display text-3xl text-court-900">{config ? config.appeal_count : "—"}</p>
            <p className="mt-1 text-xs text-court-700">Filed since deployment.</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="font-display text-xl text-court-100">Your Stakes</h2>
      {!address && <Button className="w-fit" onClick={connect}>Connect Wallet to View Stakes</Button>}
      {error && <ErrorBanner message={error} />}
      {address && !appeals && !error && <div className="flex justify-center py-10"><Spinner className="h-8 w-8" /></div>}
      {appeals && appeals.length === 0 && <EmptyState title="No stakes yet" hint="Stakes appear when you file appeals." />}
      <div className="flex flex-col gap-3">
        {appeals?.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link href={`/appeals/${a.id}`} className="font-display text-court-900 underline">
                Appeal #{a.id} · {a.case_id}
              </Link>
              <span className="font-semibold text-court-950">{formatGen(a.stake)} GEN</span>
              <Badge tone={a.stake_outcome === "Slashed" ? "danger" : a.stake_outcome === "Returned" ? "success" : "warning"}>
                {a.stake_outcome}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
