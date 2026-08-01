import Link from "next/link";
import BlogArticleLayout, {
  Section,
  List,
  TableOfContents,
  Callout,
  CTACard,
} from "@/components/blog/BlogArticleLayout";
import { blogPostCanonical, createBlogPostMetadata } from "@/lib/atsBlogPosts";

const CANONICAL = blogPostCanonical("claude-resume-prompts");
const TITLE = "Claude Resume Prompts That Work (And How to Check What Comes Back)";
const DESCRIPTION =
  "Nine copy-paste prompts for scoring, rewriting, and tailoring a resume with Claude, plus the four output checks that catch the mistakes these models reliably make.";

export const metadata = createBlogPostMetadata("claude-resume-prompts");

const TOC = [
  { id: "why-prompts-differ", label: "Why resume prompts are different" },
  { id: "before-you-start", label: "Before you paste anything" },
  { id: "prompt-1", label: "1 · Honest gap read" },
  { id: "prompt-2", label: "2 · Rewrite one bullet" },
  { id: "prompt-3", label: "3 · Find the missing metric" },
  { id: "prompt-4", label: "4 · Tailor to a posting" },
  { id: "prompt-5", label: "5 · Keyword audit" },
  { id: "prompt-6", label: "6 · Summary from evidence" },
  { id: "prompt-7", label: "7 · Cut the filler" },
  { id: "prompt-8", label: "8 · Interview defence" },
  { id: "prompt-9", label: "9 · Machine-tell sweep" },
  { id: "checking-output", label: "Checking what comes back" },
  { id: "faq", label: "FAQ" },
];

/**
 * Every prompt is written to constrain the model to the résumé's own evidence.
 * That constraint is the entire point of the post: the failure mode these
 * prompts guard against is invention, and a prompt that says "make it sound
 * impressive" invites exactly that.
 */
