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

Set `NEXT_PUBLIC_CONTRACT_ADDRESS` to the deployed address.

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
| 1 | Reference case + verdict, stake GEN | `create_appeal` (payable) |
| 2 | Attach public evidence URLs + hashes | `submit_evidence` |
| 3 | Trigger validator consensus | `request_review` |
| 4 | Consensus settles stake automatically | on-chain: return or slash |

Consensus output: appeal status, strength / novelty / confidence scores, material
impact, stake outcome, verdict recommendation, reasoning, supporting evidence, and
next action — stored permanently on-chain and rendered in the Consensus Viewer.
