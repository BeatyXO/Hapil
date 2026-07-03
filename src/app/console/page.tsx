"use client";

import { useState } from "react";
import {
  CONTRACT_ADDRESS, explorerAddressUrl,
  fetchAppeal, fetchAppeals, fetchConfig, fetchConsensus, fetchEvidence,
} from "@/lib/genlayer";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";

const READS = [
  { name: "get_config", needsId: false },
  { name: "get_appeals", needsId: false },
  { name: "get_appeal", needsId: true },
  { name: "get_evidence", needsId: true },
  { name: "get_consensus", needsId: true },
] as const;

export default function ContractConsole() {
  const [fn, setFn] = useState<string>("get_config");
  const [id, setId] = useState("0");
  const [output, setOutput] = useState<string>("// call a view method to inspect on-chain state");
  const [busy, setBusy] = useState(false);

  const needsId = READS.find((r) => r.name === fn)?.needsId ?? false;

  async function run() {
    setBusy(true);
    try {
      const n = Number(id) || 0;
      let result: unknown;
      switch (fn) {
        case "get_config": result = await fetchConfig(); break;
        case "get_appeals": result = await fetchAppeals(0, 50); break;
        case "get_appeal": result = await fetchAppeal(n); break;
        case "get_evidence": result = await fetchEvidence(n); break;
        case "get_consensus": result = await fetchConsensus(n); break;
      }
      setOutput(JSON.stringify(result, null, 2));
    } catch (e) {
      setOutput(`// ERROR\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-court-100">Contract Interaction Panel</h1>
        <p className="mt-1 text-sm text-court-200/80">
          Direct read access to the HapilProtocol intelligent contract on StudioNet.
        </p>
        <a
          href={explorerAddressUrl(CONTRACT_ADDRESS)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block break-all text-xs font-semibold text-court-400 underline"
        >
          {CONTRACT_ADDRESS}
        </a>
      </div>

      <Card>
        <CardHeader><CardTitle>View Method</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Function</Label>
              <Select value={fn} onChange={(e) => setFn(e.target.value)}>
                {READS.map((r) => <option key={r.name}>{r.name}</option>)}
              </Select>
            </div>
            {needsId && (
              <div>
                <Label>Appeal ID</Label>
                <Input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" />
              </div>
            )}
          </div>
          <Button onClick={run} disabled={busy} className="w-fit">{busy ? "Calling…" : "Call Contract"}</Button>
          <pre className="max-h-[28rem] overflow-auto rounded-md bg-court-950 p-4 text-xs leading-relaxed text-court-200">
            {output}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
