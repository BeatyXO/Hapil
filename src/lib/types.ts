export type AppealStatus = "Draft" | "UnderReview" | "Accepted" | "Rejected";
export type StakeOutcome = "Locked" | "Returned" | "Slashed";

export interface Appeal {
  id: number;
  case_id: string;
  original_verdict: string;
  appeal_reason: string;
  owner: string;
  stake: string;
  status: AppealStatus;
  stake_outcome: StakeOutcome;
  evidence_count: number;
}

export interface EvidenceItem {
  index: number;
  title: string;
  type: string;
  url: string;
  hash: string;
  source: string;
  relevance: string;
  submitter: string;
}

export interface ConsensusResult {
  appeal_status: "Accepted" | "Rejected";
  appeal_strength_score: number;
  evidence_novelty_score: number;
  material_impact: "None" | "Low" | "Medium" | "High";
  confidence_score: number;
  stake_outcome: "Returned" | "Slashed";
  verdict_recommendation: string;
  reasoning: string;
  supporting_evidence: string[];
  next_action: string;
}

export interface ContractConfig {
  owner: string;
  min_stake: string;
  appeal_count: string;
  slashed_pool: string;
}

export type TxPhase = "idle" | "signing" | "pending" | "success" | "error";

export const EVIDENCE_TYPES = [
  "Court Document",
  "Audit Report",
  "Research Paper",
  "Blockchain Record",
  "GitHub Repository",
  "Official Announcement",
  "Government Publication",
  "Public Dataset",
  "News Article",
  "Supporting Documentation",
] as const;

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatGen(wei: string | bigint): string {
  const v = BigInt(wei || "0");
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}
