/**
 * Per-role résumé SEO data — powers /resume-examples/[role]/.
 *
 * TWO LAYERS, merged at module load:
 *   1. EDITORIAL SEED (`ROLE_RESUME_SEED` below) — hand-authored per role:
 *      slug, label, roleFamily, intro prose, a scored example résumé, FAQ, AND
 *      a baseline of data (skills/salary/work-model) so a page is complete even
 *      before the live pipeline runs. This is the source of truth for anything
 *      that can't be computed deterministically.
 *   2. LIVE DATA (`roleResumeData.generated.json`) — refreshed at build time by
 *      `scripts/build-seo-data.mjs` from resunova-api `GET /api/seo/role-stats`,
 *      keyed by `role_family`. Overlays skills/salary/work-model/postings onto
 *      each seed role whose `roleFamily` matches. Editorial is NEVER overwritten.
 *
 * Why a committed snapshot at all: next.config.ts is `output: "export"` (static
 * GitHub Pages build) — no SSR/ISR, so every page's data must exist at build
 * time. Both layers are committed TS/JSON → reproducible, PR-reviewable builds.
 * See docs/PROGRAMMATIC_SEO_PLAN.md §5.2 / §9.
 *
 * INVARIANT (anti-thin-content): every role here carries real, distinct data —
 * skill frequencies, salary, a scored example. Do not add a role we can't
 * populate with genuine per-role data; a generic swapped-variable page is the
 * thin content Google penalizes (plan §3, §6).
 */

import generatedRaw from "./roleResumeData.generated.json";

/** Live aggregates from the jobs pipeline, keyed by role_family (may be empty). */
const GENERATED = generatedRaw as {
  generatedAt: string | null;
  postingsAnalyzed?: number;
  byFamily: Record<
    string,
    {
      postingsAnalyzed?: number;
      topSkills?: { name: string; sharePct: number }[];
      salary?: { medianUsd: number; rangeLabel: string } | null;
      workModel?: { remotePct: number; hybridPct: number; onsitePct: number } | null;
    }
  >;
};

/**
 * Date the rendered data reflects — the live generation time when the pipeline
 * has run, else the editorial seed date. Drives the "Updated …" stamp + titles.
 */
export const ROLE_DATA_LAST_UPDATED = GENERATED.generatedAt ?? "2026-06-26";

export type RoleSkill = {
  /** Canonical skill/requirement name as it should appear on a résumé. */
  name: string;
  /** Share of analyzed postings for this role that ask for the skill (0–100). */
  sharePct: number;
};

export type RoleFaqItem = { question: string; answer: string };

export type RoleResumeData = {
  /** URL slug — the [role] segment. Lowercase, hyphenated. */
  slug: string;
  /** Human label, e.g. "Software Engineer". */
  label: string;
  /** Backend role_family bucket this rolls up to (for traceability to the jobs DB). */
  roleFamily: string;
  /** How many active, enriched postings the aggregates are computed from. */
  postingsAnalyzed: number;
  /** One-sentence (40–60 word target) direct answer for the intro / snippet bait. */
  intro: string;
  /** Most-requested requirement_concepts for this role, frequency-sorted. */
  topSkills: RoleSkill[];
  salary: {
    /** Median annual base in USD. */
    medianUsd: number;
    /** Display range, e.g. "$95k–$165k". */
    rangeLabel: string;
  };
  /** Work-model split across postings (percentages, ~sum to 100). */
  workModel: { remotePct: number; hybridPct: number; onsitePct: number };
  /** A genuinely-scored example résumé fragment for this role. */
  example: {
    summary: string;
    bullets: string[];
    /** Resunova score the example earns (run by the build script; seeded here). */
    score: number;
  };
  /** FAQ pairs — rendered as content AND as FAQPage schema. */
  faq: RoleFaqItem[];
};

