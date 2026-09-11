import type { AnalysisResult } from "@/components/analyze/analyzeTypes";
import type { AnalyzeRecord } from "@/lib/supabase";

/**
 * A complete Analyze result: the shape `POST /api/analyze-upload` returns and
 * `resume_analyses.result` stores, with every section the result view renders
 * populated. The person is fictional. A real saved row carries a real résumé
 * and must never be committed as a fixture.
 *
 * `bulletAnalysis` is sparse (weakest bullets only) and `bulletMap` points each
 * entry back at its line in `structuredResume`, the way the backend emits them.
 */

export const FIXTURE_ANALYSIS_ID = "3f6d2c1e-8a4b-4f0e-9c7d-5b2a1e0f9d84";
export const FIXTURE_USER_ID = "0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d";
export const FIXTURE_NAME = "Jordan Rivera";

const CONTACT = "Austin, TX | jordan.rivera@example.com | (555) 010-0142 | linkedin.com/in/jordan-rivera-example";

const SUMMARY =
  "Frontend engineer with 7 years of experience building data-heavy web applications in React and TypeScript.";

const NORTHWIND_BULLETS = [
  "Built a React and TypeScript design system adopted by four product teams.",
  "Responsible for maintaining CI/CD pipelines and deployment scripts.",
  "Worked on improving page load performance for the customer dashboard.",
];

const CONTOSO_BULLETS = [
  "Helped the team migrate twelve services to Kubernetes.",
  "Shipped a patient intake form now used by 120 clinics.",
  "Wrote unit tests for the scheduling service.",
];

const EXTRACTED_TEXT = [
  FIXTURE_NAME,
  CONTACT,
  "",
  "SUMMARY",
  SUMMARY,
  "",
  "EXPERIENCE",
  "Senior Frontend Engineer | Northwind Analytics | Mar 2021 – Present",
  ...NORTHWIND_BULLETS.map((b) => `- ${b}`),
  "Software Engineer | Contoso Health | Jun 2018 – Feb 2021",
  ...CONTOSO_BULLETS.map((b) => `- ${b}`),
  "",
  "PROJECTS",
  "Open Budget Explorer | React, D3, Supabase",
  "- Visualized city budget data for 30,000 monthly visitors.",
  "",
  "SKILLS",
  "Languages: TypeScript, JavaScript, Python, SQL",
  "Frameworks: React, Next.js, Node.js, GraphQL",
  "",
  "EDUCATION",
  "B.S. Computer Science | University of Texas at Austin | 2014 – 2018",
  "",
  "CERTIFICATIONS",
  "AWS Certified Developer, Associate (2023)",
].join("\n");

