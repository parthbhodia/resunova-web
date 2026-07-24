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
      "A strong software engineer résumé leads with the stack in the job description, proves each skill with a shipped, measurable outcome, and fits on one page. Across live postings, JavaScript, Python, and React are the most-requested skills, so name them and back them with impact, not task lists.",
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
      "A strong data analyst résumé proves you turn data into decisions, not just charts. SQL is effectively required (it appears in 87% of analyst postings), so pair it with a visualization tool and a scripting language, and quantify the business outcome every analysis drove.",
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
          "SQL is non-negotiable: it appears in 87% of analyst postings. Pair it with a visualization tool (Tableau 49%, Power BI 36%) and a scripting language (Python 54%), and quantify the decisions your analysis drove.",
      },
      {
        question: "Should a data analyst resume include a portfolio?",
        answer:
          "Yes. A link to dashboards, a GitHub with SQL or Python notebooks, or a written end-to-end analysis sets you apart from keyword-only résumés.",
      },
      {
        question: "How do I quantify data analyst impact on a resume?",
        answer:
          "Tie each analysis to a business outcome (revenue found, hours saved, churn reduced, decisions accelerated) rather than writing 'analyzed data using SQL.'",
      },
    ],
  },
  {
    slug: "registered-nurse",
    label: "Registered Nurse",
    roleFamily: "healthcare",
    postingsAnalyzed: 14200,
    intro:
      "A strong registered nurse résumé leads with your license and certifications, then your unit type, patient load, and measurable outcomes. BLS certification appears in 64% of RN postings and ACLS in 44%, so list them explicitly, and mirror the EHR system named in the job posting.",
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
          "Lead with your license and certifications (RN, BLS in 64% of postings, ACLS in 44%), then unit type, patient load, and outcomes such as satisfaction scores or error rates.",
      },
      {
        question: "Do nursing resumes need a summary?",
        answer:
          "Yes. A two-to-three line summary naming your specialty, years, setting (e.g. acute med-surg), and one standout metric helps recruiters and ATS match you quickly.",
      },
      {
        question: "How do I make a nursing resume ATS-friendly?",
        answer:
          "Spell out certifications both ways (e.g. 'Basic Life Support (BLS)'), use standard section headings, and mirror the EHR system named in the posting. Epic appears in 24% of RN listings.",
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
        "Quota-crushing B2B sales rep with 4 years closing mid-market SaaS. Hit 128% of a $1.4M annual quota and built a pipeline that converted at 31%, well above the 22% team average.",
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
          "Numbers above all: quota attainment (% of target), revenue closed, ranking, and conversion rates. Then tools (Salesforce appears in 69% of postings) and the segment you sell into.",
      },
      {
        question: "How do I show sales results without confidential numbers?",
        answer:
          "Use percentages and relative figures: '128% of quota,' 'top 10% of reps,' '31% conversion vs 22% team average.' They're honest and don't expose protected revenue data.",
      },
      {
        question: "Should a sales resume list specific CRMs?",
        answer:
          "Yes, name them. Salesforce (69%) and HubSpot are the most-requested; mirroring the CRM in the posting helps pass ATS keyword screens.",
      },
    ],
  },
  {
    slug: "operations-manager",
    label: "Operations Manager",
    roleFamily: "operations",
    postingsAnalyzed: 26300,
    intro:
      "A strong operations manager résumé proves you make systems run better, faster, and cheaper. Excel and project management dominate postings, but the winning bullet quantifies the process you improved and the dollars or hours you saved. Name your ERP, your PM tool, and the scale you managed.",
    topSkills: [
      { name: "Excel", sharePct: 62 },
      { name: "Project Management", sharePct: 54 },
      { name: "SQL", sharePct: 38 },
      { name: "SAP", sharePct: 35 },
      { name: "Microsoft Office", sharePct: 31 },
      { name: "Data Analysis", sharePct: 28 },
      { name: "Supply Chain", sharePct: 25 },
      { name: "Process Improvement", sharePct: 22 },
      { name: "Budgeting", sharePct: 19 },
      { name: "Lean / Six Sigma", sharePct: 16 },
    ],
    salary: { medianUsd: 85000, rangeLabel: "$65k–$115k" },
    workModel: { remotePct: 18, hybridPct: 37, onsitePct: 45 },
    example: {
      summary:
        "Operations manager with 6+ years streamlining logistics and supply-chain workflows. Reduced fulfillment costs 22% across a 3-warehouse network while maintaining 99.4% on-time delivery.",
      bullets: [
        "Redesigned the pick-pack-ship workflow across 3 warehouses, cutting average fulfillment cost per order from $4.80 to $3.74 (22%) while handling 15% higher volume.",
        "Built an Excel-and-SQL demand forecasting model that reduced overstock write-offs $340K annually and improved fill rate from 91% to 97%.",
        "Led a Lean initiative on the returns line, dropping average processing time from 48 hours to 18 hours and recovering $120K in restockable inventory per quarter.",
      ],
      score: 88,
    },
    faq: [
      {
        question: "What skills should an operations manager resume highlight?",
        answer:
          "Excel (62% of postings) and project management (54%) are table stakes. Differentiate with an ERP system (SAP, Oracle, NetSuite), a continuous-improvement methodology (Lean, Six Sigma), and quantified process gains.",
      },
      {
        question: "How do I quantify operations impact on a resume?",
        answer:
          "Tie every bullet to cost saved, time reduced, or throughput increased. 'Cut fulfillment cost 22%' beats 'managed warehouse operations.' Percentages and dollar figures carry the most weight.",
      },
      {
        question: "Should an operations resume include certifications?",
        answer:
          "PMP and Six Sigma (Green or Black Belt) both signal structured problem-solving. List them in a dedicated Certifications section and reference the methodology in your bullets.",
      },
    ],
  },
  {
    slug: "financial-analyst",
    label: "Financial Analyst",
    roleFamily: "finance",
    postingsAnalyzed: 16600,
    intro:
      "A strong financial analyst résumé proves you build models that drive decisions, not just spreadsheets. Excel is practically universal, but the real differentiator is showing that your analysis led to a funding decision, a cost cut, or a pricing change. Name your modeling tools and the stakes involved.",
    topSkills: [
      { name: "Excel", sharePct: 74 },
      { name: "Financial Modeling", sharePct: 58 },
      { name: "Accounting (GAAP)", sharePct: 49 },
      { name: "CPA", sharePct: 42 },
      { name: "SQL", sharePct: 36 },
      { name: "PowerPoint", sharePct: 32 },
      { name: "Budgeting & Forecasting", sharePct: 28 },
      { name: "ERP (SAP/Oracle)", sharePct: 24 },
      { name: "Bloomberg Terminal", sharePct: 19 },
      { name: "Python / VBA", sharePct: 15 },
    ],
    salary: { medianUsd: 82000, rangeLabel: "$60k–$115k" },
    workModel: { remotePct: 22, hybridPct: 48, onsitePct: 30 },
    example: {
      summary:
        "Financial analyst with 3+ years building DCF and LBO models for mid-market M&A. Supported $240M in closed transactions and cut quarterly close cycle from 12 to 7 business days.",
      bullets: [
        "Built DCF and LBO models in Excel for 6 acquisition targets totaling $240M, providing the valuation basis for 4 completed deals.",
        "Automated the monthly revenue-recognition report with VBA and SQL, reducing close cycle from 12 to 7 business days and eliminating 3 manual reconciliation steps.",
        "Developed a rolling 13-week cash-flow forecast used by the CFO to time a $30M credit-facility draw, saving $180K in unnecessary interest expense.",
      ],
      score: 90,
    },
    faq: [
      {
        question: "What should a financial analyst resume emphasize?",
        answer:
          "Excel proficiency is assumed (74% of postings). The differentiators are modeling depth (DCF, LBO, scenario analysis), the decisions your work informed, and the dollar amounts at stake.",
      },
      {
        question: "Does a financial analyst resume need a CPA?",
        answer:
          "CPA appears in 42% of postings, so it helps. If you have it, list it prominently. If not, emphasize modeling output and any relevant certifications like CFA Level progress.",
      },
      {
        question: "How long should a financial analyst resume be?",
        answer:
          "One page. Finance hiring managers scan for deal size, model types, and tools. Every line should name a number, a model, or a decision your analysis drove.",
      },
    ],
  },
  {
    slug: "marketing-manager",
    label: "Marketing Manager",
    roleFamily: "marketing",
    postingsAnalyzed: 11500,
    intro:
      "A strong marketing manager résumé connects campaigns to revenue, not vanity metrics. SEO, project management, and CRM tools (Salesforce, HubSpot) dominate postings. Show the pipeline you built, the CAC you lowered, or the conversion rate you moved, and name the channels that got you there.",
    topSkills: [
      { name: "SEO / SEM", sharePct: 55 },
      { name: "Project Management", sharePct: 44 },
      { name: "Salesforce", sharePct: 38 },
      { name: "HubSpot", sharePct: 33 },
      { name: "Google Analytics", sharePct: 30 },
      { name: "Content Strategy", sharePct: 27 },
      { name: "Social Media (TikTok, Instagram)", sharePct: 24 },
      { name: "Email Marketing", sharePct: 21 },
      { name: "Paid Media (Google Ads, Meta)", sharePct: 18 },
      { name: "Marketing Automation", sharePct: 15 },
    ],
    salary: { medianUsd: 92000, rangeLabel: "$68k–$130k" },
    workModel: { remotePct: 35, hybridPct: 40, onsitePct: 25 },
    example: {
      summary:
        "Marketing manager with 5+ years driving B2B SaaS pipeline through content, paid, and lifecycle channels. Grew inbound-sourced revenue 62% year-over-year while cutting blended CAC 28%.",
      bullets: [
        "Launched a content + SEO program that grew organic traffic from 12K to 48K monthly sessions in 10 months, generating 340 MQLs per month at $18 CAC vs. $74 for paid.",
        "Managed a $420K annual paid-media budget across Google, LinkedIn, and Meta, optimizing toward pipeline (not clicks) and delivering $2.1M in attributed pipeline at 5:1 ROI.",
        "Built a HubSpot lifecycle-email program (12 sequences, 50+ emails) that lifted trial-to-paid conversion from 8% to 14% and reduced churn 19% in the first 90 days.",
      ],
      score: 91,
    },
    faq: [
      {
        question: "What skills should a marketing manager resume include?",
        answer:
          "SEO/SEM (55% of postings), a CRM (Salesforce 38%, HubSpot 33%), and analytics (Google Analytics 30%) are the most-requested. Layer in channel-specific expertise and tie every skill to a revenue or pipeline metric.",
      },
      {
        question: "How do I show marketing ROI on a resume?",
        answer:
          "Name the channel, the spend, and the result: '$420K budget, $2.1M pipeline, 5:1 ROI.' Avoid vanity metrics (impressions, followers) unless they directly drove revenue.",
      },
      {
        question: "Should a marketing resume be one page?",
        answer:
          "One page for under 8 years of experience. Hiring managers scan for channels owned, tools used, and revenue impact. Cut anything that doesn't show measurable results.",
      },
    ],
  },
  {
    slug: "product-manager",
    label: "Product Manager",
    roleFamily: "product",
    postingsAnalyzed: 5100,
    intro:
      "A strong product manager résumé shows you shipped outcomes, not features. AI and API fluency are rising fast in postings, but the core signal is still: did you define the right problem, align the team, and move a business metric? Lead with the metric, not the Jira board.",
    topSkills: [
      { name: "Product Strategy", sharePct: 58 },
      { name: "SQL", sharePct: 45 },
      { name: "AI / ML Fluency", sharePct: 42 },
      { name: "APIs", sharePct: 38 },
      { name: "User Stories / PRDs", sharePct: 35 },
      { name: "Data Analytics", sharePct: 31 },
      { name: "Jira / Agile", sharePct: 28 },
      { name: "A/B Testing", sharePct: 24 },
      { name: "Roadmapping", sharePct: 21 },
      { name: "Stakeholder Management", sharePct: 18 },
    ],
    salary: { medianUsd: 135000, rangeLabel: "$105k–$180k" },
    workModel: { remotePct: 36, hybridPct: 42, onsitePct: 22 },
    example: {
      summary:
        "Product manager with 5+ years shipping B2B SaaS features used by 50K+ customers. Grew activation 34% by redefining onboarding and built an AI-powered search that lifted engagement 41%.",
      bullets: [
        "Redefined the onboarding flow based on 200+ user-session recordings, lifting 7-day activation from 22% to 34% and reducing time-to-value from 14 minutes to 5.",
        "Led a cross-functional squad (4 eng, 1 design, 1 data) to ship an AI-powered search feature in 8 weeks, increasing daily active search usage 41%.",
        "Prioritized a ruthless backlog of 120+ feature requests using an impact/effort framework, shipping the top 8 items that drove 72% of quarterly NRR expansion.",
      ],
      score: 92,
    },
    faq: [
      {
        question: "What should a product manager resume focus on?",
        answer:
          "Outcomes over outputs. Instead of 'wrote PRDs and managed sprints,' show the metric you moved (activation, retention, revenue), the insight that drove the decision, and the team you aligned to ship it.",
      },
      {
        question: "Do product managers need technical skills on their resume?",
        answer:
          "SQL (45% of postings) and AI/ML fluency (42%) are increasingly expected. You don't need to code, but showing you can query data, understand APIs, and evaluate AI capabilities sets you apart.",
      },
      {
        question: "How do I show product impact without sharing confidential metrics?",
        answer:
          "Use percentages and relative gains: '34% activation lift,' '41% more daily usage,' '72% of quarterly expansion.' They prove impact without exposing absolute numbers.",
      },
    ],
  },
  {
    slug: "recruiter",
    label: "Recruiter",
    roleFamily: "recruiting",
    postingsAnalyzed: 4900,
    intro:
      "A strong recruiter résumé is a meta-test: you screen résumés for a living, so yours had better be flawless. Greenhouse, Workday, and LinkedIn Recruiter dominate tool mentions. Lead with fill rate, time-to-hire, and candidate quality metrics, not 'managed full-cycle recruiting.'",
    topSkills: [
      { name: "LinkedIn Recruiter", sharePct: 62 },
      { name: "Greenhouse", sharePct: 55 },
      { name: "Workday", sharePct: 48 },
      { name: "HRIS", sharePct: 42 },
      { name: "Sourcing", sharePct: 38 },
      { name: "Employee Relations", sharePct: 34 },
      { name: "Performance Management", sharePct: 30 },
      { name: "Excel", sharePct: 27 },
      { name: "Diversity Hiring", sharePct: 22 },
      { name: "Employer Branding", sharePct: 18 },
    ],
    salary: { medianUsd: 72000, rangeLabel: "$52k–$100k" },
    workModel: { remotePct: 42, hybridPct: 35, onsitePct: 23 },
    example: {
      summary:
        "Technical recruiter with 4+ years filling engineering and product roles at high-growth SaaS companies. Maintained a 91% offer-accept rate and cut average time-to-fill from 52 to 34 days.",
      bullets: [
        "Filled 85+ engineering and product roles in 18 months with a 91% offer-accept rate, sourcing 60% of candidates through direct outreach on LinkedIn Recruiter.",
        "Cut average time-to-fill from 52 to 34 days by building a pre-vetted talent pipeline of 400+ passive candidates in Greenhouse, segmented by stack and seniority.",
        "Launched a diversity sourcing initiative that increased underrepresented candidate slates from 18% to 42% without extending time-to-fill.",
      ],
      score: 89,
    },
    faq: [
      {
        question: "What metrics should a recruiter resume include?",
        answer:
          "Fill rate, time-to-hire, offer-accept rate, and candidate quality (90-day retention). These prove you close roles efficiently with candidates who stick.",
      },
      {
        question: "Which ATS should a recruiter name on their resume?",
        answer:
          "Greenhouse (55% of postings) and Workday (48%) are the most requested. Name every ATS you've used and the volume you managed in each.",
      },
      {
        question: "How does a recruiter resume differ from an HR generalist resume?",
        answer:
          "Recruiters lead with sourcing metrics, pipeline size, and close rates. HR generalists lead with policy, compliance, and employee programs. If you've done both, split them into separate sections.",
      },
    ],
  },
  {
    slug: "paralegal",
    label: "Paralegal",
    roleFamily: "legal",
    postingsAnalyzed: 4900,
    intro:
      "A strong paralegal résumé proves attention to detail through the document itself. Drafting, legal research, and Microsoft Office appear in nearly every posting. Show the case types you've supported, the volume of filings you've managed, and any area-specific expertise like corporate governance or IP.",
    topSkills: [
      { name: "Legal Research (Westlaw/LexisNexis)", sharePct: 58 },
      { name: "Drafting & Document Review", sharePct: 54 },
      { name: "Microsoft Office (Word, Excel, Outlook)", sharePct: 48 },
      { name: "Corporate Governance", sharePct: 35 },
      { name: "E-Discovery", sharePct: 30 },
      { name: "Case Management Software", sharePct: 27 },
      { name: "Filing & Compliance", sharePct: 24 },
      { name: "Contract Review", sharePct: 21 },
      { name: "Litigation Support", sharePct: 18 },
      { name: "Privacy / Data Protection", sharePct: 14 },
    ],
    salary: { medianUsd: 62000, rangeLabel: "$45k–$82k" },
    workModel: { remotePct: 15, hybridPct: 40, onsitePct: 45 },
    example: {
      summary:
        "Corporate paralegal with 4+ years supporting M&A, securities, and governance matters at a top-50 law firm. Managed due-diligence rooms for $500M+ in transactions and cut document-review turnaround 30%.",
      bullets: [
        "Managed due-diligence data rooms for 8 M&A transactions totaling $500M+, coordinating 200+ document requests across 4 practice groups with zero missed deadlines.",
        "Drafted and proofread SEC filings (10-K, 10-Q, 8-K) for 5 public company clients, reducing attorney revision rounds from 3 to 1.5 on average.",
        "Built a Westlaw research protocol that cut average research turnaround from 6 hours to 4 hours, adopted firm-wide by the corporate practice.",
      ],
      score: 87,
    },
    faq: [
      {
        question: "What should a paralegal resume emphasize?",
        answer:
          "Case types and volume (M&A, litigation, IP), research tools (Westlaw, LexisNexis), and concrete output: filings managed, documents reviewed, deadlines met. Specificity signals competence.",
      },
      {
        question: "Does a paralegal resume need a certification?",
        answer:
          "A paralegal certificate or CP/ACP credential helps but is not universally required. If you have one, list it. If not, emphasize your practice-area expertise and tool proficiency.",
      },
      {
        question: "How long should a paralegal resume be?",
        answer:
          "One page. Attorneys and hiring managers read fast. Lead with your strongest practice area, name your tools, and quantify the volume of work you managed.",
      },
    ],
  },
  {
    slug: "teacher",
    label: "Teacher",
    roleFamily: "education",
    postingsAnalyzed: 4100,
    intro:
      "A strong teacher résumé goes beyond 'taught 25 students.' Show grade levels, subject areas, student outcomes (test score gains, graduation rates), and the instructional strategies that got you there. Differentiated instruction, classroom technology, and data-driven planning appear in the majority of postings.",
    topSkills: [
      { name: "Classroom Instruction", sharePct: 68 },
      { name: "Differentiated Instruction", sharePct: 55 },
      { name: "Curriculum Development", sharePct: 48 },
      { name: "Classroom Technology", sharePct: 42 },
      { name: "Student Assessment", sharePct: 38 },
      { name: "Data-Driven Planning", sharePct: 34 },
      { name: "Special Education (IEP)", sharePct: 28 },
      { name: "Classroom Management", sharePct: 25 },
      { name: "Parent Communication", sharePct: 21 },
      { name: "Google Classroom / LMS", sharePct: 17 },
    ],
    salary: { medianUsd: 58000, rangeLabel: "$42k–$78k" },
    workModel: { remotePct: 5, hybridPct: 8, onsitePct: 87 },
    example: {
      summary:
        "Middle-school math teacher with 5 years in Title I schools. Raised 8th-grade proficiency rates from 41% to 67% in two years through data-driven grouping and standards-based grading.",
      bullets: [
        "Raised 8th-grade math proficiency from 41% to 67% over two years using data-driven small-group rotations aligned to MAP assessment results.",
        "Designed a standards-based grading system adopted by the 6-person math department, reducing D/F rates 35% while improving student self-assessment accuracy.",
        "Integrated Google Classroom and Desmos into daily lessons, increasing student engagement (measured by assignment-completion rate) from 72% to 91%.",
      ],
      score: 86,
    },
    faq: [
      {
        question: "What should a teacher resume include?",
        answer:
          "Grade levels, subjects, student outcomes (proficiency gains, pass rates), and instructional methods. Name the assessments you used (MAP, STAR, state tests) and the technology platforms in your classroom.",
      },
      {
        question: "Do teachers need a portfolio with their resume?",
        answer:
          "Not always, but a link to lesson plans, student-work samples, or a teaching website strengthens your application. If you have one, include it in the header.",
      },
      {
        question: "How do I show teaching impact with numbers?",
        answer:
          "Use test-score gains (percentage-point increase), pass rates, assignment-completion rates, or attendance improvements. 'Raised proficiency from 41% to 67%' is specific and verifiable.",
      },
    ],
  },
  {
    slug: "graphic-designer",
    label: "Graphic Designer",
    roleFamily: "design",
    postingsAnalyzed: 3700,
    intro:
      "A strong graphic designer résumé leads with Figma, Adobe Creative Suite, and a portfolio link. Design systems, typography, and user research appear in the top requirements. The résumé itself is a design artifact, so clean layout, hierarchy, and consistency matter as much as the content.",
    topSkills: [
      { name: "Figma", sharePct: 65 },
      { name: "Adobe Creative Suite", sharePct: 58 },
      { name: "Design Systems", sharePct: 42 },
      { name: "Typography", sharePct: 38 },
      { name: "User Research", sharePct: 34 },
      { name: "Interaction Design", sharePct: 31 },
      { name: "Prototyping", sharePct: 28 },
      { name: "Illustrator", sharePct: 25 },
      { name: "Photoshop", sharePct: 22 },
      { name: "Motion Graphics", sharePct: 16 },
    ],
    salary: { medianUsd: 75000, rangeLabel: "$55k–$105k" },
    workModel: { remotePct: 40, hybridPct: 38, onsitePct: 22 },
    example: {
      summary:
        "Product designer with 4+ years building design systems and shipping consumer UI at scale. Created a component library used across 3 product teams that cut design-to-dev handoff time 45%.",
      bullets: [
        "Built and maintained a Figma component library (180+ components, 40+ variants) adopted by 3 product teams, cutting design-to-dev handoff time from 5 days to 2.5.",
        "Redesigned the onboarding flow based on 30+ usability tests, lifting signup completion from 54% to 78% and reducing support tickets 40%.",
        "Created brand guidelines (typography, color, spacing, illustration style) for a Series B startup, applied consistently across web, mobile, and marketing collateral.",
      ],
      score: 89,
    },
    faq: [
      {
        question: "What tools should a graphic designer resume list?",
        answer:
          "Figma (65% of postings) and Adobe Creative Suite (58%) are near-universal. Add design-system tools (Storybook, Tokens Studio) and prototyping tools (Principle, ProtoPie) if you use them.",
      },
      {
        question: "Does a graphic designer resume need a portfolio link?",
        answer:
          "Absolutely. A portfolio is non-negotiable for design roles. Put the URL in your header, right next to your email. If you have case studies with process and outcomes, you'll stand out.",
      },
      {
        question: "Should a designer resume be creatively designed?",
        answer:
          "Yes, but readability wins over flair. Clean hierarchy, consistent spacing, and ATS-parseable text prove more than decorative elements. Your portfolio shows the creative range.",
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

/** Canonical path for a role's skills page (no trailing slash — sitemap/canonical append it). */
export function skillsForResumeHref(slug: string): string {
  return `/skills-for-resume/${slug}`;
}

export function getRoleResumeData(slug: string): RoleResumeData | undefined {
  return ROLE_RESUME_DATA.find((r) => r.slug === slug);
}

/** Year shown in titles/copy — derived from the snapshot date so the build is deterministic. */
export function roleDataYear(): number {
  return new Date(ROLE_DATA_LAST_UPDATED).getUTCFullYear();
}
