import type { StructuredResume } from "@/store/resumeAnalyzeStore";

/**
 * Lightweight, dependency-free resume industry/category classifier.
 *
 * Outputs one of 7 supported Interview Prep categories:
 * Technology | Legal | Healthcare | Sales | Marketing | Product | General
 *
 * Matching uses word/phrase boundaries (NOT raw substring `includes`, which
 * false-matched "go" in "negotiation", "api" in "capital", "law" in "flawless",
 * "sql"/"ehr" inside unrelated words). Signals are weighted (job titles >
 * concrete skills > generic terms) and scored per section (a title is a stronger
 * domain signal than a body mention). A confidence floor + a minimum lead over
 * the runner-up keep one accidental match (e.g. a finance résumé that lists SQL)
 * from tipping the whole résumé into the wrong category — it falls back to
 * General instead.
 */

export type ResumeCategory =
  | "Technology"
  | "Legal"
  | "Healthcare"
  | "Sales"
  | "Marketing"
  | "Product"
  | "General";

export const RESUME_CATEGORIES: ResumeCategory[] = [
  "Technology",
  "Legal",
  "Healthcare",
  "Sales",
  "Marketing",
  "Product",
  "General",
];

export interface ResumeCategoryResult {
  category: ResumeCategory;
  /** 0–1 share of the winning category's weighted score over the total. */
  confidence: number;
}

type ScoredCategory = ResumeCategory;

interface WeightedSignal {
  signal: string;
  weight: number;
}

// A job title is the strongest domain signal, then concrete skills, then
// free-text body. These multiply the per-signal weight below.
const SECTION_WEIGHT = { title: 3, skills: 2, body: 1 } as const;

// Minimum weighted score for a confident pick, and the minimum lead the winner
// must hold over the runner-up. Below either → General. This is what stops a
// single ambiguous skill (a finance/MBA résumé that lists "sql") from being
// classified Technology.
const MIN_CONFIDENCE_SCORE = 8;
const MIN_LEAD_OVER_SECOND = 2;