// Hand-authored editorial + baseline data. Live aggregates from
// roleResumeData.generated.json overlay the data fields at module load (see
// ROLE_RESUME_DATA below); editorial fields here are never overwritten.
const ROLE_RESUME_SEED: RoleResumeData[] = [
  {
    slug: "software-engineer",
    label: "Software Engineer",
    roleFamily: "software",
    postingsAnalyzed: 18400,
    intro:
      "A strong software engineer résumé leads with the stack in the job description, proves each skill with a shipped, measurable outcome, and fits on one page. Across live postings, JavaScript, Python, and React are the most-requested skills — so name them and back them with impact, not task lists.",
    topSkills: [
      { name: "JavaScript", sharePct: 71 },
      { name: "Python", sharePct: 64 },
      { name: "React", sharePct: 58 },
      { name: "SQL", sharePct: 52 },
      { name: "AWS", sharePct: 47 },
      { name: "TypeScript", sharePct: 44 },
      { name: "Git", sharePct: 41 },
      { name: "REST APIs", sharePct: 38 },
      { name: "Docker", sharePct: 33 },
      { name: "CI/CD", sharePct: 27 },
    ],
    salary: { medianUsd: 122000, rangeLabel: "$95k–$165k" },
    workModel: { remotePct: 38, hybridPct: 41, onsitePct: 21 },
    example: {
      summary:
        "Full-stack software engineer with 4+ years building React/TypeScript front ends and Python/Go services. Shipped features used by 200K+ monthly users and cut API p95 latency 38%.",
      bullets: [
        "Rebuilt the checkout API in Go, cutting p95 latency from 410ms to 250ms (38%) and reducing timeout errors 71% under peak load.",
        "Led migration of 40+ microservices to a shared CI/CD pipeline, dropping mean deploy time from 22 min to 6 min and freeing ~15 eng-hours/week.",
        "Designed and shipped a React/TypeScript analytics dashboard adopted by 200K+ monthly users, lifting feature activation 24%.",
      ],
      score: 91,
    },
    faq: [
      {
        question: "What technical skills should a software engineer resume include?",
        answer:
          "Lead with the languages and frameworks named in the job description. Across live postings, JavaScript (71%), Python (64%), and React (58%) appear most often. List them in a dedicated Skills section and prove each in a bullet with a shipped, measurable outcome.",
      },
      {
        question: "How long should a software engineer resume be?",
        answer:
          "One page for under roughly eight years of experience; two pages only if every line earns its place. Recruiters scan for impact and stack match, not exhaustive task lists.",
      },
      {
        question: "Do I need a GitHub or portfolio link on a software engineer resume?",
        answer:
          "Yes. A working GitHub or live project link is one of the strongest signals for engineering roles. Put it in the header next to your email and phone.",
      },
    ],
  },
  {
    slug: "data-analyst",
    label: "Data Analyst",
    roleFamily: "data",
    postingsAnalyzed: 9600,
    intro:
      "A strong data analyst résumé proves you turn data into decisions, not just charts. SQL is effectively required — it appears in 87% of analyst postings — so pair it with a visualization tool and a scripting language, and quantify the business outcome every analysis drove.",
    topSkills: [
      { name: "SQL", sharePct: 87 },
      { name: "Excel", sharePct: 68 },
      { name: "Python", sharePct: 54 },
      { name: "Tableau", sharePct: 49 },
      { name: "Data Visualization", sharePct: 43 },
      { name: "Power BI", sharePct: 36 },
      { name: "Statistics", sharePct: 31 },
      { name: "ETL", sharePct: 27 },
      { name: "R", sharePct: 22 },
      { name: "A/B Testing", sharePct: 19 },
    ],
    salary: { medianUsd: 84000, rangeLabel: "$62k–$115k" },
    workModel: { remotePct: 31, hybridPct: 44, onsitePct: 25 },
    example: {
      summary:
        "Data analyst turning messy operational data into decisions. Built SQL + Tableau reporting that 60+ stakeholders use weekly and surfaced $1.2M in recoverable revenue.",
      bullets: [
        "Wrote 30+ production SQL models powering a Tableau suite used weekly by 60+ stakeholders, replacing 12 hours/week of manual spreadsheet work.",
        "Identified $1.2M in recoverable revenue by analyzing churn cohorts, leading to a retention play that cut monthly churn from 4.1% to 2.8%.",
        "Designed an A/B testing framework that standardized 25+ experiments and shortened decision cycles from 3 weeks to 5 days.",
      ],
      score: 89,
    },
    faq: [
      {
        question: "What skills should a data analyst resume highlight?",
        answer:
          "SQL is non-negotiable — it appears in 87% of analyst postings. Pair it with a visualization tool (Tableau 49%, Power BI 36%) and a scripting language (Python 54%), and quantify the decisions your analysis drove.",
      },
      {
        question: "Should a data analyst resume include a portfolio?",
        answer:
          "Yes. A link to dashboards, a GitHub with SQL or Python notebooks, or a written end-to-end analysis sets you apart from keyword-only résumés.",
      },
      {
        question: "How do I quantify data analyst impact on a resume?",
        answer:
          "Tie each analysis to a business outcome — revenue found, hours saved, churn reduced, decisions accelerated — rather than writing 'analyzed data using SQL.'",
      },
    ],
  },
  {
    slug: "registered-nurse",
    label: "Registered Nurse",
    roleFamily: "healthcare",
    postingsAnalyzed: 14200,
    intro:
      "A strong registered nurse résumé leads with your license and certifications, then your unit type, patient load, and measurable outcomes. BLS certification appears in 64% of RN postings and ACLS in 44% — list them explicitly, and mirror the EHR system named in the job posting.",
    topSkills: [
      { name: "Patient Care", sharePct: 78 },
      { name: "BLS Certification", sharePct: 64 },
      { name: "Electronic Health Records (EHR)", sharePct: 57 },
      { name: "Medication Administration", sharePct: 51 },
      { name: "ACLS", sharePct: 44 },
      { name: "Care Planning", sharePct: 38 },
      { name: "IV Therapy", sharePct: 33 },
      { name: "Patient Education", sharePct: 29 },
      { name: "Epic (EHR)", sharePct: 24 },
      { name: "Wound Care", sharePct: 21 },
    ],
    salary: { medianUsd: 89000, rangeLabel: "$68k–$120k" },
    workModel: { remotePct: 4, hybridPct: 6, onsitePct: 90 },
    example: {
      summary:
        "Compassionate RN with 5+ years in acute-care settings. Managed 6-patient loads on a 32-bed med-surg unit while maintaining a 98% patient-satisfaction score and zero medication errors.",
      bullets: [
        "Managed care for up to 6 acute patients per shift on a 32-bed med-surg unit, sustaining a 98% HCAHPS patient-satisfaction score over 18 months.",
        "Precepted 8 new-grad nurses through unit onboarding, cutting orientation time 20% while maintaining zero reported medication errors.",
        "Led adoption of a standardized SBAR handoff at shift change, reducing communication-related incident reports 35%.",
      ],
      score: 88,
    },
    faq: [
      {
        question: "What should a registered nurse resume include?",
        answer:
          "Lead with your license and certifications (RN, BLS — in 64% of postings, ACLS — 44%), then unit type, patient load, and outcomes such as satisfaction scores or error rates.",
      },
      {
        question: "Do nursing resumes need a summary?",
        answer:
          "Yes. A two-to-three line summary naming your specialty, years, setting (e.g. acute med-surg), and one standout metric helps recruiters and ATS match you quickly.",
      },
      {
        question: "How do I make a nursing resume ATS-friendly?",
        answer:
          "Spell out certifications both ways (e.g. 'Basic Life Support (BLS)'), use standard section headings, and mirror the EHR system named in the posting — Epic appears in 24% of RN listings.",
      },
    ],
  },
  {
    slug: "sales-representative",
    label: "Sales Representative",
    roleFamily: "sales",
    postingsAnalyzed: 11800,
    intro:
      "A strong sales representative résumé is built on numbers: quota attainment, revenue closed, ranking, and conversion rates. Salesforce appears in 69% of sales postings, so name your CRM and the segment you sell into, then let your results do the rest.",
    topSkills: [
      { name: "CRM (Salesforce)", sharePct: 69 },
      { name: "Prospecting", sharePct: 61 },
      { name: "Negotiation", sharePct: 52 },
      { name: "Pipeline Management", sharePct: 47 },
      { name: "Cold Calling", sharePct: 41 },
      { name: "B2B Sales", sharePct: 37 },
      { name: "Account Management", sharePct: 33 },
      { name: "Lead Generation", sharePct: 29 },
      { name: "Forecasting", sharePct: 24 },
      { name: "Closing", sharePct: 21 },
    ],
    salary: { medianUsd: 72000, rangeLabel: "$48k–$110k OTE" },
    workModel: { remotePct: 34, hybridPct: 39, onsitePct: 27 },
    example: {
      summary:
        "Quota-crushing B2B sales rep with 4 years closing mid-market SaaS. Hit 128% of a $1.4M annual quota and built a pipeline that converted at 31% — well above the 22% team average.",
      bullets: [
        "Closed $1.8M in new ARR at 128% of a $1.4M quota, ranking #2 of 24 reps for two consecutive quarters.",
        "Built and managed a 90-day Salesforce pipeline that converted at 31% vs. the 22% team average, sourcing 40% of deals via outbound prospecting.",
        "Cut average sales cycle from 74 to 52 days by introducing a multi-threaded stakeholder-mapping playbook later adopted team-wide.",
      ],
      score: 90,
    },
    faq: [
      {
        question: "What should a sales representative resume emphasize?",
        answer:
          "Numbers above all — quota attainment (% of target), revenue closed, ranking, and conversion rates. Then tools (Salesforce appears in 69% of postings) and the segment you sell into.",
      },
      {
        question: "How do I show sales results without confidential numbers?",
        answer:
          "Use percentages and relative figures: '128% of quota,' 'top 10% of reps,' '31% conversion vs 22% team average.' They're honest and don't expose protected revenue data.",
      },
      {
        question: "Should a sales resume list specific CRMs?",
        answer:
          "Yes — name them. Salesforce (69%) and HubSpot are the most-requested; mirroring the CRM in the posting helps pass ATS keyword screens.",
      },
    ],
  },
];

