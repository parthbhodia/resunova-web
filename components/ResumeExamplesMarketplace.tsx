"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, CheckCircle2, ArrowRight, ChevronDown, Zap, Star } from "lucide-react";
import type { ResumeCatalogExample } from "@/lib/resumeExamplesCatalog";
import { PUBLIC_RESUME_EXAMPLES } from "@/lib/resumeExamplesCatalog";
import { RESUME_CATEGORIES, TOTAL_RESUME_EXAMPLES, TOTAL_RESUME_CATEGORIES } from "@/lib/resumeExampleCategories";
import { ROLE_RESUME_DATA, roleResumeHref } from "@/lib/roleResumeData";
import { stashTemplateBuilderExactPrefill } from "@/lib/templateBuilderPrefill";
import ResumeThumbnail from "@/components/seo/ResumeThumbnail";
import ResumePreview from "@/components/TemplateBuilder/ResumePreview";

const ALL = "All";
const PAGE_SIZE = 12;

const KEPT_ALL_TITLES = [
  "Clean Balanced Resume Template",
  "Sleek Professional Resume",
  "Modern Color Accent Resume",
  "Professional and Clear Resume",
  "Project Coordinator",
  "Modern Bookmark Resume",
  "Inline Minimalist Resume",
  "Green Line Split Resume",
  "Bold Red Line Resume",
  "Purple Lavender Sidebar Resume",
];

// Real, recognizable roles that have a sourced role page — not a random pick.
const QUICK_ROLES = ["software-engineer", "product-manager", "data-analyst", "sales-representative"];

const FEATURED_EXAMPLE: ResumeCatalogExample = PUBLIC_RESUME_EXAMPLES.reduce((best, e) =>
  e.score > best.score ? e : best,
);

const WHY_IT_WORKS: string[] = [
  "Every bullet leads with a strong action verb and closes on a measurable outcome — not a duty list.",
  "A clean, single-column layout that every major ATS parses without scrambling sections.",
  "Contact info and job titles in the body text, not baked into a header image an ATS can't read.",
  `Scored ${FEATURED_EXAMPLE.score}/100 by Resunova's 8-dimension analysis — the same scoring you get on your own résumé, free.`,
];

