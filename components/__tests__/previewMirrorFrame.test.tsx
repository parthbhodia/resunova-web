import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import AnnotatedResumePanel from "@/components/AnnotatedResumePanel";

/**
 * The frame the preview draws around the selected bullet must not re-render the
 * panel when it has nowhere new to go.
 *
 * updateMirrorPosition runs far more often than the frame moves: twice per
 * layout effect, and on every scroll, resize and paper ResizeObserver callback.
 * Three of its setMirrorBox writes built a fresh object each time, and React
 * only skips a re-render when the new state is Object.is-equal to the old one,
 * so every call re-rendered the whole panel.
 *
 * It is also half of React #185. The layout effect keyed on updateMirrorPosition
 * re-runs whenever the callback changes, so a dependency that is a new reference
 * on every render (Analyze's crash came from a `= []` default in that list)
 * plus a write that re-renders when nothing changed is an infinite loop. Every
 * dependency below is a stable value, so these tests measure the write alone.
 */

/**
 * Stands in for the résumé body. It renders each bullet where the frame looks
 * for it, and the panel hands it a new props object on every render it commits,
 * so counting here counts panel renders.
 */
const body = vi.hoisted(() => ({ renders: 0 }));

vi.mock("@/components/AnalyzeLiveResumeBody", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/AnalyzeLiveResumeBody")>()),
  default: function ResumeBodyStub({ bulletAnalysis }: { bulletAnalysis: { originalBullet: string }[] }) {
    body.renders += 1;
    return (
      <ul>
        {bulletAnalysis.map((b, i) => <li key={i} data-bullet-idx={i}>{b.originalBullet}</li>)}
      </ul>
    );
  },
}));

type PanelProps = ComponentProps<typeof AnnotatedResumePanel>;

const BULLETS: PanelProps["bulletAnalysis"] = [
  { originalBullet: "Cut deploy time from 40 minutes to 6.", score: 82, issues: [], improvedBullet: "" },
  { originalBullet: "Helped with the billing migration.", score: 41, issues: [], improvedBullet: "" },
];
const NO_SECTIONS: PanelProps["sectionFeedback"] = [];
const NO_EDITS: PanelProps["rewriteEdits"] = {};
const NO_OVERRIDES: PanelProps["previewLineOverrides"] = {};
const NO_TARGETS: number[] = [];
const noop = () => {};

/** Presentation mode, as Analyze and Tailor render it. */
function panel(overrides: Partial<PanelProps> = {}) {
  return (
    <AnnotatedResumePanel
      bulletAnalysis={BULLETS}
      sectionFeedback={NO_SECTIONS}
      activeCategory={null}
      rewriteEdits={NO_EDITS}
      patchBulletRewrite={noop}
      previewLineOverrides={NO_OVERRIDES}
      patchPreviewLine={noop}
      gapFixTargetBulletIndices={NO_TARGETS}
      presentationOnly
      {...overrides}
    />
  );
}

const scroller = (container: HTMLElement) => container.querySelector(".az-resume-scroll") as HTMLElement;

/** The paper's only child with a left border. */
const frame = (container: HTMLElement) =>
  container.querySelector('.az-resume-paper > [style*="border-left"]') as HTMLElement;

describe.each([
  { state: "nothing is selected", selectedBulletIndex: null, opacity: "0" },
  { state: "the selected bullet is framed", selectedBulletIndex: 0, opacity: "1" },
  { state: "the selected bullet is not on the page", selectedBulletIndex: 7, opacity: "0" },
])("the preview's bullet frame, when $state", ({ selectedBulletIndex, opacity }) => {
  it("does not re-render the panel on scroll", () => {
    const { container } = render(panel({ selectedBulletIndex }));
    expect(frame(container).style.opacity).toBe(opacity);
    body.renders = 0;

    for (let i = 0; i < 5; i += 1) fireEvent.scroll(scroller(container));

    expect(body.renders).toBe(0);
  });

  it("re-renders once, not twice, when a dependency is replaced by an equal one", () => {
    const { container, rerender } = render(panel({ selectedBulletIndex }));
    expect(frame(container).style.opacity).toBe(opacity);
    body.renders = 0;

    // The render the new array causes is unavoidable. The layout effect that
    // follows it has nothing to change, so it must not cause a second one.
    rerender(panel({ selectedBulletIndex, gapFixTargetBulletIndices: [] }));

    expect(body.renders).toBe(1);
  });
});

describe("the preview's bullet frame", () => {
  it("follows its bullet when the layout moves it", () => {
    const { container } = render(panel({ selectedBulletIndex: 0 }));
    // The same bullet in the same tone, so only the position can tell the old
    // frame from the new one.
    const bullet = container.querySelector('[data-bullet-idx="0"]') as HTMLElement;
    bullet.getBoundingClientRect = () => ({ top: 120.4, height: 18.2 }) as DOMRect;

    fireEvent(window, new Event("resize"));

    expect(parseFloat(frame(container).style.top)).toBeCloseTo(118, 0);
    expect(parseFloat(frame(container).style.height)).toBeCloseTo(24, 0);
  });

  it("repaints when only the tone changes", () => {
    // A strong bullet and an applied rewrite share a bar colour and differ in
    // tint, so a guard that compared the bar alone would keep the old tint.
    const { container, rerender } = render(panel({ selectedBulletIndex: 0 }));
    expect(frame(container).style.background).toBe("rgba(52, 211, 153, 0.12)");

    rerender(panel({ selectedBulletIndex: 0, previewLineOverrides: { 0: "Cut deploy time from 40 minutes to 6 by caching builds." } }));

    expect(frame(container).style.background).toBe("rgba(52, 211, 153, 0.14)");
  });
});
