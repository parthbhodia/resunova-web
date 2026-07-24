import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import {
  BLOG_POSTS,
  blogPostHref,
  formatPublishedAt,
  hasFinding,
  type BlogPostMeta,
} from "@/lib/atsBlogPosts";

export const metadata: Metadata = {
  // No "· Resunova" suffix here: the root layout applies template "%s · Resunova".
  title: "Blog",
  description:
    "Original research from a live corpus of about 270,000 job postings pulled straight from company hiring systems, plus practical guides to the software reading your résumé.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/blog/" },
  openGraph: {
    type: "website",
    url: "/blog/",
    siteName: "Resunova",
    title: "Resunova Job Market Research and Resume Guides",
    description:
      "Original job-market research from Resunova's live postings corpus, plus practical resume, ATS, and job-search guides.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resunova Job Market Research and Resume Guides",
    description:
      "Original job-market research from Resunova's live postings corpus, plus practical resume, ATS, and job-search guides.",
  },
};

const research = BLOG_POSTS.filter(hasFinding);
const guides = BLOG_POSTS.filter((p) => !hasFinding(p));
const [lede, ...restResearch] = research;

export default function BlogIndexPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: 56,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <LogoFull markSize={26} textColor="var(--text)" />
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
          <Link href="/resume-examples" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Resume Examples
          </Link>
          <Link href="/" style={{ color: "var(--dim)", textDecoration: "none" }}>
            App
          </Link>
        </nav>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 24px 90px" }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, margin: "0 0 12px" }}>Blog</h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 14px", maxWidth: 640 }}>
          We pull about 270,000 live job postings straight from company hiring systems, then publish what the numbers
          actually say. Plus practical guides to the software reading your résumé.
        </p>
        <p style={{ fontSize: 12, color: "var(--dim)", margin: "0 0 40px" }}>
          Every figure below is measured from that corpus. Methodology and caveats are published with each post.
        </p>

        <SectionHeading>Original research</SectionHeading>

        {lede ? <LedeCard post={lede} /> : null}

        {restResearch.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              margin: "16px 0 0",
              padding: 0,
              display: "grid",
              // auto-fit rather than a fixed column count: no media query needed,
              // and it collapses to one column on a phone on its own.
              gridTemplateColumns: "repeat(auto-fit, minmax(272px, 1fr))",
              gap: 16,
            }}
          >
            {restResearch.map((post) => (
              <li key={post.slug} style={{ display: "flex" }}>
                <ResearchCard post={post} />
              </li>
            ))}
          </ul>
        ) : null}

        {guides.length > 0 ? (
          <>
            <SectionHeading style={{ marginTop: 56 }}>Guides and background</SectionHeading>
            {/* These drop card treatment entirely. They're the reference half of
                the blog, and subordinating them by format (not by a dimmer copy of
                the same card) is what keeps them from competing with the research
                above. They carry no stat, and we don't invent filler for the slot. */}
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {guides.map((post, i) => (
                <li key={post.slug} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <GuideRow post={post} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </main>
    </div>
  );
}

function SectionHeading({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--dim)",
        borderTop: "1px solid var(--border)",
        padding: "14px 0 0",
        margin: "0 0 16px",
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "var(--accent)",
        background: "var(--accent-bg)",
        borderRadius: 999,
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {tag}
    </span>
  );
}

function MetaLine({ post }: { post: BlogPostMeta }) {
  const date = formatPublishedAt(post.publishedAt);
  return (
    <div style={{ fontSize: 12, color: "var(--dim)", display: "flex", alignItems: "center", gap: 8 }}>
      {date ? <time dateTime={post.publishedAt}>{date}</time> : null}
      {date ? <span aria-hidden>·</span> : null}
      <span>{post.readMinutes} min read</span>
    </div>
  );
}

/**
 * The stat block mirrors the composition of the post's own OG card
 * (lib/ogImage.tsx): headline number in accent, set large, sitting directly
 * above the title. Reusing that arrangement is why a card reads as a finding
 * rather than a link, and it means the stat can be any width without a fixed
 * gutter to overflow ("41% -> 14%" is as valid as "13").
 */
function Stat({ post, size }: { post: BlogPostMeta; size: number | string }) {
  if (!post.stat) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: "var(--accent)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {post.stat}
      </div>
      {post.statLabel ? (
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, marginTop: 8, maxWidth: 340 }}>
          {post.statLabel}
        </div>
      ) : null}
    </div>
  );
}

const cardBase: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  padding: "22px 22px 20px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  // Deliberately --surface, not --surface2: surface2 is *lighter* than surface
  // in dark theme and darker in light, so using it to mean "quieter" inverts
  // between themes. It also drops --dim text below AA contrast.
  background: "var(--surface)",
  textDecoration: "none",
  color: "inherit",
};

function LedeCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={blogPostHref(post.slug)} className="bx-card" style={{ ...cardBase, padding: "30px 30px 26px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <TagPill tag={post.tag} />
        <MetaLine post={post} />
      </div>
      {/* clamp() rather than a media query: the stat shrinks on a phone by itself. */}
      <Stat post={post} size="clamp(44px, 7vw, 68px)" />
      <h3
        className="bx-title"
        style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.25, margin: "4px 0 8px", maxWidth: 720 }}
      >
        {post.title}
      </h3>
      <p style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.6, margin: 0, maxWidth: 720 }}>
        {post.description}
      </p>
    </Link>
  );
}

function ResearchCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={blogPostHref(post.slug)} className="bx-card" style={cardBase}>
      <div style={{ marginBottom: 14 }}>
        <TagPill tag={post.tag} />
      </div>
      <Stat post={post} size={34} />
      <h3
        className="bx-title"
        style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.35, margin: "2px 0 8px" }}
      >
        {post.title}
      </h3>
      <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 16px" }}>
        {post.description}
      </p>
      {/* marginTop:auto pins the meta line to the bottom so every card in a row
          aligns regardless of how long its title and description run. */}
      <div style={{ marginTop: "auto" }}>
        <MetaLine post={post} />
      </div>
    </Link>
  );
}

function GuideRow({ post }: { post: BlogPostMeta }) {
  return (
    <Link
      href={blogPostHref(post.slug)}
      className="bx-row"
      style={{
        display: "block",
        // Negative inline margin + matching padding: the hover wash extends past
        // the text without the text shifting when it appears.
        padding: "18px 14px",
        margin: "0 -14px",
        borderRadius: 10,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <h3 className="bx-title" style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2, margin: "0 0 5px" }}>
        {post.title}
      </h3>
      <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 8px", maxWidth: 720 }}>
        {post.description}
      </p>
      <MetaLine post={post} />
    </Link>
  );
}
