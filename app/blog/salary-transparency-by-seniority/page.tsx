import type { Metadata } from "next";
import Link from "next/link";
import BlogArticleLayout, { Section } from "@/components/blog/BlogArticleLayout";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Why Don't Jobs List Salary? 109,159 Postings Say: The Higher the Role, the More They Hide It",
  description:
    "We measured salary disclosure across 109,159 active US job postings. Entry-level roles list pay 41% of the time. Director roles: 14%. The gap survives every control we threw at it.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/blog/salary-transparency-by-seniority/" },
  openGraph: {
    title: "The higher the job, the more they hide the pay",
    description:
      "Salary disclosure rates by seniority across 109,159 active US job postings: entry 41%, senior 28%, director 14%.",
    type: "article",
  },
};

// ── data (Resunova jobs corpus, active US postings, queried 2026-07-14) ──────

const TOTAL_POSTINGS = 109159;

const BY_SENIORITY = [
  { label: "Intern", value: 36.0, n: 567 },
  { label: "Entry", value: 41.4, n: 49836 },
  { label: "Mid-level", value: 28.7, n: 15060 },
  { label: "Senior", value: 28.3, n: 37648 },
  { label: "Lead", value: 19.2, n: 3817 },
  { label: "Principal", value: 22.9, n: 1365 },
  { label: "Director", value: 14.2, n: 655 },
  { label: "Executive", value: 14.2, n: 211 },
];

const TECH_ONLY = [
  { label: "Entry", value: 35.3 },
  { label: "Mid-level", value: 27.8 },
  { label: "Senior", value: 29.6 },
  { label: "Lead", value: 19.5 },
  { label: "Principal", value: 24.8 },
  { label: "Director", value: 13.6 },
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
      <figcaption style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>{title}</figcaption>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{children}</div>
      {note && <p style={{ fontSize: 11.5, color: "var(--dim)", margin: "12px 0 0", lineHeight: 1.5 }}>{note}</p>}
    </figure>
  );
}

function SeniorityChart() {
  return (
    <ChartCard
      title="Share of active US postings that disclose a salary range, by seniority"
      note={`n = ${TOTAL_POSTINGS.toLocaleString()} active US postings with extracted job facts, July 2026. A posting counts as disclosing if it lists a salary figure or range, either as structured data or stated in the job description text. Director (n=655) and executive (n=211) are smaller samples; the downward trend from entry through lead is measured on tens of thousands of postings per rung.`}
    >
      {BY_SENIORITY.map((row) => (
        <BarRow
          key={row.label}
          label={row.label}
          value={row.value}
          max={45}
          color={row.value >= 35 ? "var(--accent)" : row.value >= 20 ? "var(--dim)" : "var(--red-ink, #d97757)"}
          bold={row.label === "Entry" || row.label === "Director"}
        />
      ))}
    </ChartCard>
  );
}

