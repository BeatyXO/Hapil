import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";

const steps = [
  { n: "01", t: "Select Verdict", d: "Reference the finalized case and verdict you intend to challenge." },
  { n: "02", t: "Stake GEN", d: "Lock GEN tokens. Weak appeals are slashed — appeals have real cost." },
  { n: "03", t: "Submit Evidence", d: "Provide public URLs to genuinely new evidence with hashes and sources." },
  { n: "04", t: "Request Review", d: "GenLayer validators independently evaluate novelty and material impact." },
  { n: "05", t: "Consensus", d: "Differing validator interpretations converge into one defensible outcome." },
  { n: "06", t: "Outcome", d: "Stake returned and case reopened — or stake slashed and verdict stands." },
];

const features = [
  "Appeal Registry", "GEN Staking System", "Evidence Registry", "Appeal Consensus",
  "Evidence Novelty Detection", "Material Impact Assessment", "Stake Slashing Rules",
  "Verdict Reopening", "Consensus History", "Public Appeal Explorer",
  "Wallet-Based Ownership", "Explorer-Linked Records",
];

export default function Landing() {
  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="pt-10 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-court-400">
          Judicial Noir · GenLayer StudioNet
        </p>
        <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight text-court-100 md:text-6xl">
          Decentralized Appeals &amp; Evidence Consensus
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-court-200">
          Most systems allow unlimited appeals — inviting spam and endless reconsideration.
          Hapil makes every appeal carry real economic weight: stake GEN, bring genuinely new
          evidence, and let decentralized AI validator consensus decide if the case deserves reopening.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/appeals/new"><Button className="px-6 py-3 text-base">File an Appeal</Button></Link>
          <Link href="/appeals"><Button variant="secondary" className="px-6 py-3 text-base">Explore Appeals</Button></Link>
        </div>
      </section>

      {/* Economics */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { t: "Appeal Accepted", d: "Stake returned in full. A new consensus review is unlocked.", tone: "border-emerald-400/50" },
          { t: "Appeal Rejected", d: "Stake slashed. Frivolous challenges pay the price.", tone: "border-red-400/50" },
          { t: "Appeal Successful", d: "The original verdict is reopened for full reconsideration.", tone: "border-court-400" },
        ].map((c) => (
          <Card key={c.t} className={`border-2 ${c.tone}`}>
            <CardContent>
              <h3 className="font-display text-lg text-court-900">{c.t}</h3>
              <p className="mt-2 text-sm text-court-950/80">{c.d}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Workflow */}
      <section>
        <h2 className="mb-6 text-center font-display text-3xl text-court-100">The Appeal Workflow</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-lg border border-court-400/30 bg-court-950/40 p-5">
              <span className="font-display text-3xl text-court-400">{s.n}</span>
              <h3 className="mt-2 font-display text-lg text-court-100">{s.t}</h3>
              <p className="mt-1 text-sm text-court-200/80">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="text-center">
        <h2 className="mb-6 font-display text-3xl text-court-100">Protocol Capabilities</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {features.map((f) => (
            <span key={f} className="rounded-full border border-court-400/40 bg-court-700/30 px-4 py-1.5 text-sm text-court-200">
              {f}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
