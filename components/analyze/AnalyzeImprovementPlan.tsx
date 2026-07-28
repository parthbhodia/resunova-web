// The result-state "Improvement Plan" panel, extracted from AnalyzeResume.tsx
// (Slice 4 of docs/ANALYZE_REFACTOR_PLAN.md). IMPORTANT: this panel owns NO
// state — every useState/useCallback stays in AnalyzeResume and is threaded in
// as a prop. So this is the same low-risk verbatim-move + prop-thread pattern as
// Slice 3 (AnalyzeSidebar), NOT a state relocation. The JSX is copied verbatim;
// former closure references became same-named props.

import React from "react";
import JobSearchActivationWidget from "@/components/JobSearchActivationWidget";
import { Badge } from "@/components/ui/badge";
import { countBulletsInCategory, type CategoryAssignmentOptions } from "@/lib/analysisCategoryMatch";
import type { AnalyzeRecord } from "@/lib/supabase";
import type { AnalysisResult } from "./analyzeTypes";
import { CATEGORY_ICONS, scoreColor } from "./analyzeViewHelpers";

type CategoryEntry = { key: keyof AnalysisResult["categoryScores"]; label: string };

interface AnalyzeImprovementPlanProps {
  result: AnalysisResult;
  activeCategory: string | null;
  setActiveCategory: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedBulletIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showJobActivation: boolean;
  setShowJobActivation: React.Dispatch<React.SetStateAction<boolean>>;
  setFeedbackToast: React.Dispatch<React.SetStateAction<string | null>>;
  saveLocalPreviewDraft: () => void;
  clearLocalPreviewDraft: () => void;
  savingVersion: boolean;
  editDraftStatus: string | null;
  summaryFlagged: boolean;
  summaryIssueCount: number;
  topFixCategories: CategoryEntry[];
  completedCategories: CategoryEntry[];
  categoryAssignmentOpts: CategoryAssignmentOptions;
  resolvedBulletIndices: Set<number>;
  azHistory: AnalyzeRecord[];
  azHistoryRows: React.ReactNode;
}

