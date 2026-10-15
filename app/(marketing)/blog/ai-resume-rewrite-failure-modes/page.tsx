import Link from "next/link";
import BlogArticleLayout, {
  Section,
  List,
  TableOfContents,
  Callout,
  CTACard,
} from "@/components/blog/BlogArticleLayout";
import { blogPostCanonical, createBlogPostMetadata } from "@/lib/atsBlogPosts";

const CANONICAL = blogPostCanonical("ai-resume-rewrite-failure-modes");
const TITLE = "Five Things AI Gets Wrong When It Rewrites Your Resume";
const DESCRIPTION =
  "We built validators to catch what language models do to resume bullets: no-op rewrites, quantification claims with no number attached, dropped metrics, and gaps contradicted by the resume itself.";

export const metadata = createBlogPostMetadata("ai-resume-rewrite-failure-modes");

const TOC = [
  { id: "how-we-found-these", label: "How we found these" },
  { id: "failure-1", label: "1 · The rewrite that changes nothing" },
  { id: "failure-2", label: "2 · Quantified, with no number" },
  { id: "failure-3", label: "3 · The dropped metric" },
  { id: "failure-4", label: "4 · The gap you don't have" },
  { id: "failure-5", label: "5 · Advice about text that isn't there" },
  { id: "the-tell", label: "The formatting tell" },
  { id: "what-to-do", label: "What to do about it" },
  { id: "faq", label: "FAQ" },
];

const FAQ = [
  {
    q: "Does this mean AI is useless for resume writing?",
    a: "No. It is genuinely good at rephrasing, condensing, and spotting where a bullet is vague. The failures cluster in a specific place: claims about your history that the source text does not support. Use it for wording and structure, and verify anything factual yourself.",
  },
  {
    q: "Do these problems happen with every model?",
    a: "The patterns we describe here are not specific to one provider. Stronger reasoning models produce cleaner output and trip the validators less often, but none of them eliminated the checks. We still run every suggestion through the same filters.",
  },
  {
    q: "How can I check for these myself?",
    a: "Put the original and the rewrite side by side. Confirm every number survived, confirm a quantification claim actually added a digit, and confirm you can say in one sentence what got better. If you cannot, keep your original line.",
  },
  {
    q: "Why would a model list a gap the resume clearly fills?",
    a: "It is extracting requirements from the posting and checking them against the resume as two separate steps, and the check is imperfect. The giveaway is that its own explanation often describes where you meet the requirement, in the same paragraph that calls it missing.",
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

function Compare({
  before,
  after,
  verdict,
}: {
  before: string;
  after: string;
  verdict: string;
}) {
  const cell = {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    fontSize: "var(--fs-sm)",
    lineHeight: 1.6,
  } as const;
  return (
    <div style={{ margin: "16px 0" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={cell}>
          <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 6 }}>
            Original
          </div>
          {before}
        </div>
        <div style={cell}>
          <div style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 6 }}>
            What came back
          </div>
          {after}
        </div>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
        {verdict}
      </p>
    </div>
  );
}

