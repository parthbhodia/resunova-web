"use client";

/**
 * Interview Prep — "use a saved resume" picker.
 *
 * Lets a signed-in user start a prep kit from a resume they already analyzed
 * instead of re-uploading the file. Sourced from analyzed history
 * (`resume_analyses`) because that saved `result` blob already carries the same
 * `extractedText` / `structuredResume` / `resumeHeader` shape the upload
 * pipeline produces — so selecting one hydrates the store identically to an
 * upload and the rest of the workflow works unchanged.
 *
 * Self-hides for signed-out users or when there is no saved history (no empty
 * box), mirroring the Story Bank panel pattern. Lives inside ResumeUploadCard,
 * below the drop zone.
 */

import { useEffect, useState } from "react";
import { ChevronRight, FileText, History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { fetchAnalyses, fetchAnalysisById, type AnalyzeRecord } from "@/lib/supabase";
import { displayNameForVariant, fetchVariantDisplayNames } from "@/lib/resumeVariants";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { classifyResumeCategory } from "@/lib/resumeCategoryClassify";
import { useInterviewPrepStore } from "@/store/interviewPrepStore";

const MAX_VISIBLE = 4;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ResumeHistoryPicker() {
  // null = initial fetch in flight; [] = signed out / no history
  const [items, setItems] = useState<AnalyzeRecord[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // Rename-aware variant labels (same override map the Analyze chips use).
  const [variantDisplayNames, setVariantDisplayNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void fetchVariantDisplayNames().then((m) => { if (alive) setVariantDisplayNames(m); });
    return () => { alive = false; };
  }, []);

  const setParsing = useInterviewPrepStore((s) => s.setParsing);
  const setParseError = useInterviewPrepStore((s) => s.setParseError);
  const setParsedResume = useInterviewPrepStore((s) => s.setParsedResume);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchAnalyses(20);
        if (!cancelled) setItems(rows);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render anything until we know there's history to show — avoids a
  // layout flash and never shows an empty section to signed-out users.
  if (items === null || items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, MAX_VISIBLE);

  const handlePick = async (rec: AnalyzeRecord) => {
    setLoadingId(rec.id);
    setParsing(true); // reuses the drop-zone "Parsing…" affordance + clears errors
    try {
      const full = await fetchAnalysisById(rec.id);
      const result = full?.result ?? null;
      const extractedText: string =
        typeof result?.extractedText === "string" ? result.extractedText : "";
      const structuredResume = (result?.structuredResume ?? null) as StructuredResume | null;
      const resumeHeader: string[] = Array.isArray(result?.resumeHeader)
        ? (result.resumeHeader as string[])
        : [];

      if (!extractedText.trim() && !structuredResume) {
        setParseError(
          "That saved resume has no readable text. Try uploading the file instead.",
        );
        return;
      }

      const { category } = classifyResumeCategory(structuredResume, extractedText);
      setParsedResume({
        fileName: rec.sourceFilename || rec.label || "Saved resume",
        extractedText,
        resumeHeader,
        structuredResume,
        category,
      });
    } catch {
      setParseError("Could not load that resume from your history.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* "or" divider */}
      <div className="flex items-center gap-3" aria-hidden>
        <Separator className="flex-1" />
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <History className="size-3.5" />
          or use a saved resume
        </span>
        <Separator className="flex-1" />
      </div>

      <ul className="flex flex-col gap-2">
        {visible.map((rec) => {
          const busy = loadingId === rec.id;
          return (
            <li key={rec.id}>
              <button
                type="button"
                onClick={() => void handlePick(rec)}
                disabled={busy}
                aria-label={`Use saved resume ${rec.sourceFilename || rec.label}`}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all outline-none",
                  "hover:border-accent/40 hover:bg-[var(--accent-bg)] focus-visible:ring-3 focus-visible:ring-ring/50",
                  busy && "opacity-70",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                    "group-hover:bg-accent/10 group-hover:text-accent",
                  )}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <FileText className="size-4" aria-hidden />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {rec.sourceFilename || rec.label || "Saved resume"}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {formatDate(rec.createdAt)}
                    {typeof rec.score === "number" ? (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span>Score {rec.score}</span>
                      </>
                    ) : null}
                    {rec.variantName ? (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="truncate text-accent">
                          {displayNameForVariant(rec.variantName, variantDisplayNames)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>

                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-accent"
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>

      {items.length > MAX_VISIBLE ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start rounded-md text-xs font-medium text-accent outline-none transition-colors hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {expanded ? "Show less" : `Show all ${items.length}`}
        </button>
      ) : null}
    </div>
  );
}
