import { beforeEach, describe, expect, it, vi } from "vitest";

/* Pre-wall event stash (M2): signed-out edit intent is stored locally and
 * delivered after sign-in with prewall=true — owner-RLS means it cannot be
 * inserted while signed out. */

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => ({ insert: async () => ({ error: null }) }),
  }),
}));

beforeEach(() => {
  localStorage.clear();
});

describe("prewall event stash", () => {
  it("stashes locally and flush returns + clears the stash (one-shot)", async () => {
    const { stashPrewallEvent, flushPrewallEvents } = await import("@/lib/clientEvents");
    stashPrewallEvent("edit_click", { from: "score" });
    stashPrewallEvent("edit_click", {});

    const flushed = await flushPrewallEvents();
    expect(flushed).toHaveLength(2);
    expect(flushed[0].event).toBe("edit_click");
    expect(flushed[0].props).toEqual({ from: "score" });
    expect(flushed[0].ts).toBeTruthy();

    // one-shot: the stash is gone
    await expect(flushPrewallEvents()).resolves.toHaveLength(0);
  });

  it("caps the stash at 20 events (newest kept)", async () => {
    const { stashPrewallEvent, flushPrewallEvents } = await import("@/lib/clientEvents");
    for (let i = 0; i < 25; i++) stashPrewallEvent("edit_click", { i });
    const flushed = await flushPrewallEvents();
    expect(flushed).toHaveLength(20);
    expect(flushed[0].props).toEqual({ i: 5 });
    expect(flushed[19].props).toEqual({ i: 24 });
  });

  it("logClientEvent is a quiet no-op without a session", async () => {
    const { logClientEvent } = await import("@/lib/clientEvents");
    await expect(logClientEvent("report_view")).resolves.toBe(false);
  });
});
