import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import TailorPreviewPane from "@/components/TailorPreviewPane";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const structured: StructuredResume = {
  full_name: "Parth Bhodia",
  headline: "",
  location: "Jersey City",
  email: "p@example.com",
  phone: "123",
  linkedin: "",
  github: "",
  summary: "",
  skills: [],
  experience: [
    {
      company: "Eccalon LLC",
      role: "Fullstack Developer",
      dates: "May 2022 – Present",
      location: "Remote",
      bullets: ["Built scalable Vue.js frontends for federal platforms."],
    },
  ],
  education: [],
  projects: [],
  extra_sections: [],
};

const bulletAnalysis = [
  {
    originalBullet: "Built scalable Vue.js frontends for federal platforms.",
    score: 55,
    issues: [],
    improvedBullet: "",
  },
];

describe("Tailor preview → sidebar bullet link", () => {
  it("reports the clicked bullet index via onBulletLinkedSelect", () => {
    const onBulletLinkedSelect = vi.fn();
    const { container } = render(
      <TailorPreviewPane
        extractedText=""
        resumeHeader={["Parth Bhodia"]}
        bulletAnalysis={bulletAnalysis}
        structuredResume={structured}
        onBulletLinkedSelect={onBulletLinkedSelect}
      />,
    );
    const bullet = container.querySelector('[data-bullet-idx="0"]') as HTMLElement;
    expect(bullet).toBeTruthy();
    fireEvent.click(bullet);
    expect(onBulletLinkedSelect).toHaveBeenCalledWith(0);
  });

  // Regression guard for "this is not highlighting the section we are on".
  // AnnotatedResumePanel has drawn a selected-bullet ring all along; Tailor
  // simply never forwarded the prop, so the affordance was dead here.
  it("marks the selected bullet so the user can see where they are", () => {
    const { container } = render(
      <TailorPreviewPane
        extractedText=""
        resumeHeader={["Parth Bhodia"]}
        bulletAnalysis={bulletAnalysis}
        structuredResume={structured}
        selectedBulletIndex={0}
      />,
    );
    const bullet = container.querySelector('[data-bullet-idx="0"]') as HTMLElement;
    expect(bullet.style.boxShadow).toContain("inset");
  });

  it("leaves bullets unmarked when nothing is selected", () => {
    const { container } = render(
      <TailorPreviewPane
        extractedText=""
        resumeHeader={["Parth Bhodia"]}
        bulletAnalysis={bulletAnalysis}
        structuredResume={structured}
        selectedBulletIndex={null}
      />,
    );
    const bullet = container.querySelector('[data-bullet-idx="0"]') as HTMLElement;
    expect(bullet.style.boxShadow).toBe("");
  });
});
