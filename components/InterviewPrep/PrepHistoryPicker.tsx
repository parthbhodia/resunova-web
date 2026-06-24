"use client";

/**
 * Interview Prep — "your prep history" list (Step 1).
 *
 * Lets a returning user reopen a saved prep kit to review before an interview,
 * instead of re-uploading and regenerating. Lists past sessions (metadata only)
 * from `GET /api/interview-prep/sessions`; clicking one stashes its id in the
 * store and navigates to the dashboard, which loads that specific kit on mount.
 *
 * Self-hides for signed-out users or when there is no saved history (no empty
 * box), mirroring the Resume history / Story Bank patterns.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPrepSessions, type PrepSessionSummary } from "@/lib/supabase";
import { useInterviewPrepStore } from "@/store/interviewPrepStore";

const MAX_VISIBLE = 3;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PrepHistoryPicker() {
  const router = useRouter();
  // null = initial fetch in flight; [] = signed out / no history
  const [items, setItems] = useState<PrepSessionSummary[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const setHistorySessionId = useInterviewPrepStore((s) => s.setHistorySessionId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchPrepSessions();
        if (!cancelled) setItems(rows);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null || items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, MAX_VISIBLE);

  const open = (id: string) => {
    setHistorySessionId(id);
    router.push("/interview-prep/dashboard");
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <History className="size-4" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base">Your prep history</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reopen a saved kit to review before your interview.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {visible.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => open(s.id)}
            aria-label={`Open saved prep kit ${[s.role, s.company].filter(Boolean).join(" at ")}`}
            className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all outline-none hover:border-accent/40 hover:bg-[var(--accent-bg)] focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {[s.role, s.company].filter(Boolean).join(" · ") || "Interview prep kit"}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3 shrink-0" aria-hidden />
                {formatDate(s.updatedAt || s.createdAt)}
                {s.questionCount ? (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{s.questionCount} questions</span>
                  </>
                ) : null}
              </p>
            </div>
            {s.category ? (
              <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                {s.category}
              </Badge>
            ) : null}
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-accent"
              aria-hidden
            />
          </button>
        ))}

        {items.length > MAX_VISIBLE ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="self-start rounded-md text-xs font-medium text-accent outline-none transition-colors hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {expanded ? "Show less" : `Show all ${items.length}`}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
