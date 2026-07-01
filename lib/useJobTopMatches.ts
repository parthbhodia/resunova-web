import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { authHeaders } from "@/lib/jobsApi";
import { apiUrl } from "@/lib/utils";

export type JobTopMatch = {
  id: string;
  title: string;
  company: string;
  matchScore: number | null;
};

export type UseJobTopMatchesParams = {
  enabled: boolean;
  days: number;
  countryScope: string;
  roleQuery?: string;
  search?: string;
  companyFilter?: string;
  workModels?: string[];
  analysisId?: string;
  limit?: number;
  refreshKey?: number;
};

export function useJobTopMatches({
  enabled,
  days,
  countryScope,
  roleQuery = "",
  search = "",
  companyFilter = "",
  workModels = [],
  analysisId = "",
  limit = 5,
  refreshKey = 0,
}: UseJobTopMatchesParams) {
  const [jobs, setJobs] = useState<JobTopMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const latestKeyRef = useRef("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (days) params.set("max_age_days", String(days));
    if (countryScope) params.set("country", countryScope);
    if (roleQuery.trim()) params.set("role", roleQuery.trim());
    if (search.trim()) params.set("title_any", search.trim());
    if (companyFilter.trim()) params.set("company", companyFilter.trim());
    if (workModels.length) params.set("work_model_any", workModels.join("|"));
    if (analysisId) params.set("analysis_id", analysisId);
    params.set("limit", String(limit));
    return params.toString();
  }, [analysisId, companyFilter, countryScope, days, limit, roleQuery, search, workModels]);

  useEffect(() => {
    if (!enabled) {
      setJobs([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const key = `${query}|r:${refreshNonce}`;
    latestKeyRef.current = key;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const headers = await authHeaders();
        if (controller.signal.aborted) return;
        const resp = await fetch(apiUrl(`/api/jobs/top-matches?${query}`), {
          headers,
          signal: controller.signal,
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
        }
        const body = await resp.json();
        if (controller.signal.aborted || latestKeyRef.current !== key) return;
        setJobs(Array.isArray(body?.jobs) ? body.jobs : []);
      } catch (err) {
        if (controller.signal.aborted || latestKeyRef.current !== key) return;
        setJobs([]);
        setError(err instanceof Error ? err.message : "Could not load top matches");
      } finally {
        if (!controller.signal.aborted && latestKeyRef.current === key) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [enabled, query, refreshKey, refreshNonce]);

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  return { jobs, loading, error, refresh };
}
