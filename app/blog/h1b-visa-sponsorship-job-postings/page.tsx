import Link from "next/link";
import BlogArticleLayout, { Section, TableOfContents, CTACard } from "@/components/blog/BlogArticleLayout";
import JsonLd from "@/components/seo/JsonLd";
import { createBlogPostMetadata } from "@/lib/atsBlogPosts";

export const metadata = createBlogPostMetadata("h1b-visa-sponsorship-job-postings");

// ── data (Resunova jobs corpus, active US postings, queried 2026-08-17) ──────

const TOTAL_POSTINGS = 102857;

const WHAT_POSTINGS_SAY = [
  { label: "Says nothing", value: 95.7, n: 98481 },
  { label: "Says no", value: 3.9, n: 3974 },
  { label: "Says yes", value: 0.4, n: 402 },
];

const SILENCE_BY_INDUSTRY = [
  { label: "Healthcare", value: 97.9, n: 16017 },
  { label: "Energy", value: 97.3, n: 2050 },
  { label: "Defense", value: 97.1, n: 3246 },
  { label: "Software", value: 95.8, n: 2616 },
  { label: "AI", value: 95.4, n: 8037 },
  { label: "Fintech", value: 95.1, n: 5137 },
  { label: "Finance", value: 92.7, n: 2132 },
  { label: "Aerospace", value: 91.7, n: 3354 },
];

const SPONSOR_LEADERBOARD = [
  { employer: "NVIDIA Corporation", filings: 1265, wage: 188293, postings: 135 },
  { employer: "Intel Corporation", filings: 1172, wage: 133432, postings: 101 },
  { employer: "Salesforce, Inc.", filings: 906, wage: 201000, postings: 37 },
  { employer: "Accenture LLP", filings: 850, wage: 148800, postings: 543 },
  { employer: "LinkedIn Corporation", filings: 822, wage: 179079, postings: 134 },
  { employer: "ServiceNow, Inc.", filings: 311, wage: 165096, postings: 147 },
  { employer: "Pinterest, Inc.", filings: 223, wage: 174304, postings: 165 },
  { employer: "Snowflake Inc.", filings: 222, wage: 185099, postings: 217 },
  { employer: "Databricks, Inc.", filings: 178, wage: 168958, postings: 348 },
  { employer: "Workday, Inc.", filings: 172, wage: 156200, postings: 61 },
  { employer: "DoorDash, Inc.", filings: 151, wage: 179088, postings: 366 },
  { employer: "Humana Inc.", filings: 150, wage: 140754, postings: 65 },
];

function BarRow({ label, value, max, color = "var(--accent)", bold = false }: {
  label: string; value: number; max: number; color?: string; bold?: boolean;
}) {
  const pct = Math.max(2, (100 * value) / max);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 52px", alignItems: "center", gap: 10 }}>
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

function WhatPostingsSayChart() {
  return (
    <ChartCard
      title="What active US job postings say about visa sponsorship"
      note={`n = ${TOTAL_POSTINGS.toLocaleString()} active US postings with extracted job facts, August 2026. A posting counts as addressing sponsorship if it states a position either way in the description text. Anything that does not raise the subject counts as silent.`}
    >
      {WHAT_POSTINGS_SAY.map((row) => (
        <BarRow
          key={row.label}
          label={row.label}
          value={row.value}
          max={100}
          color={row.label === "Says yes" ? "var(--accent)" : row.label === "Says no" ? "var(--red-ink, #d97757)" : "var(--dim)"}
          bold={row.label === "Says nothing"}
        />
      ))}
    </ChartCard>
  );
}

function SilenceByIndustryChart() {
  return (
    <ChartCard
      title="Share of postings that never mention sponsorship, by industry"
      note="Every industry with at least 2,000 active postings sits between 91.7% and 97.9% silent. Aerospace and finance raise the subject slightly more often than average, and both do so mostly to rule it out. No sector treats the question as standard information."
    >
      {SILENCE_BY_INDUSTRY.map((row) => (
        <BarRow key={row.label} label={row.label} value={row.value} max={100} color="var(--dim)" />
      ))}
    </ChartCard>
  );
}

function SponsorTable() {
  const money = (n: number) => `$${n.toLocaleString()}`;
  return (
    <figure style={{ margin: "18px 0 6px", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: "18px 20px", overflowX: "auto" }}>
      <figcaption style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
        Employers with the most certified H-1B filings that are hiring right now
      </figcaption>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 460 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--muted)" }}>
            <th style={{ padding: "0 0 8px", fontWeight: 600 }}>Employer</th>
            <th style={{ padding: "0 0 8px", fontWeight: 600, textAlign: "right" }}>Certified filings</th>
            <th style={{ padding: "0 0 8px", fontWeight: 600, textAlign: "right" }}>Median filed wage</th>
            <th style={{ padding: "0 0 8px", fontWeight: 600, textAlign: "right" }}>Open roles</th>
          </tr>
        </thead>
        <tbody>
          {SPONSOR_LEADERBOARD.map((row) => (
            <tr key={row.employer} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "8px 0", color: "var(--text)", fontWeight: 500 }}>{row.employer}</td>
              <td style={{ padding: "8px 0", textAlign: "right", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                {row.filings.toLocaleString()}
              </td>
              <td style={{ padding: "8px 0", textAlign: "right", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                {money(row.wage)}
              </td>
              <td style={{ padding: "8px 0", textAlign: "right", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                {row.postings}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: "var(--dim)", margin: "12px 0 0", lineHeight: 1.5 }}>
        Employers with at least 25 active US postings, ranked by certified filing count. Median filed wage is the
        midpoint of the wages those employers certified, which indicates the role level they sponsor at rather than
        a salary offer. Open roles counts postings active on 2026-08-17.
      </p>
    </figure>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How many job postings say whether they sponsor a visa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Across 102,857 active US postings, 95.7% never raise the subject. Only 4.3% address sponsorship at all, and of those, 90.8% state that they will not sponsor. Postings that affirmatively offer sponsorship are 0.4% of the market.",
      },
    },
    {
      "@type": "Question",
      name: "Does 'we do not sponsor visas' mean the company never sponsors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not reliably. Of the active US postings that explicitly rule out sponsorship, 20.2% are at employers that hold certified H-1B filings under an exactly matched company name, and 12.0% are at employers with five or more such filings. The statement is best read as a policy for that requisition, not a fact about the whole company. Other roles at the same employer may be sponsored.",
      },
    },
    {
      "@type": "Question",
      name: "Which companies sponsor the most H-1B visas and are hiring now?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Among employers with at least 25 active US postings, the largest certified filing counts belong to NVIDIA (1,265 filings, $188,293 median filed wage), Intel (1,172, $133,432), Salesforce (906, $201,000), Accenture (850, $148,800), and LinkedIn (822, $179,079). Accenture and DoorDash currently carry the most open roles of that group.",
      },
    },
    {
      "@type": "Question",
      name: "How can I tell if an employer sponsors when the posting does not say?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Public federal wage filings record which employers have certified sponsorship applications, at what job titles, and at what wages. Because 95.7% of postings stay silent, that public record is usually the only evidence available before you apply.",
      },
    },
  ],
};

