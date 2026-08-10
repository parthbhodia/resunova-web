import Link from "next/link";
import BlogArticleLayout, { Section, TableOfContents, CTACard } from "@/components/blog/BlogArticleLayout";
import { createBlogPostMetadata } from "@/lib/atsBlogPosts";

export const metadata = createBlogPostMetadata("sp100-tech-hiring-2026");

// ── data (queried from the Resunova jobs corpus, 2026-07-05, US postings) ────

const WORK_MODEL = [
  { label: "Onsite", sp: 78.8, market: 53.6 },
  { label: "Hybrid", sp: 16.6, market: 32.7 },
  { label: "Remote", sp: 4.6, market: 13.7 },
];

const SKILLS = [
  { skill: "Python", pct: 28.3 },
  { skill: "SQL", pct: 12.1 },
  { skill: "Java", pct: 11.4 },
  { skill: "AWS", pct: 9.6 },
  { skill: "Kubernetes", pct: 7.2 },
  { skill: "C++", pct: 5.6 },
  { skill: "JavaScript", pct: 5.1 },
  { skill: "Docker", pct: 5.0 },
  { skill: "Azure", pct: 4.9 },
  { skill: "Machine learning", pct: 4.2 },
];

const SALARY_BOARD = [
  { company: "NVIDIA", median: 235750 },
  { company: "Capital One", median: 211200 },
  { company: "ServiceNow", median: 210540 },
  { company: "General Motors", median: 198450 },
  { company: "Cisco", median: 179450 },
  { company: "BlackRock", median: 174000 },
  { company: "Broadcom", median: 150000 },
  { company: "CVS Health", median: 141266 },
  { company: "Caterpillar", median: 140885 },
];

const ADV_VS_DOL = [
  { company: "NVIDIA", advertised: 235750, dol: 188293 },
  { company: "ServiceNow", advertised: 210540, dol: 165096 },
  { company: "BlackRock", advertised: 174000, dol: 147700 },
  { company: "Broadcom", advertised: 150000, dol: 178131 },
  { company: "Accenture", advertised: 131300, dol: 148800 },
];

const fmtK = (n: number) => `$${Math.round(n / 1000)}k`;

// ── chart primitives (inline, dependency-free, theme-var colored) ────────────

