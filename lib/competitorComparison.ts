/**
 * Competitor comparison data for /compare/[slug]/.
 *
 * SOURCING INVARIANT: every competitor claim here is research-verified (web
 * search + an independent adversarial fact-check) and DATED. We publish only
 * confirmed/high-confidence facts, never fabricated specifics — exact prices
 * that couldn't be confirmed are deliberately omitted in favour of structure
 * ("freemium", "Premium-gated"). Comparisons must stay fair to the competitor
 * (accuracy + fairness is also what gets the page cited by AI engines, and what
 * keeps it off the wrong side of Google's quality guidelines). Re-verify before
 * relying on any line; competitor feature sets change.
 */

export type ComparisonRow = {
  /** What's being compared. */
  feature: string;
  /** Resunova's answer. */
  resunova: string;
  /** Competitor's answer. */
  competitor: string;
  /** Marks a row whose competitor claim leans on third-party review sourcing. */
  caveat?: boolean;
};

export type Comparison = {
  /** URL slug — the [slug] segment, e.g. "resunova-vs-kickresume". */
  slug: string;
  competitor: string;
  competitorUrl: string;
  /** Human "as of" label for freshness. */
  asOf: string;
  /** 40–60 word direct-answer intro / snippet bait. */
  intro: string;
  rows: ComparisonRow[];
  /** Honest, fair verdict prose. */
  verdict: string;
  faq: { question: string; answer: string }[];
  footnotes: string[];
};