function TechOnlyChart() {
  return (
    <ChartCard
      title="Same measurement, tech postings only (software, AI, fintech, cybersecurity)"
      note="Restricting to tech industries removes the hourly-wage-heavy sectors (healthcare, retail, hospitality, staffing) that could inflate the entry-level number. The gradient barely moves."
    >
      {TECH_ONLY.map((row) => (
        <BarRow
          key={row.label}
          label={row.label}
          value={row.value}
          max={45}
          color={row.value >= 30 ? "var(--accent)" : row.value >= 20 ? "var(--dim)" : "var(--red-ink, #d97757)"}
        />
      ))}
    </ChartCard>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

const CANONICAL = `${SITE_URL}/blog/salary-transparency-by-seniority/`;

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Why Don't Jobs List Salary? The Higher the Role, the More They Hide It",
  description:
    "Salary disclosure rates by seniority across 109,159 active US job postings: entry-level roles list pay 41% of the time, director roles 14%.",
  datePublished: "2026-07-14",
  dateModified: "2026-07-14",
  author: { "@type": "Organization", name: "Resunova", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#org` },
  mainEntityOfPage: CANONICAL,
};

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why do fewer senior job postings list a salary than entry-level ones?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Across 109,159 active US postings, entry-level roles disclose salary 41.4% of the time versus 14.2% for director and executive roles. The gap holds even after removing hourly-wage-heavy industries and restricting to tech postings only, so it is not explained by industry mix. Likely drivers: senior pay has more negotiation room a printed range would anchor, compensation leans more on bonus and equity that don't reduce to a clean base range, and a public senior salary is readable by people already in that role internally.",
      },
    },
    {
      "@type": "Question",
      name: "What percentage of job postings disclose salary by seniority level?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In Resunova's corpus of active US postings: entry-level 41.4%, intern 36.0%, mid-level 28.7%, senior 28.3%, principal 22.9%, lead 19.2%, director 14.2%, executive 14.2%.",
      },
    },
    {
      "@type": "Question",
      name: "How can I find out the salary for a senior role that doesn't list one?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ask early, before investing interview rounds, since silence on senior postings is structural rather than personal. Federal wage filings and state-mandated pay-range disclosure laws in California, Colorado, New York, and Washington remain the best public anchors for roles that will not name a number.",
      },
    },
  ],
};

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog/` },
    {
      "@type": "ListItem",
      position: 3,
      name: "The higher the job, the more they hide the pay",
      item: CANONICAL,
    },
  ],
};

export default function SalaryTransparencyBySeniorityPage() {
  return (
    <BlogArticleLayout
      slug="salary-transparency-by-seniority"
      title="The Higher the Job, the More They Hide the Pay"
      subtitle="We measured how often active US job postings disclose a salary, rung by rung up the career ladder. Entry-level postings tell you the pay 41% of the time. By director level it drops to 14%. We tried to explain the gap away with industry mix and sample effects. It would not go away."
    >
      <JsonLd data={[ARTICLE_JSONLD, FAQ_JSONLD, BREADCRUMB_JSONLD]} />

      <p style={{ margin: "0 0 14px" }}>
        &quot;Competitive salary&quot; is the most expensive phrase in job hunting. Every hour spent tailoring a
        resume, prepping for a screen, or sitting through interview rounds for a role that was never going to pay
        enough is an hour billed to the candidate. So we asked a simple question of our jobs corpus: who actually
        tells you the pay up front, and who makes you find out the hard way?
      </p>

      <Section title="Disclosure falls with every rung of the ladder">
        <p style={{ margin: "0 0 12px" }}>
          Across <strong>109,159 active US postings</strong>, 41.4% of entry-level roles list a salary figure or
          range. Mid-level and senior roles hover around 28%. Lead and principal roles drop to roughly one in five.
          Director and executive postings disclose pay just <strong>14.2%</strong> of the time. An entry-level
          candidate is nearly three times as likely to know the pay before applying as a director-level one.
        </p>
        <SeniorityChart />
      </Section>

      <Section title="We tried to explain it away. It held.">
        <p style={{ margin: "0 0 12px" }}>
          The obvious objection: entry-level postings skew toward hourly-wage industries such as healthcare, retail,
          and hospitality, where posting a wage is standard practice. Maybe the ladder effect is really an industry
          effect.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          So we removed those industries entirely and measured again: entry drops from 41.4% to 38.6%, but director
          falls to 12.2%. The gap persists. Then we restricted to tech postings only, where pay-transparency norms
          are supposedly strongest. Same picture:
        </p>
        <TechOnlyChart />
        <p style={{ margin: "0 0 12px" }}>
          Whatever is driving this, it is not industry mix. Companies that happily print a number on the junior
          posting go quiet on the senior one, inside the same sector and often inside the same careers page.
        </p>
      </Section>

      <Section title="Why senior salaries go dark">
        <p style={{ margin: "0 0 12px" }}>
          The data shows the pattern, not the motive, but three explanations fit what we see:
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong>Negotiation leverage.</strong> Senior compensation has more room to move, and a printed range
          anchors the conversation. Keeping it dark preserves the employer&apos;s ability to pay what the specific
          candidate will accept, which is precisely why candidates hate it.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong>Comp complexity.</strong> Director and executive pay leans on bonus, equity, and incentives that
          do not reduce to a clean base-salary range. Some employers treat that as a reason to publish nothing
          rather than publish a partial number.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong>Internal visibility.</strong> A public range on a senior posting is readable by the people
          already in that role. The higher the role, the more awkward the comparison, and the stronger the pull
          toward silence.
        </p>
      </Section>

      <Section title="What this means if you're job hunting">
        <p style={{ margin: "0 0 12px" }}>
          If you are early-career, expect a number and treat its absence as a mild signal: most of your market does
          disclose. If you are senior, the silence is structural, not personal, and the burden of pay discovery
          shifts to you. Ask early, before investing interview rounds. Federal wage filings and state-mandated
          ranges in California, Colorado, New York, and Washington remain the best public anchors for roles that
          will not name a number.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          Resunova&apos;s job feed surfaces disclosed pay wherever a posting provides it, and our{" "}
          <Link href="/blog/tailor-resume-to-job-description" style={{ color: "var(--accent)" }}>
            tailoring guide
          </Link>{" "}
          covers how to position for roles where you already know the range is worth your time. For a look at
          what large-company postings reveal about pay, see our{" "}
          <Link href="/blog/sp100-tech-hiring-2026" style={{ color: "var(--accent)" }}>
            S&amp;P 100 hiring analysis
          </Link>
          .
        </p>
      </Section>

      <Section title="Methodology">
        <p style={{ margin: "0 0 12px" }}>
          Figures are from Resunova&apos;s jobs corpus: 109,159 US postings active on 2026-07-14 with extracted job
          facts and a classified seniority level. A posting counts as disclosing salary if it carries a pay figure
          or range, either as structured posting data or stated in the description text. Seniority is classified
          from the posting itself. Small rungs (intern, director, executive) are noted with sample sizes in the
          chart; the core gradient rests on rungs with 15,000 to 50,000 postings each.
        </p>
      </Section>

      <Section title="FAQ">
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
