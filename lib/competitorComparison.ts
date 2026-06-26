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
      "Resunova and Kickresume both build resumes, score them against ATS rules, and tailor them to a job description. The core difference is the paywall: Resunova is completely free — including the full ATS report, AI rewrites, and a formatted PDF download — while Kickresume gates those behind a paid Premium plan.",
    rows: [
      {
        feature: "Price",
        resunova: "Completely free — no paid tier",
        competitor: "Freemium — a free plan plus a paid Premium subscription for full features",
      },
      {
        feature: "ATS resume score",
        resunova: "Free — full score across 7 dimensions, with the weakest bullets flagged and a rewrite for each",
        competitor: "Free score shows an overall + 3 category scores; the full detailed ATS report requires Premium",
      },
      {
        feature: "Tailor to a job description",
        resunova: "Free — match score, gap analysis, and keyword fixes against any pasted JD",
        competitor: "Yes — AI rewrites your resume to the JD, but it's a Premium feature (free has limited AI credits)",
      },
      {
        feature: "Download a formatted PDF",
        resunova: "Free — a clean, ATS-friendly PDF, no watermark",
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
        competitor: "Premium — the free plan includes only limited AI credits",
      },
      {
        feature: "Cover letter builder",
        resunova: "Not yet — Resunova focuses on the resume",
        competitor: "Yes — AI cover letters with matching templates (Premium AI)",
      },
      {
        feature: "Sign-up to start",
        resunova: "Not required for the template builder",
        competitor: "A free account is required to build and download",
      },
      {
        feature: "Student offer",
        resunova: "Free for everyone — built for students and the job-seeking community",
        competitor: "Roughly 6 months of free Premium for verified students and teachers",
      },
    ],
    verdict:
      "Kickresume is a polished, broad product — 40+ templates, an AI writing suite, cover letters, a website builder — and if you want that full toolkit and are willing to pay for Premium, it's a strong choice. Resunova makes a narrower bet: the things that actually move you past an ATS — an honest score, job-description tailoring, and a clean ATS-friendly PDF — are free, with no download paywall, aimed at students and early-career job seekers. If \"free, no catch\" matters most to you, Resunova wins; if you want the widest premium feature set and will subscribe, Kickresume earns its price.",
    faq: [
      {
        question: "Is Resunova really free?",
        answer:
          "Yes — completely free, including the full ATS score, job-description tailoring, AI rewrites, and a formatted PDF download. There is no paid tier and no credit card. It's built for students and the job-seeking community.",
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
          "You can build one for free, but multiple reviews report that a fully-formatted PDF effectively requires Premium — the free tier's downloads are format-restricted. (As of June 2026; verify on kickresume.com.) Resunova's formatted PDF download is free with no watermark.",
      },
    ],
    footnotes: [
      "Compiled from Kickresume's public pages and reputable third-party reviews as of June 2026, then independently fact-checked. Kickresume's exact pricing could not be confirmed via automated checks and is intentionally omitted; verify current details on kickresume.com. Feature sets change — corrections welcome at contact@resunova.io.",
    ],
  },
  {
    slug: "resunova-vs-teal",
    competitor: "Teal",
    competitorUrl: "https://www.tealhq.com",
    asOf: "June 2026",
    intro:
      "Resunova and Teal both score resumes, tailor them to a job description, and let you download for free. The difference is where the paywall sits: Teal caps free AI generations and gates its full numeric match score behind Teal+, while Resunova's full ATS score, job-description tailoring, and AI rewrites are all free.",
    rows: [
      {
        feature: "Price",
        resunova: "Completely free — no paid tier",
        competitor: "Freemium — a genuinely usable free tier plus a Teal+ subscription (billed weekly/monthly/quarterly, no annual plan)",
        caveat: true,
      },
      {
        feature: "ATS resume score",
        resunova: "Free — full score across 7 dimensions, with a rewrite for each weak bullet",
        competitor: "Free ATS resume checker returns a score; the full numeric job-match score requires Teal+",
      },
      {
        feature: "Tailor to a job description",
        resunova: "Free — match score, gap analysis, and keyword fixes against any JD",
        competitor: "Yes — Matching Mode surfaces missing keywords; the full numeric match score is gated behind Teal+",
        caveat: true,
      },
      {
        feature: "Download a formatted PDF",
        resunova: "Free — clean, ATS-friendly PDF, no watermark",
        competitor: "Free — unlimited PDF downloads, no export paywall (PDF is the export format)",
      },
      {
        feature: "Templates",
        resunova: "Free template builder, no sign-up required",
        competitor: "100+ free, customizable, ATS-friendly templates",
      },
      {
        feature: "AI bullet rewrites",
        resunova: "Free",
        competitor: "Limited free credits (reviews cite ~10 bullets / 2 summaries); unlimited requires Teal+",
        caveat: true,
      },
      {
        feature: "Cover letter builder",
        resunova: "Not yet — Resunova focuses on the resume",
        competitor: "Yes — AI cover-letter generator (free credits limited)",
      },
      {
        feature: "Sign-up to start",
        resunova: "Not required for the template builder",
        competitor: "A free account is required to build and download",
      },
      {
        feature: "Focus",
        resunova: "Resume scoring + job-description tailoring",
        competitor: "All-in-one job-search hub — resume builder plus job tracker and contacts CRM",
      },
    ],
    verdict:
      "Teal is a genuinely strong free product — unlimited resumes, free PDF downloads with no export paywall, 100+ templates, and a built-in job tracker — so if you want an all-in-one job-search hub, it's excellent. The dividing line is AI and the match score: Teal caps free AI generations and gates its full numeric match score behind Teal+, while Resunova gives you the full ATS score, job-description tailoring, and AI rewrites for free. Choose Teal for the all-in-one tracker; choose Resunova if you want unlimited free scoring and tailoring focused purely on the resume.",
    faq: [
      {
        question: "Is Teal free?",
        answer:
          "Teal has a genuinely usable free tier — unlimited resumes, free PDF downloads with no paywall, 100+ templates, a free ATS resume checker, and a job tracker. The limits are on AI (a small pool of free credits) and the full numeric match score, which requires Teal+.",
      },
      {
        question: "What's the difference between Resunova and Teal?",
        answer:
          "Both are free to use and download. Resunova's full ATS score, job-description tailoring, and AI rewrites are free; Teal caps free AI generations and gates its full numeric match score behind Teal+. Teal is also a broader job-search hub (tracker + CRM), while Resunova focuses on scoring and tailoring the resume.",
      },
      {
        question: "Does Teal charge to download a resume?",
        answer:
          "No — Teal allows unlimited free PDF downloads with no export paywall or watermark, which is one of its strengths. So does Resunova. (As of June 2026.)",
      },
    ],
    footnotes: [
      "Compiled from Teal's public pages and reputable third-party reviews as of June 2026, then independently fact-checked. Teal's pages returned HTTP 403 to automated checks, so AI-credit counts, the match-score gating, and Teal+ pricing cadence rely on review sourcing and may change; verify on tealhq.com. Corrections welcome at contact@resunova.io.",
    ],
  },
  {
    slug: "resunova-vs-zety",
    competitor: "Zety",
    competitorUrl: "https://zety.com",
    asOf: "June 2026",
    intro:
      "Resunova and Zety both build and check resumes, but the download is the dividing line: Zety's free plan only exports a plain-text (.txt) file — a formatted PDF or Word document requires a paid plan — while Resunova's formatted, ATS-friendly PDF is completely free.",
    rows: [
      {
        feature: "Price",
        resunova: "Completely free — no paid tier, no trial",
        competitor: "Paid — a low-cost trial that auto-renews into a recurring subscription, plus an annual plan",
        caveat: true,
      },
      {
        feature: "ATS resume score",
        resunova: "Free — full score across 7 dimensions, with a rewrite for each weak bullet",
        competitor: "ATS resume checker returns a score and flags issues; full use is gated behind a paid plan",
        caveat: true,
      },
      {
        feature: "Tailor to a job description",
        resunova: "Free — match score, gap analysis, and keyword fixes against any JD",
        competitor: "Partial — suggests keywords from a pasted job ad, but you apply the edits manually (no auto-rewrite)",
      },
      {
        feature: "Download a formatted PDF",
        resunova: "Free — clean, ATS-friendly PDF, no watermark",
        competitor: "Paid — the free tier exports plain-text (.txt) only; a formatted PDF or Word file requires a subscription",
      },
      {
        feature: "Templates",
        resunova: "Free template builder, no sign-up required",
        competitor: "Around 18 templates for corporate, tech, and creative roles",
        caveat: true,
      },
      {
        feature: "AI bullet rewrites",
        resunova: "Free",
        competitor: "Template/library-driven content suggestions rather than free-form AI rewriting",
      },
      {
        feature: "Cover letter builder",
        resunova: "Not yet — Resunova focuses on the resume",
        competitor: "Yes — matching cover-letter builder (same paywall for formatted downloads)",
      },
      {
        feature: "Sign-up to start",
        resunova: "Not required for the template builder",
        competitor: "An account is required to build and save",
      },
    ],
    verdict:
      "Zety is a polished, guided builder with strong pre-written content and a matching cover-letter tool — and if you're happy to subscribe, it produces clean resumes. The catch is the download: Zety's free tier only exports plain text, so getting a formatted PDF or Word file means paying, and its low-cost trial auto-renews into a recurring subscription. Resunova gives you the full ATS score, job-description tailoring, and a formatted ATS-friendly PDF for free — no trial, no auto-renew. If a free formatted download matters to you, Resunova is the clear pick.",
    faq: [
      {
        question: "Can I download a resume for free on Zety?",
        answer:
          "Only as a plain-text (.txt) file. Zety's free tier strips formatting on download — a formatted PDF or Word document requires a paid plan. Resunova's formatted, ATS-friendly PDF is free. (As of June 2026; verify on zety.com.)",
      },
      {
        question: "What's the difference between Resunova and Zety?",
        answer:
          "Price and downloads. Resunova is free, including a formatted PDF and full ATS score. Zety gates formatted downloads and full checker use behind a paid plan whose trial auto-renews into a subscription. Resunova also auto-tailors to a job description, where Zety mainly suggests keywords for you to add manually.",
      },
      {
        question: "Does Zety have a free trial?",
        answer:
          "Reviews report a low-cost short trial that auto-renews into a recurring subscription unless cancelled — so it isn't free in practice for a formatted resume. Resunova has no trial and no paid tier. (As of June 2026.)",
      },
    ],
    footnotes: [
      "Compiled from Zety's public pages and reputable third-party reviews as of June 2026, then independently fact-checked. Zety's pages returned HTTP 403 to automated checks and its pricing/promotions change frequently, so exact figures are omitted and the trial/template details rely on review sourcing; verify on zety.com. Corrections welcome at contact@resunova.io.",
    ],
  },
];

export function comparisonHref(slug: string): string {
  return `/compare/${slug}`;
}

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
