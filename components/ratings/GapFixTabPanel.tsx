"use client";

import { useEffect, useMemo, useRef } from "react";
import { suggestionsWithDrafts } from "@/lib/tailorGapFix";
import { GapFixSuggestionCard, type GapFixSuggestion } from "@/components/ratings/GapFixSuggestionCard";

export type GapFixPanelState = {
  gapName: string;
  gapNotes: string;
  suggestions: GapFixSuggestion[];
  /** True when suggestions came from the server's ATS keyword fallback pass. */
  atsFallback?: boolean;
  /** JD product/tool terms this gap is targeting (chip row). */
  targetTerms?: string[];
};

type Props = {
  gapFixPanel: GapFixPanelState;
  gapFixError?: string | null;
  onApplyFix?: (s: GapFixSuggestion) => void | Promise<void>;
  onApplyAllFixes?: (suggestions: GapFixSuggestion[]) => void | Promise<void>;
  onSkipFix?: (s: GapFixSuggestion) => void;
  onDismissFix?: () => void;
  gapFixDrafts?: Record<string, string>;
  onGapFixDraftChange?: (id: string, text: string) => void;
  applyBusy?: boolean;
  /** Cards on the currently selected bullet — plural, since a bullet can carry several. */
  activeGapFixIds?: ReadonlySet<string>;
  onGapFixActivate?: (id: string) => void;
  /** The bullet's CURRENT preview text, which diverges from s.original once
   *  another fix has already been applied to the same line. */
  gapFixBulletText?: (suggestionId: string) => string | undefined;
};

export default function GapFixTabPanel({
  gapFixPanel,
  gapFixError,
  onApplyFix,
  onApplyAllFixes,
  onSkipFix,
  onDismissFix,
  gapFixDrafts = {},
  onGapFixDraftChange,
  applyBusy = false,
  activeGapFixIds,
  onGapFixActivate,
  gapFixBulletText,
}: Props) {
  const panelSuggestions = useMemo(
    () => (gapFixPanel.suggestions ?? []).filter((s) => s.original?.trim() && s.suggested?.trim()),
    [gapFixPanel.suggestions],
  );

  const targetTerms = useMemo(
    () => (gapFixPanel.targetTerms ?? []).map((t) => t.trim()).filter(Boolean),
    [gapFixPanel.targetTerms],
  );

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const firstActiveId =
    activeGapFixIds && activeGapFixIds.size > 0
      ? panelSuggestions.find((s) => activeGapFixIds.has(s.id))?.id
      : undefined;

  useEffect(() => {
    if (!firstActiveId) return;
    const t = setTimeout(() => {
      cardRefs.current.get(firstActiveId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(t);
  }, [firstActiveId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            Gap fixes
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>
            Review each rewrite, then Apply or Skip —{" "}
            <strong style={{ color: "var(--text)", fontWeight: 600 }}>{gapFixPanel.gapName}</strong>
          </div>
          {targetTerms.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {targetTerms.map((term) => (
                <span
                  key={term}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text)",
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                    borderRadius: 999,
                    padding: "3px 9px",
                  }}
                >
                  {term}
                </span>
              ))}
            </div>
          ) : null}
          {gapFixPanel.atsFallback && panelSuggestions.length > 0 ? (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.4 }}>
              ATS keyword pass — prioritize JD coverage; double-check each rewrite before applying.
            </div>
          ) : null}
        </div>
        {onDismissFix ? (
          <button
            type="button"
            onClick={onDismissFix}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--muted)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Close
          </button>
        ) : null}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px" }}>
        {gapFixError ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--error, #ef4444)" }}>{gapFixError}</p>
        ) : panelSuggestions.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            No ATS-friendly rewrites could be woven into your existing bullets for this gap
            (nothing transferable enough without inventing experience). Try &quot;Get suggestions&quot;
            on the Interview tab for a broader pass, or add related experience in the preview first.
          </p>
        ) : (
          <>
            {onApplyAllFixes && panelSuggestions.length > 1 ? (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button
                  type="button"
                  disabled={applyBusy}
                  onClick={() => {
                    const toApply = suggestionsWithDrafts(panelSuggestions, gapFixDrafts);
                    if (toApply.length === 0) return;
                    void onApplyAllFixes(toApply);
                  }}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: applyBusy ? "not-allowed" : "pointer",
                    opacity: applyBusy ? 0.55 : 1,
                  }}
                >
                  {applyBusy ? "Applying…" : `Apply all (${panelSuggestions.length})`}
                </button>
              </div>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {panelSuggestions.map((s, i) => (
                <GapFixSuggestionCard
                  key={s.id}
                  suggestion={s}
                  index={i}
                  draftText={gapFixDrafts[s.id] ?? s.suggested}
                  onDraftChange={(text) => onGapFixDraftChange?.(s.id, text)}
                  active={!!activeGapFixIds?.has(s.id)}
                  onActivate={onGapFixActivate ? () => onGapFixActivate(s.id) : undefined}
                  targetBulletText={gapFixBulletText?.(s.id)}
                  onApply={
                    onApplyFix
                      ? () => {
                          const drafted = suggestionsWithDrafts([s], gapFixDrafts)[0] ?? s;
                          return onApplyFix(drafted);
                        }
                      : undefined
                  }
                  onSkip={onSkipFix ? () => onSkipFix(s) : undefined}
                  applyBusy={applyBusy}
                  cardRef={(el) => {
                    if (el) cardRefs.current.set(s.id, el);
                    else cardRefs.current.delete(s.id);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
