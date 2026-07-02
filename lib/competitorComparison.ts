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
];

export function comparisonHref(slug: string): string {
  return `/compare/${slug}`;
}

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
