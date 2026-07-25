"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AddressedGapAction, RatingsData, DetailedRatingItem } from "@/lib/types";
import { isDetailedRatings } from "@/lib/types";
import { scoreColor } from "./ratings/scoreColor";
import { OverallSection } from "./ratings/OverallSection";
import { JobTitleSection } from "./ratings/JobTitleSection";
import { CoveredMissingSection } from "./ratings/CoveredMissingSection";
import { KeywordsSection } from "./ratings/KeywordsSection";
import { InterviewSection } from "./ratings/InterviewSection";
import CategoryFixPanel from "./CategoryFixPanel";
import GapFixTabPanel from "./ratings/GapFixTabPanel";

export type Tab = "overall" | "job_title" | "qualifications" | "responsibilities" | "keywords" | "interview" | "gapfix" | "fixes";

const ALWAYS_TABS: Tab[] = ["overall", "job_title", "qualifications", "responsibilities", "keywords", "interview"];

type Impact = "HIGH" | "MEDIUM" | "LOW";

const IMPACT_COLOR: Record<Impact, { color: string; bg: string }> = {
  HIGH:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  MEDIUM: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  LOW:    { color: "#64748b", bg: "rgba(100,116,139,0.1)" },
};

const SECTION_ICON: Record<Tab, ReactNode> = {
  overall: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 13V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 13V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.5 13V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 13V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  job_title: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 5V3.5C6 2.95 6.45 2.5 7 2.5H9C9.55 2.5 10 2.95 10 3.5V5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  qualifications: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.8 6.2L8 3l6.2 3.2L8 9.4 1.8 6.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4.5 8v2.2c0 .9 1.6 2 3.5 2s3.5-1.1 3.5-2V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  responsibilities: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4h7M6 8h7M6 12h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2.3 4.1l1 .9 1.4-1.6M2.3 8.1l1 .9 1.4-1.6M2.3 12.1l1 .9 1.4-1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  keywords: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.2" cy="6.2" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.8 8.8l4.2 4.2M11.8 11.8l1.2-1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  interview: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="6" y="2.2" width="4" height="7.2" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 7.5c0 2.2 1.8 4 4 4s4-1.8 4-4M8 11.5V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  gapfix: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8.9 1.8L4.4 8h3l-.3 6.2L11.6 8h-3l.3-6.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  fixes: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2l1.5 3 3.3.5-2.4 2.3.6 3.2L8 9.4 5 11l.6-3.2L3.2 5.5l3.3-.5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
};

const SECTION_IMPACT: Record<Tab, Impact> = {
  overall:          "HIGH",
  job_title:        "HIGH",
  qualifications:   "HIGH",
  responsibilities: "MEDIUM",
  keywords:         "HIGH",
  interview:        "HIGH",
  gapfix:           "HIGH",
  fixes:            "HIGH",
};

const SECTION_DESC: Record<Tab, string> = {
  overall:          "Comprehensive evaluation of your resume against the job description.",
  job_title:        "Analysis of your job title alignment with the target role.",
  qualifications:   "Comparison of your qualifications against required skills and experience.",
  responsibilities: "Review of your role descriptions and impact quantification.",
  keywords:         "ATS keyword optimisation check for skills and technologies.",
  interview:        "Coaching tips on how to position your story for this role in interviews.",
  gapfix:           "Review targeted bullet rewrites for the gap you selected, then apply to your résumé.",
  fixes:            "Review and apply AI-suggested bullet improvements category by category.",
};

type GapFixSuggestion = {
  id: string; section: string; original: string; suggested: string; reason: string; priority: string;
};
type GapFixPanel = { gapName: string; gapNotes: string; suggestions: GapFixSuggestion[] };

