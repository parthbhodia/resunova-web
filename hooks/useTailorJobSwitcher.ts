"use client";

/**
 * Switches the open tailor job without leaving the page.
 *
 * The page still owns the inputs. This hook snapshots them onto the job
 * being left, then writes the next job back. In-flight requests keep the id
 * they started with and must not paint onto whichever tab is now visible.
 */

import { useCallback, useRef, useState } from "react";
import { useSuggestionsStore } from "@/store/suggestionsStore";
import {
  markTailorWorkspaceMemory,
  tailorWorkspaceHasMemory,
  useTailorWorkspaceStore,
} from "@/store/tailorWorkspaceStore";
import {
  MAX_OPEN_TAILOR_JOBS,
  createTailorJob,
  findOpenTailorJob,
  tailorJobIsEmpty,
  type TailorJobFields,
  type TailorJobTarget,
} from "@/lib/tailorJobTarget";

export type PastedTailorJob = {
  company?: string;
  role?: string;
  jd?: string;
  savedFolder?: string | null;
  score?: number | null;
};

type SwitcherArgs = {
  getWork: () => TailorJobFields;
  apply: (job: TailorJobTarget) => void;
  /** Abort streams that belong to the job being left. */
  onLeave?: () => void;
};

export function useTailorJobSwitcher(args: SwitcherArgs) {
  const getWorkRef = useRef(args.getWork);
  getWorkRef.current = args.getWork;
  const applyRef = useRef(args.apply);
  applyRef.current = args.apply;
  const onLeaveRef = useRef(args.onLeave);
  onLeaveRef.current = args.onLeave;

  const targets = useTailorWorkspaceStore((s) => s.targets);
  const activeId = useTailorWorkspaceStore((s) => s.activeId);
  const [ready, setReady] = useState(false);
  const booted = useRef(false);

  const show = useCallback((job: TailorJobTarget) => {
    useSuggestionsStore.getState().restoreSuggestions(job.work.suggestions);
    applyRef.current(job);
  }, []);

  const commitActive = useCallback(() => {
    const { activeId: id, patch } = useTailorWorkspaceStore.getState();
    if (!id) return;
    patch(id, {
      ...getWorkRef.current(),
      suggestions: useSuggestionsStore.getState().captureSuggestions(),
    });
  }, []);

  const bootTailorJobs = useCallback(() => {
    if (booted.current) return;
    booted.current = true;
    if (tailorWorkspaceHasMemory()) {
      const job = useTailorWorkspaceStore.getState().activeJob();
      if (job) show(job);
      setReady(true);
      return;
    }
    const live = {
      ...getWorkRef.current(),
      suggestions: useSuggestionsStore.getState().captureSuggestions(),
    };
    useTailorWorkspaceStore.getState().hydrateFromDraft(live);
    markTailorWorkspaceMemory();
    setReady(true);
  }, [show]);

  const focusJob = useCallback((id: string) => {
    const store = useTailorWorkspaceStore.getState();
    if (id === store.activeId) return;
    if (!store.targets.some((job) => job.id === id)) return;
    commitActive();
    store.focus(id);
    onLeaveRef.current?.();
    const next = useTailorWorkspaceStore.getState().activeJob();
    if (next) show(next);
  }, [commitActive, show]);

  const openBlankJob = useCallback((): boolean => {
    commitActive();
    const id = useTailorWorkspaceStore.getState().addBlank();
    if (!id) return false;
    onLeaveRef.current?.();
    const next = useTailorWorkspaceStore.getState().activeJob();
    if (next) show(next);
    return true;
  }, [commitActive, show]);

  const closeJob = useCallback((id: string) => {
    const store = useTailorWorkspaceStore.getState();
    if (store.targets.length <= 1) return;
    const closingActive = store.activeId === id;
    store.close(id);
    if (!closingActive) return;
    onLeaveRef.current?.();
    const next = useTailorWorkspaceStore.getState().activeJob();
    if (next) show(next);
  }, [show]);

  const placeJob = useCallback((input: PastedTailorJob): boolean => {
    const store = useTailorWorkspaceStore.getState();
    const existing = findOpenTailorJob(store.targets, {
      savedFolder: input.savedFolder,
      company: input.company,
      role: input.role,
      jd: input.jd,
    });
    if (existing) {
      if (existing.id !== store.activeId) {
        commitActive();
        store.focus(existing.id);
        onLeaveRef.current?.();
        const next = useTailorWorkspaceStore.getState().targets.find((job) => job.id === existing.id);
        if (next) show(next);
      }
      return true;
    }

    const current = store.activeJob();
    if (current && tailorJobIsEmpty(current)) {
      const work = {
        ...current.work,
        company: input.company ?? current.work.company,
        role: input.role ?? current.work.role,
        jd: input.jd ?? current.work.jd,
      };
      store.patch(current.id, work);
      if (input.savedFolder != null || input.score != null) {
        useTailorWorkspaceStore.getState().setMeta(current.id, {
          ...(input.savedFolder != null ? { savedFolder: input.savedFolder } : {}),
          ...(input.score != null ? { score: input.score } : {}),
        });
      }
      const filled = useTailorWorkspaceStore.getState().activeJob();
      if (filled) show(filled);
      return true;
    }

    if (store.targets.length >= MAX_OPEN_TAILOR_JOBS) return false;
    commitActive();
    const created = createTailorJob({
      savedFolder: input.savedFolder,
      score: input.score,
      work: {
        company: input.company ?? "",
        role: input.role ?? "",
        jd: input.jd ?? "",
      },
    });
    const id = useTailorWorkspaceStore.getState().addPrepared(created);
    if (!id) return false;
    onLeaveRef.current?.();
    const next = useTailorWorkspaceStore.getState().activeJob();
    if (next) show(next);
    return true;
  }, [commitActive, show]);

  return {
    ready,
    targets,
    activeId,
    jobCount: targets.length,
    atCap: targets.length >= MAX_OPEN_TAILOR_JOBS,
    bootTailorJobs,
    focusJob,
    openBlankJob,
    closeJob,
    openPastedJob: placeJob,
  };
}
