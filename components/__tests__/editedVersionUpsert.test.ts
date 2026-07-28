import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

/* upsertEditedVersion (M2): one editable version per analyses lineage —
 * create-on-first-save (source_root_id anchored), update-in-place after,
 * link stamped with one retry and a link_failed event on double failure. */

const logClientEvent = vi.fn(async () => true);
vi.mock("@/lib/clientEvents", () => ({
  logClientEvent: (...a: unknown[]) => logClientEvent(...(a as [])),
}));

type Call = { method: string; args: unknown[] };
interface FromConfig {
  result: unknown;
  calls: Call[];
}

/** Chainable stand-in for one supabase .from() expression: every method
 * returns the chain; awaiting it (or its maybeSingle/single) resolves the
 * configured result. Calls are recorded for payload assertions. */
function makeChain(config: FromConfig) {
  const chain: Record<string, unknown> = {};
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      config.calls.push({ method, args });
      return chain;
    };
  for (const m of ["select", "insert", "update", "eq", "order", "limit"]) chain[m] = record(m);
  chain.maybeSingle = () => {
    config.calls.push({ method: "maybeSingle", args: [] });
    return Promise.resolve(config.result);
  };
  chain.single = () => {
    config.calls.push({ method: "single", args: [] });
    return Promise.resolve(config.result);
  };
  (chain as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(config.result);
  return chain;
}

function makeDb(queue: FromConfig[], userId: string | null = "u1") {
  return {
    auth: {
      getSession: async () => ({
        data: { session: userId ? { user: { id: userId }, access_token: "tok" } : null },
      }),
    },
    from: (table: string) => {
      const config = queue.shift();
      if (!config) throw new Error(`unexpected from(${table})`);
      config.calls.push({ method: "from", args: [table] });
      return makeChain(config);
    },
  };
}

let db: ReturnType<typeof makeDb>;
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => db,
  insertAnalysis: vi.fn(),
}));

const STRUCTURED = { full_name: "Parth" } as unknown as StructuredResume;

const VERSION_ROW = {
  id: "v-1", name: "Edited Jul 24", root_id: "v-1", parent_id: null, version: 1,
  structured: STRUCTURED, extracted_text: "TXT", origin: "manual", source_pdf_url: null,
  jd_text: null, jd_company: null, jd_title: null, last_score: 78, last_score_source: "estimate",
  is_default: false, source_root_id: "root-A", created_at: "2026-07-24T00:00:00Z", updated_at: "2026-07-24T00:00:00Z",
};

beforeEach(() => {
  logClientEvent.mockClear();
  vi.unstubAllGlobals();
});

describe("upsertEditedVersion", () => {
  it("creates the root v1 with source_root_id + estimate score on first save, then links", async () => {
    const lookup: FromConfig = { result: { data: null, error: null }, calls: [] };
    const insert: FromConfig = { result: { data: VERSION_ROW, error: null }, calls: [] };
    db = makeDb([lookup, insert]);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ linked: true }) })));

    const { upsertEditedVersion } = await import("@/lib/resumeVersions");
    const out = await upsertEditedVersion({
      sourceRootId: "root-A", analysisId: "a-9", name: "",
      structured: STRUCTURED, extractedText: "TXT", projectedScore: 78,
    });

    expect(out?.created).toBe(true);
    expect(out?.linked).toBe(true);
    const payload = insert.calls.find((c) => c.method === "insert")?.args[0] as Record<string, unknown>;
    expect(payload.source_root_id).toBe("root-A");
    expect(payload.origin).toBe("manual");
    expect(payload.last_score).toBe(78);
    expect(payload.last_score_source).toBe("estimate");
    // Concept-free default name — no v-numbers, reads "Edited {Mon D}".
    expect(String(payload.name)).toMatch(/^Edited /);
  });

  it("updates the existing lineage version in place (no second root)", async () => {
    const lookup: FromConfig = { result: { data: VERSION_ROW, error: null }, calls: [] };
    const update: FromConfig = { result: { error: null }, calls: [] };
    db = makeDb([lookup, update]);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ linked: true }) })));

    const { upsertEditedVersion } = await import("@/lib/resumeVersions");
    const out = await upsertEditedVersion({
      sourceRootId: "root-A", analysisId: "a-10", name: "ignored",
      structured: STRUCTURED, extractedText: "TXT2", projectedScore: 81,
    });

    expect(out?.created).toBe(false);
    expect(out?.version.id).toBe("v-1");
    const row = update.calls.find((c) => c.method === "update")?.args[0] as Record<string, unknown>;
    expect(row.extracted_text).toBe("TXT2");
    expect(row.last_score).toBe(81);
    expect(row.last_score_source).toBe("estimate");
    expect(update.calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("retries a failed link once, then logs link_failed without failing the save", async () => {
    const lookup: FromConfig = { result: { data: VERSION_ROW, error: null }, calls: [] };
    const update: FromConfig = { result: { error: null }, calls: [] };
    db = makeDb([lookup, update]);
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);

    const { upsertEditedVersion } = await import("@/lib/resumeVersions");
    const out = await upsertEditedVersion({
      sourceRootId: "root-A", analysisId: "a-11", name: "n",
      structured: STRUCTURED, extractedText: "T", projectedScore: null,
    });

    expect(out?.linked).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logClientEvent).toHaveBeenCalledWith(
      "link_failed",
      expect.objectContaining({ analysis_id: "a-11", version_id: "v-1" }),
    );
  });

  it("returns null (no throw) when there is no session", async () => {
    const lookup: FromConfig = { result: { data: null, error: null }, calls: [] };
    db = makeDb([lookup], null);
    const { upsertEditedVersion } = await import("@/lib/resumeVersions");
    const out = await upsertEditedVersion({
      sourceRootId: "root-A", analysisId: null, name: "n",
      structured: STRUCTURED, extractedText: "T", projectedScore: 70,
    });
    expect(out).toBeNull();
  });
});

describe("syncVersionAfterRescore", () => {
  it("mirrors the verified score onto the linked version as llm", async () => {
    const lookup: FromConfig = { result: { data: VERSION_ROW, error: null }, calls: [] };
    const update: FromConfig = { result: { error: null }, calls: [] };
    db = makeDb([lookup, update]);

    const { syncVersionAfterRescore } = await import("@/lib/resumeVersions");
    const ok = await syncVersionAfterRescore({ sourceRootId: "root-A", score: 84, extractedText: "T3" });

    expect(ok).toBe(true);
    const row = update.calls.find((c) => c.method === "update")?.args[0] as Record<string, unknown>;
    expect(row.last_score).toBe(84);
    expect(row.last_score_source).toBe("llm");
    expect(row.extracted_text).toBe("T3");
  });

  it("is a quiet no-op when no linked version exists", async () => {
    const lookup: FromConfig = { result: { data: null, error: null }, calls: [] };
    db = makeDb([lookup]);
    const { syncVersionAfterRescore } = await import("@/lib/resumeVersions");
    await expect(syncVersionAfterRescore({ sourceRootId: "root-Z", score: 90 })).resolves.toBe(false);
  });
});
