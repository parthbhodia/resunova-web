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
      "Resunova and Kickresume both build resumes, score them against ATS rules, and tailor them to a job description. The core difference is what you get free: Resunova's free tier includes the full ATS report, AI rewrites, and a formatted PDF download (Pro adds higher limits), while Kickresume gates those behind a paid Premium plan.",
    rows: [
      {
        feature: "Price",
        resunova: "Free to start; optional Pro at $19/month or $39/quarter unlocks higher usage limits",
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
        resunova: "Free: AI drafts from your resume + the job description, with matching templates",
        competitor: "Yes, AI cover letters with matching templates (Premium AI)",
      },
      {
        feature: "Sign-up to start",
        resunova: "Not required for the template builder",
        competitor: "A free account is required to build and download",
      },
      {
        feature: "Student offer",
        resunova: "Free tier for everyone, built for students and the job-seeking community",
        competitor: "Roughly 6 months of free Premium for verified students and teachers",
      },
    ],
    verdict:
      "Kickresume is a polished, broad product (40+ templates, an AI writing suite, cover letters, a website builder), and if you want that full toolkit and are willing to pay for Premium, it's a strong choice. Resunova makes a narrower bet: the things that actually move you past an ATS (an honest score, job-description tailoring, and a clean ATS-friendly PDF) start free, with no download paywall, aimed at students and early-career job seekers. If starting free with the essentials matters most to you, Resunova wins; if you want the widest premium feature set and will subscribe, Kickresume earns its price.",
    faq: [
      {
        question: "Is Resunova really free?",
        answer:
          "You can start free, no credit card: the full ATS score, job-description tailoring, AI rewrites, and a formatted PDF download are all in the free tier. An optional Pro plan unlocks higher usage limits. It's built for students and the job-seeking community.",
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
        resunova: "Free to start; optional Pro at $19/month or $39/quarter unlocks higher usage limits",
        competitor: "Free plan limited to 5 scans per month; Premium is $49.95/month or $89.95 per quarter, with a 7-day trial",
      },
      {
        feature: "Scan limits",
        resunova: "Free scans every day against any job description; Pro raises the limits",
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
      "Jobscan is the category veteran and its match report is genuinely thorough: 30+ checks, ATS-specific tips, and a LinkedIn optimizer nothing else here offers. If you scan more than five jobs a month, though, you are on the $49.95/month plan, and independent reviews consistently note the same trap: chasing the match-rate percentage rewards keyword stuffing, which recruiters see through. Resunova's bet is different: the scan, the tailoring, and the rewrites start free, and the scoring model is deliberately built so the way to raise your score is to be genuinely qualified and say so clearly, not to paste the job description back at itself. If you want the deepest report and LinkedIn coverage and will pay for it, Jobscan is strong. If you want honest tailoring at a fraction of the price, Resunova wins.",
    faq: [
      {
        question: "Is Jobscan free?",
        answer:
          "Partly. The free plan includes 5 scans per month (unused scans roll over, capped at 5) and the resume builder with PDF downloads. The full match report, Power Edit rewrites, and unlimited scans require Premium at $49.95/month or $89.95 per quarter (as of July 2026). Resunova's scan, tailoring, and rewrites start free, with Pro at $19/month for higher limits.",
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
          "Free daily scans and rewrites, a free cover letter builder that drafts from your resume, and a job feed built on Resunova's own posting corpus with disclosed salary and H-1B sponsor data. Jobscan counters with a LinkedIn optimizer, which Resunova doesn't have yet.",
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
      "Teal is a job-search workspace: an excellent free job tracker, a resume builder, and an AI toolkit, with the analysis depth gated behind Teal+. Resunova is narrower and free to start: resume scoring and honest tailoring against real posting data, with an optional Pro plan for higher limits. Which fits depends on whether you want an organizer or an optimizer.",
    rows: [
      {
        feature: "Price",
        resunova: "Free to start; optional Pro at $19/month or $39/quarter unlocks higher usage limits",
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
        resunova: "Free: the full gap analysis for any job description, with daily free scans",
        competitor: "Free plan shows only the top 5 keywords per job; the full keyword list requires Teal+",
      },
      {
        feature: "AI bullet rewrites",
        resunova: "Free: honest rewrites that only claim credit when a requirement is genuinely covered",
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
      "Teal's free job tracker is the best in this category, and if your main problem is organizing dozens of applications, Teal is genuinely worth installing. The catch is where the analysis lives: the free plan shows only the top 5 keywords per job and a handful of one-time AI credits, so actually optimizing every application means Teal+, billed weekly or monthly. Resunova flips that: tracking is not its game, but the full match analysis, gap breakdown, and honest rewrites are free to use for the jobs you throw at it, scored against real posting data rather than raw keyword overlap. Many job seekers could sensibly use both: Teal to track, Resunova to tailor.",
    faq: [
      {
        question: "Is Teal really free?",
        answer:
          "The tracker is genuinely free and unlimited. The analysis is where the free plan thins out: 5 visible keywords per job, basic resume analysis, and one-time AI credits (a few bullets, 2 summaries, 2 cover letters). Full keywords, advanced analysis, and unlimited AI require Teal+ at $13/week, $29/30 days, or $79/90 days (as of July 2026). Resunova's full analysis and rewrites start free, with Pro at $19/month for higher limits.",
      },
      {
        question: "What's the main difference between Resunova and Teal?",
        answer:
          "Teal is a job-search workspace built around its tracker, with resume analysis as a gated add-on. Resunova is a resume optimizer built around scoring and honest tailoring, free to start. If you want one tool to organize your search, Teal; if you want depth on every application, Resunova; plenty of people use both.",
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
  {
    slug: "resunova-vs-canva",
    competitor: "Canva",
    competitorUrl: "https://www.canva.com/resumes/templates/",
    asOf: "July 2026",
    intro:
      "Canva is a design tool with beautiful resume templates; Resunova is a resume tool built for getting past an ATS. The trade-off is real: Canva's visual layouts (columns, icons, graphics) are exactly what applicant tracking systems parse worst, while Resunova scores, tailors, and exports an ATS-safe PDF free.",
    rows: [
      {
        feature: "Price",
        resunova: "Free to start; optional Pro at $19/month or $39/quarter unlocks higher usage limits",
        competitor: "Free templates; many designs, photos, and elements require Canva Pro",
      },
      {
        feature: "Template style",
        resunova: "Clean, single-column, ATS-safe layouts (incl. creative presets that stay parseable)",
        competitor: "Thousands of visually striking designs: columns, icons, graphics, photos",
      },
      {
        feature: "ATS compatibility",
        resunova: "Built for it: real text, standard headings, single-column export, plus an ATS score that tells you how a parser reads your file",
        competitor: "Many popular Canva layouts use multi-column designs, graphics, and text effects that ATS parsers commonly scramble or drop",
        caveat: true,
      },
      {
        feature: "ATS resume score",
        resunova: "Free: full score across 7 dimensions with the weakest bullets flagged and rewritten",
        competitor: "None — Canva doesn't analyze or score resume content",
      },
      {
        feature: "Tailor to a job description",
        resunova: "Free: paste a JD, get a match score, gap analysis, and keyword fixes",
        competitor: "None — you edit the design; matching a job's requirements is entirely manual",
      },
      {
        feature: "AI writing help",
        resunova: "Free AI rewrites for weak bullets, grounded in your real experience",
        competitor: "Magic Write can draft generic text (Pro feature, credit-limited), but it isn't resume-analysis aware",
      },
      {
        feature: "Cover letter",
        resunova: "Free cover letter builder: AI drafts from your resume + the JD, with matching templates",
        competitor: "Cover letter design templates; the writing is up to you",
      },
      {
        feature: "Best for",
        resunova: "Applying through job portals and company career sites, where an ATS reads your file first",
        competitor: "Design-forward fields (graphic design, some creative roles) where a human sees the file directly, and print/portfolio use",
      },
    ],
    verdict:
      "Use the right tool for the audience reading your resume. If a human designer or art director will look at your file directly, Canva's visual templates can genuinely help you stand out. But most applications today go through an applicant tracking system first — and the decorative layouts that make Canva resumes beautiful (columns, icons, graphics, stylized text) are precisely what parsers misread. Resunova optimizes for that reality: an honest ATS score, tailoring against the actual job description, and a clean parseable PDF, free. Many applicants use both: Canva for the portfolio, Resunova for the application.",
    faq: [
      {
        question: "Are Canva resumes ATS-friendly?",
        answer:
          "Some are, many aren't. Canva's simplest single-column text templates can parse fine, but the popular multi-column, icon-and-graphic designs are commonly scrambled by ATS parsers: skills baked into graphics get dropped, columns read out of order, and headers get missed. If you're applying through an ATS, test the file — Resunova's free checker shows exactly what a parser extracts.",
      },
      {
        question: "Can Canva check my resume against a job description?",
        answer:
          "No. Canva is a design tool: it makes the document look good but doesn't analyze content, score keywords, or compare your resume to a job posting. Resunova's free scan does all three and rewrites the weakest bullets.",
      },
      {
        question: "Should I use Canva or a resume builder?",
        answer:
          "If the application goes through a job portal or company career site, use an ATS-focused builder and keep the layout simple. If a human will view the file directly (design portfolios, some creative and hospitality roles), Canva's templates are a legitimate choice. When in doubt, submit the ATS-safe version.",
      },
      {
        question: "Is Canva's resume builder free?",
        answer:
          "Canva has genuinely free resume templates, though many designs and elements are gated behind Canva Pro. The bigger cost is invisible: a beautiful template that an ATS can't parse. Resunova's free tier includes the ATS score, tailoring, AI rewrites, and a formatted PDF download.",
      },
    ],
    footnotes: [
      "Compiled from Canva's public resume-template and Magic Write pages and widely-reported ATS parsing behavior for multi-column/graphic layouts, as of July 2026. Canva's exact Pro pricing varies by region and is omitted; verify on canva.com. ATS parsing varies by vendor — the safe test is what a parser actually extracts from your specific file. Feature sets change; corrections welcome at contact@resunova.io.",
    ],
  },
  {
    slug: "resunova-vs-google-docs",
    competitor: "Google Docs",
    competitorUrl: "https://docs.google.com",
    asOf: "July 2026",
    intro:
      "Google Docs is free and its resume templates are fine for a first draft — but it's a word processor, not a resume tool. It can't score your resume, match it to a job description, or tell you why recruiters skip it. Resunova starts free too, and does exactly those things.",
    rows: [
      {
        feature: "Price",
        resunova: "Free to start; optional Pro at $19/month or $39/quarter unlocks higher usage limits",
        competitor: "Free with a Google account",
      },
      {
        feature: "Templates",
        resunova: "Free template builder with ATS-safe layouts, no sign-up required",
        competitor: "A handful of built-in resume templates (Serif, Coral, Spearmint, Swiss, Modern Writer)",
      },
      {
        feature: "ATS resume score",
        resunova: "Free: full score across 7 dimensions, weakest bullets flagged with a rewrite for each",
        competitor: "None — Docs has no notion of resume quality",
      },
      {
        feature: "Tailor to a job description",
        resunova: "Free: match score, gap analysis, and keyword fixes against any pasted JD",
        competitor: "Manual — you re-read the posting and edit by hand each time",
      },
      {
        feature: "AI writing help",
        resunova: "Free AI rewrites grounded in your actual experience",
        competitor: "Gemini in Docs can draft text (plan-dependent), but it isn't resume-analysis aware",
      },
      {
        feature: "Formatting risk",
        resunova: "Exports a clean, parseable PDF: standard headings, single column, real text",
        competitor: "Easy to break parseability with tables, text boxes, columns, and headers/footers as you customize",
        caveat: true,
      },
      {
        feature: "Cover letter",
        resunova: "Free builder: AI drafts from your resume + the JD, matching templates, PDF/DOCX export",
        competitor: "Blank page or a generic template; the writing is up to you",
      },
      {
        feature: "Best for",
        resunova: "Actually optimizing the resume: scoring, tailoring, and passing ATS filters",
        competitor: "Quick free drafting, collaboration/comments, and simple documents",
      },
    ],
    verdict:
      "Google Docs is a fine place to draft a resume and an excellent place to collaborate on one — and it's genuinely free. But it stops at 'document editor': no score, no job-description matching, no keyword analysis, and it's easy to drift into tables and text boxes that ATS parsers mangle. Resunova's free tier picks up where Docs stops: it reads your resume like a parser does, scores it honestly, tailors it to the job you're actually applying for, and exports a clean PDF. Draft wherever you like — but check and tailor before you submit.",
    faq: [
      {
        question: "Are Google Docs resume templates ATS-friendly?",
        answer:
          "Mostly yes in their default form — they're simple, single-column, real-text layouts. The risk comes from customization: adding tables, text boxes, columns, or putting contact info in the header/footer region, all of which common parsers misread. A quick free scan shows what an ATS actually extracts from your file.",
      },
      {
        question: "Can Google Docs check my resume for ATS?",
        answer:
          "No. Docs has no resume scoring, keyword matching, or ATS analysis. Gemini can rewrite sentences if your plan includes it, but it doesn't know what an ATS looks for or what the job posting requires. Resunova's checker does both, free.",
      },
      {
        question: "Is a Google Docs resume good enough?",
        answer:
          "For the document itself, it can be. What Docs can't tell you is whether the content competes: whether your bullets carry numbers, whether the role's keywords are present, and how you score against the specific job description. That analysis is the difference between a resume that exists and one that ranks.",
      },
      {
        question: "Can I import my Google Docs resume into Resunova?",
        answer:
          "Yes — download it as a PDF from Docs and upload it to Resunova. You'll get the full free score and fix list, and you can tailor it to any job description from there.",
      },
    ],
    footnotes: [
      "Compiled from Google Docs' public template gallery and Google Workspace feature documentation as of July 2026. Gemini-in-Docs availability depends on the user's Google plan and rollout region. ATS parsing behavior varies by vendor. Feature sets change; corrections welcome at contact@resunova.io.",
    ],
  },
  {
    slug: "resunova-vs-chatgpt",
    competitor: "ChatGPT",
    competitorUrl: "https://chatgpt.com",
    asOf: "July 2026",
    intro:
      "ChatGPT can write resume bullets — with the right prompts, good ones. But it's a chat window: no formatted document, no ATS score, no guardrail against invented experience, and you re-prompt from scratch for every job. Resunova productizes that loop: score, tailor, rewrite, and export, grounded in your real resume, free.",
    rows: [
      {
        feature: "Price",
        resunova: "Free to start; optional Pro at $19/month or $39/quarter unlocks higher usage limits",
        competitor: "Free tier with usage limits; Plus subscription for more capacity",
      },
      {
        feature: "Output",
        resunova: "A formatted, ATS-safe resume PDF (and DOCX cover letter) you can submit directly",
        competitor: "Text in a chat window — formatting into a submittable document is on you",
      },
      {
        feature: "ATS resume score",
        resunova: "Free: a repeatable 7-dimension score with the weakest bullets flagged",
        competitor: "It can offer opinions if asked, but there's no consistent scoring rubric — ask twice, get two answers",
      },
      {
        feature: "Tailor to a job description",
        resunova: "Free: deterministic match score + gap analysis against the JD, then targeted rewrites",
        competitor: "Possible with careful prompting, but you rebuild the workflow (paste resume, paste JD, iterate) for every application",
      },
      {
        feature: "Fabrication risk",
        resunova: "Rewrites are validated against your original resume — numbers and facts you didn't write don't ship",
        competitor: "Known failure mode: confidently invents metrics, tools, and achievements unless you police every line",
        caveat: true,
      },
      {
        feature: "Keyword honesty",
        resunova: "Only suggests weaving in skills your experience actually supports",
        competitor: "Will happily stuff any keyword you ask for, supported or not",
      },
      {
        feature: "Cover letter",
        resunova: "Free builder: drafts from your resume + JD with matching templates, PDF/DOCX export",
        competitor: "Can draft solid text; formatting and fact-checking are manual",
      },
      {
        feature: "Best for",
        resunova: "The end-to-end application: score → tailor → export, consistently, per job",
        competitor: "Brainstorming, phrasing alternatives, interview prep conversations, one-off writing help",
      },
    ],
    verdict:
      "ChatGPT is genuinely useful in a job search — for brainstorming bullet phrasings, prepping interview answers, and unsticking a blank page. Its weakness is that it's a conversation, not a system: the output isn't a formatted document, the quality depends on your prompting, the 'score' changes every time you ask, and its best-known failure mode is confidently inventing achievements you never had. Resunova turns the same AI capability into a repeatable pipeline with guardrails — an honest score, JD tailoring, rewrites validated against what your resume actually says, and a submittable PDF — free. Use ChatGPT to think; use a resume tool to apply.",
    faq: [
      {
        question: "Can ChatGPT write my resume?",
        answer:
          "It can draft one, and with detailed prompts the text can be good. What it can't do is give you a formatted ATS-safe document, a consistent score, or a guarantee it didn't embellish — models are well documented to invent metrics and experience when asked to 'improve' a resume. Whatever it writes, verify every claim before submitting.",
      },
      {
        question: "Is ChatGPT good for tailoring a resume to a job description?",
        answer:
          "It's workable but manual: you paste your resume and the JD, prompt carefully, and repeat for every application. A purpose-built tool runs the same comparison deterministically — which requirements you match, which are missing, and which bullets to fix — and keeps the score consistent across runs so you can tell whether an edit actually helped.",
      },
      {
        question: "Do recruiters care if a resume was written with ChatGPT?",
        answer:
          "Recruiters care whether the resume is true, specific, and relevant. Obvious AI tells — generic buzzwords, invented-sounding metrics, uniform sentence rhythm — hurt you regardless of the tool. That's why Resunova validates rewrites against your original text and flags unsupported claims instead of inventing them.",
      },
      {
        question: "Is Resunova just ChatGPT with a wrapper?",
        answer:
          "No. The scoring and job-matching layers are deterministic (the same resume and JD produce the same score), the rewrite layer is AI with validators that block fabricated numbers and no-op edits, and the output is a formatted ATS-safe document. The AI drafts; the system keeps it honest and submittable.",
      },
    ],
    footnotes: [
      "Compiled from OpenAI's public ChatGPT pricing/feature pages and widely-documented LLM behavior around resume fabrication, as of July 2026. ChatGPT's exact tiers and limits change frequently; verify on chatgpt.com. Resunova's validation behavior is described from its own product documentation. Corrections welcome at contact@resunova.io.",
    ],
  },
];

export function comparisonHref(slug: string): string {
  return `/compare/${slug}`;
}

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