export default function H1bVisaSponsorshipJobPostingsPage() {
  return (
    <BlogArticleLayout
      slug="h1b-visa-sponsorship-job-postings"
      title="96% of Job Postings Won't Say Whether They Sponsor a Visa"
      subtitle="We measured how often active US postings answer the one question that decides whether an international candidate should apply at all. Almost none of them do. And when a posting does say 'we don't sponsor', one in five of those employers has certified sponsorship filings on the public record anyway."
    >
      <JsonLd data={FAQ_JSONLD} />

      <p style={{ margin: "0 0 14px" }}>
        For a candidate who needs sponsorship, one question decides everything: will this employer file for me? Get
        it wrong and the whole application, the tailored resume, the take-home, the four rounds of interviews, is
        spent on a role that was never available. It is the highest-stakes filter in job hunting, and it is the one
        the job posting is least likely to answer.
      </p>

      <TableOfContents
        items={[
          { id: "silence", label: "The market says nothing" },
          { id: "no-is-not-never", label: "A refusal is not company policy" },
          { id: "who-sponsors", label: "Who actually sponsors" },
          { id: "what-to-do", label: "What to do about it" },
          { id: "methodology", label: "Methodology" },
          { id: "faq", label: "FAQ" },
        ]}
      />

      <Section id="silence" title="Almost nobody answers the question">
        <p style={{ margin: "0 0 12px" }}>
          Across <strong>102,857 active US postings</strong>, 95.7% never mention visa sponsorship in any form.
          Only 4.3% raise the subject at all. Of the ones that do, the overwhelming majority raise it to close the
          door: 3,974 postings state they will not sponsor, against 402 that affirmatively offer it. Postings that
          say yes are <strong>0.4%</strong> of the market, roughly four in every thousand.
        </p>
        <WhatPostingsSayChart />
        <p style={{ margin: "12px 0 12px" }}>
          The obvious objection is that this is an industry artifact, that the silence lives in sectors where
          sponsorship is rare or legally constrained while the tech market behaves differently. It does not hold.
          Every industry with at least 2,000 active postings sits in a narrow band between 91.7% and 97.9% silent.
        </p>
        <SilenceByIndustryChart />
        <p style={{ margin: "12px 0 12px" }}>
          AI is the one visible exception, and only barely: 2.4% of AI postings affirmatively offer sponsorship,
          six times the market rate, which still leaves 95.4% of them silent. There is no sector where a candidate
          can assume the posting will tell them.
        </p>
      </Section>

      <Section id="no-is-not-never" title="A posting that says 'we don't sponsor' is not telling you about the company">
        <p style={{ margin: "0 0 12px" }}>
          The 3,974 explicit refusals look like the clearest signal in the dataset. They are not. Of the postings
          that rule sponsorship out, <strong>20.2%</strong> come from employers that hold certified H-1B filings
          under an exactly matched company name. Restrict that to employers with five or more certified filings, a
          bar that rules out one-off cases, and it is still 12.0%.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          So for roughly one in five refusals, the same employer has demonstrably sponsored people before. The
          sentence is a hiring decision about one requisition: this budget, this timeline, this role. It is written
          in the voice of company policy and read as one, but the public record says it usually is not.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          That cuts both ways, and it is worth being precise about which way. It does not mean you should ignore a
          refusal and apply anyway. It means a refusal on one posting is weak evidence about the next posting at
          the same company, and that ruling out an entire employer on the strength of one requisition&apos;s
          wording will cost you roles you could actually get.
        </p>
      </Section>

      <Section id="who-sponsors" title="Who actually sponsors, and at what wage">
        <p style={{ margin: "0 0 12px" }}>
          Since postings will not tell you, the public filing record has to. In our corpus, 22,534 active US
          postings (21.9%) sit at employers with an exactly matched certified sponsorship history, spread across
          856 distinct employers. Here are the largest of those that are hiring right now.
        </p>
        <SponsorTable />
        <p style={{ margin: "12px 0 12px" }}>
          Two things stand out. Filing volume and current hiring volume are barely related: Salesforce has 906
          certified filings against 37 open roles today, while DoorDash has 151 filings and 366 open roles. Track
          record tells you whether an employer sponsors. It says nothing about whether they are hiring this month.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          The median filed wages are also higher than most candidates expect, clustering between $133,000 and
          $201,000. That is a selection effect worth naming rather than a market average: employers sponsor at the
          role levels where they cannot fill the seat domestically, which skews senior and technical. Read those
          figures as the level an employer sponsors at, not as an offer.
        </p>
      </Section>

      <Section id="what-to-do" title="What this means if you need sponsorship">
        <p style={{ margin: "0 0 12px" }}>
          <strong>Treat silence as genuinely uninformative.</strong> With 95.7% of postings saying nothing, an
          absent sponsorship line carries no signal at all, positive or negative. It is the default, not a hint.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong>Check the employer, not the posting.</strong> Public federal wage filings record which employers
          have certified sponsorship applications, at which titles, and at what wages. That record is the only
          evidence most candidates can get before applying.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong>Ask early, and ask about the role.</strong> Because a refusal is usually requisition-level, the
          useful question is not &quot;does your company sponsor&quot; but &quot;is this requisition approved for
          sponsorship&quot;. Those have different answers often enough to matter.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          There is a pattern here that matches something we found earlier. At sponsoring employers, only 29.3% of
          postings name a salary, the same reticence we measured in{" "}
          <Link href="/blog/salary-transparency-by-seniority" style={{ color: "var(--accent)" }}>
            pay disclosure by seniority
          </Link>
          . The information candidates most need in order to self-select is the information postings most reliably
          withhold, and in both cases the public filing record is more forthcoming than the employer. For a broader
          look at how little a posting actually commits to, see our{" "}
          <Link href="/blog/linkedin-applicant-count-clicks-not-applications" style={{ color: "var(--accent)" }}>
            analysis of applicant counts
          </Link>{" "}
          and our{" "}
          <Link href="/blog/ghost-jobs-duplicate-postings" style={{ color: "var(--accent)" }}>
            work on duplicate and ghost postings
          </Link>
          .
        </p>
      </Section>

      <CTACard
        heading="Search jobs by sponsorship track record"
        body="Resunova's sponsor board matches active US postings against certified federal wage filings, so you can see which employers have sponsored before and at what level. Free to browse, no subscription."
        href="/jobs/sponsors/"
        cta="Browse H-1B sponsor jobs"
      />

      <Section id="methodology" title="Methodology">
        <p style={{ margin: "0 0 12px" }}>
          Figures come from Resunova&apos;s jobs corpus: 102,857 US postings active on 2026-08-17 with extracted
          job facts. A posting counts as addressing sponsorship only when it states a position in the description
          text. Everything else counts as silent, including postings that mention work authorization without
          addressing sponsorship.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          Sponsorship history is matched to certified H-1B filings by employer name, and every figure in this post
          uses exact-name matches only. Fuzzy matches were excluded after review found false positives among them,
          for example a posting employer sharing a first word with an unrelated certified filer. Excluding them
          makes the sponsorship-history percentages here conservative: the true rates are somewhat higher than
          stated. Certified filings reflect approved applications rather than hires, and an employer with filings
          may still not sponsor for any particular open role.
        </p>
        <p style={{ margin: 0 }}>
          Full details on the corpus and what it excludes:{" "}
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
    </BlogArticleLayout>
  );
}
