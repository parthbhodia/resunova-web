import type { ReactNode } from "react";
import Link from "next/link";
import BlogArticleLayout, {
  Section,
  List,
  TableOfContents,
  Callout,
  CTACard,
} from "@/components/blog/BlogArticleLayout";
import JsonLd from "@/components/seo/JsonLd";
import { blogPostCanonical, createBlogPostMetadata } from "@/lib/atsBlogPosts";

const SLUG = "job-search-2026-whats-working";
const CANONICAL = blogPostCanonical(SLUG);
const TITLE = "Most of Your Job Search Shouldn't Be Applications";

export const metadata = createBlogPostMetadata("job-search-2026-whats-working");

const TOC = [
  { id: "pile-is-bigger", label: "Why applications pile up" },
  { id: "volume-vs-conversion", label: "Volume vs referral conversion" },
  { id: "what-working-looks-like", label: "What a working search looks like" },
  { id: "when-you-do-apply", label: "When you do apply" },
  { id: "week-shape", label: "A week that matches the data" },
  { id: "takeaways", label: "Key takeaways" },
  { id: "faq", label: "FAQ" },
  { id: "sources", label: "Sources" },
];

const FAQ = [
  {
    q: "Is cold applying still worth it in 2026?",
    a: "Yes, as part of a mix. Glassdoor's 2025 interview-review data still shows online applications as the most common starting point for interviews and offers, even as that share has fallen from its 2023 peak. Treat cold apply as coverage, not the whole plan.",
  },
  {
    q: "Do employee referrals really convert better?",
    a: "On employer-side benchmarks, yes, by a wide margin. Gem's 2026 report finds referrals convert at about 11× the rate of inbound applicants. Ashby finds referred candidates pass initial screens at 52% versus 35% overall. Those gaps are correlational: referred candidates are often pre-vetted.",
  },
  {
    q: "Should I stop using LinkedIn Easy Apply?",
    a: "Not necessarily. Use boards to discover roles, then prefer the company's own career page when you can. Huntr's tracker data shows career-page applications converting to interviews at a higher rate than board-routed applications. Pair every serious apply with a human touch when you have one.",
  },
  {
    q: "How long until a job search starts producing interviews?",
    a: "Career coach Sarah Felice puts real momentum at about 4 to 6 weeks in 2026, not 2022 speeds. Huntr's Q1 2026 tracker data showed a median of 108 days from search start to first offer for its users. Plan for a multi-week lag and judge channels by outcomes, not by how busy you felt.",
  },
];

const PRIMARY_SOURCES: { href: string; label: string }[] = [
  {
    href: "https://www.gem.com/blog/key-takeaways-from-the-2026-recruiting-benchmarks-report",
    label: "Gem 2026 Recruiting Benchmarks (takeaways)",
  },
  {
    href: "https://www.gem.com/resource/recruiting-benchmarks",
    label: "Gem recruiting benchmarks hub",
  },
  {
    href: "https://www.ashbyhq.com/talent-trends-report/reports/recruiting-operations-benchmarks-talent-trends",
    label: "Ashby Recruiting Operations Benchmarks 2026",
  },
  {
    href: "https://www.ashbyhq.com/talent-trends-report/reports/referrals",
    label: "Ashby: Are referred candidates more likely to get hired?",
  },
  {
    href: "https://www.glassdoor.com/blog/ai-has-not-killed-online-job-applications/",
    label: "Glassdoor: AI has not killed online job applications",
  },
  {
    href: "https://www.cnbc.com/2026/01/12/cold-applying-is-still-the-no-1-way-to-get-a-new-job-but-this-method-is-quickly-getting-more-common.html",
    label: "CNBC Make It: cold applying is still No. 1 (Jennifer Liu)",
  },
  {
    href: "https://www.cnbc.com/2026/01/22/recruiting-pro-of-30-years-if-i-was-looking-for-a-job-in-2026-i-would-honestly-stop-applying-online.html",
    label: "CNBC Make It: J.T. O'Donnell on deprioritizing online apply",
  },
  {
    href: "https://tcommunity.linkedin.com/community-news-72/labor-market-report-2026-2308",
    label: "LinkedIn Talent Community: Labor Market Report 2026 (3.6× connection note)",
  },
  {
    href: "https://news.linkedin.com/2026/LinkedIn-Research-Talent-2026",
    label: "LinkedIn Research: Talent 2026",
  },
  {
    href: "https://news.linkedin.com/2026/Grads-Guide-2026",
    label: "LinkedIn Grad's Guide 2026",
  },
  {
    href: "https://huntr.co/research/best-job-boards",
    label: "Huntr: Best Job Boards of 2026 (interview rates)",
  },
  {
    href: "https://huntr.co/research/2025-annual-job-search-trends-report",
    label: "Huntr 2025 Annual Job Search Trends",
  },
  {
    href: "https://huntr.co/research/job-search-trends-q1-2026",
    label: "Huntr Q1 2026 Job Search Trends",
  },
  {
    href: "https://huntr.co/research/job-search-trends-q2-2026",
    label: "Huntr Q2 2026 Job Search Trends",
  },
  {
    href: "https://www.linkedin.com/pulse/job-searching-2026-whats-actually-working-sarah-felice-ku2yc",
    label: "Sarah Felice: Job searching in 2026",
  },
];

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
      {children}
    </a>
  );
}

