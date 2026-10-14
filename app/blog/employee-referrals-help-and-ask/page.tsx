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

const SLUG = "employee-referrals-help-and-ask";
const CANONICAL = blogPostCanonical(SLUG);
const TITLE = "Ask for a Referral Without Being Awkward (And Offer One Without Getting Flooded)";

export const metadata = createBlogPostMetadata("employee-referrals-help-and-ask");

const TOC = [
  { id: "why-referrals", label: "Why referrals keep winning" },
  { id: "two-sides", label: "Two sides of the same desk" },
  { id: "how-to-ask", label: "How to ask without being extractive" },
  { id: "how-to-help", label: "How to help without drowning" },
  { id: "weekly-loop", label: "A weekly loop that connects both" },
  { id: "takeaways", label: "Key takeaways" },
  { id: "faq", label: "FAQ" },
  { id: "sources", label: "Sources" },
];

const FAQ = [
  {
    q: "Does asking for a referral replace applying?",
    a: "No. Cold apply is still how many people get interviews and offers by volume. A referral changes the odds on roles you care about most. Apply when the fit is real, then ask someone who can vouch for you.",
  },
  {
    q: "How do I find someone open to refer on Resunova?",
    a: "Go to /refer/, sign in, and browse companies where an employee has published an open referrer desk. Names stay private on the company grid until you open a personal share link.",
  },
  {
    q: "How do I offer referrals to other job seekers?",
    a: "From Profile → Referrals, publish that you work at a company and are open to refer. Share your private link, or leave the desk open so your company appears in the /refer/ directory. Pause anytime you are at capacity.",
  },
  {
    q: "Does Resunova submit my application to the company's ATS?",
    a: "No. Resunova never writes into the employer's ATS. The employee decides whether to refer you through their company's normal process.",
  },
];

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
      {children}
    </a>
  );
}

function IntLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: "var(--accent)" }}>
      {children}
    </Link>
  );
}

