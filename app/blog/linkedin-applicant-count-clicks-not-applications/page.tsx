import Link from "next/link";
import BlogArticleLayout, { Section, TableOfContents, CTACard } from "@/components/blog/BlogArticleLayout";
import JsonLd from "@/components/seo/JsonLd";
import { createBlogPostMetadata } from "@/lib/atsBlogPosts";

export const metadata = createBlogPostMetadata("linkedin-applicant-count-clicks-not-applications");

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does the LinkedIn applicant count mean that many people actually applied?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not necessarily. It depends on the apply method. For LinkedIn's own Easy Apply, the application is submitted inside LinkedIn, so the count reflects real submissions. For postings that redirect you to a company's own careers site or ATS, LinkedIn's own Recruiter documentation states it does not keep a record of who applied and employers cannot see applicant numbers in Job Analytics for those roles. Recruiters who have tested the counter report that it increments when the Apply button is clicked, before the external application is ever completed, which means the visible number can include people who never submitted anything.",
      },
    },
    {
      "@type": "Question",
      name: "How many applicants actually meet a job posting's requirements?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Roughly half, based on employer-side survey data. Robert Half surveyed more than 300 HR managers in 2019 and found that on average 42% of the resumes they receive come from candidates who do not meet the role's stated requirements. Individual hiring managers in specialized fields report far steeper ratios, with only a handful of genuinely qualified applications per week out of dozens received.",
      },
    },
    {
      "@type": "Question",
      name: "Why do so many unqualified people apply to jobs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Volume-based applying. A 2026 Monster survey of 1,006 US job seekers found 48% frequently apply to many roles quickly rather than focusing their effort, and 25% now apply to any job that seems remotely possible. Auto-apply tools amplify this, which is why hiring managers report receiving obviously mismatched resumes, such as software engineering resumes submitted to nursing roles.",
      },
    },
    {
      "@type": "Question",
      name: "How specific are job requirements, really?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "More specific than most applicants assume. Across 164,913 active US job postings measured in the Resunova corpus, the median posting lists 13 concrete hard requirements (named skills, tools, certifications, licenses, degrees, or domain experience), and 76.4% list eight or more. In healthcare specifically, 81.3% of postings require at least one certification or license, which is a pass/fail gate rather than something a resume rewrite can bridge.",
      },
    },
  ],
};

// ── data ─────────────────────────────────────────────────────────────────────
// Requirement-density figures: queried live against the Resunova production
// jobs corpus on 2026-07-16 (active US postings with extracted requirement
// concepts). The funnel figures are illustrative, not measured: see the
// methodology section, which labels every borrowed and estimated number.

const REQ_DENSITY = [
  { label: "Lists 1 or more hard requirements", value: 100 },
  { label: "Lists 5 or more", value: 88.3 },
  { label: "Lists 8 or more", value: 76.4 },
];

const HEALTHCARE = {
  postings: "8,236",
  medianReqs: 10,
  certOrLicense: 81.3,
};

