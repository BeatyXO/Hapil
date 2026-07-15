# Hapil — Decentralized Appeals and Evidence Consensus

Hapil Protocol lets users challenge finalized verdicts by staking GEN tokens and
submitting genuinely new public evidence. GenLayer validators evaluate each appeal
non-deterministically and reach consensus: strong appeals unlock a new review and
return the stake; weak appeals are slashed.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · genlayer-js · GenLayer Intelligent Contract (Python) · StudioNet

No backend, no database — the intelligent contract is the canonical source of truth.
Evidence is public URLs + hashes only; no file uploads.

## Project structure

```
contracts/hapil_protocol.py   # GenLayer Intelligent Contract
src/app/                      # Next.js App Router pages
  page.tsx                    # Landing
  verdicts/                   # Existing verdict explorer
  appeals/                    # Public appeal explorer
  appeals/new/                # Appeal creation (stake GEN)
  appeals/[id]/               # Appeal detail: evidence + consensus viewer
  evidence/                   # Global evidence registry
  dashboard/                  # Appellant dashboard
  stake/                      # Stake management
  console/                    # Contract interaction panel
src/lib/                      # genlayer-js client, wallet context, types
src/components/               # UI primitives (Judicial Noir design system)
```

## 1. Deploy the intelligent contract (StudioNet)

1. Open [GenLayer Studio](https://studio.genlayer.com) and connect.
2. Create a new contract, paste `contracts/hapil_protocol.py`.
3. Deploy with constructor arg `min_stake` (wei; default `1000000000000000000` = 1 GEN).
4. Copy the deployed contract address.

Or with the GenLayer CLI (Windows-safe):

```powershell
npm install -g genlayer
genlayer init
genlayer deploy --contract contracts/hapil_protocol.py --args 1000000000000000000
```

## 2. Configure the frontend

```powershell
Copy-Item .env.local.example .env.local
```

Set `NEXT_PUBLIC_CONTRACT_ADDRESS` to `0xBC418EB47917314aFc1c57cD61E19a2367FF174F`.

## 3. Run locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000 and connect an injected wallet (MetaMask, Rainbow, Zerion, or any WalletConnect-compatible injected provider).

## 4. Deploy to Vercel

```powershell
npm install -g vercel
vercel --prod
```

Add `NEXT_PUBLIC_CONTRACT_ADDRESS` in Vercel → Project → Settings → Environment Variables.

## Appeal lifecycle

| Step | Action | Contract method |
|---|---|---|
| 0 | Authorized registrar commits a finalized case record and original-evidence hashes | `register_case` |
| 1 | Reference the authoritative case record and stake GEN | `create_appeal` (payable) |
| 2 | Attach a public URL plus SHA-256 of its exact content | `submit_evidence` |
| 3 | Appellant or authorized reviewer triggers validator consensus | `request_review` |
| 4 | Consensus settles stake automatically | on-chain: return or slash |

## Required authorization and verification setup

The deployer is the initial `case_registrar`. Before an appeal can be filed, a registrar must call `register_case(case_id, final_verdict, hashes_json, finalized_at)`. The record is immutable and includes the SHA-256 hashes of evidence considered in the original case. The owner can grant an explicit `case_registrar` or `reviewer` role with `set_authorized_role(address, role, enabled)`.

Only the appellant or an authorized reviewer can call `request_review`. Evidence must include a `0x`-prefixed SHA-256 of the exact bytes at its public URL. During review the contract fetches those bytes, recomputes the digest, excludes mismatches, and automatically rejects the appeal if none verify. Duplicate hashes and hashes already committed to the source case are rejected before review.

## Accepted-stake repayment verification

After deploying the updated contract to a network with GenLayer's EVM layer, retain transaction links showing this acceptance check:

1. Record the appellant EOA balance and the contract balance.
2. Register a case and file an appeal with a known stake.
3. Submit an evidence URL whose fetched body SHA-256 equals the supplied hash, using material validators can clearly accept.
4. Finalize `request_review` as the appellant or an authorized reviewer.
5. Verify the appeal reports `Returned`, the appellant balance increased by exactly the stake, and the contract balance decreased by exactly the stake.

The repayment uses the pinned GenLayer EOA external-message API (`@gl.evm.contract_interface` + `emit_transfer`), rather than an internal Intelligent-Contract message. Studio does not provide the full EVM/ghost-contract layer, so run the balance assertion on a network that supports it.

Consensus output: appeal status, strength / novelty / confidence scores, material
impact, stake outcome, verdict recommendation, reasoning, supporting evidence, and
next action — stored permanently on-chain and rendered in the Consensus Viewer.
