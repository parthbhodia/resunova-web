// localStorage fallback for the Analyze history list, extracted from
// AnalyzeResume.tsx (Slice 2 of docs/ANALYZE_REFACTOR_PLAN.md).
//
// Primary store: Supabase `resume_analyses` table (cross-device, permanent).
// This is the offline fallback: localStorage `rn_az_history_<userId>` holding
// the same AnalyzeRecord[]. Behavior-preserving move — no logic changes.

import type { AnalyzeRecord } from "@/lib/supabase";

const LS_KEY = (uid: string) => `rn_az_history_${uid}`;
const LS_MAX = 10;

export function lsLoad(uid: string): AnalyzeRecord[] {
  try {
    const r = localStorage.getItem(LS_KEY(uid));
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

export function lsSave(uid: string, recs: AnalyzeRecord[]) {
  try {
    localStorage.setItem(LS_KEY(uid), JSON.stringify(recs.slice(0, LS_MAX)));
  } catch {
    /* quota */
  }
}

export function lsPush(uid: string, rec: AnalyzeRecord) {
  lsSave(uid, [rec, ...lsLoad(uid)]);
}