type SharedProps = {
  ratings: RatingsData;
  onFixGap?: (item: DetailedRatingItem, gapType: AddressedGapAction["type"]) => void;
  onFixKeyword?: (keyword: string) => void;
  /** Bulk: write selected bare skills into the résumé's Skills section. */
  onAddSkills?: (keywords: string[], category: string) => void;
  skillCategories?: string[];
  addSkillsBusy?: boolean;
  /** Bulk: one batched rewrite pass covering several contextual gaps. */
  onFixKeywords?: (keywords: string[]) => void;
  /** Open the full prep workspace carrying this run's résumé, JD, company and role. */
  onOpenInterviewPrep?: () => void;
  fixingGapName?: string | null;
  gapFixPanel?: GapFixPanel | null;
  gapFixError?: string | null;
  onApplyFix?: (s: GapFixSuggestion) => void | Promise<void>;
  onApplyAllGapFixes?: (suggestions: GapFixSuggestion[]) => void | Promise<void>;
  onDismissFix?: () => void;
  addressedGaps?: ReadonlySet<string>;
  addressedGapActions?: readonly AddressedGapAction[];
  gapFixDrafts?: Record<string, string>;
  onGapFixDraftChange?: (id: string, text: string) => void;
  keyGap?: string;
  strategicTips?: string[];
  interviewQuestions?: string[];
  onGetSuggestions?: () => void;
  suggestionsLoading?: boolean;
  hasSuggestions?: boolean;
  onApplyAllSuggestions?: () => void;
  applyBusy?: boolean;
  activeTab?: Tab;
  onActiveTabChange?: (tab: Tab) => void;
  /** Résumé headline draft for the Job Title panel's editor — distinct from any
   *  specific employer's title under Experience, which stays untouched. Empty
   *  string = no override, show the extracted headline / LLM's resume_title. */
  headlineDraft?: string;
  onHeadlineDraftChange?: (text: string) => void;
  /** Re-runs /api/analyze with the current headline draft applied. Undefined
   *  when there's no structured résumé to attach the override to. */
  onRescoreTitle?: () => void;
  titleRescoring?: boolean;
};

/** Sidebar grouping: ATS-facing dimensions vs the human-recruiter read. */
const ATS_TAB_IDS = new Set<Tab>(["overall", "job_title", "qualifications", "responsibilities", "keywords"]);

/** Honest qualitative label for the match score — thresholds mirror
 *  scoreColor (>=75 green, >=50 amber, else red) so word and colour agree. */
function scoreLabel(s: number): string {
  if (s >= 75) return "Strong";
  if (s >= 50) return "Fair";
  return "Needs work";
}

function useTailorRatingsState({
  ratings,
  hasSuggestions = false,
  gapFixPanel = null,
  strategicTips,
  interviewQuestions,
  activeTab: activeTabProp,
  onActiveTabChange,
}: Pick<SharedProps, "ratings" | "hasSuggestions" | "gapFixPanel" | "strategicTips" | "interviewQuestions" | "activeTab" | "onActiveTabChange">) {
  const [activeTabInternal, setActiveTabInternal] = useState<Tab>("overall");
  const activeTab = activeTabProp ?? activeTabInternal;
  const setActiveTab = (t: Tab) => {
    setActiveTabInternal(t);
    onActiveTabChange?.(t);
  };

  if (!isDetailedRatings(ratings)) {
    return null;
  }

  const {
    overall_score,
    job_title,
    qualifications,
    responsibilities,
    keywords,
    whats_working,
    gaps,
    verdict,
  } = ratings;

  const tabOrder: Tab[] = [
    ...ALWAYS_TABS,
    ...(gapFixPanel ? (["gapfix"] as Tab[]) : []),
    ...(hasSuggestions ? (["fixes"] as Tab[]) : []),
  ];

  type NavTab = { id: Tab; label: string; score: string; color: string };
  const navTabs: NavTab[] = [
    { id: "overall", label: "Overall Match", score: `${overall_score}%`, color: scoreColor(overall_score) },
    { id: "job_title", label: "Job Title", score: `${job_title.score}%`, color: scoreColor(job_title.score) },
    {
      id: "qualifications",
      label: "Qualifications",
      score: `${qualifications.covered.length}/${qualifications.covered.length + qualifications.missing.length}`,
      color: scoreColor(qualifications.score),
    },
    {
      id: "responsibilities",
      label: "Responsibilities",
      score: `${responsibilities.covered.length}/${responsibilities.covered.length + responsibilities.missing.length}`,
      color: scoreColor(responsibilities.score),
    },
    {
      id: "keywords",
      label: "Keywords",
      score: keywords.found_count > 0 ? `${keywords.found_count} Found` : "0 Found",
      color: scoreColor(
        keywords.found_count > 0 && keywords.total_count > 0
          ? Math.round((keywords.found_count / keywords.total_count) * 100)
          : 0,
      ),
    },
    {
      id: "interview",
      label: "Interview",
      score: interviewQuestions && interviewQuestions.length > 0
        ? `${interviewQuestions.length} Qs`
        : strategicTips && strategicTips.length > 0
        ? `${strategicTips.length} Tips`
        : "—",
      color: (interviewQuestions?.length ?? 0) > 0 || (strategicTips?.length ?? 0) > 0 ? "#f59e0b" : "var(--dim)",
    },
    ...(gapFixPanel
      ? [{ id: "gapfix" as Tab, label: "Gap fix", score: `${gapFixPanel.suggestions.length}`, color: "#818cf8" }]
      : []),
    ...(hasSuggestions ? [{ id: "fixes" as Tab, label: "Fixes", score: "Review", color: "#818cf8" }] : []),
  ];

  const tabIdx = tabOrder.indexOf(activeTab);
  const prevTab = tabIdx > 0 ? tabOrder[tabIdx - 1] : null;
  const nextTab = tabIdx < tabOrder.length - 1 ? tabOrder[tabIdx + 1] : null;
  const impact = SECTION_IMPACT[activeTab];
  const impactStyle = IMPACT_COLOR[impact];

  return {
    activeTab,
    setActiveTab,
    overall_score,
    job_title,
    qualifications,
    responsibilities,
    keywords,
    whats_working,
    gaps,
    verdict,
    navTabs,
    prevTab,
    nextTab,
    impact,
    impactStyle,
  };
}

