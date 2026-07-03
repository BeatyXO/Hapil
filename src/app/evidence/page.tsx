"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAppeals, fetchEvidence } from "@/lib/genlayer";
import type { EvidenceItem } from "@/lib/types";
import { shortAddress } from "@/lib/types";
import { Badge, Card, CardContent, EmptyState, ErrorBanner, Spinner } from "@/components/ui";

interface RegistryRow extends EvidenceItem {
  appealId: number;
  caseId: string;
}

export default function EvidenceRegistry() {
  const [rows, setRows] = useState<RegistryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { appeals } = await fetchAppeals(0, 100);
        const withEvidence = appeals.filter((a) => a.evidence_count > 0);
        const all = await Promise.all(
          withEvidence.map(async (a) => {
            const items = await fetchEvidence(a.id);
            return items.map((ev) => ({ ...ev, appealId: a.id, caseId: a.case_id }));
          }),
        );
        setRows(all.flat());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load evidence registry");
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-court-100">Evidence Registry</h1>
        <p className="mt-1 text-sm text-court-200/80">
          Every piece of public evidence submitted across all appeals — URLs, hashes, and sources.
        </p>
      </div>
      {error && <ErrorBanner message={error} />}
      {!rows && !error && <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>}
      {rows && rows.length === 0 && (
        <EmptyState title="The evidence chamber is empty" hint="Evidence appears here as appellants file it." />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {rows?.map((ev) => (
          <Card key={`${ev.appealId}-${ev.index}`}>
            <CardContent className="text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-court-900">{ev.title}</span>
                <Badge tone="accent">{ev.type}</Badge>
              </div>
              <a href={ev.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-court-700 underline">
                {ev.url}
              </a>
              <p className="mt-1 text-court-950/80">{ev.relevance}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-court-700">
                <span>Source: {ev.source}</span>
                <span>By {shortAddress(ev.submitter)}</span>
                <Link href={`/appeals/${ev.appealId}`} className="font-semibold underline">
                  Appeal #{ev.appealId} · {ev.caseId}
                </Link>
              </div>
              <p className="mt-1 truncate text-xs text-court-400">{ev.hash}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