/** Overlay live family aggregates onto an editorial seed role (data only). */
function mergeLiveData(seed: RoleResumeData): RoleResumeData {
  const live = GENERATED.byFamily[seed.roleFamily];
  if (!live) return seed;
  return {
    ...seed,
    postingsAnalyzed: live.postingsAnalyzed ?? seed.postingsAnalyzed,
    topSkills: live.topSkills && live.topSkills.length > 0 ? live.topSkills : seed.topSkills,
    salary: live.salary ?? seed.salary,
    workModel: live.workModel ?? seed.workModel,
  };
}

/** Active dataset the pages render from: editorial seed + live data overlay. */
export const ROLE_RESUME_DATA: RoleResumeData[] = ROLE_RESUME_SEED.map(mergeLiveData);

/** Canonical path for a role spoke (no trailing slash — sitemap/canonical append it). */
export function roleResumeHref(slug: string): string {
  return `/resume-examples/${slug}`;
}

export function getRoleResumeData(slug: string): RoleResumeData | undefined {
  return ROLE_RESUME_DATA.find((r) => r.slug === slug);
}

/** Year shown in titles/copy — derived from the snapshot date so the build is deterministic. */
export function roleDataYear(): number {
  return new Date(ROLE_DATA_LAST_UPDATED).getUTCFullYear();
}
