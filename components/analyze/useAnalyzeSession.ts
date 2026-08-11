"use client";

// Session + history bootstrap for the Analyze flow, extracted from
// AnalyzeResume.tsx (Slice 4 hook step 1 of docs/ANALYZE_REFACTOR_PLAN.md).
//
// Owns: user identity (userId/userEmail/isAnon), the analyze-history list
// (azHistory + loadingHistory), and the remaining-scan quota (scansRemaining) —
// plus the on-mount effect that populates them (Supabase first, localStorage
// fallback). Behavior-preserving verbatim move; the state and effect bodies are
// unchanged. `setAzHistory` / `setScansRemaining` are returned because scan,
// restore, delete, and save-version flows in AnalyzeResume mutate them.

import { useEffect, useState } from "react";
import { getSupabaseClient, fetchAnalyses, type AnalyzeRecord } from "@/lib/supabase";
import { lsLoad, lsSave } from "./analyzeHistoryStore";
import {
  useScansRemaining,
  setScansRemaining as writeScansRemaining,
} from "@/components/app-shell/useScansRemaining";

export function useAnalyzeSession() {
  // The quota comes from the shared store, not a fetch of this hook's own —
  // this was the third of three components asking `/api/scan-limit-status` on
  // one page load. Guests are included on purpose: the endpoint answers them
  // with the per-IP free-scan allowance, which is what the count under the
  // upload button is showing.
  const { state: scanState } = useScansRemaining();
  const scansRemaining = scanState.kind === "metered" ? scanState.remaining : null;
  const [azHistory, setAzHistory]           = useState<AnalyzeRecord[]>([]);
  const [userId, setUserId]                 = useState<string | null>(null);
  const [userEmail, setUserEmail]           = useState<string | null>(null);
  /** Signed-out visitor: first scan is free + fully unlocked; a 2nd asks to sign in. */
  const [isAnon, setIsAnon]                 = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load user + history on mount: Supabase first, localStorage fallback
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user?.id) {
        setIsAnon(true);
        setLoadingHistory(false);
        return;
      }
      setIsAnon(false);
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      // Seed from localStorage immediately so UI isn't empty while fetching
      setAzHistory(lsLoad(user.id));
      try {
        const rows = await fetchAnalyses(25);   // higher: version chains share the list
        setAzHistory(rows);
        lsSave(user.id, rows);          // keep local cache in sync
      } catch {
        // Network/auth error — stay on localStorage data
      } finally {
        setLoadingHistory(false);
      }
    });
  }, []);

  return {
    userId,
    userEmail,
    isAnon,
    azHistory,
    setAzHistory,
    loadingHistory,
    scansRemaining,
    // A scan response already carries the post-scan count, so this writes it
    // straight through the store instead of triggering a refetch. Same call
    // signature as the useState setter it replaces, and the nav badge now
    // moves with the count under the upload button rather than lagging it
    // until the next window focus.
    setScansRemaining: writeScansRemaining,
  };
}
