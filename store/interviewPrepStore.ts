"use client";

import { create } from "zustand";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

/**
 * Interview Prep workflow state.
 *
 * Holds the parsed resume (reusing the same `/api/upload-resume` pipeline as
 * ATS scoring), the detected resume category, and the job/target-role inputs so
 * later Interview Prep steps (Interview Type, Practice Setup, Prep Dashboard)
 * can read them without re-uploading or re-parsing.
 */
export interface InterviewPrepResumePayload {
  fileName: string;
  extractedText: string;
  resumeHeader: string[];
  structuredResume: StructuredResume | null;
  /** Industry/domain inferred from parsed skills + job titles. */
  category: string | null;
}

export interface InterviewPrepStore {
  // ── Resume (parsed) ──
  fileName: string | null;
  extractedText: string;
  resumeHeader: string[];
  structuredResume: StructuredResume | null;
  resumeCategory: string | null;
  parsing: boolean;
  parseError: string | null;

  // ── Job + target role ──
  jobDescription: string;
  company: string;
  role: string;
  /** Set when prep was launched from a specific Jobs-feed posting (links the kit to it). */
  jobPostingId: string | null;

  // ── Step 2: interview type selection ──
  selectedInterviewType: string | null;

  // ── Step 3: practice setup ──
  difficulty: "easy" | "medium" | "hard" | null;
  questionCount: number;
  selectedSources: string[];
  selectedFocusAreas: string[];

  // ── Actions ──
  setParsing: (parsing: boolean) => void;
  setParseError: (error: string | null) => void;
  setParsedResume: (payload: InterviewPrepResumePayload) => void;
  clearResume: () => void;
  setJobDescription: (jd: string) => void;
  setCompany: (company: string) => void;
  setRole: (role: string) => void;
  setJobPostingId: (id: string | null) => void;
  setSelectedInterviewType: (id: string | null) => void;
  setDifficulty: (difficulty: "easy" | "medium" | "hard") => void;
  setQuestionCount: (count: number) => void;
  setSelectedSources: (sources: string[]) => void;
  toggleSource: (source: string) => void;
  setSelectedFocusAreas: (areas: string[]) => void;
  toggleFocusArea: (area: string) => void;
  // ── Session persistence ──
  sessionId: string | null;
  loadedFromDb: boolean;
  setSessionId: (id: string | null) => void;
  setLoadedFromDb: (v: boolean) => void;
  // One-shot: set when opening a saved kit from Prep History so the dashboard
  // loads that specific session on mount (consumed + cleared after load).
  historySessionId: string | null;
  setHistorySessionId: (id: string | null) => void;
  reset: () => void;
}

const initialResume = {
  fileName: null as string | null,
  extractedText: "",
  resumeHeader: [] as string[],
  structuredResume: null as StructuredResume | null,
  resumeCategory: null as string | null,
  parsing: false,
  parseError: null as string | null,
};

export const useInterviewPrepStore = create<InterviewPrepStore>((set) => ({
  ...initialResume,
  jobDescription: "",
  company: "",
  role: "",
  jobPostingId: null,
  selectedInterviewType: null,
  difficulty: "medium",
  questionCount: 10,
  selectedSources: ["resume", "jd"],
  selectedFocusAreas: [],
  sessionId: null,
  loadedFromDb: false,
  historySessionId: null,

  setParsing: (parsing) => set({ parsing, ...(parsing ? { parseError: null } : {}) }),
  setParseError: (parseError) => set({ parseError, parsing: false }),
  setParsedResume: (payload) =>
    set({
      fileName: payload.fileName,
      extractedText: payload.extractedText,
      resumeHeader: payload.resumeHeader,
      structuredResume: payload.structuredResume,
      resumeCategory: payload.category,
      parsing: false,
      parseError: null,
      // A new résumé starts a fresh prep — drop any prior session so the
      // dashboard generates from THIS résumé and never reuses the previous
      // résumé's saved kit / Story Bank.
      sessionId: null,
      loadedFromDb: false,
    }),
  clearResume: () => set({ ...initialResume, sessionId: null, loadedFromDb: false }),
  setJobDescription: (jobDescription) => set({ jobDescription }),
  setCompany: (company) => set({ company }),
  setRole: (role) => set({ role }),
  setJobPostingId: (jobPostingId) => set({ jobPostingId }),
  setSelectedInterviewType: (selectedInterviewType) => set({ selectedInterviewType }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setQuestionCount: (questionCount) => set({ questionCount }),
  setSelectedSources: (selectedSources) => set({ selectedSources }),
  toggleSource: (source) =>
    set((s) => ({
      selectedSources: s.selectedSources.includes(source)
        ? s.selectedSources.filter((x) => x !== source)
        : [...s.selectedSources, source],
    })),
  setSelectedFocusAreas: (selectedFocusAreas) => set({ selectedFocusAreas }),
  toggleFocusArea: (area) =>
    set((s) => ({
      selectedFocusAreas: s.selectedFocusAreas.includes(area)
        ? s.selectedFocusAreas.filter((x) => x !== area)
        : [...s.selectedFocusAreas, area],
    })),
  setSessionId: (sessionId) => set({ sessionId }),
  setLoadedFromDb: (loadedFromDb) => set({ loadedFromDb }),
  setHistorySessionId: (historySessionId) => set({ historySessionId }),
  reset: () =>
    set({
      ...initialResume,
      jobDescription: "",
      company: "",
      role: "",
      jobPostingId: null,
      selectedInterviewType: null,
      difficulty: "medium",
      questionCount: 10,
      selectedSources: ["resume", "jd"],
      selectedFocusAreas: [],
      sessionId: null,
      loadedFromDb: false,
      historySessionId: null,
    }),
}));
