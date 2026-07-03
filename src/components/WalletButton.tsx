"use client";

import { useWallet } from "@/lib/wallet";
import { shortAddress } from "@/lib/types";
import { Button, Spinner } from "./ui";

export function WalletButton() {
  const { address, connecting, connect, disconnect, error } = useWallet();

  if (address) {
    return (
      <Button variant="secondary" onClick={disconnect} title="Click to disconnect">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {shortAddress(address)}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={connect} disabled={connecting}>
        {connecting && <Spinner />}
        {connecting ? "Connecting…" : "Connect Wallet"}
      </Button>
      {error && <span className="max-w-xs text-right text-xs text-red-300">{error}</span>}
    </div>
  );
}
