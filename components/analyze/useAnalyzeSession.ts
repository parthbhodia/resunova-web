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
import { apiUrl } from "@/lib/utils";
import { lsLoad, lsSave } from "./analyzeHistoryStore";

export function useAnalyzeSession() {
  const [scansRemaining, setScansRemaining] = useState<number | null>(null);
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
        // Anonymous quota (per-IP) so the remaining count still shows.
        fetch(apiUrl("/api/scan-limit-status"))
          .then(r => r.json())
          .then((data: Record<string, unknown>) => {
            if (data.enforced && !data.unlimited && typeof data.remaining === "number") {
              setScansRemaining(data.remaining as number);
            }
          })
          .catch(() => { /* non-critical */ });
        return;
      }
      setIsAnon(false);
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      // Seed from localStorage immediately so UI isn't empty while fetching
      setAzHistory(lsLoad(user.id));
      // Fetch scan quota so remaining count shows before the first scan
      supabase.auth.getSession().then(({ data: { session } }) => {
        const authHeader: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        fetch(apiUrl("/api/scan-limit-status"), { headers: authHeader })
          .then(r => r.json())
          .then((data: Record<string, unknown>) => {
            if (data.enforced && !data.unlimited && typeof data.remaining === "number") {
              setScansRemaining(data.remaining as number);
            }
          })
          .catch(() => { /* non-critical */ });
      });
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
    setScansRemaining,
  };
}
