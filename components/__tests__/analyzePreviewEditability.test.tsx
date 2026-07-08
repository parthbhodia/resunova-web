import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import AnalyzeLiveResumeBody from "@/components/AnalyzeLiveResumeBody";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const structured: StructuredResume = {
  full_name: "Parth Bhodia",
  headline: "",
  location: "Jersey City",
  email: "parth@example.com",
  phone: "+1 4439294371",
  linkedin: "linkedin.com/in/parth",
  github: "",
  summary: "Full Stack Engineer with 5+ years of experience building SaaS applications.",
  skills: [],
  experience: [
    {
      company: "Eccalon",
      role: "Fullstack Developer",
      dates: "May 2022 – Present",
      location: "Remote",
      bullets: ["Built scalable frontend UIs in Vue.js for federal platforms."],
    },
  ],
  education: [],
  projects: [],
  extra_sections: [],
};

function renderBody(overrides: Partial<Parameters<typeof AnalyzeLiveResumeBody>[0]> = {}) {
  return render(
    <AnalyzeLiveResumeBody
      extractedText=""
      resumeHeader={["Parth Bhodia", "parth@example.com | +1 4439294371"]}
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
      onSummaryEdit={() => {}}
      {...overrides}
    />,
  );
}

describe("Analyze preview inline editability", () => {
  it("renders the header name and contact items as contentEditable fields", () => {
    const { container } = renderBody();
    const name = container.querySelector('[data-field-path="header.name"]');
    expect(name).not.toBeNull();
    expect(name!.getAttribute("contenteditable")).toBe("true");
    const contact = container.querySelector('[data-field-path^="header.contact."]');
    expect(contact).not.toBeNull();
    expect(contact!.getAttribute("contenteditable")).toBe("true");
  });

  it("renders the summary as contentEditable when not flagged", () => {
    const { container } = renderBody();
    const summary = container.querySelector('[data-field-path="summary"]');
    expect(summary).not.toBeNull();
    expect(summary!.getAttribute("contenteditable")).toBe("true");
  });

  it("keeps a flagged summary as a click-target AND makes it inline-editable", () => {
    const { container } = renderBody({ summaryFlagged: true, onSummarySelect: vi.fn() });
    // Still opens the left fix card (click-target)…
    expect(container.querySelector('[data-summary-flag="1"]')).not.toBeNull();
    // …but is now also editable inline so the whole résumé can be edited.
    expect(container.querySelector('[data-field-path="summary"]')).not.toBeNull();
  });

  it("commits a summary edit through onSummaryEdit on blur", () => {
    const onSummaryEdit = vi.fn();
    const { container } = renderBody({ onSummaryEdit });
    const summary = container.querySelector('[data-field-path="summary"]') as HTMLElement;
    summary.textContent = "Rewritten summary with sharper positioning.";
    fireEvent.blur(summary);
    expect(onSummaryEdit).toHaveBeenCalledWith("Rewritten summary with sharper positioning.");
  });

  it("shows header overrides from fieldOverrides", () => {
    const { container } = renderBody({ fieldOverrides: { "header.name": "P. Bhodia, MSc" } });
    const name = container.querySelector('[data-field-path="header.name"]');
    expect(name!.textContent).toContain("P. Bhodia, MSc");
  });

  it("does not render editable fields when fieldsEditable is false", () => {
    const { container } = renderBody({ fieldsEditable: false });
    expect(container.querySelector('[data-field-path="header.name"]')).toBeNull();
    expect(container.querySelector('[data-field-path="summary"]')).toBeNull();
  });

  it("renders a ✕ delete affordance on each bullet when onToggleBulletDeleted is provided", () => {
    const onToggleBulletDeleted = vi.fn();
    const { container } = renderBody({ onToggleBulletDeleted });
    const del = container.querySelector(".az-bullet-del");
    expect(del).not.toBeNull();
    fireEvent.click(del as HTMLElement);
    expect(onToggleBulletDeleted).toHaveBeenCalledWith("exp.0.bullets.0");
  });

  it("does not render the ✕ affordance without an onToggleBulletDeleted handler", () => {
    const { container } = renderBody();
    expect(container.querySelector(".az-bullet-del")).toBeNull();
  });

  it("hides a deleted bullet's text and shows a Restore chip in its place", () => {
    const onToggleBulletDeleted = vi.fn();
    const { container } = renderBody({
      onToggleBulletDeleted,
      deletedPaths: { "exp.0.bullets.0": true },
    });
    // The bullet content is gone (so the WYSIWYG PDF capture excludes it)…
    expect(container.textContent).not.toContain("Built scalable frontend UIs in Vue.js");
    // …replaced by a reversible restore affordance.
    expect(container.textContent).toContain("Bullet removed");
    const restore = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Restore",
    );
    expect(restore).toBeTruthy();
    fireEvent.click(restore as HTMLElement);
    expect(onToggleBulletDeleted).toHaveBeenCalledWith("exp.0.bullets.0");
  });
});