export const analysisResultFixture: AnalysisResult = {
  overallScore: 71,
  categoryScores: {
    readability: 78,
    atsCompatibility: 84,
    jobMatch: null,
    achievementQuality: 61,
    quantification: 55,
    sectionStructure: 80,
    languageQuality: 69,
    technicalBranding: 74,
  },
  categoryRationales: {
    readability: "Bullets are mostly one line, but two run long enough to wrap on the page.",
    atsCompatibility: "Standard headings and a single column parse cleanly.",
    achievementQuality: "Half the experience bullets describe duties rather than outcomes.",
    quantification: "Only two of seven bullets carry a number.",
    sectionStructure: "Sections are in a sensible order for an experienced engineer.",
    languageQuality: "Several bullets open with weak verbs such as 'Worked on' and 'Helped'.",
    technicalBranding: "The stack is clear, but the summary does not name a specialty.",
  },
  summary: "A solid frontend résumé held back by duty-style bullets and few measurable results.",
  topStrengths: [
    "Clear, modern frontend stack",
    "Steady progression from engineer to senior engineer",
  ],
  topIssues: [
    {
      issue: "Most bullets describe responsibilities instead of results",
      severity: "high",
      whyItMatters: "Recruiters skim for impact, and duties read like a job description.",
      suggestion: "Lead each bullet with what changed because of your work.",
      category: "achievementQuality",
      items: [NORTHWIND_BULLETS[1], CONTOSO_BULLETS[2]],
    },
    {
      issue: "Few bullets are quantified",
      severity: "medium",
      whyItMatters: "Numbers make scope and impact comparable at a glance.",
      suggestion: "Add a metric for time saved, users reached or performance gained.",
      category: "quantification",
    },
    {
      issue: "Weak opening verbs",
      severity: "low",
      whyItMatters: "Openers like 'Helped' understate ownership.",
      suggestion: "Start with the action you took: Led, Rebuilt, Cut.",
      category: "languageQuality",
    },
  ],
  atsWarnings: [
    {
      warning: "The certifications heading is not one most parsers recognize.",
      suggestion: "Title the section 'Certifications'.",
    },
  ],
  keywordAnalysis: {
    matchedKeywords: [],
    missingKeywords: [],
    keywordScore: null,
    suggestions: [],
  },
  bulletAnalysis: [
    {
      originalBullet: NORTHWIND_BULLETS[1],
      score: 46,
      issues: ["weak_verb", "duty_statement"],
      improvedBullet:
        "Rebuilt CI/CD pipelines and deployment scripts, cutting release time from [X] hours to [Y] minutes.",
      categoryRewrites: {
        achievementQuality:
          "Rebuilt CI/CD pipelines and deployment scripts, cutting release time from [X] hours to [Y] minutes.",
      },
      primaryCategory: "achievementQuality",
      issueCategories: ["achievementQuality", "languageQuality"],
    },
    {
      originalBullet: NORTHWIND_BULLETS[2],
      score: 52,
      issues: ["quantification"],
      improvedBullet: "Cut customer dashboard load time by [X%] by code-splitting routes and caching API responses.",
      categoryRewrites: {
        quantification: "Cut customer dashboard load time by [X%] by code-splitting routes and caching API responses.",
      },
      primaryCategory: "quantification",
      issueCategories: ["quantification", "achievementQuality"],
    },
    {
      originalBullet: CONTOSO_BULLETS[0],
      score: 58,
      issues: ["weak_verb"],
      improvedBullet: "Led the migration of twelve services to Kubernetes with zero downtime.",
      categoryRewrites: {
        languageQuality: "Led the migration of twelve services to Kubernetes with zero downtime.",
      },
      primaryCategory: "languageQuality",
      issueCategories: ["languageQuality"],
    },
    {
      originalBullet: CONTOSO_BULLETS[2],
      score: 44,
      issues: ["duty_statement", "quantification"],
      improvedBullet:
        "Raised scheduling service test coverage from [X%] to [Y%], catching regressions before release.",
      categoryRewrites: {
        quantification:
          "Raised scheduling service test coverage from [X%] to [Y%], catching regressions before release.",
      },
      primaryCategory: "quantification",
      issueCategories: ["quantification", "achievementQuality"],
    },
  ],
  extractedText: EXTRACTED_TEXT,
  resumeHeader: [FIXTURE_NAME, CONTACT],
  structuredResume: {
    full_name: FIXTURE_NAME,
    headline: "Senior Frontend Engineer",
    location: "Austin, TX",
    email: "jordan.rivera@example.com",
    phone: "(555) 010-0142",
    linkedin: "linkedin.com/in/jordan-rivera-example",
    github: "",
    summary: SUMMARY,
    skills: [
      { category: "Languages", items: ["TypeScript", "JavaScript", "Python", "SQL"] },
      { category: "Frameworks", items: ["React", "Next.js", "Node.js", "GraphQL"] },
    ],
    experience: [
      {
        company: "Northwind Analytics",
        role: "Senior Frontend Engineer",
        dates: "Mar 2021 – Present",
        location: "Austin, TX",
        bullets: NORTHWIND_BULLETS,
      },
      {
        company: "Contoso Health",
        role: "Software Engineer",
        dates: "Jun 2018 – Feb 2021",
        location: "Remote",
        bullets: CONTOSO_BULLETS,
      },
    ],
    education: [
      {
        institution: "University of Texas at Austin",
        degree: "B.S. Computer Science",
        dates: "2014 – 2018",
        location: "Austin, TX",
        bullets: [],
      },
    ],
    projects: [
      {
        name: "Open Budget Explorer",
        tech: "React, D3, Supabase",
        bullets: ["Visualized city budget data for 30,000 monthly visitors."],
      },
    ],
    extra_sections: [{ title: "Certifications", lines: ["AWS Certified Developer, Associate (2023)"] }],
  },
  bulletMap: [
    { experienceIdx: 0, bulletIdx: 1 },
    { experienceIdx: 0, bulletIdx: 2 },
    { experienceIdx: 1, bulletIdx: 0 },
    { experienceIdx: 1, bulletIdx: 2 },
  ],
  sectionFeedback: [
    { section: "SUMMARY", score: 70, feedback: "Clear, but it does not say what you specialize in." },
    { section: "EXPERIENCE", score: 63, feedback: "Strong employers and stack. The bullets need outcomes." },
    { section: "SKILLS", score: 82, feedback: "Well grouped and easy to scan." },
    { section: "EDUCATION", score: 85, feedback: "Complete." },
  ],
  rewriteSuggestions: [],
  finalRecommendations: [
    "Rewrite the four flagged bullets around outcomes.",
    "Add at least one metric to each role.",
  ],
  experienceSummary: {
    totalMonths: 99,
    totalYearsLabel: "8 years",
    roleCount: 2,
    datedRoleCount: 2,
    roles: [
      { company: "Northwind Analytics", role: "Senior Frontend Engineer", dates: "Mar 2021 – Present", months: 66 },
      { company: "Contoso Health", role: "Software Engineer", dates: "Jun 2018 – Feb 2021", months: 33 },
    ],
  },
  summaryAnalysis: {
    original: SUMMARY,
    wordCount: 15,
    issues: ["Does not name a specialty or a result."],
    improvedSummary:
      "Frontend engineer with 7 years building data-heavy React and TypeScript applications, specializing in design systems and dashboard performance.",
  },
  analysisId: FIXTURE_ANALYSIS_ID,
  analysisPersisted: true,
  sourcePdfUrl: null,
  sourceFilename: "jordan-rivera-resume.pdf",
  scanLimitStatus: null,
};

/** The history-list row `fetchAnalyses` returns: metadata only, the result is lazy-loaded on open. */
export const analysisRecordFixture: AnalyzeRecord = {
  id: FIXTURE_ANALYSIS_ID,
  label: FIXTURE_NAME,
  score: 71,
  createdAt: "2026-07-31T14:05:00.000Z",
  sourcePdfUrl: null,
  sourceFilename: "jordan-rivera-resume.pdf",
  parentId: null,
  version: 1,
  rootId: FIXTURE_ANALYSIS_ID,
  scoreSource: null,
  result: null,
};
