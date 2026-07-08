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

  it("renders an eye (hide) affordance on each bullet when onToggleBulletHidden is provided", () => {
    const onToggleBulletHidden = vi.fn();
    const { container } = renderBody({ onToggleBulletHidden });
    const eye = container.querySelector(".az-bullet-hide");
    expect(eye).not.toBeNull();
    fireEvent.click(eye as HTMLElement);
    expect(onToggleBulletHidden).toHaveBeenCalledWith("exp.0.bullets.0");
  });

  it("does not render the eye affordance without an onToggleBulletHidden handler", () => {
    const { container } = renderBody();
    expect(container.querySelector(".az-bullet-hide")).toBeNull();
  });

  it("a hidden bullet is excluded from the PDF (az-pdf-ignore) but still toggleable", () => {
    const onToggleBulletHidden = vi.fn();
    const { container } = renderBody({
      onToggleBulletHidden,
      hiddenPaths: { "exp.0.bullets.0": true },
    });
    // The hidden bullet still renders (dimmed) so the user can toggle it back…
    const row = container.querySelector('[data-bullet-idx]') as HTMLElement;
    expect(row.className).toContain("az-pdf-ignore"); // …but is dropped from the WYSIWYG PDF capture.
    // The eye toggle shows the "on" (hidden) state and un-hides on click.
    const eye = container.querySelector(".az-bullet-hide.az-bullet-hide--on");
    expect(eye).not.toBeNull();
    fireEvent.click(eye as HTMLElement);
    expect(onToggleBulletHidden).toHaveBeenCalledWith("exp.0.bullets.0");
  });
});
