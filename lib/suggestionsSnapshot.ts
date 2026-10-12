/**
 * Plain snapshot of the suggestions store.
 *
 * The live store holds Sets and a Map, which do not survive a tab switch.
 * Capturing to arrays lets each open job keep the review it had started.
 */

import type {
  CategoryStatus,
  Suggestion,
  SuggestionCategory,
} from "@/store/suggestionsStore";

export type SuggestionsSnapshot = {
  suggestions: Suggestion[];
  summary: string;
  strategicTips: string[];
  interviewQuestions: string[];
  streamText: string;
  acceptedIds: string[];
  rejectedIds: string[];
  selectedId: string | null;
  activeCategory: SuggestionCategory | null;
  categoryStatus: Array<[SuggestionCategory, CategoryStatus]>;
  error: string | null;
};

export function emptySuggestionsSnapshot(): SuggestionsSnapshot {
  return {
    suggestions: [],
    summary: "",
    strategicTips: [],
    interviewQuestions: [],
    streamText: "",
    acceptedIds: [],
    rejectedIds: [],
    selectedId: null,
    activeCategory: null,
    categoryStatus: [],
    error: null,
  };
}
