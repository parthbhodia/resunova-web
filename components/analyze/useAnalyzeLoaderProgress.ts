"use client";

// Loader step/tip progression for the Analyze scan, extracted from
// AnalyzeResume.tsx (Slice 4 hook step 2 of docs/ANALYZE_REFACTOR_PLAN.md).
// Owns loadingMsg (step index) + loadingTipIdx (coach tip index) and the timer
// effect that advances them while a scan runs. Behavior-preserving verbatim
// move; `loading` and `jd` stay in AnalyzeResume and come in as arguments.

import { useEffect, useState } from "react";
import { ANALYZE_COACH_TIPS } from "@/components/AnalyzeExperience";

export function useAnalyzeLoaderProgress(loading: boolean, jd: string) {
  const [loadingMsg, setLoadingMsg]     = useState(0);
  const [loadingTipIdx, setLoadingTipIdx] = useState(0);

  // Cycle loader steps and coach tips while analysis runs
  useEffect(() => {
    if (!loading) {
      setLoadingMsg(0);
      setLoadingTipIdx(0);
      return;
    }
    // Step delays (ms from start): reading fast, ATS medium, AI scoring slow, then hold at last step.
    // With JD a 5th "keyword matching" step is appended.
    const stepDelays = jd.trim() ? [5000, 13000, 25000, 38000] : [5000, 13000, 26000];
    const stepTimers = stepDelays.map((delay, i) => setTimeout(() => setLoadingMsg(i + 1), delay));
    const tipIv = setInterval(() => setLoadingTipIdx((t) => (t + 1) % ANALYZE_COACH_TIPS.length), 7000);
    return () => {
      stepTimers.forEach(clearTimeout);
      clearInterval(tipIv);
    };
  }, [loading, jd]);

  return { loadingMsg, loadingTipIdx };
}
