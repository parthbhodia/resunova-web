import { beforeEach, describe, expect, it } from "vitest";
import { BUILDER_DRAFT_KEY } from "@/lib/builderDraft";
import {
  MAX_OPEN_TAILOR_JOBS,
  createTailorJob,
  emptyGenerationResult,
  findOpenTailorJob,
  parsePersistedTailorJobs,
  persistTailorJob,
  tailorJobIsEmpty,
  tailorJobLabel,
  tailorJobScore,
} from "@/lib/tailorJobTarget";
import {
  resetTailorWorkspaceMemoryForTests,
  useTailorWorkspaceStore,
} from "@/store/tailorWorkspaceStore";

describe("tailor job labels", () => {
  it("names a tab from the company and role", () => {
    expect(tailorJobLabel("Stripe", "Designer")).toBe("Stripe · Designer");
    expect(tailorJobLabel("", "")).toBe("New job");
    expect(tailorJobLabel("—", "—")).toBe("New job");
    expect(tailorJobLabel("Stripe", "")).toBe("Stripe");
  });

  it("reads the match score from ratings", () => {
    expect(tailorJobScore({ match_score: 71.4, overall_score: 68, criteria: [], whats_working: [], gaps: [], verdict: "" })).toBe(68);
    expect(tailorJobScore(null)).toBeNull();
  });

  it("treats a posting with no text and no saved match as empty", () => {
    expect(tailorJobIsEmpty(createTailorJob())).toBe(true);
    const started = createTailorJob({ work: { jd: "Build APIs" } });
    expect(tailorJobIsEmpty(started)).toBe(false);
  });
});

describe("open job identity", () => {
  const stripe = createTailorJob({
    savedFolder: "tailor_match_stripe_designer",
    work: { company: "Stripe", role: "Designer", jd: "Design systems" },
  });
  const linear = createTailorJob({
    work: { company: "Linear", role: "Designer", jd: "Product craft" },
  });

  it("finds the same saved folder or the same pasted posting", () => {
    expect(findOpenTailorJob([stripe, linear], { savedFolder: "tailor_match_stripe_designer" })?.id).toBe(stripe.id);
    expect(findOpenTailorJob([stripe, linear], { company: "Linear", role: "Designer", jd: "Product craft" })?.id).toBe(linear.id);
    expect(findOpenTailorJob([stripe], { company: "Notion", jd: "Something else" })).toBeNull();
  });
});

describe("draft persistence", () => {
  it("drops the LaTeX preview and skips rows without an id", () => {
    const job = createTailorJob({
      id: "job-1",
      score: 70,
      work: {
        company: "Stripe",
        role: "Designer",
        jd: "Design systems",
        result: { ...emptyGenerationResult(), folder: "tailor_match_stripe", latexPreview: "\\documentclass{article}" },
      },
    });
    const slim = persistTailorJob(job);
    expect(slim.result?.latexPreview).toBe("");
    expect(slim.result?.folder).toBe("tailor_match_stripe");

    const parsed = parsePersistedTailorJobs([slim, { company: "Nope" }, null]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].work.jd).toBe("Design systems");
    expect(parsed[0].work.result?.latexPreview).toBe("");
    expect(parsed[0].savedFolder).toBe("tailor_match_stripe");
  });
});

