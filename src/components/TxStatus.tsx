"use client";

import type { TxPhase } from "@/lib/types";
import { explorerTxUrl } from "@/lib/genlayer";
import { Spinner } from "./ui";

export function TxStatus({
  phase,
  hash,
  error,
  pendingLabel = "Waiting for GenLayer consensus…",
}: {
  phase: TxPhase;
  hash?: string | null;
  error?: string | null;
  pendingLabel?: string;
}) {
  if (phase === "idle") return null;
  return (
    <div className="rounded-md border border-court-400/40 bg-court-200/60 px-4 py-3 text-sm text-court-950">
      {phase === "signing" && (
        <span className="flex items-center gap-2">
          <Spinner /> Confirm the transaction in your wallet…
        </span>
      )}
      {phase === "pending" && (
        <span className="flex items-center gap-2">
          <Spinner /> {pendingLabel}
        </span>
      )}
      {phase === "success" && <span className="font-semibold text-emerald-700">✓ Transaction finalized on-chain.</span>}
      {phase === "error" && <span className="text-red-700">✗ {error ?? "Transaction failed."}</span>}
      {hash && (
        <a
          href={explorerTxUrl(hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate text-xs font-semibold text-court-700 underline"
        >
          View in GenLayer Studio explorer: {hash}
        </a>
      )}
    </div>
  );
}