export default function AiResumeRewriteFailureModesPage() {
  return (
    <BlogArticleLayout
      title={TITLE}
      subtitle="Every AI suggestion Resunova shows you has passed a set of automated checks. Those checks exist because of specific, repeated mistakes. Here is what they catch, and how to catch them yourself."
      slug="ai-resume-rewrite-failure-modes"
    >
      <StructuredData />

      <TableOfContents items={TOC} />

      <Section title="How we found these" id="how-we-found-these">
        <p style={{ margin: "0 0 14px" }}>
          Resunova uses language models to analyse resumes and propose rewrites. Early on we shipped
          that output more or less as the model produced it, and the complaints that came back were not
          about tone or style. They were about the tool saying things that were not true: flagging a
          bullet for lacking numbers when it had four, presenting a rewrite identical to the original,
          listing a qualification as missing directly above an explanation of where the candidate met it.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          So we built a validation layer that sits between the model and the user. Each check started as
          a specific observed failure. What follows is that list, because the same mistakes will show up
          in your own chat window, and none of them are hard to catch once you know the shape.
        </p>
        <Callout kind="tip" title="The general rule">
          These models are reliable at rephrasing and unreliable at claims. Anything about what you did,
          how much, or how well needs checking against your own memory and your own source document.
        </Callout>
      </Section>

      <Section title="The rewrite that changes nothing" id="failure-1" step={1}>
        <p style={{ margin: "0 0 14px" }}>
          The most common failure is not a bad rewrite. It is a rewrite that is not a rewrite at all,
          delivered with the same confidence as a real improvement.
        </p>
        <Compare
          before="Managed vendor relationships; negotiated contract renewals for 12 suppliers."
          after="Managed vendor relationships and negotiated contract renewals for 12 suppliers."
          verdict="A semicolon became 'and'. Presented as an improved bullet, with an explanation of why it is stronger."
        />
        <p style={{ margin: "0 0 14px" }}>
          This matters more than it looks. If you are working through fifteen suggestions and four of them
          are cosmetic, you spend your attention on noise and lose confidence in the eleven that are real.
          Our filter drops any rewrite that is byte-identical to the original after normalising whitespace,
          and any rewrite that overlaps the original above a word-similarity threshold.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Catch it yourself:</strong> ask what got better in one sentence. If you cannot answer,
          keep your version.
        </p>
      </Section>

      <Section title="Quantified, with no number attached" id="failure-2" step={2}>
        <p style={{ margin: "0 0 14px" }}>
          Models know that resume advice says &quot;add metrics&quot;. So they tag bullets as needing
          quantification, and describe their rewrites as more quantified, without ever adding a digit.
        </p>
        <Compare
          before="Supported the onboarding process for new engineering hires."
          after="Drove a streamlined onboarding process for new engineering hires, significantly improving ramp-up time."
          verdict="Labelled as adding quantification. 'Significantly' is not a quantity. The bullet contains exactly as many numbers as before, which is none."
        />
        <p style={{ margin: "0 0 14px" }}>
          There is a second-order problem here too: the rewrite also asserts an outcome (&quot;improving
          ramp-up time&quot;) that the original never claimed. That is invention dressed as editing.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          Our rule is mechanical. If a rewrite claims to fix quantification, it must contain a numeral the
          original did not have. If it does not, the label is stripped. Where the model genuinely cannot
          know the number, the honest output is a placeholder like <code>[X%]</code> for you to fill in,
          not a confident adverb.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Catch it yourself:</strong> search the rewrite for a digit. No digit, no quantification.
        </p>
      </Section>

      <Section title="The dropped metric" id="failure-3" step={3}>
        <p style={{ margin: "0 0 14px" }}>
          This is the expensive one, because the output reads better than the input. Fluency improves and
          evidence disappears.
        </p>
        <Compare
          before="Rebuilt the checkout flow in React, cutting cart abandonment 34% and adding $2.1M in annualised revenue across 40,000 monthly users."
          after="Rebuilt the checkout experience in React, delivering a substantial lift in conversion and revenue."
          verdict="Shorter, smoother, and strictly worse. Three specific figures and the user count are gone. This is the version a hiring manager cannot act on."
        />
        <p style={{ margin: "0 0 14px" }}>
          Numbers are the scarcest thing on a resume. Most candidates have very few, and the ones they
          have are what separate their bullet from an identical bullet written by someone who did less.
          Trading them for readability is close to always wrong.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          We reject any rewrite that loses a numeral from the original, without exception. Proper nouns
          get a softer rule, since a condensing rewrite can reasonably drop a descriptive aside, but
          numbers are absolute.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Catch it yourself:</strong> read the two versions side by side and count the figures.
          This is the single highest-value check on the list.
        </p>
      </Section>

      <Section title="The gap you don't actually have" id="failure-4" step={4}>
        <p style={{ margin: "0 0 14px" }}>
          When a model compares a job posting against your resume, it sometimes files a requirement as
          missing and then, in the same breath, explains where you meet it.
        </p>
        <div
          style={{
            margin: "16px 0",
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
            Missing: Master&apos;s degree or PhD in Computer Science or a related technical field
          </p>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--fs-sm)", lineHeight: 1.6 }}>
            &quot;You have a Master of Science in Computer Science from the University of Maryland,
            Baltimore County, which is a strong related technical field.&quot;
          </p>
        </div>
        <p style={{ margin: "0 0 14px" }}>
          That is a real example from our own product, reported by a user. The claim and its refutation
          shipped in the same card. Beyond looking foolish, it inflates the number of things you think
          you have to fix.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          We now check every claimed gap against its own explanation, and move the contradicted ones to
          the covered side. The rule is deliberately conservative: an affirmation followed by any hedge
          stays a gap, because <em>&quot;your degrees imply a strong foundation, but you have not explicitly
          quantified five years of experience&quot;</em> is a genuine partial gap, not a misfile.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Catch it yourself:</strong> read the reasoning under each gap, not just the headline.
          If the explanation describes where you meet the requirement, cross it off.
        </p>
      </Section>

      <Section title="Advice about text that isn't there" id="failure-5" step={5}>
        <p style={{ margin: "0 0 14px" }}>
          Resume feedback has a canon: remove personal pronouns, avoid buzzwords, cut the objective
          statement. Models reproduce that canon whether or not it applies to the document in front of them.
        </p>
        <p style={{ margin: "0 0 14px" }}>
          We repeatedly saw &quot;remove personal pronouns from this section&quot; returned for sections
          containing no pronouns at all, and &quot;avoid buzzwords&quot; aimed at words that are ordinary
          technical vocabulary in the candidate&apos;s field. That second one is worth dwelling on: a list
          of banned buzzwords that includes &quot;framework&quot;, &quot;scalable&quot;, or &quot;pipeline&quot;
          will flag a perfectly good engineering resume for using the words engineers use. We restrict our
          own buzzword list to phrases that carry no concrete meaning in any field, like &quot;team player&quot;
          and &quot;results-driven&quot;, and check pronoun advice against whether pronouns actually appear.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Catch it yourself:</strong> before acting on a piece of generic advice, confirm the
          problem exists in your document. Use ctrl-F.
        </p>
      </Section>

      <Section title="The formatting tell" id="the-tell">
        <p style={{ margin: "0 0 14px" }}>
          Separate from correctness, there is recognisability. The strongest single tell in AI-written
          resume copy is the em dash used to splice clauses together, a construction most people rarely
          type and models produce constantly.
        </p>
        <Compare
          before="Built data pipelines processing 4TB daily, including validation and alerting."
          after="Built data pipelines processing 4TB daily—including validation and alerting—with full observability."
          verdict="Factually fine. But recruiters have read a lot of this by now, and the punctuation alone reads as generated."
        />
        <p style={{ margin: "0 0 14px" }}>
          We now rewrite these automatically before a suggestion is shown, converting spliced em dashes to
          commas while leaving en dashes in date ranges alone. If you are working in a chat window, ask
          for the same thing explicitly, along with the vocabulary that clusters with it: leveraged,
          spearheaded, utilized, robust, seamless.
        </p>
      </Section>

      <Section title="What to do about it" id="what-to-do">
        <List items={[
          { text: "Work one bullet at a time. Whole-resume rewrites produce too many simultaneous changes to audit, and that is exactly when a metric goes missing." },
          { text: "Keep the original in front of you. Almost every failure above is invisible reading the output alone and obvious in a side-by-side." },
          { text: "Treat numbers as immutable. If a figure did not survive the rewrite, the rewrite is wrong, however well it reads." },
          { text: "Verify claims against your own memory, not the model's confidence. It has no access to your history beyond what you pasted." },
          { text: "Read the reasoning, not just the verdict. Contradictions are usually visible in the explanation attached to the finding." },
        ]} />
        <p style={{ margin: "14px 0 0" }}>
          If you want the prompts that reduce how often these come up in the first place, they are in{" "}
          <Link href="/blog/claude-resume-prompts/" style={{ color: "var(--accent)" }}>
            Claude Resume Prompts That Work
          </Link>
          . The short version: spend most of the prompt on constraints, and explicitly allow the model to
          answer &quot;no honest improvement&quot;.
        </p>
      </Section>

      <CTACard
        heading="Get suggestions that already passed these checks"
        body="Resunova runs every AI rewrite through the validators described in this post before it reaches you. Dropped metrics, no-op edits, and false quantification claims never make it to the screen."
        href="/?view=analyze"
        cta="Score my resume free"
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
          { text: <Link href="/blog/claude-resume-prompts/" style={{ color: "var(--accent)" }}>Claude resume prompts that work, and how to check what comes back</Link> },
          { text: <Link href="/blog/tailor-resume-to-job-description/" style={{ color: "var(--accent)" }}>How to tailor your resume to a job description</Link> },
          { text: <Link href="/blog/how-ats-really-works/" style={{ color: "var(--accent)" }}>How ATS really works, and why you are invisible rather than rejected</Link> },
        ]} />
      </Section>
    </BlogArticleLayout>
  );
}
