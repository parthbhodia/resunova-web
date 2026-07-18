import type { Metadata } from "next";
import Link from "next/link";
import BlogArticleLayout, {
  Section,
  List,
  ByLine,
  TableOfContents,
  Figure,
  Callout,
  CTACard,
} from "@/components/blog/BlogArticleLayout";
import {
  MatchScoreShot,
  GapAnalysisShot,
  KeywordMatchShot,
  BulletRewriteShot,
} from "@/components/blog/TailorVisuals";

const CANONICAL = "https://www.resunova.io/blog/tailor-resume-to-job-description/";
const TITLE = "How to Tailor Your Resume to a Job Description (Step-by-Step)";
const DESCRIPTION =
  "A step-by-step guide to matching your resume to any job posting — keyword extraction, bullet rewrites, and ATS checks. Score your resume against any JD free with Resunova.";

export const metadata: Metadata = {
  title: "How to Tailor Your Resume to a Job Description · Resunova Blog",
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "article",
    url: CANONICAL,
    siteName: "Resunova",
    title: TITLE,
    description: DESCRIPTION,
    publishedTime: "2026-06-10T00:00:00.000Z",
    modifiedTime: "2026-07-18T00:00:00.000Z",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const TOC = [
  { id: "why-tailoring-works", label: "Why tailoring works" },
  { id: "step-1-read", label: "Step 1 · Read like a recruiter" },
  { id: "step-2-title", label: "Step 2 · Mirror the job title" },
  { id: "step-3-keywords", label: "Step 3 · Weave in keywords" },
  { id: "step-4-bullets", label: "Step 4 · Rewrite your bullets" },
  { id: "step-5-quantify", label: "Step 5 · Quantify results" },
  { id: "step-6-reorder", label: "Step 6 · Reorder sections" },
  { id: "how-resunova-helps", label: "How Resunova helps" },
  { id: "what-not-to-do", label: "What not to do" },
  { id: "checklist", label: "Quick checklist" },
];

const CHECKLIST = [
  "Copy the exact job title into your resume headline or summary.",
  "Underline every repeated word in the posting — those are your must-have keywords.",
  "Match 25–35 role-specific terms from the JD, used naturally in bullet points.",
  "Rewrite your top 3–5 bullets to reflect the specific outcomes the role cares about.",
  "Add a number (%, $, ×, headcount) to every achievement bullet possible.",
  "Move your most relevant section to just below the summary.",
  "Run an ATS check — look for missing contact info, two-column layout, or table usage.",
  "Read it aloud: does it sound like you wrote it for this role, or for any role?",
];

const FAQ = [
  {
    q: "How long does it take to tailor a resume to a job description?",
    a: "A strategic edit of your summary and 4–6 bullets takes 15–20 minutes. You don't need to rewrite the whole resume — focus on the sections closest to what the role requires.",
  },
  {
    q: "How many keywords from the job description should I include?",
    a: "Aim for roughly 25–35 relevant, role-specific terms used naturally inside accomplishment bullets. Prioritise 'required' keywords over 'preferred' ones, and avoid keyword stuffing.",
  },
  {
    q: "What is a good resume match score?",
    a: "A well-tailored resume typically scores 75–90% against the specific job description. Below 60% usually means you're missing key technical terms or your bullets don't reflect the role's core responsibilities.",
  },
  {
    q: "Will changing my resume for every job get me flagged?",
    a: "No — tailoring is expected. What gets flagged is keyword stuffing (hidden white text, long skill lists) and misrepresenting job titles. Weave keywords into real, quantified achievements instead.",
  },
];

const HOW_TO_STEPS = [
  { name: "Read the job description like a recruiter", text: "Read the posting twice. Circle hard keywords (tools, credentials) and underline repeated role-framing words." },
  { name: "Mirror the exact job title", text: "Add the target title verbatim to your headline or summary — ATS keyword matching is largely literal." },
  { name: "Weave keywords into context", text: "Use 25–35 role-specific terms naturally inside accomplishment bullets rather than stuffing a skills list." },
  { name: "Rewrite your top bullets", text: "Sharpen your 3–5 most relevant bullets using action verb + specific scope + the outcome the posting cares about." },
  { name: "Quantify every achievement", text: "Add a number to every achievement bullet — percentages, dollars, headcount, speed, or scale." },
  { name: "Reorder sections for relevance", text: "Move whatever proves you're qualified into the top third of the page." },
];

function StructuredData() {
  const json = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: TITLE,
      description: DESCRIPTION,
      image: "https://www.resunova.io/blog/tailor-resume-to-job-description/opengraph-image.png",
      author: { "@type": "Organization", name: "Resunova", url: "https://www.resunova.io" },
      publisher: {
        "@type": "Organization",
        name: "Resunova",
        logo: { "@type": "ImageObject", url: "https://www.resunova.io/opengraph-image.png" },
      },
      datePublished: "2026-06-10",
      dateModified: "2026-07-18",
      mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Tailor Your Resume to a Job Description",
      description: DESCRIPTION,
      totalTime: "PT20M",
      step: HOW_TO_STEPS.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.name,
        text: s.text,
        url: `${CANONICAL}#step-${i + 1}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function TailorResumeToJobDescriptionPage() {
  return (
    <BlogArticleLayout
      title={TITLE}
      subtitle="Generic applications rarely land interviews — not because applicants are unqualified, but because their resume doesn't mirror what the recruiter is scanning for. Here's how to fix that, step by step."
      meta={<ByLine readMinutes={7} updated="July 2026" />}
      slug="tailor-resume-to-job-description"
    >
      <StructuredData />

      <TableOfContents items={TOC} />

      <Section title="Why tailoring works (and generic applications don't)" id="why-tailoring-works">
        <p style={{ margin: "0 0 14px" }}>
          When you send the same resume to 50 jobs, you&apos;re competing on luck, not relevance. Recruiters
          search their Applicant Tracking System (ATS) like a database — by keyword, title, and experience
          band. If your resume doesn&apos;t match what they type, you don&apos;t appear. You&apos;re not rejected;
          you&apos;re invisible.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          Tailoring solves two problems at once. It passes the machine filter, and it signals to the
          human reading your resume that you understood the role — not just applied to everything in
          the ballpark. A hiring manager can tell in 10 seconds whether a candidate actually read the
          posting or bulk-blasted a generic document.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          You don&apos;t need to rewrite your resume from scratch for every application. A strategic edit
          of 4–6 bullets and your summary takes 15–20 minutes and dramatically improves your match
          score — the single number that predicts whether you clear the filter.
        </p>
        <Figure caption="Resunova scores your resume against any job description and flags exactly what's missing — in under a minute.">
          <MatchScoreShot />
        </Figure>
      </Section>

      <Section title="Read the job description like a recruiter would" id="step-1-read" step={1}>
        <p style={{ margin: "0 0 14px" }}>
          Read the posting twice before you touch your resume. On the first pass, circle every technical
          skill, tool name, and certification mentioned (Python, Salesforce, Series B, GAAP, PMP).
          On the second pass, underline every soft-skill phrase and repeated word — if &quot;cross-functional
          collaboration&quot; appears three times, that phrase is load-bearing.
        </p>
        <p style={{ margin: "0 0 14px" }}>You&apos;re looking for two types of terms:</p>
        <List items={[
          { text: "Hard keywords — specific tools, technologies, methodologies, or credentials the role requires. These need to appear verbatim." },
          { text: "Role-framing words — how the company describes the work: strategy, operations, pipeline, stakeholder, roadmap. These tell you the register your bullets should match." },
          { text: "Required vs. preferred — “required” keywords must appear in your resume. “preferred” keywords improve your score but are lower priority." },
        ]} />
        <Callout kind="tip" title="Skip the manual counting">
          Instead of pasting the posting into a word-frequency tool, drop the job description into Resunova.
          It extracts the required keywords automatically and shows which ones are already in your resume and which are missing.
        </Callout>
        <Figure caption="Keyword match view: green terms are already in your resume; red terms are missing and worth adding.">
          <KeywordMatchShot />
        </Figure>
      </Section>

      <Section title="Mirror the exact job title" id="step-2-title" step={2}>
        <p style={{ margin: "0 0 14px" }}>
          This is the single highest-ROI edit you can make. ATS keyword matching is still largely
          literal — &quot;Senior Product Manager&quot; and &quot;Head of Product Strategy&quot; are different strings.
          If the posting says &quot;Senior Product Manager,&quot; those exact three words should appear in
          your headline, summary, or a recent job title.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          You don&apos;t have to change your actual title (which is a factual record). Instead, add a
          professional headline directly below your name: <em>&quot;Senior Product Manager — SaaS / B2B Growth&quot;</em>.
          That line is indexable text and can carry your target title without misrepresenting your history.
        </p>
      </Section>

      <Section title="Weave keywords into context — don't stuff them" id="step-3-keywords" step={3}>
        <p style={{ margin: "0 0 14px" }}>
          Keyword stuffing (hiding white text, listing 60 skills in a row) is detectable by modern
          ATS platforms and flagged by AI-assisted screening tools. You want roughly 25–35 relevant,
          role-specific terms from the posting, used naturally inside accomplishment bullets.
        </p>
        <p style={{ margin: "0 0 14px" }}>The best insertion point is an accomplishment bullet — it creates context:</p>
        <List items={[
          { text: "Weak: 'Proficient in SQL.' (keyword without context)" },
          { text: "Strong: 'Built SQL pipelines that reduced weekly reporting time by 6 hours across 3 teams.'" },
        ]} />
        <p style={{ margin: "14px 0 0" }}>
          The second version passes the same keyword check, proves competence, and is a better read
          for the human reviewer.
        </p>
      </Section>

      <Section title="Rewrite your top bullets for the role" id="step-4-bullets" step={4}>
        <p style={{ margin: "0 0 14px" }}>
          You don&apos;t need to rewrite everything — identify the 3–5 bullets in your most recent or
          most relevant role that are closest to what the job requires, then sharpen them.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          The formula: <strong>Action verb + specific scope + outcome the posting cares about.</strong>
        </p>
        <Figure caption="Resunova's bullet rewrite turns a vague responsibility into a quantified, keyword-rich achievement.">
          <BulletRewriteShot />
        </Figure>
        <p style={{ margin: "14px 0 0" }}>
          Notice the &quot;after&quot; version contains: a strong ownership verb (Redesigned), specific tools
          (Python, Airflow), a quantified outcome (4 hours → 15 minutes), and stakeholder scope
          (5 downstream ML teams). All four are common filters in engineering hiring.
        </p>
      </Section>

      <Section title="Quantify every achievement you can" id="step-5-quantify" step={5}>
        <p style={{ margin: "0 0 14px" }}>
          Numbers compress credibility. &quot;$2M ARR&quot; or &quot;40% churn reduction&quot; communicates scale
          instantly. Recruiters spending 10 seconds on a resume scan for numbers — they&apos;re the fastest
          signal that a candidate has moved the needle, not just held a title.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          If you don&apos;t know an exact figure, use a reasonable approximation and flag it:
          &quot;Reduced onboarding time by approximately 30%.&quot; Most hiring managers accept approximations;
          what they don&apos;t accept is a resume with zero numbers on a role that clearly had
          measurable outcomes.
        </p>
        <p style={{ margin: "0 0 14px" }}>Common quantification angles you might be missing:</p>
        <List items={[
          { text: "Team / headcount: 'Led a team of 8 engineers across 3 time zones.'" },
          { text: "Scale: 'System processed 2M events/day at peak load.'" },
          { text: "Speed: 'Reduced deployment cycle from 2 weeks to 2 days.'" },
          { text: "Revenue / cost: 'Identified $180K annual savings in vendor contracts.'" },
          { text: "Coverage: 'Rolled out new onboarding program to 200+ employees in Q3.'" },
        ]} />
      </Section>

      <Section title="Reorder sections to lead with your strongest relevance" id="step-6-reorder" step={6}>
        <p style={{ margin: "0 0 14px" }}>
          Most resumes default to: Contact → Summary → Experience → Education → Skills.
          That order works for linear career paths. For career changes, non-traditional backgrounds,
          or roles where your skills section is unusually strong, it can bury your best material.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          If you&apos;re applying to a role where your side projects are more relevant than your day job,
          surface Projects above later Experience entries. If the posting emphasizes credentials
          you have in your Education section, move it up. The rule is: whatever the recruiter most
          needs to see to say &quot;qualified&quot; should appear in the top third of the page.
        </p>
      </Section>

      <Section title="How Resunova helps you tailor in one pass" id="how-resunova-helps">
        <p style={{ margin: "0 0 14px" }}>
          The six steps above work by hand — but doing them for every application is slow, and it&apos;s
          hard to know when you&apos;ve done enough. Resunova runs the same analysis automatically. Paste a
          job description, upload your resume, and you get a match report in under a minute:
        </p>
        <List items={[
          { text: <><strong>Match score</strong> — one number (0–100) showing how well your resume fits this specific JD, colour-coded so you know instantly if you&apos;re interview-ready.</> },
          { text: <><strong>Keyword match</strong> — every required term from the posting, split into what&apos;s already in your resume and what&apos;s missing.</> },
          { text: <><strong>Gap analysis</strong> — each hiring criterion scored and weighted by how much the JD emphasises it, so you fix what matters most first.</> },
          { text: <><strong>One-click gap fixes &amp; bullet rewrites</strong> — draft, tailored bullets you can drop straight in, then re-score to watch the number climb.</> },
        ]} />
        <Figure caption="Gap analysis: each criterion is scored /10 and weighted by JD importance, with a one-click 'Fix this gap' for weak areas.">
          <GapAnalysisShot />
        </Figure>
        <Callout kind="tip" title="Aim for 75–90%">
          A well-tailored resume typically scores 75–90% against the specific JD. Fix the highest-weight
          red gaps first — they move your score the most.
        </Callout>
      </Section>

      <Section title="What not to do" id="what-not-to-do">
        <List items={[
          { text: "Don't use a two-column layout. Most ATS parsers read columns left-to-right, merging them into nonsense text." },
          { text: "Don't hide keywords in white text. Modern tools detect this and it's an instant disqualifier with some platforms." },
          { text: "Don't change your actual job titles. Misrepresenting your employment record is a background-check liability. Use a headline for your target title instead." },
          { text: "Don't pad with soft skills nobody asked for. 'Team player' and 'results-driven' add no signal — they use space where a keyword could live." },
          { text: "Don't over-optimize. A resume that reads like a keyword list won't survive the human review even if it passes the ATS." },
        ]} />
        <Callout kind="warn" title="The two-column trap">
          It&apos;s the most common reason a qualified candidate goes invisible. If your resume uses side-by-side
          columns, run it through an ATS check before you apply — the parser may be reading your skills
          section as one scrambled paragraph.
        </Callout>
      </Section>

      <Section title="How to know if your tailoring worked" id="checklist">
        <p style={{ margin: "0 0 14px" }}>
          The practical check: re-read the job posting, then read your resume summary. Do the same
          words come back? Could a recruiter read your resume and immediately know you&apos;ve done this
          specific type of work?
        </p>
        <p style={{ margin: "0 0 18px" }}>
          Automated tools close the loop. Running your tailored resume against the job description in
          Resunova shows which required keywords you&apos;re still missing and where your match score sits —
          so &quot;good enough&quot; becomes a number instead of a guess.
        </p>
        <div
          style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "18px 20px",
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 12px" }}>
            Quick checklist
          </p>
          <List items={CHECKLIST.map((text) => ({ text }))} />
        </div>
      </Section>

      <CTACard
        heading="See your match score in under a minute"
        body="Upload your resume, paste any job description, and Resunova shows your match score, missing keywords, and bullet-level fixes. Free — no signup required to start."
        href="/"
        cta="Score my resume free"
      />

      <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 28, lineHeight: 1.6 }}>
        Keep reading:{" "}
        <Link href="/blog/how-ats-really-works" style={{ color: "var(--accent)" }}>
          how ATS systems really work
        </Link>{" "}
        and{" "}
        <Link href="/blog/optimizing-resumes-for-ats" style={{ color: "var(--accent)" }}>
          ATS formatting best practices
        </Link>
        .
      </p>
    </BlogArticleLayout>
  );
}
