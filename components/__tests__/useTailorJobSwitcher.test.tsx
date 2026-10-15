import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTailorJobSwitcher } from "@/hooks/useTailorJobSwitcher";
import {
  createTailorJob,
  emptyGenerationResult,
  emptyTailorJobWork,
  type TailorJobFields,
  type TailorJobTarget,
} from "@/lib/tailorJobTarget";
import {
  emptyTailorInflight,
  markTailorWorkspaceMemory,
  resetTailorWorkspaceMemoryForTests,
  useTailorWorkspaceStore,
} from "@/store/tailorWorkspaceStore";
import { useSuggestionsStore } from "@/store/suggestionsStore";

function fields(over: Partial<TailorJobFields> = {}): TailorJobFields {
  // Page fields omit the suggestions snapshot; the switcher captures that itself.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { suggestions, ...rest } = emptyTailorJobWork();
  return { ...rest, ...over };
}

const match = {
  ...emptyGenerationResult(),
  folder: "tailor_match_stripe",
  ratings: {
    match_score: 71,
    overall_score: 71,
    criteria: [],
    whats_working: [],
    gaps: [],
    verdict: "Fair",
  },
};

describe("useTailorJobSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
    resetTailorWorkspaceMemoryForTests();
    useSuggestionsStore.getState().reset();
    const fresh = createTailorJob({ id: "seed" });
    useTailorWorkspaceStore.setState({
      targets: [fresh],
      activeId: fresh.id,
      inflight: emptyTailorInflight(),
    });
  });

  it("keeps a match that landed before the page snapshot caught up", () => {
    const apply = vi.fn();
    const { result } = renderHook(() =>
      useTailorJobSwitcher({ getWork: () => fields(), apply }),
    );
    act(() => result.current.bootTailorJobs());
    const first = useTailorWorkspaceStore.getState().activeId;
    act(() => {
      useTailorWorkspaceStore.getState().patch(first, {
        company: "Stripe",
        jd: "Design systems",
        result: match,
      });
    });

    act(() => {
      expect(result.current.openBlankJob()).toBe(true);
    });

    const left = useTailorWorkspaceStore.getState().targets.find((job) => job.id === first);
    expect(left?.work.result?.folder).toBe("tailor_match_stripe");
    expect(left?.work.company).toBe("Stripe");
    expect(left?.work.jd).toBe("Design systems");
  });

  it("opens the match again when that job is focused", () => {
    const apply = vi.fn();
    const { result, rerender } = renderHook(
      (props: { work: TailorJobFields }) =>
        useTailorJobSwitcher({ getWork: () => props.work, apply }),
      {
        initialProps: {
          work: fields({ company: "Stripe", role: "Designer", jd: "Design systems", result: match }),
        },
      },
    );
    act(() => result.current.bootTailorJobs());
    const first = useTailorWorkspaceStore.getState().activeId;

    act(() => {
      expect(result.current.openBlankJob()).toBe(true);
    });
    rerender({ work: fields() });
    act(() => result.current.focusJob(first));

    const restored = apply.mock.calls.at(-1)?.[0] as TailorJobTarget;
    expect(restored.work.company).toBe("Stripe");
    expect(restored.work.result?.folder).toBe("tailor_match_stripe");
  });

  it("lets a cleared job stay on the intake form", () => {
    const apply = vi.fn();
    const { result, rerender } = renderHook(
      (props: { work: TailorJobFields }) =>
        useTailorJobSwitcher({ getWork: () => props.work, apply }),
      { initialProps: { work: fields({ company: "Stripe", jd: "Design systems", result: match }) } },
    );
    act(() => result.current.bootTailorJobs());
    const first = useTailorWorkspaceStore.getState().activeId;
    act(() => {
      useTailorWorkspaceStore.getState().patch(first, { result: null, preview: "" });
    });
    rerender({ work: fields({ company: "Acme", jd: "Design systems", result: null }) });

    act(() => {
      expect(result.current.openBlankJob()).toBe(true);
    });

    const left = useTailorWorkspaceStore.getState().targets.find((job) => job.id === first);
    expect(left?.work.result).toBeNull();
    expect(left?.work.company).toBe("Acme");
  });

  it("writes the visible match when the page unmounts", () => {
    const apply = vi.fn();
    const { result, rerender, unmount } = renderHook(
      (props: { work: TailorJobFields }) =>
        useTailorJobSwitcher({ getWork: () => props.work, apply }),
      { initialProps: { work: fields({ company: "Stripe", jd: "Design systems" }) } },
    );
    act(() => result.current.bootTailorJobs());
    const first = useTailorWorkspaceStore.getState().activeId;
    rerender({
      work: fields({ company: "Stripe", jd: "Design systems", result: match }),
    });

    unmount();

    const job = useTailorWorkspaceStore.getState().targets.find((row) => row.id === first);
    expect(job?.work.result?.folder).toBe("tailor_match_stripe");
  });

  it("keeps the session match when the open job was saved without one", () => {
    const job = createTailorJob({
      id: "job-a",
      work: { company: "Stripe", jd: "Design systems", result: null },
    });
    useTailorWorkspaceStore.setState({
      targets: [job],
      activeId: job.id,
      inflight: emptyTailorInflight(),
    });
    markTailorWorkspaceMemory();
    const apply = vi.fn();
    const { result } = renderHook(() =>
      useTailorJobSwitcher({
        getWork: () => fields({ company: "Stripe", jd: "Design systems", result: match }),
        apply,
      }),
    );

    act(() => result.current.bootTailorJobs());

    const restored = apply.mock.calls.at(-1)?.[0] as TailorJobTarget;
    expect(restored.work.result?.folder).toBe("tailor_match_stripe");
    expect(useTailorWorkspaceStore.getState().activeJob()?.work.result?.folder).toBe("tailor_match_stripe");
  });
});
