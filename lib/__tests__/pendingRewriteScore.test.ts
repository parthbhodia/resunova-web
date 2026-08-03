import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));
import { apiFetch } from "@/lib/apiClient";
import { fetchLiveCoverage } from "@/lib/tailorLiveCoverage";

const CONCEPTS = [{ id: "r1", canonical: "Kubernetes", importance: "required" }];
const OK = {
  ok: true,
  json: async () => ({
    before: 42, after: 58, matchedBefore: 5, matched: 7, total: 12,
    gained: [], lost: [], unmatched: [], applied: 1, truncated: {}, reason: "",
  }),
};

const bodyOf = () => JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string);

afterEach(() => vi.clearAllMocks());

describe("scoring a rewrite that has not been applied yet", () => {
  it("sends it under the key the route actually reads", async () => {
    vi.mocked(apiFetch).mockResolvedValue(OK as never);
    // ⚠️ The route reads `pending_rewrites` (plus three camelCase spellings)
    // and ignores anything else. A near-miss like `rewrites` is SILENT: the
    // request succeeds, the score comes back unchanged, and the card
    // confidently reports no movement. This test exists because the first
    // version of this code used exactly that wrong key.
    await fetchLiveCoverage(CONCEPTS, "Ran the deploys.", undefined, [
      { original: "Ran the deploys.", suggested: "Ran the deploys on Kubernetes." },
    ]);
    const body = bodyOf();
    expect(body.pending_rewrites).toEqual([
      { original: "Ran the deploys.", suggested: "Ran the deploys on Kubernetes." },
    ]);
  });

  it("omits the key entirely when there is nothing pending", async () => {
    // The scoreboard's own recount must stay byte-identical, so an empty list
    // is an absent field rather than an empty one.
    vi.mocked(apiFetch).mockResolvedValue(OK as never);
    await fetchLiveCoverage(CONCEPTS, "Ran the deploys.");
    expect("pending_rewrites" in bodyOf()).toBe(false);
    await fetchLiveCoverage(CONCEPTS, "Ran the deploys.", undefined, []);
    expect("pending_rewrites" in JSON.parse(
      vi.mocked(apiFetch).mock.calls[1][1]!.body as string,
    )).toBe(false);
  });

  it("returns the recount so a caller can show before and after", async () => {
    vi.mocked(apiFetch).mockResolvedValue(OK as never);
    const r = await fetchLiveCoverage(CONCEPTS, "Ran the deploys.", undefined, [
      { original: "Ran the deploys.", suggested: "Ran the deploys on Kubernetes." },
    ]);
    expect(r?.before).toBe(42);
    expect(r?.after).toBe(58);
  });
});
