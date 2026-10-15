/**
 * Open tailor jobs.
 *
 * The page reads the active job. Inactive jobs stay here, including a match
 * that finishes after the user has moved to another tab. The draft stores a
 * slim copy (no LaTeX preview) so a refresh can reopen the strip.
 */

import { create } from "zustand";
import { loadBuilderDraft, patchBuilderDraft } from "@/lib/builderDraft";
import {
  MAX_OPEN_TAILOR_JOBS,
  createTailorJob,
  parsePersistedTailorJobs,
  persistTailorJob,
  withTailorJobWork,
  type TailorJobTarget,
  type TailorJobWork,
} from "@/lib/tailorJobTarget";

export type TailorInflightKind = "scan" | "suggest" | "generate" | "rescore";

export type TailorInflight = Record<TailorInflightKind, string[]>;

export function emptyTailorInflight(): TailorInflight {
  return { scan: [], suggest: [], generate: [], rescore: [] };
}

function withoutInflightJob(inflight: TailorInflight, id: string): TailorInflight {
  return {
    scan: inflight.scan.filter((jobId) => jobId !== id),
    suggest: inflight.suggest.filter((jobId) => jobId !== id),
    generate: inflight.generate.filter((jobId) => jobId !== id),
    rescore: inflight.rescore.filter((jobId) => jobId !== id),
  };
}

export function tailorJobIsBusy(inflight: TailorInflight, id: string): boolean {
  return inflight.scan.includes(id)
    || inflight.suggest.includes(id)
    || inflight.generate.includes(id)
    || inflight.rescore.includes(id);
}

type TailorWorkspaceState = {
  targets: TailorJobTarget[];
  activeId: string;
  /** In-flight work per job. Not saved in the draft. */
  inflight: TailorInflight;
  setInflight: (id: string, kind: TailorInflightKind, on: boolean) => void;
  clearInflight: (id: string) => void;
  patch: (id: string, partial: Partial<TailorJobWork>) => void;
  setMeta: (id: string, meta: { savedFolder?: string | null; score?: number | null }) => void;
  focus: (id: string) => void;
  addBlank: () => string | null;
  addPrepared: (job: TailorJobTarget) => string | null;
  close: (id: string) => void;
  hydrateFromDraft: (live: TailorJobWork) => void;
  activeJob: () => TailorJobTarget | null;
};

let memoryLive = false;

export function tailorWorkspaceHasMemory(): boolean {
  return memoryLive;
}

export function markTailorWorkspaceMemory(): void {
  memoryLive = true;
}

export function resetTailorWorkspaceMemoryForTests(): void {
  memoryLive = false;
}

function freshJob(): TailorJobTarget {
  return createTailorJob();
}

function persistTargets(targets: TailorJobTarget[], activeId: string): void {
  const jobs = targets.map(persistTailorJob);
  const ok = patchBuilderDraft({ tailorJobs: jobs, activeTailorJobId: activeId });
  if (ok) return;
  const withoutResults = jobs.map((job) => ({ ...job, result: null }));
  const slimOk = patchBuilderDraft({
    tailorJobs: withoutResults,
    activeTailorJobId: activeId,
  });
  if (!slimOk) {
    console.warn("Could not save open tailor jobs in this browser.");
  }
}

function replaceJob(targets: TailorJobTarget[], next: TailorJobTarget): TailorJobTarget[] {
  return targets.map((job) => (job.id === next.id ? next : job));
}

export const useTailorWorkspaceStore = create<TailorWorkspaceState>((set, get) => {
  const first = freshJob();
  return {
    targets: [first],
    activeId: first.id,
    inflight: emptyTailorInflight(),

    setInflight: (id, kind, on) => {
      if (!id) return;
      const list = get().inflight[kind];
      const has = list.includes(id);
      if (on === has) return;
      set({
        inflight: {
          ...get().inflight,
          [kind]: on ? [...list, id] : list.filter((jobId) => jobId !== id),
        },
      });
    },

    clearInflight: (id) => {
      if (!id) return;
      set({ inflight: withoutInflightJob(get().inflight, id) });
    },

    patch: (id, partial) => {
      if (!id) return;
      const current = get().targets.find((job) => job.id === id);
      if (!current) return;
      const targets = replaceJob(get().targets, withTailorJobWork(current, partial));
      set({ targets });
      persistTargets(targets, get().activeId);
    },

    setMeta: (id, meta) => {
      if (!id) return;
      const targets = get().targets.map((job) => {
        if (job.id !== id) return job;
        return {
          ...job,
          savedFolder: meta.savedFolder !== undefined ? meta.savedFolder : job.savedFolder,
          score: meta.score !== undefined ? meta.score : job.score,
        };
      });
      set({ targets });
      persistTargets(targets, get().activeId);
    },

    focus: (id) => {
      if (!get().targets.some((job) => job.id === id)) return;
      if (get().activeId === id) return;
      set({ activeId: id });
      persistTargets(get().targets, id);
    },

    addBlank: () => {
      const { targets } = get();
      if (targets.length >= MAX_OPEN_TAILOR_JOBS) return null;
      const job = freshJob();
      const next = [...targets, job];
      set({ targets: next, activeId: job.id });
      persistTargets(next, job.id);
      return job.id;
    },

    addPrepared: (job) => {
      const { targets } = get();
      if (targets.length >= MAX_OPEN_TAILOR_JOBS) return null;
      const next = [...targets, job];
      set({ targets: next, activeId: job.id });
      persistTargets(next, job.id);
      return job.id;
    },

    close: (id) => {
      const { targets, activeId } = get();
      if (targets.length <= 1) return;
      const next = targets.filter((job) => job.id !== id);
      let nextActive = activeId;
      if (activeId === id) {
        const index = targets.findIndex((job) => job.id === id);
        nextActive = next[Math.max(0, index - 1)]?.id ?? next[0].id;
      }
      set({
        targets: next,
        activeId: nextActive,
        inflight: withoutInflightJob(get().inflight, id),
      });
      persistTargets(next, nextActive);
    },

    hydrateFromDraft: (live) => {
      const draft = loadBuilderDraft();
      const loaded = parsePersistedTailorJobs(draft.tailorJobs);
      const requested = typeof draft.activeTailorJobId === "string" ? draft.activeTailorJobId : "";
      if (loaded.length === 0) {
        const current = get().activeJob() ?? freshJob();
        const patched = withTailorJobWork(current, live);
        set({ targets: [patched], activeId: patched.id });
        persistTargets([patched], patched.id);
        return;
      }
      const activeId = loaded.some((job) => job.id === requested) ? requested : loaded[0].id;
      const targets = loaded.map((job) => (job.id === activeId ? withTailorJobWork(job, live) : job));
      set({ targets, activeId });
      persistTargets(targets, activeId);
    },

    activeJob: () => get().targets.find((job) => job.id === get().activeId) ?? null,
  };
});

export function tailorJobIsCurrent(requestJobId: string): boolean {
  return requestJobId.length > 0 && useTailorWorkspaceStore.getState().activeId === requestJobId;
}
