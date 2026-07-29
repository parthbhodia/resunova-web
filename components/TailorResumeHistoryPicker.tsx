"use client";

/**
 * Tailor "Your resume" — pick a past Analyze scan instead of re-uploading.
 * Mirrors Interview Prep's ResumeHistoryPicker: loads resume_analyses,
 * hydrates extractedText + structuredResume into the parent via callbacks.
 * Self-hides when signed out / no history.
 */

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { fetchAnalyses, fetchAnalysisById, type AnalyzeRecord } from "@/lib/supabase";
import {
  normalizeStructuredResume,
  type StructuredResume,
} from "@/store/resumeAnalyzeStore";
import { isStructuredUsable } from "@/components/AnalyzeLiveResumeBody";

const MAX_VISIBLE = 4;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export type TailorHistoryPick = {
  fileName: string;
  extractedText: string;
  structured: StructuredResume | null;
  resumeHeader: string[];
};

type Props = {
  onPick: (pick: TailorHistoryPick) => void;
};

export default function TailorResumeHistoryPicker({ onPick }: Props) {
  const [items, setItems] = useState<AnalyzeRecord[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (items === null || items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, MAX_VISIBLE);

  const handlePick = async (rec: AnalyzeRecord) => {
    setLoadingId(rec.id);
    setError(null);
    try {
      const full = await fetchAnalysisById(rec.id);
      const result = full?.result ?? null;
      const extractedText =
        typeof result?.extractedText === "string" ? result.extractedText.trim() : "";
      const structured = normalizeStructuredResume(
        (result?.structuredResume ?? null) as StructuredResume | null,
      );
      const resumeHeader: string[] = Array.isArray(result?.resumeHeader)
        ? (result.resumeHeader as string[])
        : [];

      if (!extractedText && !(structured && isStructuredUsable(structured))) {
        setError("That saved resume has no readable text. Try uploading the file instead.");
        return;
      }

      onPick({
        fileName: rec.sourceFilename || rec.label?.split("|")[0]?.trim() || "Saved resume",
        extractedText,
        structured: structured && isStructuredUsable(structured) ? structured : null,
        resumeHeader,
      });
    } catch {
      setError("Could not load that resume from your history.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          fontSize: 11,
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        <History size={12} aria-hidden />
        Or use a saved resume
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visible.map((rec) => {
          const label = (rec.label || "Resume").split("|")[0].trim() || "Resume";
          const busy = loadingId === rec.id;
          return (
            <button
              key={rec.id}
              type="button"
              disabled={!!loadingId}
              onClick={() => void handlePick(rec)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface2)",
                cursor: loadingId ? "wait" : "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                opacity: loadingId && !busy ? 0.55 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                  {formatDate(rec.createdAt)}
                  {typeof rec.score === "number" ? ` · score ${Math.round(rec.score)}` : ""}
                </div>
              </div>
              {busy ? (
                <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>Use</span>
              )}
            </button>
          );
        })}
      </div>
      {items.length > MAX_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 8,
            background: "none",
            border: "none",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          {expanded ? "Show less" : `Show ${items.length - MAX_VISIBLE} more`}
        </button>
      )}
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--error, #ef4444)" }}>{error}</div>
      )}
    </div>
  );
}
