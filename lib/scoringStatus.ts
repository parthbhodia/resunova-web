/**
 * Last scoring-model result from GET /api/scoring-status.
 * A failed fetch means we could not ask, which is a reachability problem,
 * not a model refusal. Callers leave the scan screen unchanged in that case.
 */
import { apiFetch } from "@/lib/apiClient";

export type ScoringReason = "rate_limit" | "auth" | "timeout";

export type ScoringStatus = {
  scoring: "ok" | "paused";
  reason: ScoringReason | null;
};

const REASONS = new Set<ScoringReason>(["rate_limit", "auth", "timeout"]);

export async function fetchScoringStatus(): Promise<ScoringStatus> {
  const resp = await apiFetch("/api/scoring-status");
  if (!resp.ok) return { scoring: "ok", reason: null };
  const json = await resp.json().catch(() => null);
  const reason = json && REASONS.has(json.reason) ? (json.reason as ScoringReason) : null;
  if (json?.scoring === "paused" && reason) return { scoring: "paused", reason };
  return { scoring: "ok", reason: null };
}
