import { beforeEach, describe, expect, it } from "vitest";
import { render, type RenderResult } from "@testing-library/react";
import AnnotatedResumePanel from "@/components/AnnotatedResumePanel";

const bullet = {
  originalBullet: "Built a backend that scores résumés.",
  score: 62,
  issues: ["Duty-only phrasing"],
  improvedBullet: "",
};

const base = {
  presentationOnly: true as const,
  sectionFeedback: [] as [],
  activeCategory: null,
  rewriteEdits: {} as Record<number, string>,
  patchBulletRewrite: () => {},
  patchPreviewLine: () => {},
  extractedText: "Alex Rivera\nBuilt a backend that scores résumés.",
  resumeHeader: ["Alex Rivera"],
};

function mount(
  overrides: Record<string, unknown> = {},
): RenderResult {
  return render(
    <AnnotatedResumePanel
      {...base}
      bulletAnalysis={[bullet]}
      previewLineOverrides={{}}
      selectedBulletIndex={null}
      {...overrides}
    />,
  );
}

function mirrorFrame(container: HTMLElement): HTMLElement | null {
  const nodes = container.querySelectorAll<HTMLElement>(".az-resume-paper > .az-pdf-ignore");
  for (const el of nodes) {
    if (el.style.zIndex === "2") return el;
  }
  return null;
}

describe("Analyze result preview mount", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("does not loop when the scored résumé first appears", () => {
    expect(() => mount()).not.toThrow();
  });

  it("does not loop when a bullet is already selected", () => {
    expect(() => mount({ selectedBulletIndex: 0 })).not.toThrow();
  });

  it("does not loop when gap-fix targets and bullet rows are new arrays every render", () => {
    const view = mount({
      selectedBulletIndex: 0,
      gapFixTargetBulletIndices: [0],
      bulletAnalysis: [{ ...bullet }],
    });
    expect(() => {
      for (let i = 0; i < 8; i++) {
        view.rerender(
          <AnnotatedResumePanel
            {...base}
            selectedBulletIndex={0}
            gapFixTargetBulletIndices={[0]}
            bulletAnalysis={[{ ...bullet }]}
            previewLineOverrides={{}}
          />,
        );
      }
    }).not.toThrow();
  });

  it("keeps the frame hidden until a real bullet is selected, then hides it again", () => {
    const view = mount();
    const frame = mirrorFrame(view.container);
    expect(frame).toBeTruthy();
    expect(frame!.style.opacity).toBe("0");

    view.rerender(
      <AnnotatedResumePanel
        {...base}
        bulletAnalysis={[bullet]}
        previewLineOverrides={{}}
        selectedBulletIndex={99}
      />,
    );
    expect(mirrorFrame(view.container)!.style.opacity).toBe("0");

    view.rerender(
      <AnnotatedResumePanel
        {...base}
        bulletAnalysis={[bullet]}
        previewLineOverrides={{}}
        selectedBulletIndex={0}
      />,
    );
    const shown = mirrorFrame(view.container)!;
    expect(view.container.querySelector('[data-bullet-idx="0"]')).toBeTruthy();
    expect(shown.style.opacity).toBe("1");

    view.rerender(
      <AnnotatedResumePanel
        {...base}
        bulletAnalysis={[bullet]}
        previewLineOverrides={{}}
        selectedBulletIndex={null}
      />,
    );
    expect(mirrorFrame(view.container)!.style.opacity).toBe("0");
  });

  it("switches the frame from the score color to violet, then to the applied color", () => {
    const weak = { ...bullet, score: 40 };
    const view = mount({
      selectedBulletIndex: 0,
      bulletAnalysis: [weak],
    });
    expect(mirrorFrame(view.container)!.style.borderLeftColor).toBe("rgba(248, 113, 113, 0.95)");

    view.rerender(
      <AnnotatedResumePanel
        {...base}
        bulletAnalysis={[weak]}
        previewLineOverrides={{}}
        selectedBulletIndex={0}
        gapFixTargetBulletIndices={[0]}
      />,
    );
    expect(mirrorFrame(view.container)!.style.borderLeftColor).toBe("rgba(139, 92, 246, 0.95)");

    view.rerender(
      <AnnotatedResumePanel
        {...base}
        bulletAnalysis={[weak]}
        previewLineOverrides={{ 0: "Built a scoring service used by 400 people a day." }}
        selectedBulletIndex={0}
        gapFixTargetBulletIndices={[0]}
      />,
    );
    expect(mirrorFrame(view.container)!.style.borderLeftColor).toBe("rgba(52, 211, 153, 0.92)");
  });
});