function scrollToGrid() {
  document.getElementById("example-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ResumeExamplesMarketplace() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prefillError, setPrefillError] = useState("");
  const [previewExample, setPreviewExample] = useState<ResumeCatalogExample | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const levels = useMemo(
    () => [ALL, ...Array.from(new Set(PUBLIC_RESUME_EXAMPLES.map((e) => e.level)))],
    [],
  );

  const filtered = useMemo(
    () =>
      PUBLIC_RESUME_EXAMPLES.filter((e) => {
        const matchesQuery =
          !deferredQuery ||
          [e.title, e.category, e.desc, ...(e.tags || []), ...(e.data.skills?.featuredSkills || []).map(({ skill }) => skill)]
            .join(" ")
            .toLowerCase()
            .includes(deferredQuery);
        if (category === ALL) {
          return matchesQuery && (level === ALL || e.level === level) && KEPT_ALL_TITLES.includes(e.title);
        } else {
          return matchesQuery && e.category === category && (level === ALL || e.level === level);
        }
      }),
    [deferredQuery, category, level],
  );
  const visible = filtered.slice(0, visibleCount);

  function resetPaging() {
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearchSubmit() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const roleMatch = ROLE_RESUME_DATA.find((r) => r.label.toLowerCase().includes(q) || q.includes(r.label.toLowerCase()));
    if (roleMatch) {
      router.push(`${roleResumeHref(roleMatch.slug)}/`);
      return;
    }
    scrollToGrid();
  }

  function handleCategoryClick(name: string, roleHref: string | null) {
    if (roleHref) {
      router.push(roleHref);
      return;
    }
    setCategory((c) => (c === name ? ALL : name));
    resetPaging();
    setTimeout(scrollToGrid, 50);
  }

  function handleUseExample(example: ResumeCatalogExample) {
    if (!stashTemplateBuilderExactPrefill(example.data)) {
      setPrefillError("This example could not be opened. Check your browser storage settings and try again.");
      return;
    }
    setPrefillError("");
    router.push("/template-builder");
  }

  const sectionTitle = { fontSize: 28, fontWeight: 800, letterSpacing: -0.7, margin: 0, color: "var(--text)" } as const;
  const kicker = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "var(--accent)",
    marginBottom: 10,
  };

  return (
    <div>
      {/* Hero */}
      <section style={{ position: "relative", textAlign: "center", padding: "8px 0 40px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            padding: "7px 14px",
            borderRadius: 999,
            background: "var(--accent-bg)",
            color: "var(--accent)",
            border: "1px solid var(--accent)",
            marginBottom: 20,
          }}
        >
          <Zap size={14} aria-hidden />
          {TOTAL_RESUME_EXAMPLES}+ real example résumés · {TOTAL_RESUME_CATEGORIES} career categories
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.08, margin: "0 0 16px", color: "var(--text)" }}>
          Find the perfect resume example
        </h1>
        <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.65 }}>
          Browse real, scored resume examples across {TOTAL_RESUME_CATEGORIES} careers. Get inspired, then tailor one
          into an ATS-friendly resume of your own — free.
        </p>

        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--surface)",
              border: "2px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <Search size={18} aria-hidden style={{ color: "var(--dim)", marginLeft: 16, flexShrink: 0 }} />
            <input
              type="search"
              aria-label="Search resume examples"
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetPaging(); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); }}
              placeholder="Search by job title (e.g. Software Engineer, Product Manager)"
              style={{ flex: 1, padding: "14px 12px", fontSize: 14, background: "transparent", border: "none", outline: "none", color: "var(--text)" }}
            />
            <button
              type="button"
              onClick={handleSearchSubmit}
              style={{ margin: 8, padding: "10px 20px", borderRadius: 10, background: "var(--accent)", color: "var(--accent-foreground)", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}
            >
              Search
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 }}>
            {QUICK_ROLES.map((slug) => {
              const role = ROLE_RESUME_DATA.find((r) => r.slug === slug);
              if (!role) return null;
              return (
                <Link
                  key={slug}
                  href={`${roleResumeHref(slug)}/`}
                  style={{ fontSize: 13, color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, padding: "6px 14px", textDecoration: "none" }}
                >
                  {role.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 32, marginTop: 40, fontSize: 14, color: "var(--muted)" }}>
          {[
            { value: `${TOTAL_RESUME_EXAMPLES}+`, label: "real resume examples" },
            { value: `${TOTAL_RESUME_CATEGORIES}`, label: "career categories" },
            { value: "Free", label: "no sign-up to browse" },
          ].map(({ value, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{value}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Category tiles */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ ...kicker }}>Browse by career</div>
        <h2 style={sectionTitle}>Popular career categories</h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", marginTop: 20 }}>
          {RESUME_CATEGORIES.map(({ name, icon: Icon, color, count, roleHref }) => (
            <button
              key={name}
              type="button"
              onClick={() => handleCategoryClick(name, roleHref)}
              style={{
                textAlign: "left",
                padding: 16,
                borderRadius: 14,
                border: category === name ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: category === name ? "var(--accent-bg)" : "var(--surface)",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                  background: `${color}1f`,
                  color,
                }}
              >
                <Icon size={18} />
              </span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: 2 }}>{name}</div>
              <div style={{ fontSize: 12, color: "var(--dim)" }}>{count} examples</div>
            </button>
          ))}
        </div>
      </section>

      {/* Sticky filter bar */}
      <div
        style={{
          position: "sticky",
          top: 56,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
          overflowX: "auto",
          padding: "16px 0",
          margin: "0 0 32px",
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flexShrink: 0, marginRight: 8 }}>
          Filter by Level:
        </span>
        {levels.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => { setLevel(l); resetPaging(); }}
            style={{
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: 999,
              border: level === l ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: level === l ? "var(--accent)" : "var(--surface)",
              color: level === l ? "var(--accent-foreground)" : "var(--text)",
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
        {category !== ALL && (
          <button
            type="button"
            onClick={() => { setCategory(ALL); resetPaging(); }}
            style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, padding: "7px 14px", borderRadius: 999, border: "1px dashed var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}
          >
            {category} ✕
          </button>
        )}
      </div>

      {/* Example grid */}
      <section id="example-grid" style={{ marginBottom: 64 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, color: "var(--text)", margin: 0 }}>
            {category === ALL ? "All resume templates" : `${category} templates`}
          </h2>
          <span aria-live="polite" style={{ fontSize: 15, fontWeight: 600, color: "var(--muted)" }}>
            Showing {filtered.length} {filtered.length === 1 ? "template" : "templates"}
          </span>
        </div>
        {prefillError && <p role="alert" style={{ color: "var(--red-ink, #dc2626)", fontSize: 14, fontWeight: 500, margin: "0 0 16px" }}>{prefillError}</p>}
        <div style={{ display: "grid", gap: "36px 28px", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {visible.map((example) => (
            <div
              key={`${example.category}-${example.title}`}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "265px",
                height: "342px",
                margin: "0 auto",
                borderRadius: 16,
                overflow: "hidden",
                background: "#ffffff",
                border: "1px solid var(--border, #e2e8f0)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.07)",
                transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = "0 16px 36px -4px rgba(0, 0, 0, 0.14)";
                const overlay = e.currentTarget.querySelector(".hover-overlay") as HTMLElement;
                if (overlay) overlay.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.07)";
                const overlay = e.currentTarget.querySelector(".hover-overlay") as HTMLElement;
                if (overlay) overlay.style.opacity = "0";
              }}
            >
              <div
                style={{
                  pointerEvents: "none",
                  zoom: 0.325,
                  WebkitFontSmoothing: "antialiased",
                  width: "8.5in",
                  height: "11in",
                  transformOrigin: "top center",
                }}
              >
                <ResumePreview data={example.data} />
              </div>

              {/* Hover Overlay */}
              <div
                className="hover-overlay"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 16,
                  backgroundColor: "rgba(15, 23, 42, 0.55)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  opacity: 0,
                  transition: "opacity 0.2s ease",
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewExample(example)}
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "none",
                    borderRadius: 999,
                    padding: "10px 22px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    width: "80%",
                    maxWidth: 180,
                  }}
                >
                  View Template
                </button>
                <button
                  type="button"
                  onClick={() => handleUseExample(example)}
                  style={{
                    background: "#f5b900",
                    color: "#000000",
                    border: "none",
                    borderRadius: 999,
                    padding: "10px 22px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(245, 185, 0, 0.35)",
                    width: "80%",
                    maxWidth: 180,
                  }}
                >
                  Use this Template
                </button>
              </div>
            </div>
          ))}
        </div>
        {!filtered.length && (
          <p style={{ textAlign: "center", padding: 24, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)" }}>
            No examples match those filters.
          </p>
        )}
        {visibleCount < filtered.length && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 24px", borderRadius: 999, border: "2px solid var(--border)", background: "transparent", color: "var(--text)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Load more examples <ChevronDown size={16} aria-hidden />
            </button>
          </div>
        )}
      </section>

      {/* Preview Modal */}
      {previewExample && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40
        }} onClick={() => setPreviewExample(null)}>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            position: "relative",
            maxHeight: "90vh",
            maxWidth: "90vw",
            width: 1100,
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
          }} onClick={e => e.stopPropagation()}>
            <button 
              style={{ position: "absolute", top: 16, right: 20, background: "transparent", border: "none", cursor: "pointer", fontSize: 24, color: "#999", zIndex: 10 }}
              onClick={() => setPreviewExample(null)}
            >✕</button>
            
            {/* Left side: Resume Preview */}
            <div style={{ 
              flex: "1 1 60%",
              minWidth: 0,
              background: "#e2e8f0", 
              overflow: "auto", 
              display: "flex", 
              justifyContent: "center", 
              padding: "40px 20px" 
            }}>
              <div style={{ zoom: 0.7, WebkitFontSmoothing: "antialiased", background: "#fff", boxShadow: "0 0 20px rgba(0,0,0,0.1)", height: "fit-content" }}>
                <ResumePreview data={previewExample.data} />
              </div>
            </div>
            
            {/* Right side: Info */}
            <div style={{ 
              flex: "0 0 40%",
              minWidth: 0,
              padding: "40px 32px", 
              display: "flex", 
              flexDirection: "column", 
              overflowY: "auto" 
            }}>
              <div style={{ display: "inline-block", background: "var(--indigo-50, #eef2ff)", color: "var(--indigo-700, #4338ca)", padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, marginBottom: 16, width: "fit-content" }}>
                {previewExample.category} • {previewExample.level}
              </div>
              
              <h3 style={{ margin: "0 0 16px 0", fontSize: 32, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{previewExample.title}</h3>
              
              <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6, marginBottom: 32 }}>
                {previewExample.desc}
              </p>
              
              <div style={{ marginBottom: "auto" }}>
                <h4 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 12 }}>Tags</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {previewExample.tags.map(t => (
                    <span key={t} style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: 6, fontSize: 13, color: "var(--dim)", fontWeight: 500 }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              
              <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 32 }}>
                <button 
                  onClick={() => handleUseExample(previewExample)}
                  style={{ width: "100%", background: "#f5b900", color: "#000", padding: "16px 24px", borderRadius: 12, fontWeight: 700, fontSize: 18, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(245, 185, 0, 0.3)", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
                >
                  <Zap size={20} fill="currentColor" /> Use this Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured résumé */}
      <section
        style={{
          marginBottom: 56,
          padding: "40px 28px",
          borderRadius: 24,
          background: "linear-gradient(135deg, #0f172a, #1e2a4a)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#60a5fa", marginBottom: 8 }}>
              Top-scoring example
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -0.5 }}>Featured resume</h2>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 999, padding: "6px 12px" }}>
            <Star size={14} aria-hidden style={{ fill: "currentColor" }} /> Resunova score {FEATURED_EXAMPLE.score}/100
          </span>
        </div>

        <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 14 }}>
            <ResumeThumbnail data={FEATURED_EXAMPLE.data} height={340} zoom={0.5} />
          </div>
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{FEATURED_EXAMPLE.title}</h3>
            <p style={{ color: "#93c5fd", margin: "0 0 20px", fontSize: 14 }}>{FEATURED_EXAMPLE.category} · {FEATURED_EXAMPLE.level}</p>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Why this resume works
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {WHY_IT_WORKS.map((point) => (
                  <li key={point} style={{ display: "flex", gap: 10, fontSize: 14, color: "#cbd5e1", lineHeight: 1.55 }}>
                    <CheckCircle2 size={16} aria-hidden style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleUseExample(FEATURED_EXAMPLE)}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--accent-foreground)", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              Use this resume <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {/* Career resources — real, existing pages only */}
      <section style={{ marginBottom: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ ...kicker }}>Level up</div>
          <h2 style={sectionTitle}>Career resources</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "10px auto 0", maxWidth: 460 }}>
            Free tools and guides to give your job search a competitive edge.
          </p>
        </div>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {[
            { title: "ATS Resume Checker", desc: "Free instant score across 8 dimensions, with fixes for every weak bullet.", href: "/ats-resume-checker/" },
            { title: "Cover Letter Generator", desc: "AI drafts a tailored letter from your real resume and the job description.", href: "/cover-letter/" },
            { title: "Skills Employers Want", desc: "Published, cited skill-demand data for 12 roles — know what to list.", href: "/skills-for-resume/" },
            { title: "How ATS Really Works", desc: "What applicant tracking systems actually check, and how to pass.", href: "/blog/how-ats-really-works/" },
          ].map((r) => (
            <Link key={r.title} href={r.href} style={{ display: "block", padding: 20, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", textDecoration: "none" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>{r.title}</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.55 }}>{r.desc}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                Explore <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
