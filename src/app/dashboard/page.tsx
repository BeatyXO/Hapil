"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { fetchAppealsByOwner, fetchConfig, registerCase, setAuthorizedRole, setMinStake } from "@/lib/genlayer";
import type { Appeal } from "@/lib/types";
import { formatGen } from "@/lib/types";
import { AppealCard } from "@/components/AppealCard";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorBanner, Input, Label, Spinner, Textarea } from "@/components/ui";

export default function Dashboard() {
  const { address, connect } = useWallet();
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [minStakeGen, setMinStakeGen] = useState("1");
  const [registrar, setRegistrar] = useState("");
  const [caseId, setCaseId] = useState("");
  const [verdict, setVerdict] = useState("");
  const [originalHashes, setOriginalHashes] = useState("[]");

  useEffect(() => {
    if (!address) return;
    fetchAppealsByOwner(address)
      .then(setAppeals)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load your appeals"));
  }, [address]);

  useEffect(() => {
    fetchConfig().then((config) => {
      setOwner(config.owner.toLowerCase());
      setMinStakeGen(formatGen(config.min_stake));
    }).catch(() => {});
  }, []);

  const isAdmin = !!address && !!owner && address.toLowerCase() === owner;
  async function adminAction(action: () => Promise<{ hash: string }>, success: string) {
    setAdminBusy(true); setAdminMessage(null);
    try { const result = await action(); setAdminMessage(`${success} Transaction: ${result.hash}`); }
    catch (e) { setAdminMessage(e instanceof Error ? e.message : "Admin transaction failed"); }
    finally { setAdminBusy(false); }
  }

  function stakeWei(value: string): bigint {
    const [whole, fraction = ""] = value.trim().split(".");
    return BigInt(whole || "0") * 10n ** 18n + BigInt((fraction + "0".repeat(18)).slice(0, 18));
  }

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

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle>Admin Controls</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-sm text-court-700">Owner-only controls. Contract authorization is enforced on-chain as well.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Minimum stake (GEN)</Label>
                <div className="flex gap-2"><Input value={minStakeGen} onChange={(e) => setMinStakeGen(e.target.value)} inputMode="decimal" /><Button disabled={adminBusy} onClick={() => adminAction(() => setMinStake(address, stakeWei(minStakeGen)), "Minimum stake updated.")}>Set minimum</Button></div>
              </div>
              <div>
                <Label>Registrar wallet address</Label>
                <div className="flex gap-2"><Input value={registrar} onChange={(e) => setRegistrar(e.target.value)} placeholder="0x…" /><Button disabled={adminBusy || !registrar} onClick={() => adminAction(() => setAuthorizedRole(address, registrar, "case_registrar", true), "Registrar authorized.")}>Authorize</Button></div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Case ID</Label><Input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="CASE-2026-001" /></div>
              <div><Label>Original evidence hashes (JSON array)</Label><Input value={originalHashes} onChange={(e) => setOriginalHashes(e.target.value)} placeholder="[]" /></div>
            </div>
            <div><Label>Finalized verdict</Label><Textarea value={verdict} onChange={(e) => setVerdict(e.target.value)} rows={3} placeholder="Authoritative finalized verdict" /></div>
            <Button disabled={adminBusy || !caseId || !verdict} onClick={() => adminAction(() => registerCase(address, caseId, verdict, originalHashes), "Case registered.")}>Register case</Button>
            {adminMessage && <p className="break-all rounded bg-court-200 p-3 text-xs text-court-900">{adminMessage}</p>}
          </CardContent>
        </Card>
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
