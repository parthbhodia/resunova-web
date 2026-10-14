import Link from "next/link";
import BlogArticleLayout, { Section, TableOfContents, CTACard } from "@/components/blog/BlogArticleLayout";
import JsonLd from "@/components/seo/JsonLd";
import { createBlogPostMetadata } from "@/lib/atsBlogPosts";

export const metadata = createBlogPostMetadata("ghost-jobs-duplicate-postings");

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a ghost job or duplicate job posting?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A ghost job, in the phantom-volume sense, is one real job requisition that appears many times on a job board because an ATS lets a company push the same posting to multiple locations or feeds. Each copy reads as a separate opening to anyone counting listings. On the surge day measured here, about 38% (roughly 13,000 of 34,000) of newly ingested postings were byte-identical duplicates of another posting in the same batch.",
      },
    },
    {
      "@type": "Question",
      name: "Why do the same job postings get listed hundreds of times?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An applicant tracking system lets a company push one requisition to every location or franchise with a form field, and each copy is filed as its own listing. The single biggest contributor in this dataset was one company that had reposted one job description across roughly 800 different locations.",
      },
    },
    {
      "@type": "Question",
      name: "How do you detect duplicate job postings accurately?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A byte-identical match on the job description text works better than a normalized/fuzzy match. A looser, normalized-text comparison was tried first and it collapsed about 17,000 postings that only shared boilerplate or a template across different companies, not the same job. Matching on the raw, exact text avoids merging postings that only look alike.",
      },
    },
  ],
};

// ── data (Resunova jobs pipeline: historical event from api commit log #57,
// 2026-07-02; live figures queried 2026-07-14, once right after a dedupe pass
// and once mid-crawl while a scan's upserts were re-activating duplicates) ──

const DUPLICATE_RATE = [
  { label: "Day of the provider surge (2026-07-02)", value: 38.2 },
  { label: "Mid-crawl peak, measured live today", value: 11.9 },
  { label: "Hours after a dedupe pass, today", value: 2.8 },
];

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