const PROMPTS: { id: string; step: number; title: string; why: string; prompt: string; watch: string }[] = [
  {
    id: "prompt-1",
    step: 1,
    title: "Get an honest gap read, not a compliment",
    why:
      "Asked plainly, most models open with praise. The instruction that changes the output is forbidding a positive opener and demanding evidence for every claim.",
    prompt: `You are a hiring manager for the role below, screening resumes for a first-round callback. You have 30 seconds per resume.

Do not open with praise and do not soften your assessment.

For each point you raise, quote the exact line from the resume you are reacting to. If you cannot quote a line, do not make the point.

Give me:
1. The three things that would make you pass on this candidate, hardest first.
2. For each, whether it is fixable by editing the resume or is a genuine experience gap.
3. One sentence: would you call this person back, yes or no, and why.

JOB POSTING:
"""
[paste the posting]
"""

RESUME:
"""
[paste your resume as plain text]
"""`,
    watch:
      "If it returns a gap you actually cover, ask it to quote the line that made it think so. Usually there isn't one.",
  },
  {
    id: "prompt-2",
    step: 2,
    title: "Rewrite a single bullet, with the numbers preserved",
    why:
      "Rewriting a whole resume in one pass is where numbers get dropped and scope quietly inflates. One bullet at a time is slower and much safer.",
    prompt: `Rewrite the resume bullet below.

Hard rules:
- Every number, percentage, dollar figure, and proper noun in the original must survive in the rewrite. You may not drop one.
- You may not add any number, tool, employer, or outcome that is not already in the original.
- If you cannot improve it without breaking either rule, say "no honest improvement" and stop.
- No em dashes.

Give me three versions: one that leads with the outcome, one that leads with the action, and one that is one line shorter than the original.

ORIGINAL BULLET:
"""
[paste one bullet]
"""

TARGET ROLE: [job title]`,
    watch:
      "Diff the numbers yourself. A rewrite that reads better but lost \"by 34%\" is a worse bullet.",
  },
  {
    id: "prompt-3",
    step: 3,
    title: "Find where a metric is missing, without inventing one",
    why:
      "The useful output here is a question aimed at you, not a number. A model that supplies the number has made it up.",
    prompt: `Read the resume below and find the bullets that describe real work but carry no measurable outcome.

For each one:
- Quote the bullet.
- Name the specific metric that would make it land (a percentage, a dollar amount, a count, a time saved, a headcount).
- Write the rewrite with a bracketed placeholder like [X%] or [$Y] where that number goes.

Do NOT guess or estimate the number. The placeholder must stay a placeholder. I will fill it in.

RESUME:
"""
[paste your resume]
"""`,
    watch:
      "If a concrete figure appears where you never supplied one, that is fabrication. Delete it and keep the placeholder.",
  },
  {
    id: "prompt-4",
    step: 4,
    title: "Tailor to a posting using only what you already have",
    why:
      "Tailoring should re-order and re-word what is true, not manufacture new experience. Saying so explicitly changes the output substantially.",
    prompt: `Tailor my resume to the posting below.

You may: reorder bullets, reorder sections, change wording to mirror the posting's vocabulary, and move emphasis between existing achievements.

You may not: add a skill I have not listed, add an employer, add a responsibility I did not describe, or change any date, title, or number.

For every change, output a row: what you changed | why the posting justifies it | the original text.

If the posting requires something my resume genuinely does not show, list it separately under GENUINE GAPS. Do not paper over it.

JOB POSTING:
"""
[paste the posting]
"""

RESUME:
"""
[paste your resume]
"""`,
    watch:
      "The GENUINE GAPS list is the valuable half of this output. A tailoring pass that returns an empty gap list is usually flattering you.",
  },
  {
    id: "prompt-5",
    step: 5,
    title: "Audit keywords by category, not as one long list",
    why:
      "A flat list of forty missing keywords is unusable. Split by whether the term is a hard requirement, and by whether you can honestly claim it.",
    prompt: `Extract the terms this posting screens for, then check them against my resume.

Return four groups:
- COVERED: the term appears in my resume. Quote where.
- MISSING AND REQUIRED: the posting lists it as required, and my resume does not show it.
- MISSING AND PREFERRED: nice-to-have, absent from my resume.
- CONTEXT ONLY: words about the company's business or domain rather than a skill I could claim. Explain why each one is in this group.

Do not tell me to add a term to my resume if my experience does not support it. Say so instead.

JOB POSTING:
"""
[paste the posting]
"""

RESUME:
"""
[paste your resume]
"""`,
    watch:
      "That last group matters. \"Fintech\" or \"healthcare\" is a domain, not a skill, and stuffing it into a bullet reads as padding to a human.",
  },
  {
    id: "prompt-6",
    step: 6,
    title: "Write the summary from evidence lower down the page",
    why:
      "Professional summaries are where invention concentrates, because there is no bullet underneath holding them to account.",
    prompt: `Write a three-sentence professional summary for the top of my resume.

Constraints:
- Every claim must be traceable to a specific bullet further down the resume. After each sentence, cite the bullet it came from.
- Use no adjective you cannot support: no "passionate", "results-driven", "seasoned", "proven track record".
- Years of experience must be calculated from the dates on the resume, not estimated.
- Target role: [job title]

RESUME:
"""
[paste your resume]
"""`,
    watch:
      "Check the year count against your own dates. Rounding up by a year is the single most common quiet exaggeration.",
  },
  {
    id: "prompt-7",
    step: 7,
    title: "Cut filler without cutting substance",
    why:
      "Length edits are safer to delegate than content edits, as long as you protect the specifics explicitly.",
    prompt: `My resume needs to lose about [N] lines to fit on [one/two] pages.

Propose the cuts. For each one, show the text you would remove and rate it: FILLER (no information lost), WEAK (some signal lost), or RISKY (real evidence lost).

Never propose cutting a line that contains a number, a tool name, or an employer.

Rank the cuts so I can take them from the top until I hit my target.

RESUME:
"""
[paste your resume]
"""`,
    watch:
      "Take the FILLER cuts without much thought. Read every RISKY one yourself before accepting it.",
  },
  {
    id: "prompt-8",
    step: 8,
    title: "Pressure-test every claim before an interview",
    why:
      "Anything on your resume you cannot expand on for sixty seconds is a liability, and this is the cheapest way to find those lines.",
    prompt: `For each bullet on my resume, write the follow-up question a skeptical interviewer would ask to test whether I actually did it.

Then flag any bullet where the question would be hard to answer without more detail than the bullet contains: those are the lines I am at risk on.

Do not write my answers. I need to know which claims I have to be ready to defend.

RESUME:
"""
[paste your resume]
"""`,
    watch:
      "If a line survives this and you still cannot answer it, the fix is usually to cut the line rather than rehearse it.",
  },
  {
    id: "prompt-9",
    step: 9,
    title: "Strip the tells that make writing read as machine-generated",
    why:
      "Recruiters have read a great deal of AI-written copy by now. A few patterns stand out immediately, and em dashes splicing clauses are the loudest.",
    prompt: `Rewrite the text below so it does not read as AI-generated, without changing any fact.

Specifically:
- Remove em dashes used to splice clauses together. Use a comma, a full stop, or restructure.
- Remove "leveraged", "spearheaded", "utilized", "robust", "seamless", "cutting-edge", "passionate about".
- Break up any sentence that lists three parallel items with the same grammatical shape.
- Vary the sentence lengths. Uniform sentence length is itself a tell.

Do not add, remove, or alter any number, name, date, or claim.

TEXT:
"""
[paste the section]
"""`,
    watch:
      "Read it aloud afterwards. If it sounds like you talking about your work, it will read that way to a recruiter too.",
  },
];

