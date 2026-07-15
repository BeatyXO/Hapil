"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import {
  explorerAddressUrl, fetchAppeal, fetchConsensus, fetchEvidence,
  requestReview, submitEvidence,
} from "@/lib/genlayer";
import {
  EVIDENCE_TYPES, formatGen, shortAddress,
  type Appeal, type ConsensusResult, type EvidenceItem, type TxPhase,
} from "@/lib/types";
import { statusTone } from "@/components/AppealCard";
import { TxStatus } from "@/components/TxStatus";
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle,
  ErrorBanner, Input, Label, ScoreBar, Select, Spinner, Textarea,
} from "@/components/ui";

export default function AppealDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { address } = useWallet();

  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [a, ev, c] = await Promise.all([fetchAppeal(id), fetchEvidence(id), fetchConsensus(id)]);
      setAppeal(a);
      setEvidence(ev);
      setConsensus(c);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load appeal");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void reload(); }, [reload]);

  // evidence form state
  const [evTitle, setEvTitle] = useState("");
  const [evType, setEvType] = useState<string>(EVIDENCE_TYPES[0]);
  const [evUrl, setEvUrl] = useState("");
  const [evSource, setEvSource] = useState("");
  const [evRelevance, setEvRelevance] = useState("");
  const [evContentHash, setEvContentHash] = useState("");
  const [evPhase, setEvPhase] = useState<TxPhase>("idle");
  const [evHash, setEvHash] = useState<string | null>(null);
  const [evError, setEvError] = useState<string | null>(null);

  // review state
  const [rvPhase, setRvPhase] = useState<TxPhase>("idle");
  const [rvHash, setRvHash] = useState<string | null>(null);
  const [rvError, setRvError] = useState<string | null>(null);

  const isOwner = !!address && !!appeal && address.toLowerCase() === appeal.owner.toLowerCase();

  async function onAddEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setEvError(null);
    setEvPhase("signing");
    try {
      const res = await submitEvidence(address, id, evTitle.trim(), evType, evUrl.trim(), evContentHash.trim(), evSource.trim(), evRelevance.trim());
      setEvHash(res.hash);
      setEvPhase("success");
      setEvTitle(""); setEvUrl(""); setEvSource(""); setEvRelevance(""); setEvContentHash("");
      await reload();
    } catch (err) {
      setEvPhase("error");
      setEvError(err instanceof Error ? err.message : "Failed to submit evidence");
    }
  }

  async function onRequestReview() {
    if (!address) return;
    setRvError(null);
    setRvPhase("pending");
    try {
      const res = await requestReview(address, id);
      setRvHash(res.hash);
      setRvPhase("success");
      await reload();
    } catch (err) {
      setRvPhase("error");
      setRvError(err instanceof Error ? err.message : "Review request failed");
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (loadError) return <ErrorBanner message={loadError} />;
  if (!appeal) return <ErrorBanner message={`Appeal #${id} does not exist on this contract.`} />;

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-court-100">Appeal #{appeal.id}</h1>
          <p className="text-sm text-court-200/80">Case {appeal.case_id}</p>
        </div>
        <div className="flex gap-2">
          <Badge tone={statusTone(appeal.status)}>{appeal.status}</Badge>
          <Badge tone={appeal.stake_outcome === "Slashed" ? "danger" : appeal.stake_outcome === "Returned" ? "success" : "accent"}>
            Stake {appeal.stake_outcome} · {formatGen(appeal.stake)} GEN
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* case record */}
        <Card>
          <CardHeader><CardTitle>Case Record</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-xs font-bold uppercase text-court-700">Original Verdict</p>
              <p className="text-court-950/90">{appeal.original_verdict}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-court-700">Appeal Reason</p>
              <p className="text-court-950/90">{appeal.appeal_reason}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-court-700">Appellant</p>
              <a href={explorerAddressUrl(appeal.owner)} target="_blank" rel="noreferrer" className="font-semibold text-court-700 underline">
                {shortAddress(appeal.owner)}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* consensus viewer */}
        <Card>
          <CardHeader><CardTitle>Consensus Verdict</CardTitle></CardHeader>
          <CardContent>
            {consensus ? (
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={consensus.appeal_status === "Accepted" ? "success" : "danger"}>{consensus.appeal_status}</Badge>
                  <Badge tone="accent">Impact: {consensus.material_impact}</Badge>
                  <Badge tone={consensus.stake_outcome === "Returned" ? "success" : "danger"}>Stake {consensus.stake_outcome}</Badge>
                </div>
                <ScoreBar label="Appeal Strength" value={consensus.appeal_strength_score} />
                <ScoreBar label="Evidence Novelty" value={consensus.evidence_novelty_score} />
                <ScoreBar label="Confidence" value={consensus.confidence_score} />
                <div>
                  <p className="text-xs font-bold uppercase text-court-700">Recommendation</p>
                  <p className="font-semibold text-court-950">{consensus.verdict_recommendation}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-court-700">Reasoning</p>
                  <p className="text-court-950/90">{consensus.reasoning}</p>
                </div>
                {consensus.supporting_evidence?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase text-court-700">Supporting Evidence</p>
                    <ul className="list-inside list-disc text-court-950/90">
                      {consensus.supporting_evidence.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase text-court-700">Next Action</p>
                  <p className="text-court-950/90">{consensus.next_action}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-sm text-court-950/80">
                <p>No consensus yet. Once evidence is filed, the appellant can request validator review.</p>
                {isOwner && appeal.status === "Draft" && (
                  <>
                    <Button onClick={onRequestReview} disabled={evidence.length === 0 || rvPhase === "pending"}>
                      {rvPhase === "pending" ? "Validators deliberating…" : "Request Appeal Review"}
                    </Button>
                    {evidence.length === 0 && <p className="text-xs text-court-700">Submit at least one piece of evidence first.</p>}
                    {rvError && <ErrorBanner message={rvError} />}
                    <TxStatus phase={rvPhase} hash={rvHash} error={rvError} pendingLabel="GenLayer validators are evaluating the appeal — this may take a minute…" />
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* evidence registry */}
      <Card>
        <CardHeader><CardTitle>Evidence Registry ({evidence.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {evidence.length === 0 && <p className="text-sm text-court-950/70">No evidence submitted yet.</p>}
          {evidence.map((ev) => (
            <div key={ev.index} className="rounded-md border border-court-400/40 bg-white/70 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-court-900">{ev.title}</span>
                <Badge tone="accent">{ev.type}</Badge>
              </div>
              <a href={ev.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-court-700 underline">{ev.url}</a>
              <p className="mt-1 text-court-950/80">{ev.relevance}</p>
              <p className="mt-1 truncate text-xs text-court-700">Source: {ev.source} · Hash: {ev.hash}</p>
            </div>
          ))}

          {isOwner && appeal.status === "Draft" && (
            <form onSubmit={onAddEvidence} className="mt-2 flex flex-col gap-3 rounded-md border border-dashed border-court-400/60 p-4">
              <p className="font-display text-court-900">Submit New Evidence</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input required value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Independent audit report" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={evType} onChange={(e) => setEvType(e.target.value)}>
                    {EVIDENCE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Public URL</Label>
                <Input required type="url" value={evUrl} onChange={(e) => setEvUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <Label>SHA-256 of exact URL content</Label>
                <Input required value={evContentHash} onChange={(e) => setEvContentHash(e.target.value)}
                  pattern="0x[a-fA-F0-9]{64}" placeholder="0x… (64 hexadecimal characters)" />
                <p className="mt-1 text-xs text-court-700">The contract fetches this URL during review and rejects a content-hash mismatch.</p>
              </div>
              <div>
                <Label>Source</Label>
                <Input required value={evSource} onChange={(e) => setEvSource(e.target.value)} placeholder="e.g. Trail of Bits, court registry" />
              </div>
              <div>
                <Label>Relevance Explanation</Label>
                <Textarea required rows={2} value={evRelevance} onChange={(e) => setEvRelevance(e.target.value)}
                  placeholder="How does this evidence change the original verdict?" />
              </div>
              {evError && <ErrorBanner message={evError} />}
              <TxStatus phase={evPhase} hash={evHash} error={evError} pendingLabel="Recording evidence on-chain…" />
              <Button type="submit" disabled={evPhase === "signing" || evPhase === "pending"}>Add Evidence</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