describe("tailor workspace store", () => {
  beforeEach(() => {
    localStorage.clear();
    resetTailorWorkspaceMemoryForTests();
    const fresh = createTailorJob({ id: "seed" });
    useTailorWorkspaceStore.setState({ targets: [fresh], activeId: fresh.id, inflight: { scan: [], suggest: [], generate: [], rescore: [] } });
  });

  it("keeps the job you left when another tab is focused", () => {
    const store = useTailorWorkspaceStore.getState();
    store.patch(store.activeId, { company: "Stripe", jd: "Design systems" });
    const added = useTailorWorkspaceStore.getState().addBlank();
    expect(added).toBeTruthy();
    useTailorWorkspaceStore.getState().patch(added!, { company: "Linear", jd: "Product craft" });

    const jobs = useTailorWorkspaceStore.getState().targets;
    expect(jobs.map((job) => job.work.company).sort()).toEqual(["Linear", "Stripe"]);
    expect(jobs.find((job) => job.work.company === "Stripe")?.work.jd).toBe("Design systems");
  });

  it("writes a finished match onto the job that started it", () => {
    const store = useTailorWorkspaceStore.getState();
    const first = store.activeId;
    store.patch(first, { company: "Stripe", jd: "Design systems" });
    const second = store.addBlank();
    expect(useTailorWorkspaceStore.getState().activeId).toBe(second);

    useTailorWorkspaceStore.getState().patch(first, {
      result: { ...emptyGenerationResult(), folder: "tailor_match_stripe", ratings: { match_score: 71, overall_score: 71, criteria: [], whats_working: [], gaps: [], verdict: "Fair" } },
    });

    const stripe = useTailorWorkspaceStore.getState().targets.find((job) => job.id === first);
    const linear = useTailorWorkspaceStore.getState().activeJob();
    expect(stripe?.score).toBe(71);
    expect(stripe?.savedFolder).toBe("tailor_match_stripe");
    expect(linear?.id).toBe(second);
    expect(linear?.work.result).toBeNull();
  });

  it("keeps in-flight work on the job that started it", () => {
    const store = useTailorWorkspaceStore.getState();
    const first = store.activeId;
    store.setInflight(first, "scan", true);
    store.setInflight(first, "suggest", true);
    store.setInflight(first, "generate", true);
    store.setInflight(first, "rescore", true);
    const second = store.addBlank();
    if (!second) throw new Error("expected a second job");

    const next = useTailorWorkspaceStore.getState();
    expect(next.activeId).toBe(second);
    expect(next.inflight.scan).toEqual([first]);
    expect(next.inflight.suggest).toEqual([first]);
    expect(next.inflight.generate).toEqual([first]);
    expect(next.inflight.rescore).toEqual([first]);

    next.setInflight(second, "scan", true);
    next.close(first);
    const afterClose = useTailorWorkspaceStore.getState();
    expect(afterClose.inflight.scan).toEqual([second]);
    expect(afterClose.inflight.suggest).toEqual([]);
    expect(afterClose.inflight.generate).toEqual([]);
    expect(afterClose.inflight.rescore).toEqual([]);
  });

  it("stops at five open jobs and will not close the last one", () => {
    const store = useTailorWorkspaceStore.getState();
    const first = store.activeId;
    for (let i = 0; i < MAX_OPEN_TAILOR_JOBS; i += 1) store.addBlank();
    expect(useTailorWorkspaceStore.getState().targets).toHaveLength(MAX_OPEN_TAILOR_JOBS);
    expect(useTailorWorkspaceStore.getState().addBlank()).toBeNull();

    const only = createTailorJob({ id: "only" });
    useTailorWorkspaceStore.setState({ targets: [only], activeId: only.id });
    useTailorWorkspaceStore.getState().close(only.id);
    expect(useTailorWorkspaceStore.getState().targets).toHaveLength(1);

    useTailorWorkspaceStore.getState().close(first);
  });

  it("reopens the slim draft after a refresh", () => {
    const store = useTailorWorkspaceStore.getState();
    store.patch(store.activeId, { company: "Stripe", role: "Designer", jd: "Design systems" });
    const raw = localStorage.getItem(BUILDER_DRAFT_KEY);
    expect(raw).toBeTruthy();
    const draft = JSON.parse(raw!) as { tailorJobs: unknown };
    expect(Array.isArray(draft.tailorJobs)).toBe(true);

    const reloaded = parsePersistedTailorJobs(draft.tailorJobs);
    expect(reloaded[0].work.company).toBe("Stripe");
    expect(reloaded[0].work.jd).toBe("Design systems");
  });
});