const CHECKS = [
  {
    text: (
      <>
        <strong>Diff the numbers.</strong> Put the original and the rewrite side by side and confirm every
        figure survived. Dropping &quot;reduced load time by 40%&quot; to gain smoother phrasing is a downgrade
        no matter how much better the sentence reads.
      </>
    ),
  },
  {
    text: (
      <>
        <strong>Check that a quantification claim came with a number.</strong> If the model says it made a
        bullet more quantified, the rewrite must contain a digit the original did not have. Frequently
        it does not.
      </>
    ),
  },
  {
    text: (
      <>
        <strong>Reject rewrites that changed nothing.</strong> Swapping a semicolon for &quot;and&quot; is presented
        with the same confidence as a real improvement. If you cannot say what got better, keep the original.
      </>
    ),
  },
  {
    text: (
      <>
        <strong>Verify every gap against your own resume.</strong> Models will list a requirement as missing
        and then, a paragraph later, describe where you meet it. Read the reasoning, not just the verdict.
      </>
    ),
  },
];

const FAQ = [
  {
    q: "Is it safe to paste my whole resume into an AI chatbot?",
    a: "Your resume contains your full name, contact details, employers, and education history. Check the provider's data-retention and training settings before pasting, and consider redacting your address and phone number, which the model does not need in order to help with the writing.",
  },
  {
    q: "Will a recruiter be able to tell my resume was written with AI?",
    a: "Often, yes, when the output ships unedited. The recognisable patterns are em dashes splicing clauses, uniformly long sentences, and vocabulary like 'leveraged' and 'spearheaded'. Editing for your own voice matters more than the prompt you started from.",
  },
  {
    q: "Why do these prompts keep saying 'do not invent'?",
    a: "Because without that instruction, models fill gaps rather than report them. Asked to make a bullet stronger, a model will often supply a plausible percentage. On a resume that is a claim you may have to defend in an interview.",
  },
  {
    q: "Should I rewrite my whole resume in one prompt?",
    a: "No. Whole-document rewrites are where numbers get dropped and scope inflates, and the changes are hard to audit because there are too many at once. One bullet or one section per prompt is slower and considerably safer.",
  },
  {
    q: "Do these prompts work with other AI models?",
    a: "Yes. Nothing here is Claude-specific, and the constraint-first structure works across models. Running the same prompt in two and comparing the output is a reasonable way to spot where one of them invented something.",
  },
];

