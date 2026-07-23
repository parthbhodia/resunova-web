"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { ResumeCatalogExample } from "@/lib/resumeExamplesCatalog";
import { stashTemplateBuilderExactPrefill } from "@/lib/templateBuilderPrefill";

const ALL = "All";

export default function ResumeExamplesCatalog({ examples: allExamples }: { examples: ResumeCatalogExample[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [prefillError, setPrefillError] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const categories = [ALL, ...Array.from(new Set(allExamples.map((example) => example.category)))];
  const levels = [ALL, ...Array.from(new Set(allExamples.map((example) => example.level)))];

  const examples = allExamples.filter((example) => {
    const matchesQuery =
      !deferredQuery ||
      [
        example.title,
        example.category,
        example.desc,
        ...example.tags,
        ...example.data.skills.featuredSkills.map(({ skill }) => skill),
        example.data.skills.descriptions,
      ]
        .join(" ")
        .toLowerCase()
        .includes(deferredQuery);
    return matchesQuery && (category === ALL || example.category === category) && (level === ALL || example.level === level);
  });
  const visibleExamples = examples.slice(0, visibleCount);

  function resetVisibleResults() {
    setVisibleCount(12);
  }

  function handleUseExample(example: ResumeCatalogExample) {
    if (!stashTemplateBuilderExactPrefill(example.data)) {
      setPrefillError("This example could not be opened. Check your browser storage settings and try again.");
      return;
    }
    setPrefillError("");
    router.push("/template-builder");
  }

  return (
    <section
      id="example-library"
      aria-labelledby="catalog-heading"
      style={{ marginLeft: "50%", marginTop: 56, transform: "translateX(-50%)", width: "min(1120px, calc(100vw - 48px))" }}
    >
      <p style={{ color: "var(--accent)", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", margin: "0 0 8px", textTransform: "uppercase" }}>
        Example Library
      </p>
      <h2 id="catalog-heading" style={{ color: "var(--text)", fontSize: 28, letterSpacing: -0.7, margin: "0 0 10px" }}>
        60 fictional resume examples
      </h2>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.65, margin: "0 0 22px" }}>
        These examples use fictional candidates and employers. Contact details and license numbers are intentionally omitted. Replace every detail with your own accurate, verifiable information before applying.
      </p>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr)", marginBottom: 22 }}>
        <label style={{ position: "relative" }}>
          <span className="sr-only">Search resume examples</span>
          <Search aria-hidden="true" size={18} style={{ color: "var(--dim)", left: 14, position: "absolute", top: 13 }} />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetVisibleResults();
            }}
            placeholder="Search by title, category, or skill"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", font: "inherit", padding: "12px 14px 12px 42px", width: "100%" }}
          />
        </label>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <label style={{ color: "var(--dim)", display: "grid", fontSize: 12, gap: 5 }}>
            Category
            <select value={category} onChange={(event) => { setCategory(event.target.value); resetVisibleResults(); }} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", font: "inherit", padding: "10px 12px" }}>
              {categories.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label style={{ color: "var(--dim)", display: "grid", fontSize: 12, gap: 5 }}>
            Experience level
            <select value={level} onChange={(event) => { setLevel(event.target.value); resetVisibleResults(); }} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", font: "inherit", padding: "10px 12px" }}>
              {levels.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
      </div>

      <p aria-live="polite" style={{ color: "var(--dim)", fontSize: 13, margin: "0 0 14px" }}>
        {examples.length} {examples.length === 1 ? "example" : "examples"}
      </p>
      {(query || category !== ALL || level !== ALL) && (
        <button
          type="button"
          onClick={() => { setQuery(""); setCategory(ALL); setLevel(ALL); resetVisibleResults(); }}
          style={{ background: "transparent", border: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700, margin: "-38px 0 14px auto", padding: 0, display: "block" }}
        >
          Clear filters
        </button>
      )}
      {prefillError && <p role="alert" style={{ color: "#b42318", fontSize: 13, margin: "0 0 14px" }}>{prefillError}</p>}
      <ul style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", listStyle: "none", margin: 0, padding: 0 }}>
        {visibleExamples.map((example) => (
          <li key={`${example.category}-${example.title}`} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, display: "flex", flexDirection: "column", padding: 18 }}>
            <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 700 }}>{example.category}</span>
              <span style={{ color: "var(--dim)", fontSize: 12 }}>{example.level}</span>
            </div>
            <h3 style={{ color: "var(--text)", fontSize: 17, margin: "0 0 8px" }}>{example.title}</h3>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, margin: "0 0 14px" }}>{example.desc}</p>
            <p style={{ color: "var(--dim)", fontSize: 12, margin: "auto 0 14px" }}>{example.tags.join(" · ")}</p>
            <button
              type="button"
              onClick={() => handleUseExample(example)}
              aria-label={`Use ${example.title} example`}
              style={{ background: "var(--accent)", border: 0, borderRadius: 9, color: "var(--accent-foreground)", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700, padding: "10px 14px" }}
            >
              Use this example
            </button>
          </li>
        ))}
      </ul>
      {!examples.length && (
        <p style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--muted)", padding: 20, textAlign: "center" }}>
          No examples match those filters.
        </p>
      )}
      {visibleCount < examples.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + 12)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", cursor: "pointer", display: "block", font: "inherit", fontSize: 14, fontWeight: 700, margin: "22px auto 0", padding: "11px 20px" }}
        >
          Load 12 more
        </button>
      )}
    </section>
  );
}