/** Left rail — job match score + category nav (Analyze Improvement Plan analogue). */
export function TailorMatchSidebar({
  ratings,
  hasSuggestions,
  gapFixPanel,
  strategicTips,
  interviewQuestions,
  activeTab: activeTabProp,
  onActiveTabChange,
  collapsed = false,
  onCollapsedChange,
}: Pick<SharedProps, "ratings" | "hasSuggestions" | "gapFixPanel" | "strategicTips" | "interviewQuestions" | "activeTab" | "onActiveTabChange"> & {
  collapsed?: boolean;
  onCollapsedChange?: (c: boolean) => void;
}) {
  const state = useTailorRatingsState({ ratings, hasSuggestions, gapFixPanel, strategicTips, interviewQuestions, activeTab: activeTabProp, onActiveTabChange });
  if (!state) return null;

  const { activeTab, setActiveTab, overall_score, navTabs } = state;
  const sidebarCollapsed = collapsed;

  return (
    <aside
      className="tb-match-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        borderRight: "1px solid var(--border)",
        background: "var(--surface)",
        overflow: "hidden",
        width: sidebarCollapsed ? 36 : undefined,
        flexShrink: 0,
      }}
    >
      {/* Header — collapse toggle + score (expanded) */}
      <div style={{
        flexShrink: 0,
        padding: sidebarCollapsed ? "10px 4px 8px" : "16px 16px 12px",
        borderBottom: sidebarCollapsed ? "none" : "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {!sidebarCollapsed && (
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.6, flex: 1 }}>
              Job Match
            </div>
          )}
          <button
            type="button"
            title={sidebarCollapsed ? "Expand match sidebar" : "Collapse"}
            onClick={() => onCollapsedChange?.(!sidebarCollapsed)}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--surface2)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "var(--muted)", flexShrink: 0,
            }}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>
      </div>

      {/* Score card + grouped nav — hidden when collapsed */}
      {!sidebarCollapsed && (() => {
        const renderRow = (tab: (typeof navTabs)[number]) => {
          const isActive = activeTab === tab.id;
          const isLow = tab.color === "#ef4444" || tab.color === "#f59e0b";
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: "100%",
                flexShrink: 0,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                gap: 0,
                border: "none",
                borderRadius: 10,
                borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                background: isActive ? "var(--accent-bg)" : "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                color: isActive ? "var(--accent)" : "var(--muted)",
                transition: "background 0.15s, color 0.15s",
                position: "relative",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: (tab.id === "fixes" || tab.id === "gapfix") ? "#818cf8" : (isActive ? "var(--text)" : "var(--dim)"),
                    flexShrink: 0,
                  }}
                >
                  {SECTION_ICON[tab.id]}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: (tab.id === "fixes" || tab.id === "gapfix") ? "#818cf8" : (isActive ? "var(--text)" : "var(--muted)"),
                  textAlign: "left",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {tab.label}
                </span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isLow ? tab.color : "var(--muted)", flexShrink: 0, marginLeft: 8 }}>
                {tab.score}
              </span>
            </button>
          );
        };
        const groupLabel = (text: string) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 7px", marginTop: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.7 }}>{text}</span>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
        );
        const atsRows = navTabs.filter((t) => ATS_TAB_IDS.has(t.id));
        const humanRows = navTabs.filter((t) => !ATS_TAB_IDS.has(t.id));
        const col = scoreColor(overall_score);
        const R = 26, CIRC = 2 * Math.PI * R;
        const clamped = Math.max(0, Math.min(100, overall_score));
        return (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 12px 18px", display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Persistent score card */}
            <div style={{ display: "flex", alignItems: "center", gap: 13, border: "1px solid var(--border)", borderRadius: 12, padding: 13, marginBottom: 6 }}>
              <div style={{ position: "relative", width: 62, height: 62, flexShrink: 0 }}>
                <svg width="62" height="62" viewBox="0 0 62 62" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
                  <circle cx="31" cy="31" r={R} fill="none" stroke="var(--surface2)" strokeWidth="6" />
                  <circle cx="31" cy="31" r={R} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - clamped / 100)} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: col, letterSpacing: -0.5 }}>
                  {overall_score}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.6 }}>Match score</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: col, letterSpacing: -0.2, marginTop: 2 }}>{scoreLabel(overall_score)}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, lineHeight: 1.35 }}>How well this résumé covers the job</div>
              </div>
            </div>

            {atsRows.length > 0 && groupLabel("Beat the ATS")}
            {atsRows.map(renderRow)}
            {humanRows.length > 0 && groupLabel("Beat the human")}
            {humanRows.map(renderRow)}
          </div>
        );
      })()}
    </aside>
  );
}

