import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * upsertResume's select-then-insert has a hole: a row that appears between
 * the two calls (second tab, rescore racing the autosave) makes the insert
 * hit the (user_id, folder) unique — and the shipped code surfaced that as
 * "Save failed" with a Retry that re-ran the same doomed insert. The row is
 * the caller's own, so the honest recovery is to update it.
 *
 * Mocked at the @supabase/supabase-js boundary so the real select/insert/
 * update sequencing in upsertResume is what runs.
 */

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

import { createClient } from "@supabase/supabase-js";

type Result = { data: unknown; error: unknown };

const state = {
  selectResults: [] as Result[],
  insertResults: [] as Result[],
  updates: [] as Array<{ id: string; payload: Record<string, unknown> }>,
  inserts: [] as Array<Record<string, unknown>>,
};

function resumesBuilder() {
  let pendingInsert: Record<string, unknown> | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;
  let updateId = "";
  const b = {
    select: () => b,
    eq: (col: string, v: string) => {
      if (pendingUpdate && col === "id") updateId = v;
      return b;
    },
    maybeSingle: async () => state.selectResults.shift() ?? { data: null, error: null },
    insert: (p: Record<string, unknown>) => {
      pendingInsert = p;
      return b;
    },
    update: (p: Record<string, unknown>) => {
      pendingUpdate = p;
      return b;
    },
    single: async () => {
      if (pendingInsert) {
        state.inserts.push(pendingInsert);
        pendingInsert = null;
        return state.insertResults.shift() ?? { data: { id: "new-1" }, error: null };
      }
      if (pendingUpdate) {
        state.updates.push({ id: updateId, payload: pendingUpdate });
        pendingUpdate = null;
        return { data: { id: updateId }, error: null };
      }
      return { data: null, error: null };
    },
  };
  return b;
}

const fakeClient = {
  auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
  from: (table: string) =>
    table === "resumes"
      ? resumesBuilder()
      : {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        },
};

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk-test";

import { upsertResume, isDuplicateKeyError } from "@/lib/supabase";

const DUP = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "resumes_user_folder_key"',
};

beforeEach(() => {
  // The repo's vitest config resets mocks between tests, so the client
  // wiring must be re-established here, not at module scope.
  vi.mocked(createClient).mockReturnValue(fakeClient as never);
  state.selectResults = [];
  state.insertResults = [];
  state.updates = [];
  state.inserts = [];
});

describe("upsertResume recovers from an insert race", () => {
  it("updates the row that appeared between select and insert", async () => {
    state.selectResults = [
      { data: null, error: null }, // initial select: nothing there yet
      { data: { id: "raced-1" }, error: null }, // recovery select: the racer's row
    ];
    state.insertResults = [{ data: null, error: DUP }];

    const id = await upsertResume("tailor_match_co_role_x", "—", "—", "m", "", null, null);
    expect(id).toBe("raced-1");
    expect(state.inserts).toHaveLength(1);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].id).toBe("raced-1");
  });

  it("still surfaces a non-duplicate insert error", async () => {
    // The recovery must be scoped to the one error it can honestly fix — an
    // RLS refusal retried as an update would just fail twice, slower.
    state.selectResults = [{ data: null, error: null }];
    state.insertResults = [
      { data: null, error: { code: "42501", message: "permission denied for table resumes" } },
    ];
    await expect(
      upsertResume("tailor_match_co_role_x", "—", "—", "m", "", null, null),
    ).rejects.toThrow(/Library save failed/);
    expect(state.updates).toHaveLength(0);
  });
});

describe("isDuplicateKeyError", () => {
  it("matches the PostgREST unique-violation shape", () => {
    expect(isDuplicateKeyError(DUP)).toBe(true);
    expect(isDuplicateKeyError({ message: "Duplicate key value violates unique constraint" })).toBe(true);
  });
  it("rejects everything else", () => {
    expect(isDuplicateKeyError({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
    expect(isDuplicateKeyError("duplicate key")).toBe(false);
  });
});