export default function JobSearch2026WhatsWorkingPage() {
  return (
    <BlogArticleLayout
      slug={SLUG}
      title={TITLE}
      subtitle="Job search in 2026 is a channel problem, not just a résumé problem. Employer benchmarks say relationship channels punch far above their share of applications. Seeker data says cold apply is still how many people get hired. Both can be true."
    >
      {/* BlogArticleLayout already emits BlogPosting + BreadcrumbList. Only add FAQPage here
          so we do not ship a second competing Article/BlogPosting graph. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
          url: CANONICAL,
        }}
      />
      <TableOfContents items={TOC} />

      <p>
        A 2026 job search can burn weeks on Easy Apply and still feel invisible. That silence is not always a verdict
        on your résumé. It is often a mismatch between how seekers spend time and how hiring teams fill seats.
      </p>
      <p>
        Inbound volume is enormous. Relationship-driven channels still convert better. Cold online apply remains, by
        some measures, the most common path into interviews and offers. The useful question is not &quot;applications
        or networking?&quot; It is how to split your hours so you are not optimizing for activity alone.
      </p>

      <Section title="Why job applications pile up while recruiters drown" id="pile-is-bigger">
        <p>
          Start with the recruiter&apos;s desk.{" "}
          <ExtLink href="https://www.gem.com/blog/key-takeaways-from-the-2026-recruiting-benchmarks-report">
            Gem&apos;s 2026 Recruiting Benchmarks
          </ExtLink>{" "}
          (drawn from more than 165 million applications and 1.2 million hires between June 2021 and May 2025) report
          that applications per recruiter rose to an average of about 5,327 in the June 2024–May 2025 window, up
          roughly 93% since 2021. Hires per recruiter did not keep pace.
        </p>
        <p>
          On the seeker side, the market feels harder for a related reason.{" "}
          <ExtLink href="https://news.linkedin.com/2026/LinkedIn-Research-Talent-2026">
            LinkedIn&apos;s early-2026 talent research
          </ExtLink>{" "}
          found that 65% of people say finding a job has become more challenging over the last year, with competition
          cited as the main hurdle. More people are applying. Recruiters are not reviewing every file with the care
          the volume implies.
        </p>
        <Callout kind="tip" title="What this means for your calendar">
          Extra Easy Apply clicks are a rational response to anxiety. They are a weak response to a funnel that is
          already drowning in inbound.
        </Callout>
      </Section>

      <Section title="Application volume vs referral conversion" id="volume-vs-conversion">
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>
          Job boards feed the funnel. Relationships fill seats.
        </h3>
        <p>
          Gem&apos;s same 2026 write-up is blunt on channel mix: job boards and company marketing generate roughly 90%
          of applications but about half of hires. Referrals convert at about{" "}
          <strong>11×</strong> the rate of inbound applicants. Direct sourcing delivers about 11% of hires from about
          2.6% of applications. Sourced candidates are nearly eight times more likely to be hired than inbound
          applicants. You can download the fuller cut from{" "}
          <ExtLink href="https://www.gem.com/resource/recruiting-benchmarks">Gem&apos;s benchmarks hub</ExtLink>.
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "20px 0 8px" }}>
          Referrals clear early screens more often
        </h3>
        <p>
          <ExtLink href="https://www.ashbyhq.com/talent-trends-report/reports/recruiting-operations-benchmarks-talent-trends">
            Ashby&apos;s 2026 Recruiting Operations Benchmarks
          </ExtLink>{" "}
          (54M+ applications, 93K jobs, January 2021 through March 2026) find referred candidates pass initial screens
          at <strong>52%</strong> versus about <strong>35%</strong> overall, with higher passthrough at later stages
          too. An earlier Ashby cut,{" "}
          <ExtLink href="https://www.ashbyhq.com/talent-trends-report/reports/referrals">
            Are referred candidates more likely to get hired?
          </ExtLink>
          , looking at 38M applications through 2024, reported that about 40% of referred candidates moved from
          application to interview, while inbound still made up about 93.8% of applications.
        </p>
        <p>
          That last point matters. Referrals are a minority of the input and a disproportionate share of the output.
          They are not a secret door that replaces applying. They change the odds on the roles you care about most.
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "20px 0 8px" }}>
          Nuance: cold apply is still how many people get hired
        </h3>
        <p>
          If you only read referral multiples, you might quit the portal tomorrow. That would overcorrect.{" "}
          <ExtLink href="https://www.glassdoor.com/blog/ai-has-not-killed-online-job-applications/">
            Glassdoor&apos;s analysis of self-reported interview reviews
          </ExtLink>{" "}
          found that in 2025, online applications still accounted for about 66% of interviews and 60% of job offers
          reported on the platform, down from higher shares in 2023.{" "}
          <ExtLink href="https://www.cnbc.com/2026/01/12/cold-applying-is-still-the-no-1-way-to-get-a-new-job-but-this-method-is-quickly-getting-more-common.html">
            CNBC Make It&apos;s Jennifer Liu
          </ExtLink>{" "}
          summarized the same Glassdoor trend: cold apply remains the No. 1 path by volume, while recruiter-sourced
          hires are climbing.
        </p>
        <p>
          So the honest synthesis is dual-track. Inbound still produces most interviews and offers because almost
          everyone uses it. Relationship channels produce better conversion per attempt. Spend hours as if both facts
          are true.
        </p>
      </Section>

      <Section title="What a working 2026 job search looks like" id="what-working-looks-like">
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>
          A connection to an employee is a real signal
        </h3>
        <p>
          LinkedIn&apos;s January 2026 Labor Market Report states that applicants are{" "}
          <strong>3.6× more likely to be hired</strong> when they are already connected to an employee at the company
          on LinkedIn before applying. LinkedIn summarizes that finding in its{" "}
          <ExtLink href="https://tcommunity.linkedin.com/community-news-72/labor-market-report-2026-2308">
            Talent Community Labor Market Report 2026 note
          </ExtLink>
          . That is platform data, not a coaching slogan. For early-career seekers, network access is also the barrier
          they name most often:{" "}
          <ExtLink href="https://news.linkedin.com/2026/Grads-Guide-2026">
            LinkedIn&apos;s 2026 Grad&apos;s Guide
          </ExtLink>{" "}
          reports that 44% of Gen Z cite not having the right network as the biggest obstacle to landing an
          entry-level role.
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "20px 0 8px" }}>
          Cap application hours. Put the rest into people.
        </h3>
        <p>
          Career coach{" "}
          <ExtLink href="https://www.linkedin.com/pulse/job-searching-2026-whats-actually-working-sarah-felice-ku2yc">
            Sarah Felice&apos;s 2026 &quot;what&apos;s actually working&quot; note
          </ExtLink>{" "}
          puts applications at about 40% of search activity at most, with 60–70% on networking, a typical response
          rate around 10%, and 4 to 6 weeks before real momentum. Treat that as experienced practitioner framing, not
          a census. It lines up directionally with the employer benchmarks above.
        </p>
        <p>
          Practitioner voices are getting sharper. In a{" "}
          <ExtLink href="https://www.cnbc.com/2026/01/22/recruiting-pro-of-30-years-if-i-was-looking-for-a-job-in-2026-i-would-honestly-stop-applying-online.html">
            January 2026 CNBC Make It interview
          </ExtLink>
          , recruiting pro J.T. O&apos;Donnell argued she would largely stop relying on online apply and focus on
          getting recruited: visibility, conversations, and being findable. You do not have to take the absolute
          version of that advice to take the priority shift seriously.
        </p>
        <Callout kind="warn" title="How to ask without being extractive">
          Lead with curiosity about the team and the role. Say you have already applied (or will). Ask what the hiring
          manager cares about. A forced &quot;can you refer me?&quot; as the first message is how warm leads go cold.
          For the two-sided playbook (how to ask, and how to offer help without drowning), see{" "}
          <Link href="/blog/employee-referrals-help-and-ask/" style={{ color: "var(--accent)" }}>
            Ask for a Referral Without Being Awkward
          </Link>
          , including Resunova&apos;s open referral desk at{" "}
          <Link href="/refer/" style={{ color: "var(--accent)" }}>
            /refer/
          </Link>
          .
        </Callout>
      </Section>

      <Section title="When you do apply, change the channel and the document" id="when-you-do-apply">
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>
          Prefer the company career page when you can
        </h3>
        <p>
          Discovery and submission are different steps.{" "}
          <ExtLink href="https://huntr.co/research/best-job-boards">
            Huntr&apos;s ranking of job boards by interview rate
          </ExtLink>{" "}
          (about 1.24 million tracked applications from October 2024 through July 2026) found applications through job
          boards converting at about <strong>1.95%</strong>, through ATS domains at about <strong>3.16%</strong>, and
          through employer career pages at about <strong>6.87%</strong>. Find the role on a board. Apply at the source
          when a clean path exists.
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "20px 0 8px" }}>
          Tailored beats untailored
        </h3>
        <p>
          Volume without fit is expensive.{" "}
          <ExtLink href="https://huntr.co/research/2025-annual-job-search-trends-report">
            Huntr&apos;s 2025 Annual Job Search Trends Report
          </ExtLink>{" "}
          found applications with a tailored résumé converting to interview, offer, or hire at <strong>5.8%</strong>{" "}
          versus <strong>3.73%</strong> without (about a 1.6× lift across roughly 1.7 million tracked applications).{" "}
          <ExtLink href="https://huntr.co/research/job-search-trends-q2-2026">Huntr&apos;s Q2 2026 cut</ExtLink> and{" "}
          <ExtLink href="https://huntr.co/research/job-search-trends-q1-2026">Q1 2026 report</ExtLink> show the same
          direction, with Q1 also recording a 108-day median from search start to first offer for its users. Fewer,
          better applications beat fifty one-click sends. If you want a concrete rewrite process for those few apps,
          see our guide on{" "}
          <Link href="/blog/tailor-resume-to-job-description/" style={{ color: "var(--accent)" }}>
            how to tailor a résumé to a job description
          </Link>
          .
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "20px 0 8px" }}>
          If you go cold, apply early
        </h3>
        <p>
          O&apos;Donnell&apos;s practical tip in the CNBC coverage is still useful when you do cold apply: set alerts
          and try to land in the first wave of applicants (she cites roughly the first 20 to 40). Early does not beat
          a strong match. It is a tie-breaker in a chronological pile. For how that pile is usually sorted inside
          common ATS products, see{" "}
          <Link href="/blog/how-ats-really-works/" style={{ color: "var(--accent)" }}>
            how ATS really works
          </Link>
          .
        </p>
      </Section>

      <Section title="A week that matches the data" id="week-shape">
        <p>
          You do not need a second full strategy manifesto. You need a shape you can repeat.
        </p>
        <List
          items={[
            {
              text: (
                <>
                  <strong>Monday to Thursday:</strong> a small number of high-fit applications, preferably on the
                  company career site, each with a tailored résumé. Same day, one human touch when you can find an
                  employee, alumni, or recruiter.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Friday:</strong> review interviews and replies by source (career page, board, referral,
                  inbound recruiter). Double down on the channel that moved, not the one that felt busiest.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Pace:</strong> budget weeks, not days, before judging the system. Felice&apos;s 4–6 week
                  momentum window and Huntr&apos;s long search-to-offer medians are different measurements of the same
                  advice: do not quit a sound process after ten silent applications.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Key takeaways" id="takeaways">
        <List
          items={[
            {
              text: (
                <>
                  <strong>Inbound is volume. Referrals and sourcing are conversion.</strong> Gem and Ashby disagree
                  on exact ratios but agree on the direction.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Do not abandon cold apply.</strong> Glassdoor and CNBC still show online applications as
                  the most common path into interviews and offers, even as that dominance softens.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Spend hours like a portfolio.</strong> Cap application time, invest in employee connections,
                  apply on career pages with a tailored résumé, and track outcomes by channel.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="FAQ" id="faq">
        {FAQ.map((f) => (
          <div key={f.q} style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>{f.q}</h3>
            <p style={{ margin: 0 }}>{f.a}</p>
          </div>
        ))}
      </Section>

      <Section title="Sources and caveats" id="sources">
        <p>
          Primary reports cited above come from Gem, Ashby, Glassdoor, LinkedIn, Huntr, CNBC Make It, and Sarah
          Felice&apos;s LinkedIn Pulse. Gem and Ashby samples are dominated by their customer bases (often tech-heavy).
          Referral multiples are correlational: referred candidates are frequently pre-screened. Glassdoor figures are
          self-reported interview and offer sources. Huntr figures come from job-tracker users, not a labor-force
          census. Where a coach states a time split or response rate, we label it as practitioner advice.
        </p>
        <ul style={{ margin: "12px 0 0", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          {PRIMARY_SOURCES.map((s) => (
            <li key={s.href} style={{ fontSize: 14 }}>
              <ExtLink href={s.href}>{s.label}</ExtLink>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 14 }}>
          Avoid recycled referral myths with no recent primary source (for example decade-old Jobvite retention
          percentages still republished as &quot;2026 stats&quot;). Prefer dated vendor benchmarks and newsroom
          summaries that name the underlying dataset.
        </p>
      </Section>

      <CTACard
        heading="Make the applications you do send count"
        body="When you pick a real role, score your résumé against that job description so the hours you spend on the portal match the channel research above. Free with an account, no credit card."
        href="/?view=analyze"
        cta="Score your résumé free"
      />
    </BlogArticleLayout>
  );
}