export const COMPARISONS: Comparison[] = [
  {
    slug: "resunova-vs-kickresume",
    competitor: "Kickresume",
    competitorUrl: "https://www.kickresume.com",
    asOf: "June 2026",
    intro:
      "Resunova and Kickresume both build resumes, score them against ATS rules, and tailor them to a job description. The core difference is the paywall: Resunova is completely free (including the full ATS report, AI rewrites, and a formatted PDF download), while Kickresume gates those behind a paid Premium plan.",
    rows: [
      {
        feature: "Price",
        resunova: "Completely free, no paid tier",
        competitor: "Freemium: a free plan plus a paid Premium subscription for full features",
      },
      {
        feature: "ATS resume score",
        resunova: "Free: full score across 7 dimensions, with the weakest bullets flagged and a rewrite for each",
        competitor: "Free score shows an overall + 3 category scores; the full detailed ATS report requires Premium",
      },
      {
        feature: "Tailor to a job description",
        resunova: "Free: match score, gap analysis, and keyword fixes against any pasted JD",
        competitor: "Yes, AI rewrites your resume to the JD, but it's a Premium feature (free has limited AI credits)",
      },
      {
        feature: "Download a formatted PDF",
        resunova: "Free: a clean, ATS-friendly PDF, no watermark",
        competitor: "A fully-formatted PDF effectively requires Premium; free downloads are format-restricted",
        caveat: true,
      },
      {
        feature: "Templates",
        resunova: "Free template builder, no sign-up required",
        competitor: "A few basic templates free; the full 40+ library and styling require Premium",
      },
      {
        feature: "AI bullet rewrites",
        resunova: "Free",
        competitor: "Premium: the free plan includes only limited AI credits",
      },
      {
        feature: "Cover letter builder",
        resunova: "Not yet. Resunova focuses on the resume",
        competitor: "Yes, AI cover letters with matching templates (Premium AI)",
      },
      {
        feature: "Sign-up to start",
        resunova: "Not required for the template builder",
        competitor: "A free account is required to build and download",
      },
      {
        feature: "Student offer",
        resunova: "Free for everyone, built for students and the job-seeking community",
        competitor: "Roughly 6 months of free Premium for verified students and teachers",
      },
    ],
    verdict:
      "Kickresume is a polished, broad product (40+ templates, an AI writing suite, cover letters, a website builder), and if you want that full toolkit and are willing to pay for Premium, it's a strong choice. Resunova makes a narrower bet: the things that actually move you past an ATS (an honest score, job-description tailoring, and a clean ATS-friendly PDF) are free, with no download paywall, aimed at students and early-career job seekers. If \"free, no catch\" matters most to you, Resunova wins; if you want the widest premium feature set and will subscribe, Kickresume earns its price.",
    faq: [
      {
        question: "Is Resunova really free?",
        answer:
          "Yes, completely free, including the full ATS score, job-description tailoring, AI rewrites, and a formatted PDF download. There is no paid tier and no credit card. It's built for students and the job-seeking community.",
      },
      {
        question: "What's the main difference between Resunova and Kickresume?",
        answer:
          "The paywall. Resunova gives you the full ATS report, AI rewrites, and a formatted PDF for free. Kickresume's free plan shows a limited score and restricted downloads, and gates the detailed ATS report, AI tools, and a fully-formatted PDF behind its paid Premium plan.",
      },
      {
        question: "Does Kickresume have a free ATS checker?",
        answer:
          "Yes, but it's limited. Kickresume's free ATS/resume checker shows an overall score plus three category scores; the full detailed report requires Premium. Resunova's free check returns the full breakdown plus a rewrite for each weak bullet.",
      },
      {
        question: "Can I download my resume for free on Kickresume?",
        answer:
          "You can build one for free, but multiple reviews report that a fully-formatted PDF effectively requires Premium; the free tier's downloads are format-restricted. (As of June 2026; verify on kickresume.com.) Resunova's formatted PDF download is free with no watermark.",
      },
    ],
    footnotes: [
      "Compiled from Kickresume's public pages and reputable third-party reviews as of June 2026, then independently fact-checked. Kickresume's exact pricing could not be confirmed via automated checks and is intentionally omitted; verify current details on kickresume.com. Feature sets change; corrections welcome at contact@resunova.io.",
    ],
  },
  {
    slug: "resunova-vs-jobscan",
    competitor: "Jobscan",
    competitorUrl: "https://www.jobscan.co",
    asOf: "July 2026",
    intro:
      "Jobscan is the original resume-vs-job-description scanner: paste both, get a match rate, close the keyword gaps. Resunova covers the same core loop for free, with a scoring model built to reward honest rewrites instead of keyword stuffing. The practical differences are the paywall and what the score optimizes for.",
    rows: [
      {
        feature: "Price",
        resunova: "Completely free, no paid tier",
        competitor: "Free plan limited to 5 scans per month; Premium is $49.95/month or $89.95 per quarter, with a 7-day trial",
      },
      {
        feature: "Scan limits",
        resunova: "Unlimited: score your resume against as many job descriptions as you want",
        competitor: "5 free scans per month (unused scans roll over, capped at 5); unlimited requires Premium",
      },
      {
        feature: "Match scoring approach",
        resunova: "Deterministic model built from analysis of 100,000+ real US postings; weights what employers actually require rather than raw keyword overlap",
        competitor: "Keyword match rate against the pasted JD, with an official target of 75%+; hard/soft skill gaps and 30+ checks in the report",
      },
      {
        feature: "AI bullet rewrites",
        resunova: "Free: honest rewrites that only claim credit when a requirement is genuinely covered, with clear skip reasons when there is no honest bridge",
        competitor: "Power Edit generates bullet options per missing keyword and AI Optimize rewrites in one click; these are Premium features",
      },
      {
        feature: "Full ATS report",
        resunova: "Free: full score with the weakest bullets flagged and a rewrite for each",
        competitor: "Free scan shows the basics; full match-rate insights and ATS-specific tips require Premium",
      },
      {
        feature: "Resume builder and PDF download",
        resunova: "Free template builder, ATS-friendly PDF, no watermark, no sign-up required",
        competitor: "Free: builder with 9 templates and unlimited PDF downloads (AI extras inside the builder are paid)",
      },
      {
        feature: "Job feed",
        resunova: "Live postings with disclosed salary, H-1B sponsor data, and per-job match scoring, free",
        competitor: "Job Matcher surfaces postings labeled by match quality from a third-party feed",
      },
      {
        feature: "LinkedIn optimization",
        resunova: "Not yet. Resunova focuses on the resume and the job feed",
        competitor: "Yes: profile score and keyword recommendations; basic version free, full version Premium (excluded from the trial)",
      },
      {
        feature: "Cover letters",
        resunova: "Not yet",
        competitor: "AI cover letter generator, Premium after the trial",
      },
    ],
    verdict:
      "Jobscan is the category veteran and its match report is genuinely thorough: 30+ checks, ATS-specific tips, and a LinkedIn optimizer nothing else here offers. If you scan more than five jobs a month, though, you are on the $49.95/month plan, and independent reviews consistently note the same trap: chasing the match-rate percentage rewards keyword stuffing, which recruiters see through. Resunova's bet is different: the scan, the tailoring, and the rewrites are free and unlimited, and the scoring model is deliberately built so the way to raise your score is to be genuinely qualified and say so clearly, not to paste the job description back at itself. If you want the deepest report and LinkedIn coverage and will pay for it, Jobscan is strong. If you want unlimited honest tailoring for free, Resunova wins.",
    faq: [
      {
        question: "Is Jobscan free?",
        answer:
          "Partly. The free plan includes 5 scans per month (unused scans roll over, capped at 5) and the resume builder with PDF downloads. The full match report, Power Edit rewrites, and unlimited scans require Premium at $49.95/month or $89.95 per quarter (as of July 2026). Resunova's scan, tailoring, and rewrites are free and unlimited.",
      },
      {
        question: "Is a 75%+ Jobscan match rate enough to get interviews?",
        answer:
          "Not by itself. The match rate measures keyword overlap with the job description, and multiple independent reviews report high scores followed by rejections. Real ATS systems are search-and-ranking tools for recruiters, not scored gates. That is why Resunova scores against what postings actually require and only credits changes that are honestly supported by your experience.",
      },
      {
        question: "Does keyword matching mean I should copy phrases from the job description?",
        answer:
          "No. Recruiters read resumes, and pasted-in JD phrasing is easy to spot. Cover the requirement in your own words with evidence. Resunova's rewriter is built around this: it weaves missing keywords into your bullets only where your experience genuinely supports them, and tells you why when it declines.",
      },
      {
        question: "What does Resunova have that Jobscan doesn't?",
        answer:
          "Unlimited free scans and rewrites, and a job feed built on Resunova's own posting corpus with disclosed salary and H-1B sponsor data. Jobscan counters with a LinkedIn optimizer and cover letter tools, which Resunova doesn't have yet.",
      },
    ],
    footnotes: [
      "Compiled from Jobscan's public pages (jobscan.co pricing tutorial, resume scanner, Power Edit, resume builder, LinkedIn optimization, and cover letter pages) and multiple independent reviews as of July 2026, then independently fact-checked. Pricing and free-scan limits confirmed from Jobscan's own published pages. Feature sets change; verify current details on jobscan.co. Corrections welcome at contact@resunova.io.",
    ],
  },
  {
    slug: "resunova-vs-teal",
    competitor: "Teal",
    competitorUrl: "https://www.tealhq.com",
    asOf: "July 2026",
    intro:
      "Teal is a job-search workspace: an excellent free job tracker, a resume builder, and an AI toolkit, with the analysis depth gated behind Teal+. Resunova is narrower and fully free: unlimited resume scoring and honest tailoring against real posting data. Which fits depends on whether you want an organizer or an optimizer.",
    rows: [
      {
        feature: "Price",
        resunova: "Completely free, no paid tier",
        competitor: "Free plan plus Teal+ at $13 per week, $29 per 30 days, or $79 per 90 days; no annual plan",
      },
      {
        feature: "Resume builder and PDF download",
        resunova: "Free template builder, ATS-friendly PDF, no sign-up required",
        competitor: "Free: unlimited resumes, 10 templates, unlimited PDF export (PDF is the only format); full template library requires Teal+",
      },
      {
        feature: "Match scoring approach",
        resunova: "Deterministic model built from analysis of 100,000+ real US postings; weights what employers actually require rather than raw keyword overlap",
        competitor: "Keyword overlap between your resume and the attached job description, shown as included/missing keywords",
      },
      {
        feature: "Keyword visibility",
        resunova: "Free: the full gap analysis for any job description, unlimited",
        competitor: "Free plan shows only the top 5 keywords per job; the full keyword list requires Teal+",
      },
      {
        feature: "AI bullet rewrites",
        resunova: "Free and unlimited: honest rewrites that only claim credit when a requirement is genuinely covered",
        competitor: "Free plan includes a small one-time credit allotment (single-digit bullet credits, 2 summaries, 2 cover letters); unlimited requires Teal+",
      },
      {
        feature: "Job application tracker",
        resunova: "Not yet. Resunova focuses on scoring, tailoring, and the job feed",
        competitor: "Yes, and it's the standout: unlimited free tracking with stages, notes, contacts, and follow-up templates",
      },
      {
        feature: "Job feed",
        resunova: "Live postings with disclosed salary, H-1B sponsor data, and per-job match scoring, free",
        competitor: "Yes: a large job board sourced from company ATS systems, with salary-disclosed filters and saved-search alerts",
      },
      {
        feature: "Chrome extension",
        resunova: "Not yet",
        competitor: "Free extension that bookmarks postings from major job boards into the tracker and can autofill application forms",
      },
    ],
    verdict:
      "Teal's free job tracker is the best in this category, and if your main problem is organizing dozens of applications, Teal is genuinely worth installing. The catch is where the analysis lives: the free plan shows only the top 5 keywords per job and a handful of one-time AI credits, so actually optimizing every application means Teal+, billed weekly or monthly. Resunova flips that: tracking is not its game, but the full match analysis, gap breakdown, and unlimited honest rewrites are free for every job you throw at it, scored against real posting data rather than raw keyword overlap. Many job seekers could sensibly use both: Teal to track, Resunova to tailor.",
    faq: [
      {
        question: "Is Teal really free?",
        answer:
          "The tracker is genuinely free and unlimited. The analysis is where the free plan thins out: 5 visible keywords per job, basic resume analysis, and one-time AI credits (a few bullets, 2 summaries, 2 cover letters). Full keywords, advanced analysis, and unlimited AI require Teal+ at $13/week, $29/30 days, or $79/90 days (as of July 2026). Resunova's full analysis and rewrites are free and unlimited.",
      },
      {
        question: "What's the main difference between Resunova and Teal?",
        answer:
          "Teal is a job-search workspace built around its tracker, with resume analysis as a gated add-on. Resunova is a resume optimizer built around scoring and honest tailoring, with everything free. If you want one tool to organize your search, Teal; if you want unlimited depth on every application, Resunova; plenty of people use both.",
      },
      {
        question: "How do the match scores differ?",
        answer:
          "Teal's Match Score measures keyword overlap between your resume and the job description, and independent reviews note it can surface filler or irrelevant keywords. Resunova scores against a model of what employers actually require, built from analysis of 100,000+ real US postings, and its rewriter only takes credit for requirements your experience genuinely covers.",
      },
      {
        question: "Does Resunova have a job tracker like Teal?",
        answer:
          "Not yet. Teal's tracker (stages, notes, contacts, follow-up templates, Chrome extension bookmarking) is its strongest feature and is free without limits. Resunova's focus is the other half of the problem: knowing which jobs are worth your time (disclosed salary, H-1B sponsorship, match score) and tailoring for them.",
      },
    ],
    footnotes: [
      "Compiled from Teal's public pages (tealhq.com pricing, job tracker, and help center articles on the Job Matcher, Resume Analyzer, exports, and job search) and multiple independent reviews as of July 2026, then independently fact-checked. Teal+ pricing confirmed from Teal's own pricing page and help center; Teal's pages showed minor internal inconsistencies on free bullet-credit counts, so this page states the conservative range. Feature sets change; verify current details on tealhq.com. Corrections welcome at contact@resunova.io.",
    ],
  },
];

export function comparisonHref(slug: string): string {
  return `/compare/${slug}`;
}

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