function DuplicateRateChart() {
  return (
    <ChartCard
      title="Exact-duplicate JD rate: the surge day, and the daily cycle today"
      note="Duplicate rate = postings sharing byte-identical job-description text with another active posting. The 2026-07-02 figure is the raw rate on the surge day, before the dedupe pass collapsed it. The two 2026-07-14 figures were measured live the same day: mid-crawl (while a scan's writes were re-activating duplicates the boards still list) and a few hours after the previous scan's dedupe pass."
    >
      {DUPLICATE_RATE.map((row, i) => (
        <BarRow key={row.label} label={row.label} value={row.value} max={40} color={i === 0 ? "var(--red-ink, #d97757)" : i === 1 ? "var(--dim)" : "var(--accent)"} bold={i === 2} />
      ))}
    </ChartCard>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function GhostJobsDuplicatePostingsPage() {
  return (
    <BlogArticleLayout
      slug="ghost-jobs-duplicate-postings"
      title="We 7x'd Our Job-Board Coverage Overnight. 13,000 of the New Postings Were Duplicates."
      subtitle="Turning on six new ATS integrations took our daily ingest from about 530 postings to about 3,700. Before we could celebrate the jump, we noticed something: a huge share of it was the same job, posted again and again. Here's what we found, why it happens, and what the feed looks like now that we catch it automatically."
    >
      <JsonLd data={FAQ_JSONLD} />

      <p style={{ margin: "0 0 14px" }}>
        Resunova's jobs feed pulls postings straight from company ATS and career-site APIs (Workday, Greenhouse,
        SmartRecruiters, Lever, Ashby, and a growing list more), several times a day, so the ranked list a user sees
        stays close to what a company&apos;s own careers page shows. In early July we activated six previously dormant
        provider integrations at once. Last-24-hour US postings jumped from roughly 530 to roughly 3,700, a 7x
        increase. Good news, until we looked closer at what had actually come in.
      </p>

      <TableOfContents
        items={[
          { id: "the-finding", label: "38% were the same job" },
          { id: "one-company", label: "One JD, 800 locations" },
          { id: "byte-identical", label: "Why exact matching won" },
          { id: "ongoing", label: "The cleanup never stops" },
          { id: "methodology", label: "Methodology" },
          { id: "faq", label: "FAQ" },
        ]}
      />

      <Section id="the-finding" title="Thirty-eight percent of the new postings were the same job">
        <p style={{ margin: "0 0 12px" }}>
          Of the roughly 34,000 raw postings ingested that run, about <strong>13,000, or 38%, were byte-for-byte
          identical</strong> to another posting ingested in the same batch. Same title, same body text, same
          requirements, just filed under a different location or a slightly different req ID. Left alone, every one
          of those would have shown up in a job feed as a separate opening.
        </p>
        <DuplicateRateChart />
      </Section>

      <Section id="one-company" title="One company, one job description, about 800 locations">
        <p style={{ margin: "0 0 12px" }}>
          The single biggest contributor was a security-staffing company, Securitas, which had reposted one job
          description across roughly 800 different locations. Same guard-post listing, same requirements paragraph,
          filed once per site. It is not hard to see why: an ATS lets a company push one requisition to every branch
          with a form field, and each copy reads as a separate &quot;opening&quot; to anyone counting postings, us
          included, before we started deduplicating.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          This is the mechanic behind a complaint job seekers already have a name for: ghost jobs, or more precisely
          here, phantom volume. The role count on a board looks large because one real requisition got multiplied,
          not because a company has hundreds of genuinely distinct openings.
        </p>
      </Section>

      <Section id="byte-identical" title="Byte-identical, not 'looks similar': why the stricter signal won">
        <p style={{ margin: "0 0 12px" }}>
          Our dedupe pass runs after every scan and keeps one row per identical job-description body (favoring the
          copy with extracted skill data, then the one with a salary, then the newest), deactivating the rest so
          duplicates get swept from the live feed several times a day.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          We tried a looser version first: normalize the text (lowercase, strip bullets and extra whitespace) before
          comparing, so two postings that differ only in formatting still count as the same job. That was too
          aggressive. On a later run it collapsed about 17,000 postings that were only superficially similar, shared
          boilerplate or a template across different companies, not the same job at all. We narrowed the match back
          to raw, byte-identical text. Slightly less aggressive, but it never merges two postings that only look
          alike.
        </p>
      </Section>

      <Section id="ongoing" title="The spam never stops. Neither does the cleanup.">
        <p style={{ margin: "0 0 12px" }}>
          Here is the part we did not expect: the fix is not a one-time cleanup, it is a treadmill. The source boards
          never stop listing those duplicates, so every fresh crawl re-activates them, and the pass at the end of the
          crawl collapses them again. Our scan logs show the dedupe pass deactivating <strong>roughly 23,000
          duplicate postings on every single scan</strong> (the last six scans: between 22,918 and 23,484 each),
          several times a day, every day.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          That means the duplicate share of the active feed breathes with the crawl cycle. We measured it twice on
          the same day while writing this post: a few hours after a dedupe pass it was <strong>2.8%</strong>; mid-crawl,
          while a scan&apos;s writes were re-activating postings the boards still list, it peaked at <strong>11.9%</strong>.
          The pass at the end of that crawl knocks it back down, and the cycle repeats. Right after a pass the active
          US feed holds about 170,000 postings.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          And Securitas is not special. A crawl running while we wrote this showed fresh clusters: a personal-training
          company (Svetness) with one job description active in 383 copies, a boutique-fitness chain (Solidcore) at
          163, and a delivery company (Gopuff) at 158. New names, same mechanic, every day.
        </p>
      </Section>

      <CTACard
        heading="A job board that collapses the copies"
        body="The dedupe pass described above runs on Resunova's board after every scan, several times a day. Browse the postings that survive it: free, no subscription, straight from company career sites."
        href="/jobs/"
        cta="Browse deduplicated jobs"
      />

      <Section id="methodology" title="Methodology and honest caveats">
        <p style={{ margin: "0 0 10px" }}>
          <strong>The surge numbers.</strong> ~530 to ~3,700 last-24h US postings, ~34,000 raw ingested, ~13,000
          (38%) exact duplicates, and the Securitas figure are all from the single provider-activation run on
          2026-07-02. They describe that event, not a permanent daily rate.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>The current numbers.</strong>{" "}
          All queried live against the production database on 2026-07-14. The
          active count and duplicate rate oscillate with the crawl cycle, so we quote both ends: ~170,000 active US
          postings and a 2.8% duplicate rate measured a few hours after a dedupe pass; an 11.9% duplicate rate
          measured mid-crawl the same day, before that crawl&apos;s pass ran. The ~23,000-per-scan collapse figure
          is from the pipeline&apos;s own scan logs across the six most recent scans (range 22,918 to 23,484).
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>What "duplicate" means here.</strong> An exact match on job-description text (MD5 hash of the raw
          body), not a fuzzy or semantic match. Two postings with the same requirements worded differently are not
          counted as duplicates by this measure, so the true phantom-volume rate, including near-duplicates, is
          higher than what we report.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Source.</strong>{" "}
          Postings pulled directly from each company&apos;s public ATS or career-site API.
          Deduping runs server-side after every scan, several times a day. Full corpus details:{" "}
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
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>See the deduplicated feed</p>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
          Resunova sweeps duplicate postings out of the feed by job-description content several times a day, then
          ranks what remains against your résumé, with skill-by-skill match breakdowns and H-1B sponsor data on each
          job.
        </p>
        <Link href="/jobs/" style={{ display: "inline-block", background: "var(--accent)", color: "#fff", borderRadius: 9, padding: "9px 16px", fontSize: 14, fontWeight: 650, textDecoration: "none" }}>
          Browse live jobs
        </Link>
      </div>

      <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 24 }}>
        Questions about the methodology, or want the query behind a number here? Reach us via the{" "}
        <Link href="/contact" style={{ color: "var(--accent)" }}>contact page</Link>.
      </p>
    </BlogArticleLayout>
  );
}