function BarRow({ label, value, max, suffix = "%", color = "var(--accent)", bold = false }: {
  label: string; value: number; max: number; suffix?: string; color?: string; bold?: boolean;
}) {
  const pct = Math.max(2, (100 * value) / max);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 64px", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, color: "var(--text)", fontWeight: bold ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ height: 10, borderRadius: 5, background: "var(--surface2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 5, background: color }} />
      </div>
      <span style={{ fontSize: 13, color: "var(--muted)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {suffix === "%" ? `${value}%` : fmtK(value)}
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

function WorkModelChart() {
  return (
    <ChartCard
      title="Work model: S&P 100 tech postings vs the rest of the market"
      note="US software and data postings that state a work model. S&P 100 n=1,582; rest of market n=14,133."
    >
      {WORK_MODEL.map((row) => (
        <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
          <BarRow label={`${row.label} (S&P 100)`} value={row.sp} max={80} color="var(--accent)" bold={row.label === "Remote"} />
          <BarRow label={`${row.label} (market)`} value={row.market} max={80} color="var(--dim)" />
        </div>
      ))}
    </ChartCard>
  );
}

function DumbbellChart() {
  const min = 110000;
  const max = 250000;
  const x = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <ChartCard
      title="Advertised median vs DOL-filed median wage"
      note="Advertised = median midpoint of posted US tech salary ranges (base only). DOL = the company's median wage in the public FY2026 H-1B LCA disclosure file. Bold rows advertise below their filings."
    >
      {ADV_VS_DOL.map((r) => {
        const below = r.dol > r.advertised;
        return (
          <div key={r.company} style={{ display: "grid", gridTemplateColumns: "92px 1fr", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: below ? 700 : 500, color: "var(--text)" }}>{r.company}</span>
            <div>
              {/* Label lives in normal flow above the track so it can never be
                  clipped at narrow widths (absolute right-side labels were). */}
              <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right", marginBottom: 3, fontVariantNumeric: "tabular-nums" }}>
                {fmtK(r.advertised)} advertised · {fmtK(r.dol)} filed
              </div>
              <div style={{ position: "relative", height: 12 }}>
                <div style={{ position: "absolute", top: 5, left: `${Math.min(x(r.advertised), x(r.dol))}%`, width: `${Math.abs(x(r.advertised) - x(r.dol))}%`, height: 2, background: "var(--surface2)" }} />
                <span title={`Advertised ${fmtK(r.advertised)}`} style={{ position: "absolute", top: 1, left: `calc(${x(r.advertised)}% - 5px)`, width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />
                <span title={`DOL ${fmtK(r.dol)}`} style={{ position: "absolute", top: 1, left: `calc(${x(r.dol)}% - 5px)`, width: 10, height: 10, borderRadius: "50%", background: below ? "var(--red-ink, #d97757)" : "var(--dim)" }} />
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 12, color: "var(--dim)" }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "var(--accent)", marginRight: 5 }} />advertised</span>
        <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "var(--dim)", marginRight: 5 }} />DOL filing</span>
      </div>
    </ChartCard>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function Sp100TechHiringPage() {
  return (
    <BlogArticleLayout
      slug="sp100-tech-hiring-2026"
      title="What 13,128 Live Job Postings at S&P 100 Companies Reveal About Tech Hiring"
      subtitle="We pulled the openings straight from ~50 S&P 100 career-page APIs, extracted every skill requirement, and cross-referenced salaries with federal wage filings. Five findings surprised us."
    >
      <p style={{ margin: "0 0 14px" }}>
        Resunova exists to match résumés to jobs, and doing that well means holding an unusually fresh copy of the job market:
        our pipeline pulls postings directly from company ATS and career-site APIs (Workday, Greenhouse, SmartRecruiters,
        Lever, Ashby, and a dozen more) several times a day. Right now that is about 247,000 active postings across 9,400
        companies, deduplicated by JD content so one national req copied across 800 locations counts once.
      </p>
      <p style={{ margin: "0 0 14px" }}>
        In early July 2026 we isolated the S&P 100 companies our sources cover directly: <strong>about 50 of them, with
        13,128 live openings, 2,960 of those in software and data roles</strong>. 99.7% of that tech slice has
        machine-extracted skill requirements. Here is what the data says.
      </p>

      <TableOfContents
        items={[
          { id: "remote", label: "Remote is 3x rarer" },
          { id: "pay-premium", label: "The pay premium is gone" },
          { id: "dol-gap", label: "Advertised vs. filed wages" },
          { id: "skills", label: "Python beats the rest combined" },
          { id: "entry-level", label: "Where entry-level went" },
          { id: "methodology", label: "Methodology" },
        ]}
      />

      <Section id="remote" title="1. Remote is three times rarer at the giants">
        <p style={{ margin: "0 0 12px" }}>
          Of big-company tech postings that state a work model, <strong>78.8% are onsite and only 4.6% are remote</strong>.
          The rest of the market posts 13.7% remote. Four out of five engineering openings at America&apos;s largest
          companies now expect you in a building.
        </p>
        <WorkModelChart />
      </Section>

      <Section id="pay-premium" title="2. The big-company pay premium is gone">
        <p style={{ margin: "0 0 12px" }}>
          Median advertised tech salary at the S&P 100 set: <strong>$163,700</strong>. Median for the rest of the market:
          <strong> $162,500</strong>. A rounding error. Scale buys stability now, not a pay premium.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          The company board is more surprising than the aggregate: General Motors advertises a higher engineering median
          than Cisco.
        </p>
        <ChartCard
          title="Median advertised tech salary by company"
          note="Midpoint of posted US salary ranges, base pay only, companies with 10+ salary-tagged tech postings. Equity-heavy companies read low because posted ranges exclude stock."
        >
          {SALARY_BOARD.map((r) => (
            <BarRow key={r.company} label={r.company} value={r.median} max={240000} suffix="$" color={r.company === "General Motors" ? "var(--accent)" : "var(--dim)"} bold={r.company === "General Motors"} />
          ))}
        </ChartCard>
      </Section>

      <Section id="dol-gap" title="3. Two companies advertise below what they tell the government they pay">
        <p style={{ margin: "0 0 12px" }}>
          Every company that hires on an H-1B visa files its wages with the US Department of Labor, and those filings are
          public. We joined them against the same companies&apos; live posting ranges. Most companies advertise above their
          historical filings, which is what you would expect from wage growth and senior-heavy openings. Two go the other
          way: <strong>Broadcom advertises a $150k median but filed $178k; Accenture advertises $131k but filed $149k.</strong>
        </p>
        <p style={{ margin: "0 0 12px" }}>
          If you are negotiating with either company, the DOL number is public record and it is a better anchor than the
          posting range.
        </p>
        <DumbbellChart />
      </Section>

      <Section id="skills" title="4. Python appears in more postings than Java, C++, and JavaScript combined">
        <p style={{ margin: "0 0 12px" }}>
          Across the 2,960 tech postings, Python leads at 28.3%, more than the next three languages combined. One more
          number worth sitting with: AI and machine-learning skills appear in <strong>18.5%</strong> of giant-company tech
          postings, which is statistically identical to the 18.4% rate across the rest of the market. The giants are not
          ahead of the market on AI hiring. They are exactly at it.
        </p>
        <ChartCard title="Share of S&P 100 tech postings requiring each skill" note="Machine-extracted requirements (skills and tools) from 2,950 postings; a posting counts once per skill.">
          {SKILLS.map((s) => (
            <BarRow key={s.skill} label={s.skill} value={s.pct} max={30} color={s.skill === "Python" ? "var(--accent)" : "var(--dim)"} bold={s.skill === "Python"} />
          ))}
        </ChartCard>
      </Section>

      <Section id="entry-level" title="5. Entry-level did not die, it moved to the giants">
        <p style={{ margin: "0 0 12px" }}>
          Of postings with a stated experience level, <strong>21.2% of S&P 100 tech openings are entry-level or intern
          roles, versus 14.6% across the rest of the market</strong>. The &quot;no junior jobs&quot; story is real for
          startups and mid-market companies. The giants still run structured university pipelines. The catch is in finding
          number one: those junior roles are overwhelmingly onsite.
        </p>
      </Section>

      <CTACard
        heading="See how you read against these requirements"
        body="The same extraction that produced the skill counts above runs on any job description you paste in, scored against your own resume: which of its requirements you already evidence, and which you don't. Free to try."
        href="/"
        cta="Score my resume free"
      />

      <Section id="methodology" title="Methodology and honest caveats">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Source.</strong>{" "}
          Live postings pulled directly from each company&apos;s public ATS or career-site API,
          refreshed several times daily, deduplicated by JD content hash. This cut: ~50 S&P 100 members, 13,128 live
          openings, 2,960 software/data roles as of July 5, 2026.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>Skills.</strong> One LLM extraction per posting into a typed requirement graph (skill, tool,
          certification, required vs preferred). 99.7% coverage on this cut.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>Salary.</strong> Midpoint of the posted US range, base pay only, $30k to $900k sanity bounds. No equity,
          so stock-heavy companies read low. Work-model and level stats only cover postings that state them, and the
          denominators are quoted above.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>What is missing.</strong>{" "}
          Apple, Google, Meta, and Microsoft post on closed portals our pipeline does not
          cover, so they are excluded rather than estimated. This is each company&apos;s public careers pipeline, not every
          internal req.
        </p>
        <p style={{ margin: 0 }}>
          <strong>DOL wages.</strong> Median per employer from the public FY2026 H-1B LCA disclosure file (~1M rows).
          Filings are historical while postings are current, so part of any gap is timing and seniority mix.
        </p>
        <p style={{ margin: "10px 0 0" }}>
          <strong>The corpus.</strong> Full details on sourcing, extraction, and exclusions:{" "}
          <Link href="/blog/methodology/" style={{ color: "var(--accent)" }}>
            how we measure
          </Link>
          .
        </p>
      </Section>

      <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: "20px 22px", marginTop: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>Explore the data yourself</p>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
          Every posting in this analysis is live and searchable on Resunova, ranked against your résumé, with skill-by-skill
          match breakdowns and H-1B sponsor data on each job.
        </p>
        <Link href="/jobs/" style={{ display: "inline-block", background: "var(--accent)", color: "#fff", borderRadius: 9, padding: "9px 16px", fontSize: 14, fontWeight: 650, textDecoration: "none" }}>
          Browse live jobs
        </Link>
      </div>

      <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 24 }}>
        Questions about the methodology, or a cut you would like to see (specific companies, skills, metros)? Reach us via
        the <Link href="/contact" style={{ color: "var(--accent)" }}>contact page</Link>.
      </p>
    </BlogArticleLayout>
  );
}
