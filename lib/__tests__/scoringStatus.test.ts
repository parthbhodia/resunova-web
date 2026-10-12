import { describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiFetch }));

import { fetchScoringStatus } from "@/lib/scoringStatus";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body };
}

describe("fetchScoringStatus", () => {
  it("reports a model refusal", async () => {
    apiFetch.mockResolvedValue(jsonResponse({ scoring: "paused", reason: "rate_limit" }));
    await expect(fetchScoringStatus()).resolves.toEqual({ scoring: "paused", reason: "rate_limit" });
    expect(apiFetch).toHaveBeenCalledWith("/api/scoring-status");
  });

  it("treats an unreachable status route as not a model refusal", async () => {
    apiFetch.mockResolvedValue(jsonResponse({ error: "down" }, false));
    await expect(fetchScoringStatus()).resolves.toEqual({ scoring: "ok", reason: null });
  });

  it("ignores a paused flag with no known reason", async () => {
    apiFetch.mockResolvedValue(jsonResponse({ scoring: "paused", reason: "mystery" }));
    await expect(fetchScoringStatus()).resolves.toEqual({ scoring: "ok", reason: null });
  });
});
