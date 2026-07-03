"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchAppeals } from "@/lib/genlayer";
import type { Appeal } from "@/lib/types";
import { Badge, Button, Card, CardContent, EmptyState, ErrorBanner, Input, Spinner } from "@/components/ui";
import { statusTone } from "@/components/AppealCard";

/**
 * Existing Verdict Explorer — verdicts referenced by appeals, grouped by case.
 */
export default function VerdictExplorer() {
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchAppeals(0, 100)
      .then((r) => setAppeals(r.appeals))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load verdicts"));
  }, []);

  const cases = useMemo(() => {
    if (!appeals) return null;
    const map = new Map<string, Appeal[]>();
    for (const a of appeals) {
      const list = map.get(a.case_id) ?? [];
      list.push(a);
      map.set(a.case_id, list);
    }
    return Array.from(map.entries()).filter(
      ([caseId, list]) =>
        !query ||
        caseId.toLowerCase().includes(query.toLowerCase()) ||
        list.some((a) => a.original_verdict.toLowerCase().includes(query.toLowerCase())),
    );
  }, [appeals, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-court-100">Existing Verdict Explorer</h1>
          <p className="mt-1 text-sm text-court-200/80">Finalized verdicts under challenge, grouped by case.</p>
        </div>
        <Link href="/appeals/new"><Button>Challenge a Verdict</Button></Link>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by case ID or verdict text…"
        className="max-w-md bg-court-100"
      />
      {error && <ErrorBanner message={error} />}
      {!cases && !error && <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>}
      {cases && cases.length === 0 && (
        <EmptyState title="No verdicts on record" hint="Verdicts appear here once appeals reference them." />
      )}
      <div className="flex flex-col gap-4">
        {cases?.map(([caseId, list]) => (
          <Card key={caseId}>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg text-court-900">Case {caseId}</h3>
                <Badge tone="accent">{list.length} appeal{list.length > 1 ? "s" : ""}</Badge>
              </div>
              <p className="mt-2 text-sm text-court-950/80">{list[0].original_verdict}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {list.map((a) => (
                  <Link key={a.id} href={`/appeals/${a.id}`}>
                    <Badge tone={statusTone(a.status)} className="cursor-pointer hover:opacity-80">
                      Appeal #{a.id} · {a.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
