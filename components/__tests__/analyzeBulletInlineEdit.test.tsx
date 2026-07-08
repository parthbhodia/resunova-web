import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import AnalyzeLiveResumeBody from "@/components/AnalyzeLiveResumeBody";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const BULLET = "Built scalable frontend UIs in Vue.js for federal platforms.";

const structured: StructuredResume = {
  full_name: "Parth Bhodia",
  headline: "",
  location: "Jersey City",
  email: "parth@example.com",
  phone: "+1 4439294371",
  linkedin: "",
  github: "",
  summary: "Full Stack Engineer with 5+ years of experience building SaaS applications.",
  skills: [],
  experience: [
    { company: "Eccalon", role: "Fullstack Developer", dates: "May 2022 – Present", location: "Remote", bullets: [BULLET] },
  ],
  education: [],
  projects: [],
  extra_sections: [],
};

// A flagged bullet (has an analysis entry) — the kind that used to open the
// floating "AI Suggestion" popup instead of being editable.
const flaggedAnalysis = [
  { originalBullet: BULLET, score: 55, issues: ["quantification"], improvedBullet: "Built Vue.js UIs for 12 federal platforms, cutting load 40%." },
];

function renderBody(overrides: Partial<Parameters<typeof AnalyzeLiveResumeBody>[0]> = {}) {
  return render(
    <AnalyzeLiveResumeBody
      extractedText=""
      resumeHeader={["Parth Bhodia", "parth@example.com"]}
      bulletAnalysis={flaggedAnalysis}
      structuredResume={structured}
      structuredResumeAuthoritative
      activeCategory={null}
      rewriteEdits={{}}
      patchBulletRewrite={() => {}}
      previewLineOverrides={{}}
      patchPreviewLine={() => {}}
      presentationOnly
      fieldsEditable
      onFieldEdit={() => {}}
      onSummaryEdit={() => {}}
      {...overrides}
    />,
  );
}

describe("Analyze preview — flagged bullet inline editing", () => {
  it("makes a flagged bullet's text directly editable when editing is enabled", () => {
    const { container } = renderBody();
    const editable = Array.from(container.querySelectorAll('[contenteditable="true"]')).find((el) =>
      (el.textContent ?? "").includes("Vue.js for federal platforms"),
    );
    expect(editable).toBeTruthy();
  });

  it("commits an inline bullet edit through patchPreviewLine on blur", () => {
    const patchPreviewLine = vi.fn();
    const { container } = renderBody({ patchPreviewLine });
    const editable = Array.from(container.querySelectorAll('[contenteditable="true"]')).find((el) =>
      (el.textContent ?? "").includes("Vue.js for federal platforms"),
    ) as HTMLElement;
    editable.textContent = "Built Vue.js UIs for 12 federal platforms, cutting load 40%.";
    fireEvent.blur(editable);
    expect(patchPreviewLine).toHaveBeenCalledWith(0, "Built Vue.js UIs for 12 federal platforms, cutting load 40%.");
  });

  it("clears the override (null) when the edit reverts to the original text", () => {
    const patchPreviewLine = vi.fn();
    const { container } = renderBody({ patchPreviewLine });
    const editable = Array.from(container.querySelectorAll('[contenteditable="true"]')).find((el) =>
      (el.textContent ?? "").includes("Vue.js for federal platforms"),
    ) as HTMLElement;
    editable.textContent = BULLET;
    fireEvent.blur(editable);
    expect(patchPreviewLine).toHaveBeenCalledWith(0, null);
  });

  it("clicking a flagged bullet reports its index to open the left apply card", () => {
    const onBulletLinkedSelect = vi.fn();
    const { container } = renderBody({ onBulletLinkedSelect });
    const row = container.querySelector('[data-bullet-idx="0"]') as HTMLElement;
    fireEvent.click(row);
    expect(onBulletLinkedSelect).toHaveBeenCalledWith(0);
  });

  it("is NOT editable when editing is disabled (read-only preview keeps the popup)", () => {
    const { container } = renderBody({ fieldsEditable: false, onFieldEdit: undefined, onSummaryEdit: undefined });
    const editable = Array.from(container.querySelectorAll('[contenteditable="true"]')).find((el) =>
      (el.textContent ?? "").includes("Vue.js for federal platforms"),
    );
    expect(editable).toBeUndefined();
  });
});