/** Middle column — active category detail cards. */
export function TailorMatchDetail(props: SharedProps) {
  const state = useTailorRatingsState({
    ratings: props.ratings,
    hasSuggestions: props.hasSuggestions,
    gapFixPanel: props.gapFixPanel,
    strategicTips: props.strategicTips,
    interviewQuestions: props.interviewQuestions,
    activeTab: props.activeTab,
    onActiveTabChange: props.onActiveTabChange,
  });
  // The "gapfix" tab only exists while gapFixPanel is set. If the panel is
  // cleared (fix applied or dismissed) while it's the active tab, the detail
  // panel would render blank — fall back to Overall.
  useEffect(() => {
    if (props.activeTab === "gapfix" && !props.gapFixPanel) {
      props.onActiveTabChange?.("overall");
    }
  }, [props.activeTab, props.gapFixPanel, props.onActiveTabChange]);

  // A step change swaps the entire panel body. Without this the reader lands
  // in the middle of the new step at whatever offset the previous one happened
  // to be scrolled to — and the Next button sits at the bottom, so that offset
  // is almost always "the end". Instant, not smooth: this is an arrival at a
  // new step, not a move to a target on the current one.
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    detailScrollRef.current?.scrollTo({ top: 0 });
  }, [props.activeTab]);

  if (!state) return null;

  const {
    activeTab,
    setActiveTab,
    overall_score,
    job_title,
    qualifications,
    responsibilities,
    keywords,
    whats_working,
    gaps,
    verdict,
    navTabs,
    impact,
    impactStyle,
  } = state;

  const {
    onFixGap,
    onFixKeyword,
    fixingGapName,
    gapFixPanel,
    gapFixError,
    onApplyFix,
    onApplyAllGapFixes,
    onDismissFix,
    addressedGaps,
    addressedGapActions,
    gapFixDrafts,
    onGapFixDraftChange,
    keyGap,
    strategicTips,
    interviewQuestions,
    onGetSuggestions,
    suggestionsLoading,
    onApplyAllSuggestions,
    applyBusy,
  } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      {activeTab !== "fixes" && activeTab !== "gapfix" && (
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 24px", borderBottom: "1px solid var(--border)",
            background: "var(--surface2)", gap: 12, flexWrap: "wrap", flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 0", minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "var(--surface)",
              border: "1px solid var(--border)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18, flexShrink: 0,
            }}>
              {SECTION_ICON[activeTab]}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  {navTabs.find((t) => t.id === activeTab)?.label}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
                  background: impactStyle.bg, color: impactStyle.color, letterSpacing: 0.4,
                  textTransform: "uppercase", flexShrink: 0,
                }}>
                  {impact} IMPACT
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.4 }}>
                {SECTION_DESC[activeTab]}
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={detailScrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: (activeTab === "fixes" || activeTab === "gapfix") ? 0 : "24px 28px" }}>
        {activeTab === "overall" && (
          <OverallSection overallScore={overall_score} jobTitleScore={job_title?.score} verdict={verdict} whats_working={whats_working} gaps={gaps} keywords={keywords} qualifications={qualifications} responsibilities={responsibilities} roleContext={props.ratings?.role_context ?? []} onNavigate={setActiveTab} />
        )}
        {activeTab === "job_title" && (
          <JobTitleSection
            jobTitle={job_title}
            headlineDraft={props.headlineDraft}
            onHeadlineDraftChange={props.onHeadlineDraftChange}
            onRescoreTitle={props.onRescoreTitle}
            rescoring={props.titleRescoring}
          />
        )}
        {activeTab === "qualifications" && (
          <CoveredMissingSection category={qualifications} label="Qualifications" onFixGap={onFixGap} fixingGapName={fixingGapName} addressedGaps={addressedGaps} addressedGapActions={addressedGapActions} />
        )}
        {activeTab === "responsibilities" && (
          <CoveredMissingSection category={responsibilities} label="Responsibilities" onFixGap={onFixGap} fixingGapName={fixingGapName} addressedGaps={addressedGaps} addressedGapActions={addressedGapActions} />
        )}
        {activeTab === "keywords" && (
          <KeywordsSection
            keywords={keywords}
            onFixKeyword={onFixKeyword}
            fixingKeyword={fixingGapName}
            addressedGaps={addressedGaps}
            addressedGapActions={addressedGapActions}
            onAddSkills={props.onAddSkills}
            skillCategories={props.skillCategories}
            addSkillsBusy={props.addSkillsBusy}
            onFixKeywords={props.onFixKeywords}
          />
        )}
        {activeTab === "interview" && (
          <InterviewSection keyGap={keyGap} tips={strategicTips} questions={interviewQuestions} onGetSuggestions={onGetSuggestions} suggestionsLoading={suggestionsLoading} onOpenInterviewPrep={props.onOpenInterviewPrep} />
        )}
        {activeTab === "gapfix" && gapFixPanel && (
          <GapFixTabPanel
            gapFixPanel={gapFixPanel}
            gapFixError={gapFixError}
            onApplyFix={onApplyFix}
            onApplyAllFixes={onApplyAllGapFixes}
            onDismissFix={onDismissFix}
            gapFixDrafts={gapFixDrafts}
            onGapFixDraftChange={onGapFixDraftChange}
            applyBusy={applyBusy}
          />
        )}
        {activeTab === "fixes" && (
          <CategoryFixPanel onApplyAll={onApplyAllSuggestions ?? (() => {})} applyBusy={applyBusy ?? false} />
        )}
      </div>

      {/* Guided stepper — walk the match one dimension at a time. Shown for the
          walkthrough dimensions (not the full-bleed fix/gap-fix drill-ins). */}
      {activeTab !== "fixes" && activeTab !== "gapfix" && (() => {
        const idx = navTabs.findIndex((t) => t.id === activeTab);
        const prev = idx > 0 ? navTabs[idx - 1] : null;
        const next = idx >= 0 && idx < navTabs.length - 1 ? navTabs[idx + 1] : null;
        const navBtn = (extra: React.CSSProperties): React.CSSProperties => ({
          display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 9,
          fontWeight: 700, fontSize: 13, padding: "9px 15px", fontFamily: "inherit",
          border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
          cursor: "pointer", ...extra,
        });
        return (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "13px 24px", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0,
          }}>
            <button type="button" onClick={() => prev && setActiveTab(prev.id)}
              style={navBtn({ visibility: prev ? "visible" : "hidden" })}>
              ‹ Back
            </button>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.6 }}>
              Step {idx + 1} of {navTabs.length}
            </div>
            {next ? (
              <button type="button" onClick={() => setActiveTab(next.id)}
                style={navBtn({ border: "1px solid var(--accent)", background: "var(--accent)", color: "#fff" })}>
                Next: {next.label} ›
              </button>
            ) : (
              <button type="button" onClick={() => setActiveTab(navTabs[0].id)} style={navBtn({})}>
                Back to Overview
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default function DetailedRatingsView(props: SharedProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: sidebarCollapsed ? "44px 1fr" : "220px 1fr",
        gap: 0,
        borderRadius: "var(--radius-xl, 16px)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        overflow: "hidden",
        boxShadow: "var(--shadow-card)",
        transition: "grid-template-columns 0.22s ease",
      }}
    >
      <TailorMatchSidebar
        {...props}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <TailorMatchDetail {...props} />
    </div>
  );
}

