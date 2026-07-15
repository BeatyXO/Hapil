"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Appeal, ConsensusResult, ContractConfig, EvidenceItem } from "./types";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0xBC418EB47917314aFc1c57cD61E19a2367FF174F") as `0x${string}`;

export const STUDIO_EXPLORER = "https://studio.genlayer.com";

export function explorerTxUrl(hash: string): string {
  return `${STUDIO_EXPLORER}/transactions/${hash}`;
}

export function explorerAddressUrl(addr: string): string {
  return `${STUDIO_EXPLORER}/accounts/${addr}`;
}

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_GENLAYER_RPC;

function makeClient(account?: `0x${string}`) {
  const provider =
    typeof window !== "undefined" ? (window as { ethereum?: unknown }).ethereum : undefined;
  return createClient({
    chain: studionet,
    ...(RPC_ENDPOINT ? { endpoint: RPC_ENDPOINT } : {}),
    ...(account ? { account } : {}),
    ...(account && provider ? { provider: provider as never } : {}),
  });
}

let readClient: ReturnType<typeof makeClient> | null = null;
function getReadClient() {
  if (!readClient) readClient = makeClient();
  return readClient;
}

type CallArg = string | number | bigint | boolean;

async function readJson<T>(functionName: string, args: CallArg[] = []): Promise<T> {
  const client = getReadClient();
  const raw = (await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  })) as string;
  return JSON.parse(raw) as T;
}

// ---------------- reads ----------------

export async function fetchConfig(): Promise<ContractConfig> {
  return readJson<ContractConfig>("get_config");
}

export async function fetchAppeals(offset = 0, limit = 50): Promise<{ total: number; appeals: Appeal[] }> {
  return readJson("get_appeals", [offset, limit]);
}

export async function fetchAppeal(id: number): Promise<Appeal | null> {
  const a = await readJson<Appeal | Record<string, never>>("get_appeal", [id]);
  return "id" in a ? (a as Appeal) : null;
}

export async function fetchAppealsByOwner(owner: string): Promise<Appeal[]> {
  return readJson<Appeal[]>("get_appeals_by_owner", [owner]);
}

export async function fetchEvidence(appealId: number): Promise<EvidenceItem[]> {
  return readJson<EvidenceItem[]>("get_evidence", [appealId]);
}

export async function fetchConsensus(appealId: number): Promise<ConsensusResult | null> {
  const c = await readJson<ConsensusResult | Record<string, never>>("get_consensus", [appealId]);
  return "appeal_status" in c ? (c as ConsensusResult) : null;
}

// ---------------- writes ----------------

export interface WriteResult {
  hash: string;
}

const STUDIONET_CHAIN_ID = 61999;
const STUDIONET_CHAIN_HEX = `0x${STUDIONET_CHAIN_ID.toString(16)}`;

interface InjectedProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/** Make sure the injected wallet is on StudioNet before signing a write. */
async function ensureStudioNet(): Promise<void> {
  const eth = (window as { ethereum?: InjectedProvider }).ethereum;
  if (!eth) return;
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (parseInt(current, 16) === STUDIONET_CHAIN_ID) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_HEX }],
    });
  } catch (err) {
    // 4902 = chain not added to the wallet yet
    if ((err as { code?: number })?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: STUDIONET_CHAIN_HEX,
            chainName: "GenLayer StudioNet",
            nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
            rpcUrls: [RPC_ENDPOINT ?? "https://studio.genlayer.com/api"],
            blockExplorerUrls: ["https://genlayer-explorer.vercel.app"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

async function write(
  account: `0x${string}`,
  functionName: string,
  args: CallArg[],
  value?: bigint,
): Promise<WriteResult> {
  await ensureStudioNet();
  const client = makeClient(account);
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: value ?? 0n,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: "FINALIZED" as never,
    retries: 200,
    interval: 3000,
  });
  assertExecutionSuccess(receipt as Record<string, unknown>);
  // give the RPC node a moment so follow-up reads see the new state
  await new Promise((r) => setTimeout(r, 1500));
  return { hash: hash as string };
}

/** A finalized transaction can still have FAILED contract execution — surface that as an error. */
function assertExecutionSuccess(receipt: Record<string, unknown>): void {
  const execName = receipt.txExecutionResultName as string | undefined;
  const consensus = receipt.consensus_data as
    | { leader_receipt?: { execution_result?: string; error?: string | null }[] | { execution_result?: string; error?: string | null } }
    | undefined;
  const leader = Array.isArray(consensus?.leader_receipt)
    ? consensus?.leader_receipt[0]
    : consensus?.leader_receipt;

  const failed =
    execName === "FINISHED_WITH_ERROR" ||
    leader?.execution_result === "ERROR" ||
    leader?.execution_result === "FINISHED_WITH_ERROR";

  if (failed) {
    const detail = leader?.error ? `: ${leader.error}` : "";
    throw new Error(`Transaction was finalized but the contract execution FAILED${detail}. Check the transaction in GenLayer Studio for details.`);
  }
}

export function createAppeal(
  account: `0x${string}`,
  caseId: string,
  appealReason: string,
  stakeWei: bigint,
): Promise<WriteResult> {
  return write(
    account,
    "create_appeal",
    [caseId, appealReason, new Date().toISOString()],
    stakeWei,
  );
}

export function submitEvidence(
  account: `0x${string}`,
  appealId: number,
  title: string,
  type: string,
  url: string,
  hash: string,
  source: string,
  relevance: string,
): Promise<WriteResult> {
  return write(account, "submit_evidence", [
    appealId,
    title,
    type,
    url,
    hash,
    source,
    relevance,
    new Date().toISOString(),
  ]);
}

export function requestReview(account: `0x${string}`, appealId: number): Promise<WriteResult> {
  return write(account, "request_review", [appealId]);
}

export function setMinStake(account: `0x${string}`, minStakeWei: bigint): Promise<WriteResult> {
  return write(account, "set_min_stake", [minStakeWei]);
}

export function setAuthorizedRole(
  account: `0x${string}`,
  target: string,
  role: "case_registrar" | "reviewer",
  enabled: boolean,
): Promise<WriteResult> {
  return write(account, "set_authorized_role", [target, role, enabled]);
}

export function registerCase(
  account: `0x${string}`,
  caseId: string,
  finalVerdict: string,
  originalEvidenceHashesJson: string,
): Promise<WriteResult> {
  return write(account, "register_case", [caseId, finalVerdict, originalEvidenceHashesJson, new Date().toISOString()]);
}

// ---------------- utils ----------------

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return (
    "0x" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
