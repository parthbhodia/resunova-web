// Strongly-typed shapes for the Analyze flow, extracted from AnalyzeResume.tsx
// (Slice 1 of docs/ANALYZE_REFACTOR_PLAN.md). Behavior-preserving move — these
// interfaces were previously defined inline in AnalyzeResume.
//
// AnalyzeRecord is imported from @/lib/supabase (result typed loosely for JSON
// column flexibility); callers cast result → AnalysisResult when reading.

import type { StructuredResume, BulletMapEntry } from "@/store/resumeAnalyzeStore";

export interface RequirementConceptFE {
  id: string;
  canonical: string;
  aliases: string[];
  type: string;
  importance: "required" | "preferred" | "nice_to_have";
  roleFamily: string;
  sourceText: string;
  confidence: number;
}

export interface JdMatchBreakdown {
  job_title:        { score: number; matched: boolean; evidence: string[] };
  qualifications:   { total: number; covered: number; missing: number };
  responsibilities: { total: number; covered: number; missing: number };
  keywords: {
    required_total:   number;
    required_found:   number;
    preferred_total:  number;
    preferred_found:  number;
  };
  overall_score: number;
}

export interface ScoringMeta {
  scoring_model:     string;
  scoring_version:   string;
  prompt_version:    string;
  scoring_algorithm: string;
}

export interface AnalysisResult {
  overallScore: number;
  categoryScores: {
    readability: number;
    atsCompatibility: number;
    jobMatch: number | null;
    achievementQuality: number;
    quantification: number;
    sectionStructure: number;
    languageQuality: number;
    technicalBranding: number;
  };
  /** Per-category 1–2 sentence explanation of why that score was assigned. */
  categoryRationales?: Partial<Record<keyof AnalysisResult["categoryScores"], string>>;
  summary: string;
  topStrengths: string[];
  topIssues: Array<{
    issue: string;
    severity: "low" | "medium" | "high";
    whyItMatters: string;
    suggestion: string;
    /** Explicit categoryScores key (backend-authoritative for deterministic checks). */
    category?: keyof AnalysisResult["categoryScores"];
    /** Concrete offending items (bullets, words, phrases) to list under the issue. */
    items?: string[];
    /** "deterministic" for rule-based recruiter checks surfaced by the backend. */
    source?: string;
  }>;
  atsWarnings: Array<{ warning: string; suggestion: string }>;
  keywordAnalysis: {
    matchedKeywords: string[];
    missingKeywords: string[];
    keywordScore: number | null;
    suggestions: string[];
  };
  bulletAnalysis: Array<{
    originalBullet: string;
    score: number;
    issues: string[];
    improvedBullet: string;
    categoryRewrites?: Partial<Record<string, string>>;
    /** Backend-authoritative category bucketing (see analysisCategoryMatch). */
    primaryCategory?: string;
    issueCategories?: string[];
  }>;
  /** Plain text from PDF/LaTeX extraction — drives live preview when present. */
  extractedText?: string;
  /** Name + contact lines extracted before the first section heading. */
  resumeHeader?: string[];
  /** Faithfully-extracted structured model (no JD tailoring). */
  structuredResume?: StructuredResume | null;
  /** Maps flat bulletAnalysis[i] → {experienceIdx, bulletIdx} in structuredResume. */
  bulletMap?: BulletMapEntry[];
  sectionFeedback: Array<{ section: string; score: number; feedback: string }>;
  rewriteSuggestions: Array<{ before: string; after: string; reason: string }>;
  finalRecommendations: string[];
  /** Deterministic document-level ATS / structural flags (LinkedIn, open dates, misclassified sections, separators). */
  structuralFlags?: Array<{ issue: string; risk: string; severity?: "high" | "medium" | "low" }>;
  /** When analysis used a library folder (TeX on disk), persisted so history restore can reopen Builder with `base=`. */
  libraryFolder?: string | null;
  /** Merged professional tenure from structuredResume.experience dates. */
  experienceSummary?: {
    totalMonths: number;
    totalYearsLabel: string;
    roleCount: number;
    datedRoleCount: number;
    roles: Array<{
      company: string;
      role: string;
      dates: string;
      months: number;
    }>;
  };
  /** Deterministic JD match score (0–100). Present only when a JD was supplied. */
  jdMatchScore?: number | null;
  /** Per-bucket breakdown of the deterministic JD match scoring. */
  jdMatchBreakdown?: JdMatchBreakdown | null;
  /** Structured JD requirements extracted by the LLM (one entry per concept). */
  requirementConcepts?: RequirementConceptFE[];
  /** Provenance/version metadata for the deterministic scorer. */
  scoringMeta?: ScoringMeta | null;
  /** Set when backend persisted this run (analyze-upload). */
  analysisId?: string;
  /** True when backend wrote resume_analyses; false/absent means client should insert. */
  analysisPersisted?: boolean;
  /** Version lineage of a persisted rescore — backend chains it as a verified
   *  ("llm") child of the analysis it was rescored from (parent_analysis_id). */
  analysisParentId?: string | null;
  analysisVersion?: number;
  analysisRootId?: string | null;
  analysisScoreSource?: string | null;
  sourcePdfUrl?: string | null;
  sourceFilename?: string | null;
  scanLimitStatus?: { limit: number; used: number; remaining: number; resetAt: string } | null;
  /** LLM analysis of the professional summary section. Present only when a summary section exists. */
  summaryAnalysis?: {
    original: string;
    wordCount: number;
    issues: string[];
    improvedSummary?: string;
  } | null;
}
