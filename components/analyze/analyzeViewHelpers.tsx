// Pure view helpers + presentational constants for the Analyze flow, extracted
// from AnalyzeResume.tsx (Slice 1 of docs/ANALYZE_REFACTOR_PLAN.md). All of
// these were module-level (state-free) in AnalyzeResume — this is a
// behavior-preserving move, no logic changes.

import React from "react";
import type { AnalysisResult } from "./analyzeTypes";
import { bulletBelongsToCategory, type CategoryAssignmentOptions } from "@/lib/analysisCategoryMatch";

export const SCORE_NEEDS_EXPLANATION = 95;

export function scoreColor(score: number | null): string {
  if (score === null) return "var(--border)";
  if (score >= 80) return "var(--green)";
  if (score >= 60) return "var(--yellow)";
  return "var(--red)";
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  return "Needs Work";
}

export function severityColor(severity: "low" | "medium" | "high"): string {
  if (severity === "high") return "var(--red)";
  if (severity === "medium") return "#f59e0b";
  return "var(--accent)";
}

export function severityBg(severity: "low" | "medium" | "high"): string {
  if (severity === "high") return "rgba(248,113,113,0.12)";
  if (severity === "medium") return "rgba(245,158,11,0.12)";
  return "rgba(99,102,241,0.12)";
}

export const CATEGORY_LABELS: Array<{ key: keyof AnalysisResult["categoryScores"]; label: string }> = [
  { key: "readability", label: "Readability" },
  { key: "atsCompatibility", label: "ATS Safety" },
  { key: "jobMatch", label: "Job Match" },
  { key: "achievementQuality", label: "Achievement" },
  { key: "quantification", label: "Quantification" },
  { key: "sectionStructure", label: "Structure" },
  { key: "languageQuality", label: "Language" },
  { key: "technicalBranding", label: "Field & depth" },
];

export function flaggedBulletFixChip(
  activeCategory: keyof AnalysisResult["categoryScores"] | null,
  isLanguageMicroEdit: boolean,
): string {
  if (isLanguageMicroEdit) return "Proofreading";
  if (!activeCategory) return "Fix";
  return CATEGORY_LABELS.find(c => c.key === activeCategory)?.label ?? "Fix";
}

/**
 * Plain-language coaching for a flagged bullet, written for a new grad who has
 * never built a résumé. Each entry answers the three questions a confused
 * student actually has: why is this weak, what do I do, and what does good
 * look like? Keyed by the analysis category the bullet was flagged under.
 */
export type CategoryCoach = { why: string; how: string; example: string };

export const CATEGORY_COACH: Partial<Record<keyof AnalysisResult["categoryScores"], CategoryCoach>> = {
  achievementQuality: {
    why: "Right now this says what you were responsible for, not what changed because of you. Recruiters skim for results, not duties.",
    how: "Start with a strong action verb and end with the outcome: what got better, faster, cheaper, or bigger?",
    example: "“Responsible for onboarding design” → “Redesigned onboarding, cutting setup time ~40% for 500+ new users.”",
  },
  quantification: {
    why: "Numbers make a line believable and easy to skim. “Improved the flow” is vague; “cut it from 3 weeks to 1” sticks.",
    how: "Add any real figure: people, %, time, money, or scale. No exact number? A rough count or range still helps.",
    example: "“Grew community engagement” → “Grew engagement 40% across 2 social channels.”",
  },
  sectionStructure: {
    why: "This line tries to do too much at once, or it’s the only bullet for the role. Recruiters scan fast, so each line should carry one clear idea.",
    how: "Split it into 2–4 short bullets for the job, each leading with an action and ending with a result.",
    example: "One long line → “Led UX for the AI Automation team.” + “Shipped 3 product flows now used across 4 product teams.”",
  },
  languageQuality: {
    why: "Small wording slips like the wrong tense, passive voice, or filler make a line read less confident than you are.",
    how: "Use past tense for past roles, start with the action, and cut empty words like “responsible for” or “various.”",
    example: "“Was responsible for various design tasks” → “Designed and shipped the team’s design system.”",
  },
  readability: {
    why: "Long, dense lines are hard to skim, and a recruiter spends only seconds on each résumé.",
    how: "Keep every bullet to one or two lines. Put the important part first and trim the rest.",
    example: "A 3-line run-on → one tight line that leads with the result.",
  },
  technicalBranding: {
    why: "This line doesn’t show the specific tools or methods that prove you can actually do the work in your field.",
    how: "Name the real tools, methods, or systems you used, the ones a hiring manager in your field looks for.",
    example: "“Did user research” → “Ran 12 usability tests in Figma + Maze, turning findings into a service blueprint.”",
  },
};

