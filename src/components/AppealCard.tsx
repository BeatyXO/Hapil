"use client";

import Link from "next/link";
import type { Appeal } from "@/lib/types";
import { formatGen, shortAddress } from "@/lib/types";
import { Badge, Card, CardContent } from "./ui";

export function statusTone(status: string): "neutral" | "success" | "danger" | "warning" | "accent" {
  switch (status) {
    case "Accepted":
      return "success";
    case "Rejected":
      return "danger";
    case "UnderReview":
      return "warning";
    default:
      return "accent";
  }
}

export function AppealCard({ appeal }: { appeal: Appeal }) {
  return (
    <Link href={`/appeals/${appeal.id}`}>
      <Card className="transition-transform hover:-translate-y-0.5 hover:border-court-700/60">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-court-900">Appeal #{appeal.id}</span>
            <Badge tone={statusTone(appeal.status)}>{appeal.status}</Badge>
          </div>
          <p className="text-sm text-court-700">
            Case <span className="font-semibold">{appeal.case_id}</span>
          </p>
          <p className="line-clamp-2 text-sm text-court-950/80">{appeal.appeal_reason}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-court-700">
            <span>⚖ {formatGen(appeal.stake)} GEN staked</span>
            <span>📎 {appeal.evidence_count} evidence</span>
            <span>👤 {shortAddress(appeal.owner)}</span>
            <Badge tone={appeal.stake_outcome === "Slashed" ? "danger" : appeal.stake_outcome === "Returned" ? "success" : "accent"}>
              Stake {appeal.stake_outcome}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
