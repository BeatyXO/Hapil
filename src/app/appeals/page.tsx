"use client";

import { useEffect, useState } from "react";
import { fetchAppeals } from "@/lib/genlayer";
import type { Appeal } from "@/lib/types";
import { AppealCard } from "@/components/AppealCard";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui";

const FILTERS = ["All", "Draft", "Accepted", "Rejected"] as const;

export default function AppealsExplorer() {
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  useEffect(() => {
    fetchAppeals(0, 100)
      .then((r) => setAppeals(r.appeals))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load appeals from contract"));
  }, []);

  const visible = appeals?.filter((a) => filter === "All" || a.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-court-100">Public Appeal Explorer</h1>
        <p className="mt-1 text-sm text-court-200/80">Every appeal, stake, and consensus outcome recorded on-chain.</p>
      </div>
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f ? "bg-court-400 text-court-950" : "bg-court-700/40 text-court-200 hover:bg-court-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {error && <ErrorBanner message={error} />}
      {!appeals && !error && (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      )}
      {visible && visible.length === 0 && (
        <EmptyState title="No appeals found" hint="File the first appeal to open the chamber." />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {visible?.map((a) => <AppealCard key={a.id} appeal={a} />)}
      </div>
    </div>
  );
}