export default function AnalyzeImprovementPlan({
  result,
  activeCategory,
  setActiveCategory,
  setSelectedBulletIndex,
  showJobActivation,
  setShowJobActivation,
  setFeedbackToast,
  saveLocalPreviewDraft,
  clearLocalPreviewDraft,
  savingVersion,
  editDraftStatus,
  summaryFlagged,
  summaryIssueCount,
  topFixCategories,
  completedCategories,
  categoryAssignmentOpts,
  resolvedBulletIndices,
  azHistory,
  azHistoryRows,
}: AnalyzeImprovementPlanProps) {
  return (
    <>
          {/* Job search activation — shown once after first scan if roles not set */}
          {showJobActivation && (
            <JobSearchActivationWidget
              onActivated={(_roles, _locs) => {
                setShowJobActivation(false);
                setFeedbackToast("Job preferences saved — check the Jobs tab for matching openings.");
              }}
              onSkip={() => setShowJobActivation(false)}
            />
          )}

          {/* Local preview draft — New Scan lives in the pinned sidebar header */}
          <div style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px solid var(--border)",
          }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                Save a version
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45, marginBottom: 10 }}>
                Saves your applied edits as a new version in this résumé&rsquo;s history, with the updated estimated score. Restore any earlier version from history anytime.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  type="button"
                  onClick={saveLocalPreviewDraft}
                  disabled={savingVersion}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-h)",
                    background: "var(--surface3)",
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: savingVersion ? "default" : "pointer",
                    opacity: savingVersion ? 0.6 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  {savingVersion ? "Saving version…" : "Save as version"}
                </button>
                <button
                  type="button"
                  onClick={clearLocalPreviewDraft}
                  style={{
                    width: "100%",
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--muted)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Clear saved draft
                </button>
              </div>
              {editDraftStatus ? (
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--green)", lineHeight: 1.4 }}>
                  {editDraftStatus}
                </div>
              ) : null}
          </div>

          {/* Hint */}
          <div style={{
            fontSize: 11, color: "var(--dim)", marginBottom: 14,
            lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 5.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="6" cy="4" r="0.6" fill="currentColor"/>
            </svg>
            Click a category or a bullet; they stay in sync. Copy improved text into your résumé.
          </div>

          {/* SUMMARY — its own fix entry, visible on any tab so the biggest
              issue (an 89-word buzzword summary) isn't buried under Readability. */}
          {summaryFlagged && (
            <div style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: "var(--amber-ink, #b45309)",
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                Summary
              </div>
              <button
                onClick={() => {
                  setSelectedBulletIndex(null);
                  setActiveCategory(activeCategory === "summary" ? null : "summary");
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 10px", borderRadius: 8, width: "100%",
                  border: `1px solid ${activeCategory === "summary" ? "rgba(245,158,11,0.55)" : "var(--border)"}`,
                  background: activeCategory === "summary" ? "rgba(245,158,11,0.12)" : "var(--surface2)",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => { if (activeCategory !== "summary") { e.currentTarget.style.background = "var(--surface3)"; e.currentTarget.style.borderColor = "var(--border-h)"; } }}
                onMouseLeave={e => { if (activeCategory !== "summary") { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "var(--border)"; } }}
              >
                <span style={{ color: activeCategory === "summary" ? "#b45309" : "var(--dim)", flexShrink: 0 }}>
                  {CATEGORY_ICONS.readability}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Professional Summary
                </span>
                {summaryIssueCount > 0 && (
                  <Badge className="text-[10px] font-semibold px-1.5 py-0 h-4 border-0 shrink-0" style={{ background: "rgba(245,158,11,0.16)", color: "#b45309" }}>
                    {summaryIssueCount}
                  </Badge>
                )}
              </button>
            </div>
          )}

          {/* TOP FIXES */}
          {topFixCategories.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: "var(--red)",
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />
                Top Fixes
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {topFixCategories.map(({ key, label }) => {
                  const score = result.categoryScores[key];
                  const isActive = activeCategory === key;
                  const affectedCount = countBulletsInCategory(result.bulletAnalysis, key, categoryAssignmentOpts, resolvedBulletIndices);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedBulletIndex(null);
                        setActiveCategory(isActive ? null : key);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "9px 10px", borderRadius: 8, width: "100%",
                        border: `1px solid ${isActive ? "rgba(33,150,243,0.45)" : "var(--border)"}`,
                        background: isActive ? "rgba(227,242,253,0.85)" : "var(--surface2)",
                        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--surface3)"; e.currentTarget.style.borderColor = "var(--border-h)"; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "var(--border)"; } }}
                    >
                      <span style={{ color: isActive ? "#1565c0" : "var(--dim)", flexShrink: 0 }}>
                        {CATEGORY_ICONS[key]}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {label}
                      </span>
                      {affectedCount > 0 && (
                        <Badge className="text-[10px] font-semibold px-1.5 py-0 h-4 bg-red/10 text-red border-0 shrink-0">
                          {affectedCount}
                        </Badge>
                      )}
                      <span style={{
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                        color: scoreColor(score),
                        minWidth: 24, textAlign: "right",
                      }}>
                        {score ?? "–"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMPLETED */}
          {completedCategories.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, fontWeight: 800, color: "var(--green)",
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                Completed
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {completedCategories.map(({ key, label }) => {
                  const score = result.categoryScores[key];
                  const isActive = activeCategory === key;
                  // A category can land in COMPLETED with score >= 70 yet
                  // still have weak bullets attached (e.g. Achievement 82
                  // with one duty-only line). Surface the bullet count so
                  // the user knows there's still work available — softer
                  // amber styling distinguishes it from the red TOP FIXES
                  // badge so the visual hierarchy stays clear.
                  const affectedCount = countBulletsInCategory(result.bulletAnalysis, key, categoryAssignmentOpts, resolvedBulletIndices);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedBulletIndex(null);
                        setActiveCategory(isActive ? null : key);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 8, width: "100%",
                        border: `1px solid ${isActive ? "rgba(33,150,243,0.4)" : "var(--border)"}`,
                        background: isActive ? "rgba(227,242,253,0.75)" : "transparent",
                        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                        transition: "background 0.15s, border-color 0.15s",
                        opacity: isActive ? 1 : 0.8,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "var(--surface2)"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = isActive ? "1" : "0.8"; e.currentTarget.style.background = isActive ? "rgba(227,242,253,0.75)" : "transparent"; }}
                      title={affectedCount > 0
                        ? `${affectedCount} bullet${affectedCount === 1 ? "" : "s"} flagged in this category`
                        : "No flagged bullets in this category"}
                    >
                      <span
                        style={{
                          color: isActive ? "#1565c0" : "var(--green-ink, var(--green))",
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {CATEGORY_ICONS[key]}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--muted)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {label}
                      </span>
                      {affectedCount > 0 && (
                        <Badge className="text-[10px] font-semibold px-1.5 py-0 h-4 bg-amber/10 text-amber border-0 shrink-0">
                          {affectedCount}
                        </Badge>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", flexShrink: 0 }}>
                        {score ?? "–"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {azHistory.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{
                fontSize: 9,
                fontWeight: 800,
                color: "var(--amber)",
                textTransform: "uppercase",
                letterSpacing: 0.9,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--amber)" }} aria-hidden />
                Past runs
              </div>
              <div style={{ maxHeight: 220, minHeight: 0, overflowY: "auto" }}>{azHistoryRows}</div>
            </div>
          )}
    </>
  );
}
