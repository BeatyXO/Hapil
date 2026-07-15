"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { createAppeal, fetchConfig } from "@/lib/genlayer";
import { formatGen, type TxPhase } from "@/lib/types";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, ErrorBanner } from "@/components/ui";
import { TxStatus } from "@/components/TxStatus";

export default function NewAppeal() {
  const { address, connect } = useWallet();
  const router = useRouter();

  const [caseId, setCaseId] = useState("");
  const [reason, setReason] = useState("");
  const [stakeGen, setStakeGen] = useState("1");
  const [minStake, setMinStake] = useState<bigint>(10n ** 18n);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig().then((c) => setMinStake(BigInt(c.min_stake))).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!address) return connect();

    let stakeWei: bigint;
    try {
      const [whole, frac = ""] = stakeGen.split(".");
      stakeWei = BigInt(whole || "0") * 10n ** 18n + BigInt((frac + "0".repeat(18)).slice(0, 18));
    } catch {
      return setError("Invalid stake amount");
    }
    if (stakeWei < minStake) {
      return setError(`Stake must be at least ${formatGen(minStake)} GEN`);
    }

    setPhase("signing");
    try {
      const res = await createAppeal(address, caseId.trim(), reason.trim(), stakeWei);
      setHash(res.hash);
      setPhase("success");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-court-100">File an Appeal</h1>
        <p className="mt-1 text-sm text-court-200/80">
          Step 1 of 3 — reference the verdict and lock your GEN stake. You will add evidence next.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Appeal Petition</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="case">Authorized Case ID</Label>
              <Input id="case" required value={caseId} onChange={(e) => setCaseId(e.target.value)}
                placeholder="e.g. DAO-DISPUTE-2026-014" />
            </div>
            <div>
              <Label htmlFor="reason">Appeal Reason</Label>
              <Textarea id="reason" required rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Why does new evidence justify reopening this case?" />
            </div>
            <div>
              <Label htmlFor="stake">GEN Stake (min {formatGen(minStake)} GEN)</Label>
              <Input id="stake" required value={stakeGen} onChange={(e) => setStakeGen(e.target.value)}
                inputMode="decimal" placeholder="1.0" />
              <p className="mt-1 text-xs text-court-700">
                Locked until consensus completes. Rejected appeals are slashed; accepted appeals are returned.
              </p>
            </div>
            {error && <ErrorBanner message={error} />}
            <TxStatus phase={phase} hash={hash} error={error} pendingLabel="Recording appeal on GenLayer…" />
            <Button type="submit" disabled={phase === "signing" || phase === "pending"}>
              {address ? "Stake GEN & File Appeal" : "Connect Wallet to Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
