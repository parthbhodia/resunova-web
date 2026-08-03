import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { isSameUser, nextGateSession } from "@/lib/authGateSession";

const sess = (id: string, token = "t1") =>
  ({ user: { id }, access_token: token } as unknown as Session);

describe("nextGateSession", () => {
  it("keeps the session when a refocus re-emit carries none", () => {
    // THE BUG. AuthGate swaps to <SignInRequired> the moment its session goes
    // null, which unmounts every route below it. supabase-js re-emits on tab
    // refocus and does not always include the session, so switching tabs and
    // coming back destroyed whatever was in progress: a Fix-everything pass
    // mid-flight, a half-filled confirm form, an unsaved edit.
    const live = sess("u1");
    expect(nextGateSession(live, "TOKEN_REFRESHED", null)).toBe(live);
    expect(nextGateSession(live, "SIGNED_IN", null)).toBe(live);
    expect(nextGateSession(live, "INITIAL_SESSION", null)).toBe(live);
    expect(nextGateSession(live, "USER_UPDATED", null)).toBe(live);
  });

  it("still ends the session on an explicit sign out", () => {
    // The guard must not turn sign-out into a no-op, or a shared machine keeps
    // the previous person's account open.
    expect(nextGateSession(sess("u1"), "SIGNED_OUT", null)).toBeNull();
    expect(nextGateSession(sess("u1"), "USER_DELETED", null)).toBeNull();
  });

  it("ends the session on sign out even if one is somehow attached", () => {
    expect(nextGateSession(sess("u1"), "SIGNED_OUT", sess("u1"))).toBeNull();
  });

  it("takes the new session when the event actually carries one", () => {
    const next = sess("u1", "t2");
    expect(nextGateSession(sess("u1", "t1"), "TOKEN_REFRESHED", next)).toBe(next);
  });

  it("switches users rather than pinning the first one", () => {
    const b = sess("u2");
    expect(nextGateSession(sess("u1"), "SIGNED_IN", b)).toBe(b);
  });

  it("stays signed out when there was nothing to keep", () => {
    // A visitor who was never signed in must not be handed a session by a
    // null-bearing event.
    expect(nextGateSession(null, "INITIAL_SESSION", null)).toBeNull();
    expect(nextGateSession(null, "TOKEN_REFRESHED", null)).toBeNull();
  });

  it("lets a first sign-in through from signed out", () => {
    const s = sess("u1");
    expect(nextGateSession(null, "SIGNED_IN", s)).toBe(s);
  });
});

describe("isSameUser", () => {
  it("is true only for a repeat of the same signed-in user", () => {
    expect(isSameUser(sess("u1"), sess("u1", "t2"))).toBe(true);
    expect(isSameUser(sess("u1"), sess("u2"))).toBe(false);
  });

  it("is false when either side is signed out", () => {
    expect(isSameUser(null, sess("u1"))).toBe(false);
    expect(isSameUser(sess("u1"), null)).toBe(false);
    expect(isSameUser(null, null)).toBe(false);
  });
});
