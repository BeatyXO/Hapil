# Hapil Review Verification

Reviewed: 2026-07-15

Contract: `0xBC418EB47917314aFc1c57cD61E19a2367FF174F`

## What was fixed

- Review finalization is restricted on-chain to the appellant or an explicitly authorized reviewer.
- Cases are registered as immutable authoritative records by the owner or an authorized case registrar.
- Appeals copy the authoritative finalized verdict instead of accepting a verdict supplied by the appellant.
- Evidence requires a `0x`-prefixed SHA-256 content commitment.
- Review fetches the committed URL content, recomputes its hash, excludes mismatches, and rejects when no evidence verifies.
- Evidence hashes already present in the case record or duplicated within an appeal are rejected.
- Accepted GEN repayment uses the pinned GenLayer EOA external-transfer interface.
- The Dashboard now exposes owner-only controls for minimum stake, registrar authorization, and case registration.
- The frontend is wired to the deployed contract address above.

## Live contract checks

The deployed contract returned:

- Owner: `0x98ACB6B20ee0f730d0b433c6f7167de792D8a2Dd`
- Minimum stake: `1000000000000000000` wei (1 GEN)
- `get_case` is available, confirming the updated contract is deployed.

## End-to-end rejection test

Case: `LIVE-FLOW-2026-07-15`

- Case registration: `0x63d705e7976fc8a5a3ca0cf0b9cc7dac46cc9417a2e193773efa26e4081ec833`
- Appeal creation: `0x17e7ef70ad6b1dec6bdfa616c0a15e104e0547964e23fda269adbb6146456ccc`
- Evidence submission: `0x93015cb6e1bbc8558e5c5c583f36d78b5d0f255a186aaecf995f4a82324dc827`
- Review: `0x7c965dcfc00cfd0c70ff5959a259d9d02358f93268ab709ebb7033ef30bb705e`

The generic evidence was correctly rejected and the 1 GEN stake was slashed.

## End-to-end acceptance and repayment test

Case: `LIVE-ACCEPT-2026-07-15`

- Case registration: `0x12b76e8a23bf8a721e2bea6e599d56cc5cdc2bf6f6e4769607fb159519672c4d`
- Appeal creation: `0xb7c21cee66cea5953b157e4e3814b00e0a43ee3367b3942d964d6b584d29806e`
- Evidence submission: `0xdbcd07c45d1c2ee564eb519b002a67b05fe277121098fda026e193255fcc52b0`
- Review: `0x0a298c8359bd79b3a1c98d8f5d7c9de62588d8087cdb9aa8fee5f51e5946d9a6`

The validator verified the live content, accepted the appeal with High material impact, marked the stake `Returned`, and recommended reopening the original case. The test wallet balance was unchanged after the stake was returned, confirming repayment.

## Frontend verification

The live Vercel Dashboard bundle contains `Admin Controls` and the admin write methods. The controls are rendered only after wallet hydration and only when the connected address matches the on-chain owner. Non-owner wallets cannot use them, and the contract independently enforces the same authorization.

## Operational notes

- The two live test cases and their appeals remain on-chain as test records; they are useful evidence of both outcomes.
- Never reuse the private keys used for testing. They were exposed during this test and should be rotated.
- A production deployment should use a registrar/case record policy appropriate to the application, rather than the test records above.
