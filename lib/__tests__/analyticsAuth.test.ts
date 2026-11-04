import { describe, it, expect, beforeEach } from "vitest";
import {
  NEW_ACCOUNT_WINDOW_MS,
  SIGNUP_PENDING_KEY,
  classifyAuthEvent,
  consumeSignUpPending,
  loginReported,
  markLoginReported,
  markSignUpPending,
  markSignUpReported,
  signUpReported,
} from "@/lib/analyticsAuth";

const NOW = 1_800_000_000_000;
const iso = (ms: number) => new Date(ms).toISOString();

function input(over: Partial<Parameters<typeof classifyAuthEvent>[0]> = {}) {
  return {
    createdAt: iso(NOW - 10 * 24 * 60 * 60 * 1000), // ten days old = returning
    provider: "google",
    now: NOW,
    signUpAlreadyReported: false,
    loginAlreadyReported: false,
    signUpPending: false,
    ...over,
  };
}

describe("classifyAuthEvent", () => {
  it("reports a returning user as login", () => {
    expect(classifyAuthEvent(input())).toEqual({ name: "login", method: "google" });
  });

  it("reports a freshly created account as sign_up", () => {
    expect(classifyAuthEvent(input({ createdAt: iso(NOW - 4000) }))).toEqual({
      name: "sign_up",
      method: "google",
    });
  });

  /**
   * ⚠️ A new account must produce sign_up and NOT also login. GA4 counts the
   * two independently, so emitting both for one arrival would make every
   * signup look like it immediately came back — the retention number would be
   * wrong in the flattering direction.
   */
  it("never reports both events for one arrival", () => {
    const d = classifyAuthEvent(input({ createdAt: iso(NOW - 1000) }));
    expect(d?.name).toBe("sign_up");
  });

  it("treats the window edge as returning, not new", () => {
    const justInside = classifyAuthEvent(input({ createdAt: iso(NOW - (NEW_ACCOUNT_WINDOW_MS - 1000)) }));
    const justOutside = classifyAuthEvent(input({ createdAt: iso(NOW - (NEW_ACCOUNT_WINDOW_MS + 1000)) }));
    expect(justInside?.name).toBe("sign_up");
    expect(justOutside?.name).toBe("login");
  });

  /**
   * The slow-path case the `created_at` window alone cannot see: with email
   * confirmation on, the row is created at submit time but the session only
   * arrives when the link is clicked, possibly hours later.
   */
  it("honours the explicit pending marker even when created_at is old", () => {
    expect(classifyAuthEvent(input({ signUpPending: true }))).toEqual({
      name: "sign_up",
      method: "google",
    });
  });

  it("reports nothing once both have already been reported", () => {
    expect(
      classifyAuthEvent(input({ signUpAlreadyReported: true, loginAlreadyReported: true })),
    ).toBeNull();
  });

  /**
   * ⚠️ THE RE-EMIT CASE. supabase-js re-emits SIGNED_IN for the same user on
   * tab refocus and token refresh — this repo has been bitten by it twice
   * already. Without this, the login count inflates by however many times
   * someone switched tabs, worst for the engaged users the funnel most needs
   * to describe.
   */
  it("reports nothing on a repeat arrival for an already-counted session", () => {
    expect(classifyAuthEvent(input({ loginAlreadyReported: true }))).toBeNull();
  });

  it("does not re-report sign_up for an account already counted, even inside the window", () => {
    const d = classifyAuthEvent(
      input({ createdAt: iso(NOW - 1000), signUpAlreadyReported: true }),
    );
    expect(d).toEqual({ name: "login", method: "google" });
  });

  it("falls back to a visible 'unknown' method rather than merging providers", () => {
    expect(classifyAuthEvent(input({ provider: null }))?.method).toBe("unknown");
    expect(classifyAuthEvent(input({ provider: "  " }))?.method).toBe("unknown");
  });

  it("survives an unparseable created_at by treating the user as returning", () => {
    expect(classifyAuthEvent(input({ createdAt: "not-a-date" }))?.name).toBe("login");
    expect(classifyAuthEvent(input({ createdAt: null }))?.name).toBe("login");
  });
});

describe("dedupe storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("scopes sign_up to localStorage (once per account, ever)", () => {
    expect(signUpReported("u1")).toBe(false);
    markSignUpReported("u1");
    expect(signUpReported("u1")).toBe(true);
    expect(signUpReported("u2")).toBe(false);
  });

  it("scopes login to sessionStorage (once per tab session)", () => {
    expect(loginReported("u1")).toBe(false);
    markLoginReported("u1");
    expect(loginReported("u1")).toBe(true);
    // A new tab session starts with a clean sessionStorage — that IS a new login.
    sessionStorage.clear();
    expect(loginReported("u1")).toBe(false);
  });

  it("consumes the pending marker, so it explains exactly one arrival", () => {
    markSignUpPending();
    expect(consumeSignUpPending(Date.now())).toBe(true);
    expect(consumeSignUpPending(Date.now())).toBe(false);
  });

  it("expires a stale pending marker rather than relabelling a later login", () => {
    localStorage.setItem(SIGNUP_PENDING_KEY, String(Date.now() - 48 * 60 * 60 * 1000));
    expect(consumeSignUpPending(Date.now())).toBe(false);
  });

  it("reports no pending marker when none was written", () => {
    expect(consumeSignUpPending(Date.now())).toBe(false);
  });
});
