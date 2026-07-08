import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { looksLikeEntryHeader } from "@/lib/resumeEntryLineHeuristics";
import AnalyzeLiveResumeBody from "@/components/AnalyzeLiveResumeBody";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

// The exact experience-header lines from the reported résumé: a PDF that glued
// role · company · location · date onto one line (extractor left them in one
// field). These are LONG (>72 chars), which used to trip looksLikeEntryHeader's
// inline-date-narrative guard so they rendered as unstyled prose.
const GLUED_HEADERS = [
  "Research Assistant - Software Developer· University of Maryland, Baltimore County· Halethorpe, MD, US Jan 2022 – Dec 2022",
  "Software Developer· Tata Communications Ltd.· Mumbai, MH, IN July 2018 – May 2021",
];

describe("looksLikeEntryHeader — glued mid-dot headers", () => {
  it("recognizes a long role·company·location·date line as a header", () => {
    for (const h of GLUED_HEADERS) {
      expect(h.length).toBeGreaterThan(72); // long enough to look like prose
      expect(looksLikeEntryHeader(h)).toBe(true);
    }
  });

  it("still recognizes clean pipe headers and rejects prose", () => {
    expect(looksLikeEntryHeader("Fullstack Developer | Eccalon LLC | Remote | May 2022 – Present")).toBe(true);
    // Genuine prose with a single date mention and no structural separators stays prose.
    expect(
      looksLikeEntryHeader("Sitting for the bar examination in May 2024 after completing coursework this term."),
    ).toBe(false);
  });

  it("recognizes a single-mid-dot education header with a trailing date range", () => {
    // The reported bug: one mid-dot (institution · location) + a glued date range.
    // Too few mid-dots for the 2+ fast path, and the date-narrative guard used to
    // reject it as prose → it rendered as one unstyled bold run.
    for (const h of [
      "University of Maryland, Baltimore County· Baltimore, MD, US August 2021 – May 2023",
      "University of Maryland, Baltimore County· Baltimore, MD, USAugust 2021 – May 2023",
      "University of Mumbai· Mumbai, MH, IN 2014 – 2018",
    ]) {
      expect(looksLikeEntryHeader(h)).toBe(true);
    }
    // Prose with a date range but NO mid-dot must still be caught by the
    // narrative guard (my change only bypasses it when a mid-dot is ALSO present).
    expect(
      looksLikeEntryHeader("Led the team through the 2021 – 2023 migration to a microservices platform."),
    ).toBe(false);
  });
});

const structured: StructuredResume = {
  full_name: "Parth Bhodia",
  headline: "",
  location: "Jersey City, NJ",
  email: "parth@example.com",
  phone: "+1 4439294371",
  linkedin: "",
  github: "",
  summary: "",
  skills: [],
  experience: [
    // Entry 0: cleanly-extracted (separate fields) — the control that always worked.
    {
      company: "Eccalon LLC",
      role: "Fullstack Developer",
      dates: "May 2022 – Present",
      location: "Remote",
      bullets: ["Built scalable frontend UIs in Vue.js for federal platforms."],
    },
    // Entry 1: extractor crammed everything into `role`, others empty — the bug.
    {
      company: "",
      role: "Research Assistant - Software Developer· University of Maryland, Baltimore County· Halethorpe, MD, US Jan 2022 – Dec 2022",
      dates: "",
      location: "",
      bullets: ["Designed a GIS visualization framework using Elasticsearch + Kibana."],
    },
  ],
  education: [],
  projects: [],
  extra_sections: [],
};

function renderBody() {
  return render(
    <AnalyzeLiveResumeBody
      extractedText=""
      resumeHeader={["Parth Bhodia"]}
      bulletAnalysis={[]}
      structuredResume={structured}
      structuredResumeAuthoritative
      activeCategory={null}
      rewriteEdits={{}}
      patchBulletRewrite={() => {}}
      previewLineOverrides={{}}
      patchPreviewLine={() => {}}
      fieldsEditable
      onFieldEdit={() => {}}
    />,
  );
}

describe("Analyze preview — glued experience header renders as a styled entry header", () => {
  it("renders the crammed role as a bold title with the date pulled out (not plain prose)", () => {
    const { container, getByText } = renderBody();
    // The role now stands alone as a bold title — in the broken version the whole
    // blob rendered as one text node, so this exact-text lookup would fail.
    const title = getByText("Research Assistant - Software Developer");
    expect(title).toBeTruthy();
    expect(getComputedStyle(title).fontWeight).toBe("700");
    // The trailing date range is pulled off and rendered separately.
    expect(getByText("Jan 2022 – Dec 2022")).toBeTruthy();
    // The blob must NOT survive as one glued run anywhere.
    expect(container.textContent).not.toContain(
      "Software Developer· University of Maryland",
    );
  });

  it("still renders the cleanly-extracted entry as a header", () => {
    const { getByText } = renderBody();
    const title = getByText("Fullstack Developer");
    expect(getComputedStyle(title).fontWeight).toBe("700");
    expect(getByText("May 2022 – Present")).toBeTruthy();
  });
});