const CATEGORY_SIGNALS: Record<Exclude<ResumeCategory, "General">, WeightedSignal[]> = {
  Technology: [
    { signal: "software engineer", weight: 8 },
    { signal: "software developer", weight: 8 },
    { signal: "frontend developer", weight: 8 },
    { signal: "front end developer", weight: 8 },
    { signal: "backend developer", weight: 8 },
    { signal: "back end developer", weight: 8 },
    { signal: "full stack", weight: 7 },
    { signal: "data engineer", weight: 7 },
    { signal: "data scientist", weight: 7 },
    { signal: "machine learning", weight: 6 },
    { signal: "devops", weight: 6 },
    { signal: "developer", weight: 5 },
    { signal: "react", weight: 5 },
    { signal: "node", weight: 5 },
    { signal: "node.js", weight: 5 },
    { signal: "typescript", weight: 5 },
    { signal: "kubernetes", weight: 5 },
    { signal: "javascript", weight: 4 },
    { signal: "python", weight: 4 },
    { signal: "java", weight: 4 },
    { signal: "golang", weight: 4 },
    { signal: "aws", weight: 4 },
    { signal: "docker", weight: 4 },
    { signal: "graphql", weight: 4 },
    { signal: "rest api", weight: 4 },
    { signal: "microservices", weight: 4 },
    { signal: "cloud", weight: 3 },
    { signal: "sql", weight: 3 },
    { signal: "git", weight: 2 },
    { signal: "api", weight: 2 },
  ],
  Legal: [
    { signal: "attorney", weight: 8 },
    { signal: "lawyer", weight: 8 },
    { signal: "paralegal", weight: 8 },
    { signal: "legal counsel", weight: 8 },
    { signal: "general counsel", weight: 8 },
    { signal: "legal research", weight: 7 },
    { signal: "litigation", weight: 6 },
    { signal: "contract law", weight: 6 },
    { signal: "case law", weight: 6 },
    { signal: "intellectual property", weight: 5 },
    { signal: "court", weight: 5 },
    { signal: "deposition", weight: 5 },
    { signal: "arbitration", weight: 5 },
    { signal: "mediation", weight: 5 },
    { signal: "compliance", weight: 4 },
    { signal: "due diligence", weight: 4 },
    { signal: "regulatory", weight: 4 },
    { signal: "contract", weight: 3 },
    { signal: "legal", weight: 3 },
  ],
  Healthcare: [
    { signal: "registered nurse", weight: 9 },
    { signal: "physician", weight: 8 },
    { signal: "nurse", weight: 8 },
    { signal: "doctor", weight: 7 },
    { signal: "patient care", weight: 7 },
    { signal: "clinical", weight: 6 },
    { signal: "healthcare", weight: 6 },
    { signal: "medical", weight: 5 },
    { signal: "ehr", weight: 5 },
    { signal: "hipaa", weight: 5 },
    { signal: "epic", weight: 5 },
    { signal: "hospital", weight: 5 },
    { signal: "clinic", weight: 5 },
    { signal: "pharmacist", weight: 5 },
    { signal: "phlebotomy", weight: 5 },
    { signal: "diagnosis", weight: 4 },
    { signal: "care coordination", weight: 4 },
    { signal: "patient", weight: 3 },
  ],
  Sales: [
    { signal: "account executive", weight: 9 },
    { signal: "sales representative", weight: 8 },
    { signal: "business development", weight: 8 },
    { signal: "salesforce", weight: 6 },
    { signal: "crm", weight: 5 },
    { signal: "quota", weight: 5 },
    { signal: "pipeline", weight: 5 },
    { signal: "lead generation", weight: 5 },
    { signal: "prospecting", weight: 5 },
    { signal: "cold calling", weight: 5 },
    { signal: "revenue", weight: 4 },
    { signal: "territory", weight: 4 },
    { signal: "upsell", weight: 4 },
    { signal: "cross-sell", weight: 4 },
    { signal: "account management", weight: 4 },
    { signal: "sales", weight: 3 },
  ],
  Marketing: [
    { signal: "marketing manager", weight: 9 },
    { signal: "growth marketing", weight: 8 },
    { signal: "digital marketing", weight: 8 },
    { signal: "demand generation", weight: 7 },
    { signal: "seo", weight: 6 },
    { signal: "sem", weight: 6 },
    { signal: "google ads", weight: 6 },
    { signal: "google analytics", weight: 5 },
    { signal: "campaign", weight: 5 },
    { signal: "campaigns", weight: 5 },
    { signal: "content strategy", weight: 5 },
    { signal: "email marketing", weight: 5 },
    { signal: "copywriting", weight: 4 },
    { signal: "social media", weight: 4 },
    { signal: "brand", weight: 4 },
    { signal: "ppc", weight: 4 },
    { signal: "marketing", weight: 3 },
  ],
  Product: [
    { signal: "product manager", weight: 10 },
    { signal: "product owner", weight: 9 },
    { signal: "product management", weight: 8 },
    { signal: "product strategy", weight: 7 },
    { signal: "roadmap", weight: 6 },
    { signal: "user research", weight: 6 },
    { signal: "feature prioritization", weight: 6 },
    { signal: "customer discovery", weight: 6 },
    { signal: "go-to-market", weight: 5 },
    { signal: "mvp", weight: 5 },
    { signal: "okr", weight: 5 },
    { signal: "a/b testing", weight: 5 },
    { signal: "user stories", weight: 5 },
    { signal: "backlog", weight: 4 },
    { signal: "scrum", weight: 4 },
    { signal: "agile", weight: 3 },
    { signal: "stakeholder", weight: 3 },
  ],
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    // Keep token-internal +, #, ., /, - so "c++", "node.js", "ci/cd",
    // "a/b testing", "cross-sell" survive as whole tokens.
    .replace(/[^\w+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word/phrase-boundary match. Boundaries are any char that is NOT alphanumeric
 * or one of + # . / - (those stay token-internal), so "go" matches the standalone
 * word "go" but not "negotiation", and "java" does not match "javascript".
 */
function hasSignal(haystack: string, signal: string): boolean {
  const s = normalizeText(signal);
  if (!s) return false;
  const pattern = new RegExp(
    `(^|[^a-z0-9+#./-])${escapeRegex(s)}($|[^a-z0-9+#./-])`,
    "i",
  );
  return pattern.test(haystack);
}

interface Sections {
  title: string;
  skills: string;
  body: string;
}

function scoreCategory(signals: WeightedSignal[], sections: Sections): number {
  let score = 0;
  for (const { signal, weight } of signals) {
    // Credit the strongest section the signal appears in (title > skills > body).
    let mult = 0;
    if (hasSignal(sections.title, signal)) mult = SECTION_WEIGHT.title;
    else if (hasSignal(sections.skills, signal)) mult = SECTION_WEIGHT.skills;
    else if (hasSignal(sections.body, signal)) mult = SECTION_WEIGHT.body;
    if (mult > 0) score += weight * mult;
  }
  return score;
}

/**
 * Classify a parsed resume into one of the 7 supported Interview Prep
 * categories using weighted, boundary-matched keyword scoring.
 *
 * @param structured Parsed resume from `/api/upload-resume` (may be null).
 * @param extractedText Synthesized resume text (fallback signal source).
 */
export function classifyResumeCategory(
  structured: StructuredResume | null,
  extractedText = "",
): ResumeCategoryResult {
  const titleText = normalizeText(
    [
      structured?.headline ?? "",
      ...(structured?.experience ?? []).map((e) => e.role ?? ""),
      ...(structured?.projects ?? []).map((p) => p.name ?? ""),
    ].join(" "),
  );

  const skillsText = normalizeText(
    [
      ...(structured?.skills ?? []).flatMap((s) => [s.category, ...(s.items ?? [])]),
      ...(structured?.projects ?? []).map((p) => p.tech ?? ""),
    ].join(" "),
  );

  const bodyText = normalizeText(
    [
      extractedText,
      structured?.summary ?? "",
      ...(structured?.experience ?? []).flatMap((e) => e.bullets ?? []),
      ...(structured?.projects ?? []).flatMap((p) => p.bullets ?? []),
    ].join(" "),
  );

  const sections: Sections = { title: titleText, skills: skillsText, body: bodyText };

  const scored = (
    Object.entries(CATEGORY_SIGNALS) as [ScoredCategory, WeightedSignal[]][]
  )
    .map(([category, signals]) => ({ category, score: scoreCategory(signals, sections) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  const total = scored.reduce((sum, s) => sum + s.score, 0);

  // Not confident enough, or too close to call → General (the safe fallback).
  if (!best || best.score < MIN_CONFIDENCE_SCORE) {
    return { category: "General", confidence: 0 };
  }
  const lead = best.score - (second?.score ?? 0);
  if (lead < MIN_LEAD_OVER_SECOND) {
    return { category: "General", confidence: 0 };
  }

  return { category: best.category, confidence: total ? best.score / total : 0 };
}