export const COACH_BODY_STYLE: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.55,
  color: "var(--muted)",
  margin: 0,
};

// Category icons (SVG paths)
export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  quantification:     <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 12h2v2H2zM6 9h2v5H6zM10 6h2v8h-2zM14 3h-2v11h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  achievementQuality: <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4L2.1 6.2l4-.6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  languageQuality:    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  readability:        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v10H2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 7h6M5 9.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  atsCompatibility:   <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  sectionStructure:   <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="7" width="7" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="12" width="9" height="2" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>,
  technicalBranding:  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M5 4l-3 4 3 4M11 4l3 4-3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 3l-2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  jobMatch:           <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  quantification:     "Aim for metrics on ~75% of experience bullets, prioritizing your biggest wins.",
  achievementQuality: "Outcomes and ownership, not duty lists.",
  languageQuality:    "Active verbs; less passive voice and filler.",
  readability:        "Short, clear bullets recruiters can skim fast.",
  atsCompatibility:   "ATS-safe layout and standard section headings.",
  sectionStructure:   "Right sections, in the order recruiters expect.",
  technicalBranding:  "Clear tools, credentials, and field signals.",
  jobMatch:           "Keywords and experience that match the job.",
};

// Map top-issue text keywords to category keys for smart linking
export const ISSUE_TEXT_TO_CATEGORY: Array<{ patterns: string[]; key: keyof AnalysisResult["categoryScores"] }> = [
  {
    patterns: [
      "weak action", "weak verb", "duty-only", "responsible for", "task-focused",
      "vague outcome", "no achievement", "duty list",
    ],
    key: "achievementQuality",
  },
  { patterns: ["quantif", "metric", "no numbers", "measur", "lack of data", "numeric", "no metrics"], key: "quantification" },
  { patterns: ["language", "verb", "passive", "buzzword", "communication", "word"], key: "languageQuality" },
  { patterns: ["readab", "length", "format", "clarity", "long", "short"], key: "readability" },
  { patterns: ["ats", "applicant", "tracking", "keyword", "scan"], key: "atsCompatibility" },
  { patterns: ["section", "structure", "summary", "objective", "order"], key: "sectionStructure" },
  {
    patterns: [
      "github", "gitlab", "portfolio", "tech stack", "full stack", "technical stack", "stack depth",
      "technical branding", "writing sample", "work sample", "teaching portfolio", "clinical credential",
      "licensure", "board certified", "certification gap", "creative reel", "publications section",
      "domain expertise", "field-specific",
    ],
    key: "technicalBranding",
  },
  { patterns: ["job match", "fit", "requirement", "relevance"], key: "jobMatch" },
];

export function guessIssueCategory(issueText: string): keyof AnalysisResult["categoryScores"] | null {
  const lower = issueText.toLowerCase();
  for (const { patterns, key } of ISSUE_TEXT_TO_CATEGORY) {
    if (patterns.some(p => lower.includes(p))) return key;
  }
  return null;
}

/** Category for a topIssue: trust the backend's explicit `category` (deterministic
 *  checks set it authoritatively); fall back to the text heuristic for LLM issues. */
export function issueCategoryOf(
  issue: AnalysisResult["topIssues"][number],
): keyof AnalysisResult["categoryScores"] | null {
  if (issue.category) return issue.category;
  return guessIssueCategory(`${issue.issue} ${issue.whyItMatters} ${issue.suggestion}`);
}

export function getBulletsForCategory(
  key: string,
  bulletAnalysis: AnalysisResult["bulletAnalysis"],
  opts?: CategoryAssignmentOptions,
): AnalysisResult["bulletAnalysis"] {
  return bulletAnalysis.filter((b, i) =>
    bulletBelongsToCategory(b, key, bulletAnalysis, i, opts),
  );
}

export function formatExperienceTenureChip(summary: AnalysisResult["experienceSummary"]): string | null {
  if (!summary) return null;
  const { totalYearsLabel, roleCount, datedRoleCount } = summary;
  if (datedRoleCount === 0 && roleCount === 0) return null;
  const rolePart = roleCount === 1 ? "1 role" : `${roleCount} roles`;
  if (datedRoleCount === 0) return `${rolePart} · dates not parsed`;
  return `${totalYearsLabel} · ${rolePart}`;
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
    >
      <circle cx="9" cy="9" r="7" stroke="var(--border)" strokeWidth="2.5" />
      <path d="M9 2a7 7 0 017 7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  );
}