function StructuredData() {
  const json = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: TITLE,
      description: DESCRIPTION,
      url: CANONICAL,
      mainEntityOfPage: CANONICAL,
      datePublished: "2026-08-01",
      dateModified: "2026-08-01",
      author: { "@type": "Organization", name: "Resunova" },
      publisher: { "@type": "Organization", name: "Resunova" },
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

function PromptBlock({ text }: { text: string }) {
  return (
    <pre
      style={{
        margin: "14px 0 10px",
        padding: "16px 18px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "var(--fs-sm)",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        overflowX: "auto",
      }}
    >
      {text}
    </pre>
  );
}

export default function ClaudeResumePromptsPage() {
  return (
    <BlogArticleLayout
      title={TITLE}
      subtitle="Most prompt lists optimise for output that sounds impressive. These are written to constrain the model to what your resume can actually support, because the failure mode that costs you interviews is invention, not weak phrasing."
      slug="claude-resume-prompts"
    >
      <StructuredData />

      <TableOfContents items={TOC} />

      <Section title="Why resume prompts are different from other prompts" id="why-prompts-differ">
        <p style={{ margin: "0 0 14px" }}>
          Ask a model to improve a paragraph of marketing copy and the worst case is that it reads
          badly. Ask it to improve a resume bullet and the worst case is that it writes something you
          cannot defend in an interview.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          That difference should shape the prompt. A resume is a factual document about your own
          history, and the model has no access to that history beyond what you paste in. Anything it
          adds beyond your text is, by construction, invented. So the prompts below spend most of their
          words on constraints: what may not change, what may not be added, and what to do when there is
          no honest improvement available.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          They are also deliberately narrow. One bullet, one section, one question at a time. Whole-resume
          rewrites produce too many simultaneous changes to audit, which is exactly when a dropped metric
          slips through.
        </p>
      </Section>

      <Section title="Before you paste anything" id="before-you-start">
        <List items={[
          { text: "Convert your resume to plain text first. Pasting from a PDF often scrambles multi-column layouts, and the model will then reason about a garbled version of your history." },
          { text: "Consider redacting your street address and phone number. Neither improves the writing advice." },
          { text: "Check the provider's data-retention and training settings if your resume includes anything you would rather not have stored." },
          { text: "Keep the original. You need something to diff the rewrite against, and you will want to revert some of the changes." },
        ]} />
      </Section>

      {PROMPTS.map((p) => (
        <Section key={p.id} title={p.title} id={p.id} step={p.step}>
          <p style={{ margin: "0 0 6px" }}>{p.why}</p>
          <PromptBlock text={p.prompt} />
          <Callout kind="warn" title="What to check in the output">
            {p.watch}
          </Callout>
        </Section>
      ))}

      <Section title="Checking what comes back" id="checking-output">
        <p style={{ margin: "0 0 14px" }}>
          The prompt is half the work. The other half is not accepting the output on trust, and the
          mistakes worth checking for are consistent enough to make a short list.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          We know they are consistent because we built automated checks for them. Resunova runs every
          AI-generated rewrite through validators before it reaches you: one rejects a rewrite that drops
          a numeral or a proper noun from the original, another strips a &quot;more quantified&quot; label from
          any rewrite that added no digit, another discards rewrites that are effectively identical to
          the line they replaced, and another drops claimed gaps that the resume plainly contradicts.
          Each of those exists because the underlying mistake kept happening.
        </p>
        <List items={CHECKS} />
        <Callout kind="tip" title="Do this part in a diff view">
          Reading a rewrite on its own, it is very hard to notice what is absent. Side by side with the
          original, a dropped percentage is obvious in about a second.
        </Callout>
        <p style={{ margin: "14px 0 0" }}>
          We wrote up the specific failure patterns, with examples, in{" "}
          <Link href="/blog/ai-resume-rewrite-failure-modes/" style={{ color: "var(--accent)" }}>
            Five Things AI Gets Wrong When It Rewrites Your Resume
          </Link>
          .
        </p>
      </Section>

      <CTACard
        heading="Skip the copy-paste loop"
        body="Resunova runs the scoring, gap analysis, and bullet rewrites against a live corpus of job postings, and every suggestion passes the same validators described above before you see it. Free to try, no signup for your first scan."
        href="/?view=analyze"
        cta="Score my resume"
      />

      <Section title="Frequently asked questions" id="faq">
        {FAQ.map((f) => (
          <div key={f.q} style={{ margin: "0 0 18px" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{f.q}</p>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>{f.a}</p>
          </div>
        ))}
      </Section>

      <Section title="Related reading" id="related">
        <List items={[
          { text: <Link href="/blog/tailor-resume-to-job-description/" style={{ color: "var(--accent)" }}>How to tailor your resume to a job description</Link> },
          { text: <Link href="/blog/how-ats-really-works/" style={{ color: "var(--accent)" }}>How ATS really works, and why you are invisible rather than rejected</Link> },
          { text: <Link href="/blog/ai-resume-rewrite-failure-modes/" style={{ color: "var(--accent)" }}>Five things AI gets wrong when it rewrites your resume</Link> },
        ]} />
      </Section>
    </BlogArticleLayout>
  );
}
