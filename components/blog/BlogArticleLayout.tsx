import Link from "next/link";
import type { ReactNode } from "react";
import { LogoFull } from "@/components/BrandLogo";
import BlogEngagement from "@/components/blog/BlogEngagement";

export default function BlogArticleLayout({
  title,
  subtitle,
  meta,
  /** The blog post's slug (its /blog/<slug>/ segment). Renders the views/likes strip when set. */
  slug,
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  slug?: string;
  children: ReactNode;
}) {
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
          <Link href="/blog" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Blog
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Score my resume
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </nav>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 100px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
          Blog
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.1, lineHeight: 1.12, margin: "0 0 14px" }}>
          {title}
        </h1>
        {subtitle ? (
          <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 16px" }}>
            {subtitle}
          </p>
        ) : null}
        {meta ? <div style={{ margin: "0 0 14px" }}>{meta}</div> : null}
        {slug ? (
          <BlogEngagement slug={slug} />
        ) : (
          <div style={{ margin: meta ? "0 0 32px" : "0 0 36px", paddingBottom: 28, borderBottom: "1px solid var(--border)" }} />
        )}
        <article style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)" }}>{children}</article>
      </main>
    </div>
  );
}

/* Byline / read-time row shown under the subtitle. */
function ByLine({ readMinutes, updated }: { readMinutes: number; updated: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: "var(--dim)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent)", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden>
          R
        </span>
        Resunova Team
      </span>
      <span aria-hidden>·</span>
      <span>{readMinutes} min read</span>
      <span aria-hidden>·</span>
      <span>Updated {updated}</span>
    </div>
  );
}

/* On-page table of contents. */
function TableOfContents({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="On this page"
      style={{
        margin: "0 0 36px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "16px 20px",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--dim)", margin: "0 0 12px" }}>
        On this page
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
        {items.map((it, i) => (
          <li key={it.id} style={{ display: "flex", gap: 8, fontSize: 13.5 }}>
            <span style={{ color: "var(--dim)", fontWeight: 700, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
            <a href={`#${it.id}`} style={{ color: "var(--muted)", textDecoration: "none" }}>
              {it.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* A titled section with an optional anchor + numbered step badge. */
function ArticleSection({
  title,
  id,
  step,
  children,
}: {
  title: string;
  id?: string;
  step?: number;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: 36, scrollMarginTop: 72 }}>
      <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 12 }}>
        {typeof step === "number" ? (
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--accent)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {step}
          </span>
        ) : null}
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

function List({ items }: { items: { text: ReactNode }[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ color: "var(--muted)" }}>{item.text}</li>
      ))}
    </ul>
  );
}

/* Wraps a product visual with a caption. */
function Figure({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <figure style={{ margin: "22px 0" }}>
      {children}
      <figcaption style={{ marginTop: 10, fontSize: 12.5, color: "var(--dim)", textAlign: "center", lineHeight: 1.5 }}>
        {caption}
      </figcaption>
    </figure>
  );
}

/* Tip / warning callout. */
function Callout({ kind = "tip", title, children }: { kind?: "tip" | "warn"; title: string; children: ReactNode }) {
  const tip = kind === "tip";
  const accent = tip ? "var(--accent)" : "var(--red)";
  const bg = tip ? "var(--accent-bg)" : "var(--red-bg)";
  return (
    <div
      style={{
        margin: "20px 0",
        borderRadius: 12,
        border: `1px solid ${tip ? "rgba(47,129,247,0.3)" : "rgba(248,113,113,0.3)"}`,
        background: bg,
        padding: "14px 16px",
        display: "flex",
        gap: 12,
      }}
    >
      <span aria-hidden style={{ color: accent, fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>
        {tip ? "💡" : "⚠️"}
      </span>
      <div>
        <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{title}</p>
        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

/* Bottom-of-article call to action card. */
function CTACard({ heading, body, href, cta }: { heading: string; body: string; href: string; cta: string }) {
  return (
    <div
      style={{
        margin: "40px 0 8px",
        borderRadius: 16,
        border: "1px solid rgba(47,129,247,0.3)",
        background: "linear-gradient(135deg, var(--accent-bg), transparent 70%)",
        padding: "26px 24px",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: -0.4, margin: "0 0 8px" }}>{heading}</h2>
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 auto 18px", maxWidth: 460 }}>{body}</p>
      <Link
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 22px",
          borderRadius: 10,
          background: "var(--accent)",
          color: "#fff",
          fontSize: 14.5,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        {cta}
        <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

export { ArticleSection as Section, List, ByLine, TableOfContents, Figure, Callout, CTACard };