function BarRow({ label, value, max, color = "var(--accent)", bold = false }: {
  label: string; value: number; max: number; color?: string; bold?: boolean;
}) {
  const pct = Math.max(2, (100 * value) / max);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr 52px", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, color: "var(--text)", fontWeight: bold ? 700 : 500 }}>{label}</span>
      <div style={{ height: 10, borderRadius: 5, background: "var(--surface2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 5, background: color }} />
      </div>
      <span style={{ fontSize: 13, color: "var(--muted)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value}%
      </span>
    </div>
  );
}

function ChartCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <figure style={{ margin: "18px 0 6px", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: "18px 20px" }}>
      <figcaption style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>{title}</figcaption>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{children}</div>
      {note && <p style={{ fontSize: 12, color: "var(--dim)", margin: "12px 0 0", lineHeight: 1.5 }}>{note}</p>}
    </figure>
  );
}

function RequirementDensityChart() {
  return (
    <ChartCard
      title="How many concrete hard requirements a job posting actually lists"
      note="Share of 164,913 active US postings by number of extracted hard requirements: named technical skills, tools, certifications, licenses, degrees, domain knowledge, and required experience. Responsibility prose is excluded. Queried live against the Resunova jobs corpus on 2026-07-16. The median posting lists 13."
    >
      {REQ_DENSITY.map((row, i) => (
        <BarRow key={row.label} label={row.label} value={row.value} max={100} color={i === 2 ? "var(--accent)" : "var(--dim)"} bold={i === 2} />
      ))}
    </ChartCard>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function LinkedInApplicantCountPage() {
  return (
    <BlogArticleLayout
      slug="linkedin-applicant-count-clicks-not-applications"
      title="LinkedIn's Applicant Count Is Measuring Clicks, Not Applications"
      subtitle="When a posting sends you to a company's own site, LinkedIn has confirmed it keeps no record of who actually applied. So what is that number counting? And once you subtract the people who never submitted and the people who don't meet the requirements, how many real competitors are left? Here's the mechanism, the employer-side data, and what our own corpus of 164,913 postings says about why the qualified pile is always so small."
    >
      <JsonLd data={FAQ_JSONLD} />

      <p style={{ margin: "0 0 14px" }}>
        You find a job you actually want. You are qualified. Then you see it: <strong>127 applicants</strong>. You close
        the tab. Why bother.
      </p>

      <p style={{ margin: "0 0 14px" }}>
        That number is doing an enormous amount of damage, and it is not what most people think it is.
      </p>

      <TableOfContents
        items={[
          { id: "counting-clicks", label: "The badge counts clicks" },
          { id: "the-pile", label: "The pile from the other side" },
          { id: "thirteen-requirements", label: "13 requirements per posting" },
          { id: "healthcare", label: "Where the gate is a license" },
          { id: "not-competing", label: "Who isn't competing with you" },
          { id: "real-number", label: "The real number" },
          { id: "what-to-do", label: "What to do with this" },
          { id: "methodology", label: "Methodology" },
          { id: "faq", label: "FAQ" },
        ]}
      />

      <Section id="counting-clicks" title="The badge is counting clicks">
        <p style={{ margin: "0 0 12px" }}>
          There are two ways to apply to a job on LinkedIn, and they behave completely differently.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong>Easy Apply</strong> submits your application inside LinkedIn. LinkedIn knows exactly what happened,
          and the count is a real count.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong>The other kind</strong>{" "}
          sends you off to the company&apos;s own careers site or ATS. Here is what
          LinkedIn says about those, in its own Recruiter help documentation: when a posting directs applicants to an
          external site, &quot;LinkedIn doesn&apos;t keep a record of who applied for your jobs,&quot; and the employer
          cannot view applicant numbers in Job Analytics. LinkedIn is telling you plainly that once you leave, it has no
          idea what you did.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          So what is the number on the front of the posting counting? Recruiters who have tested it report the answer:
          the counter moves the moment the Apply button is clicked, before the external page has even loaded. One
          recruiter documented clicking Apply and watching the count tick up in real time, without ever filling in a
          thing. Which means, on those postings, the number is not applications. It is clicks.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          Worth being precise here, because this is the part people get wrong in both directions: LinkedIn has never
          published documentation describing the counter this way. The click-to-count behavior is established by
          recruiter testing and consistent industry reporting, not by an official spec. What LinkedIn <em>has</em>
          {" "}confirmed is the load-bearing half: for external-apply roles, it does not track completions. A number that
          cannot see completions cannot be a count of completions.
        </p>
      </Section>

      <Section id="the-pile" title="What the pile looks like from the other side of the desk">
        <p style={{ margin: "0 0 12px" }}>
          A hiring manager who recruits for specialized healthcare roles described their week publicly, and the numbers
          are worth sitting with. They receive roughly <strong>70 to 90 resumes a week</strong>. Of those, roughly
          {" "}<strong>three or four</strong> actually meet the requirements of the role. Not three or four that are
          excellent. Three or four that clear the bar at all.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          They also noted this is not new and not unique to healthcare. In earlier roles in tech manufacturing and
          fintech, it was routine to reject up to 60% of applications immediately for simply not meeting what the job
          description asked for.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          That lines up almost exactly with the only good employer-side survey on this. Robert Half asked more than 300
          HR managers what share of the resumes they receive come from candidates who do not meet the role&apos;s stated
          requirements. The answer: <strong>42%</strong>, on average. Roughly two out of every five resumes in the pile
          were never in the running.
        </p>
      </Section>

      <Section id="thirteen-requirements" title="The median job posting asks for 13 specific things">
        <p style={{ margin: "0 0 12px" }}>
          Here is where our own data comes in, because it explains why that 42% is so stubbornly high. We pull job
          postings directly from company ATS APIs and run one extraction pass per posting to pull out its concrete
          requirements: named skills, tools, certifications, licenses, degrees, domain knowledge, and required
          experience. Not the responsibility prose, the actual checkable requirements.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          Across <strong>164,913 active US postings</strong>, the median posting lists <strong>13</strong> of them.
          Over three quarters list eight or more.
        </p>
        <RequirementDensityChart />
        <p style={{ margin: "12px 0 12px" }}>
          Think about what that means as a filter. A posting asking for 13 specific things is not looking for someone
          who is generally competent and eager. Miss four or five of the 13 and you are not a near miss, you are a
          reject, and the person reading it does not have to think hard about it.
        </p>
      </Section>

      <Section id="healthcare" title="In healthcare, the gate is a license, and you either have it or you don't">
        <p style={{ margin: "0 0 12px" }}>
          The healthcare hiring manager&apos;s 3-or-4-out-of-90 ratio sounds extreme until you look at what healthcare
          postings actually require. Across <strong>{HEALTHCARE.postings} active US healthcare postings</strong> in our
          corpus (nursing, clinical, physician, therapy, pharmacy, imaging, and allied roles), the median posting lists
          {" "}{HEALTHCARE.medianReqs} hard requirements, and <strong>{HEALTHCARE.certOrLicense}% require at least one
          certification or license</strong>.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          That is a fundamentally different kind of filter from most tech postings. &quot;Five years of React&quot; is
          arguable. An RN license is not. You have it or you do not, and no amount of resume craft moves you across that
          line. When four out of five postings in a field are gated on a credential, a pile of 90 resumes collapses to a
          handful of real candidates very fast.
        </p>
      </Section>

      <Section id="not-competing" title="A lot of the pile isn't even trying to compete with you">
        <p style={{ margin: "0 0 12px" }}>
          The same hiring manager made an observation we found more interesting than the AI-written-resume panic
          everyone else is having. In healthcare, they said, they see very little they believe is AI-written. What they
          do see, every week, is a handful of applications that are obviously coming from auto-apply scripts:
          {" "}<strong>tech-focused resumes submitted to nursing roles</strong>.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          Nobody sat down and decided to apply for that job. A tool did it. And that application still counts as one of
          your 127.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          It is a broad pattern, not a fringe one. A 2026 Monster survey of 1,006 US job seekers found{" "}
          <strong>48% frequently apply to many roles quickly</strong>{" "}
          rather than focusing their effort, and 25% now
          apply to &quot;any job that seems remotely possible.&quot; Half the market is playing volume. When you look at
          an applicant count, you are looking at a number that half the market is inflating on purpose.
        </p>
      </Section>

      <Section id="real-number" title="So what is the real number?">
        <p style={{ margin: "0 0 12px" }}>
          The hiring manager ran the math themselves, and we want to be careful to present it as what it is: their
          estimate, from their own desk, not a measured statistic. Of 100 people LinkedIn counts as applicants, they
          would guess roughly 20% never actually submitted the application after clicking through. Of the ~80 who did,
          about half are not suitable anyway. That leaves roughly <strong>40 real competitors</strong> behind a badge
          that says 100. Their own words on that estimate: it might be too generous.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          We could not verify the 20% click-through drop-off, and we want to say so plainly rather than launder someone
          else&apos;s guess into a statistic. Nobody has published that figure, LinkedIn included. But notice that the
          conclusion does not actually depend on it. The 42% unqualified rate is employer-surveyed. The 48% volume-apply
          rate is surveyed. The requirement density is measured. Every independent line of evidence points the same
          direction: the badge is a wildly inflated proxy for the thing you are actually afraid of.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          And the posting count itself has the same disease. When we turned on six new job-board integrations in one
          day, <Link href="/blog/ghost-jobs-duplicate-postings/" style={{ color: "var(--accent)" }}>38% of the
          postings that came in were byte-identical duplicates of another posting</Link>, one company having reposted a
          single job description across roughly 800 locations. Inflated numbers are the water this whole industry swims
          in.
        </p>
      </Section>

      <Section id="what-to-do" title="What to actually do with this">
        <p style={{ margin: "0 0 12px" }}>
          The useful reframe is not &quot;the competition is fake, apply everywhere.&quot; That is the exact behavior
          filling those piles with noise, and it is why the hiring manager above spends their week rejecting people.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          It is this: <strong>a high applicant count is not evidence that you will lose.</strong> It is mostly evidence
          that a lot of people clicked. The pile is shallower than it looks, and it is shallow in a specific,
          exploitable way, because most of it is people who did not read the 13 requirements. If you are one of the
          handful who genuinely meets them and you can make that legible in six seconds of skimming, you are not
          competing with 127 people. You are competing with the few who bothered.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          So the move is the boring one. Read the requirements. Count how many of the 13 you actually have. If it is
          most of them, apply, and make each one impossible to miss on the page. If it is four, that is your answer, and
          your time is better spent on the posting where it is eleven.
        </p>
      </Section>

      <CTACard
        heading="Let the counting be automatic"
        body="Paste a job description and Resunova extracts its requirements the same way this analysis did, then shows which ones your resume already evidences and which ones it doesn't. Free, no account needed for the first scan."
        href="/"
        cta="Count my requirements free"
      />

      <Section id="methodology" title="Methodology and honest caveats">
        <p style={{ margin: "0 0 10px" }}>
          <strong>What we measured ourselves.</strong> The requirement-density figures (164,913 active US postings,
          median 13 hard requirements, 88.3% with five or more, 76.4% with eight or more) and the healthcare figures
          ({HEALTHCARE.postings} postings, median {HEALTHCARE.medianReqs}, {HEALTHCARE.certOrLicense}% requiring a
          certification or license) were queried live against the Resunova production jobs corpus on 2026-07-16.
          Healthcare postings are identified by title pattern matching, which is a rough cut: it will miss some roles
          and catch some administrative ones. &quot;Hard requirement&quot; means an extracted concept typed as a
          technical skill, tool, certification, license, degree, domain knowledge, or experience. Requirements are
          extracted by an LLM pass, so the count per posting is an approximation, not a hand-audited number.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>What LinkedIn confirms, and what it doesn&apos;t.</strong>{" "}
          LinkedIn&apos;s Recruiter help
          documentation confirms that for postings routing applicants to an external site, it keeps no record of who
          applied and employers cannot see applicant counts in Job Analytics. LinkedIn has <em>not</em> published
          documentation stating that the public applicant badge increments on click. That behavior is reported by
          recruiters who have tested it directly and is consistently described across recruiting industry write-ups. We
          treat it as well corroborated, not as official. Easy Apply postings are a separate case and are not affected
          by this.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>The hiring manager&apos;s numbers are one person&apos;s experience.</strong> The 70 to 90 resumes per
          week, the three or four qualified, the up-to-60% instant-reject rate from their earlier roles in tech
          manufacturing and fintech, and the 20% / 50% funnel estimate all come from a hiring manager describing their
          own desk publicly. We have paraphrased rather than reproduced their account, and we have not independently
          verified any of it. It is included because it is a concrete, first-hand illustration of a pattern the survey
          data supports, not as evidence in itself. The 20% click-through drop-off in particular is an estimate, and
          as far as we can tell no published data exists on it either way.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Borrowed figures.</strong> The 42% unqualified-resume figure is from a Robert Half survey of 300+ HR
          managers published 2019-03-19. The 48% volume-apply and 25% apply-to-anything figures are from a Monster
          survey of 1,006 US job seekers fielded 2026-03-21 and published 2026-04-10. Both are self-reported survey
          data with the usual limits. The Robert Half figure is also seven years old, and if anything we would expect
          auto-apply tooling to have pushed it up since.
        </p>
        <p style={{ margin: "10px 0 0" }}>
          <strong>The corpus.</strong> Where the postings come from and what they exclude:{" "}
          <Link href="/blog/methodology/" style={{ color: "var(--accent)" }}>
            how we measure
          </Link>
          .
        </p>
      </Section>

      <Section id="faq" title="FAQ">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {FAQ_JSONLD.mainEntity.map((f) => (
            <div key={f.name}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>{f.name}</h3>
              <p style={{ margin: 0 }}>{f.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: "20px 22px", marginTop: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>
          Find out how many of the 13 you actually have
        </p>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
          Resunova extracts the hard requirements out of any job description and scores your résumé against them, one by
          one, so you can see what you clear and what you are missing before you spend an hour on the application.
        </p>
        <Link href="/?view=analyze" style={{ display: "inline-block", background: "var(--accent)", color: "#fff", borderRadius: 9, padding: "9px 16px", fontSize: 14, fontWeight: 650, textDecoration: "none" }}>
          Check a job description
        </Link>
      </div>

      <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 24 }}>
        Questions about the methodology, or want the query behind a number here? Reach us via the{" "}
        <Link href="/contact" style={{ color: "var(--accent)" }}>contact page</Link>.
      </p>
    </BlogArticleLayout>
  );
}