export default function EmployeeReferralsHelpAndAskPage() {
  return (
    <BlogArticleLayout
      slug={SLUG}
      title={TITLE}
      subtitle="Referrals convert better than cold inbound. Almost nobody has a clean way to ask, or to say &quot;I can help&quot; without turning their inbox into chaos. Here is the research, and a desk that works both ways."
    >
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
        Most job seekers know employee referrals matter. Fewer have a script that does not feel like begging. On the
        other side, employees who want to help often hide, because every open LinkedIn status turns into fifty vague
        &quot;pls refer&quot; messages.
      </p>
      <p>
        The data says relationship channels punch above their weight. The missing piece is operational: a place to find
        people who are actually open, and a place to offer help without promising the world. That is what a referral
        desk is for.
      </p>

      <Section title="Why referrals keep showing up in the data" id="why-referrals">
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>
          Conversion, not volume
        </h3>
        <p>
          Employer-side benchmarks keep repeating the same pattern.{" "}
          <ExtLink href="https://www.gem.com/blog/key-takeaways-from-the-2026-recruiting-benchmarks-report">
            Gem&apos;s 2026 Recruiting Benchmarks
          </ExtLink>{" "}
          find referrals convert at about <strong>11×</strong> the rate of inbound applicants, while job boards and
          marketing still generate most of the application volume.{" "}
          <ExtLink href="https://www.ashbyhq.com/talent-trends-report/reports/recruiting-operations-benchmarks-talent-trends">
            Ashby&apos;s 2026 operations benchmarks
          </ExtLink>{" "}
          show referred candidates passing initial screens at about <strong>52%</strong> versus about{" "}
          <strong>35%</strong> overall.
        </p>
        <p>
          Those gaps are correlational. Referred candidates are often pre-vetted. The practical takeaway still holds:
          an hour spent finding a real human at a target company usually beats another dozen blind Easy Apply clicks.
          We unpack the fuller channel mix (including why cold apply still lands many offers by volume) in{" "}
          <IntLink href="/blog/job-search-2026-whats-working/">
            Most of Your Job Search Shouldn&apos;t Be Applications
          </IntLink>
          .
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "20px 0 8px" }}>
          A connection is a signal, not a spam script
        </h3>
        <p>
          LinkedIn&apos;s January 2026 Labor Market Report states that applicants are about{" "}
          <strong>3.6× more likely to be hired</strong> when they are already connected to an employee at the company.
          LinkedIn summarizes that finding in its{" "}
          <ExtLink href="https://tcommunity.linkedin.com/community-news-72/labor-market-report-2026-2308">
            Talent Community Labor Market Report 2026 note
          </ExtLink>
          . A connection helps. A forced first message that only says &quot;can you refer me?&quot; still burns the connection.
        </p>
      </Section>

      <Section title="Two jobs, two sides of the same desk" id="two-sides">
        <p>
          Resunova&apos;s company referrer feature is built as a <strong>desk</strong>, not a points game. An employee
          publishes &quot;I work at X and can refer.&quot; A candidate asks through a private link or a company search. The
          employee decides who to submit. Resunova never writes into the company&apos;s ATS.
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "20px 0 8px" }}>
          If you need a referral
        </h3>
        <p>
          Start at{" "}
          <IntLink href="/refer/">resunova.io/refer/</IntLink>
          . Sign in, then browse companies where someone has left their desk open. The grid shows companies and open
          counts, not a public list of every employee name. When you have a personal share link (
          <code style={{ fontSize: 13 }}>/refer/?s=…</code>
          ), you open one person, one company, one request form.
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "20px 0 8px" }}>
          If you can help someone else
        </h3>
        <p>
          From{" "}
          <IntLink href="/profile?tab=referrals">Profile → Referrals</IntLink>
          , publish that you are open to refer at your company. Share your private link with people you already trust,
          or leave the desk open so your company appears in the directory for signed-in seekers. You can pause whenever
          you are at capacity. Paused desks drop out of search, and inactive links stop taking new asks.
        </p>

        <Callout kind="tip" title="What Resunova does not do">
          We do not auto-submit you into Workday, Greenhouse, or any other ATS. A referral still goes through the
          employee and their company&apos;s normal process. That is the point: a human vouch, not a bot queue jump.
        </Callout>
      </Section>

      <Section title="How to ask without being extractive" id="how-to-ask">
        <List
          items={[
            {
              text: (
                <>
                  <strong>Prefer open desks over cold strangers.</strong> Someone who published &quot;I can refer&quot; has
                  already opted in. That is a different social contract from scraping LinkedIn for anyone with the
                  company logo.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Lead with fit, not the ask.</strong> Name the role, why this company, and the one or two
                  facts that make you a credible match. Then ask if a referral is appropriate.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>One clear package.</strong> One target role, one résumé version, one short note. If you need
                  the résumé to match the posting first,{" "}
                  <IntLink href="/blog/tailor-resume-to-job-description/">
                    tailor it to the job description
                  </IntLink>{" "}
                  before you ask anyone to stake their name on it.
                </>
              ),
            },
          ]}
        />
        <Callout kind="warn" title="The message that kills warm leads">
          Opening with &quot;pls refer&quot; and a generic PDF is how helpful employees close their desk. Curiosity about the
          team, then a specific ask, keeps the door open even if they say no.
        </Callout>
      </Section>

      <Section title="How to help other job seekers without drowning" id="how-to-help">
        <List
          items={[
            {
              text: (
                <>
                  <strong>Open when you have capacity.</strong> A published desk is a promise of attention, not of an
                  automatic yes. Pause when your week is full.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Keep the grid private by design.</strong> On{" "}
                  <IntLink href="/refer/">/refer/</IntLink>
                  , signed-in seekers see companies with open referrers. Person names stay behind a share link, so you
                  are not permanently listed as a public help desk for the entire internet.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Use honest statuses.</strong> Requests move through requested → reviewing → referred or
                  declined. A clear decline is kinder than silence, and it keeps your inbox from becoming a black hole
                  of half-promises.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Refer only what you can defend.</strong> If you would not put your name on the candidate in
                  a hallway conversation with the hiring manager, do not submit them. Helping is not the same as rubber
                  stamping.
                </>
              ),
            },
          ]}
        />
        <p>
          If nobody at your company has published yet, you can be the first. That is how the directory grows: one
          employee at a time, not a scraped contact list.
        </p>
      </Section>

      <Section title="A weekly loop that connects both posts" id="weekly-loop">
        <p>
          Pair this with the channel research in{" "}
          <IntLink href="/blog/job-search-2026-whats-working/">the 2026 job-search guide</IntLink>
          :
        </p>
        <List
          items={[
            {
              text: (
                <>
                  <strong>Apply narrow.</strong> Prefer the company career page, with a tailored résumé, for roles you
                  actually match.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Same day, find a human.</strong> Check{" "}
                  <IntLink href="/refer/">/refer/</IntLink> for that company, use a private share link if you have one,
                  or message a real connection with a specific note.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>If you work somewhere, pay it forward.</strong> Keep your desk open for people whose
                  backgrounds you can honestly support. Pause when you cannot.
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
                  <strong>Referrals win on conversion.</strong> Gem and Ashby disagree on exact ratios and agree on
                  direction. Cold apply still matters for coverage.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Ask where people have opted in.</strong> Open desks beat spray-and-pray DMs.
                </>
              ),
            },
            {
              text: (
                <>
                  <strong>Help with a pause button.</strong> Publish, share a link, decide case by case, and never let
                  a tool pretend it submitted the referral for you.
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
          Channel benchmarks cited above come from Gem, Ashby, and LinkedIn&apos;s Labor Market Report summary. They
          describe employer-side funnel behavior, not Resunova product outcomes. We do not invent referral conversion
          rates for our own desks. Product details here match the shipped company-referrer flow: open company
          directory, private share links, auth gate, pause, employee decision, no ATS write.
        </p>
        <ul style={{ margin: "12px 0 0", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          <li style={{ fontSize: 14 }}>
            <ExtLink href="https://www.gem.com/blog/key-takeaways-from-the-2026-recruiting-benchmarks-report">
              Gem 2026 Recruiting Benchmarks
            </ExtLink>
          </li>
          <li style={{ fontSize: 14 }}>
            <ExtLink href="https://www.ashbyhq.com/talent-trends-report/reports/recruiting-operations-benchmarks-talent-trends">
              Ashby Recruiting Operations Benchmarks 2026
            </ExtLink>
          </li>
          <li style={{ fontSize: 14 }}>
            <ExtLink href="https://www.ashbyhq.com/talent-trends-report/reports/referrals">
              Ashby: Are referred candidates more likely to get hired?
            </ExtLink>
          </li>
          <li style={{ fontSize: 14 }}>
            <ExtLink href="https://tcommunity.linkedin.com/community-news-72/labor-market-report-2026-2308">
              LinkedIn Talent Community: Labor Market Report 2026
            </ExtLink>
          </li>
        </ul>
      </Section>

      <CTACard
        heading="Find an open referrer, or publish your own desk"
        body="Browse companies where employees are open to refer, or share a private link from Profile when you can help someone else."
        href="/refer/"
        cta="Open the referral desk"
      />
    </BlogArticleLayout>
  );
}
