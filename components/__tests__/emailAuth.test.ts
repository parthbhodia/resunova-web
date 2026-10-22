import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendPasswordReset, signInWithEmail, signUpWithEmail } from "@/lib/emailAuth";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithOtp: vi.fn(),
  buildOAuthReturnUrl: vi.fn(() => "https://www.resunova.io/?view=jobs"),
  buildAuthRouteUrl: vi.fn(() => "https://www.resunova.io/reset-password/"),
  stashPostLoginDest: vi.fn(),
  markSignUpPending: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signInWithOtp: mocks.signInWithOtp,
    },
  }),
}));

vi.mock("@/lib/analyticsAuth", () => ({
  markSignUpPending: mocks.markSignUpPending,
}));

vi.mock("@/lib/oauthRedirect", () => ({
  buildOAuthReturnUrl: mocks.buildOAuthReturnUrl,
  buildAuthRouteUrl: mocks.buildAuthRouteUrl,
  stashPostLoginDest: mocks.stashPostLoginDest,
}));

beforeEach(() => {
  mocks.signInWithPassword.mockReset();
  mocks.signUp.mockReset();
  mocks.resetPasswordForEmail.mockReset();
  mocks.signInWithOtp.mockReset();
  mocks.stashPostLoginDest.mockClear();
  mocks.markSignUpPending.mockClear();
});

describe("email authentication", () => {
  it("signs in with a normalized email address", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    await expect(signInWithEmail(" student@monroeu.edu ", "password123")).resolves.toBeNull();
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "student@monroeu.edu",
      password: "password123",
    });
  });

  it("stashes the destination and reports when signup needs email confirmation", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: { identities: [{ provider: "email" }] } },
      error: null,
    });

    await expect(signUpWithEmail("student@monroeu.edu", "password123")).resolves.toEqual({
      error: null,
      needsConfirmation: true,
      alreadyRegistered: false,
    });
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
    expect(mocks.stashPostLoginDest).toHaveBeenCalledOnce();
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "student@monroeu.edu",
      password: "password123",
      options: { emailRedirectTo: "https://www.resunova.io/?view=jobs" },
    });
  });

  it("detects an existing account and emails a sign-in link instead of a dead confirmation", async () => {
    // Supabase's response to a repeated signup: 200, no session, user with no identities, no email sent.
    mocks.signUp.mockResolvedValue({ data: { session: null, user: { identities: [] } }, error: null });
    mocks.signInWithOtp.mockResolvedValue({ error: null });

    await expect(signUpWithEmail(" student@monroeu.edu ", "password123")).resolves.toEqual({
      error: null,
      needsConfirmation: false,
      alreadyRegistered: true,
    });
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "student@monroeu.edu",
      options: { shouldCreateUser: false, emailRedirectTo: "https://www.resunova.io/?view=jobs" },
    });
  });

  /**
   * ⚠️ WHERE THE SIGN-UP MARKER FIRES IS A MERGE DECISION, AND NOTHING HELD IT.
   * Two correct changes met in this function: #335 detects a repeated signup
   * and emails a sign-in link, and the analytics work marks a pending sign-up
   * so a confirmation click arriving an hour later still reports as `sign_up`
   * rather than `login`.
   *
   * Composed naively — the marker fired before the call, as it originally did
   * — they produce a new defect. The marker survives 24h and is consumed by
   * the next SIGNED_IN, which on the already-registered path is the magic-link
   * arrival SECONDS later, for an account that already existed. The signup
   * funnel would count a returning user as a new account, and that count is
   * the one number the whole instrumentation exists to measure.
   *
   * Pinned in both directions, because moving the call back up is a one-line
   * edit that breaks no other test.
   */
  it("marks a pending sign-up only for a genuinely new account", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: { identities: [{ provider: "email" }] } },
      error: null,
    });
    await signUpWithEmail("new@monroeu.edu", "password123");
    expect(mocks.markSignUpPending).toHaveBeenCalledTimes(1);
  });

  it("⚠️ does NOT mark a sign-up when the account already exists", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: { identities: [] } },
      error: null,
    });
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    const result = await signUpWithEmail("returning@monroeu.edu", "password123");
    expect(result.alreadyRegistered).toBe(true);
    expect(mocks.markSignUpPending).not.toHaveBeenCalled();
  });

  it("does not mark a sign-up when Supabase refuses", async () => {
    mocks.signUp.mockResolvedValue({ data: {}, error: { message: "nope" } });
    await signUpWithEmail("x@monroeu.edu", "password123");
    expect(mocks.markSignUpPending).not.toHaveBeenCalled();
  });

  it("sends password resets to the dedicated static route", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });

    await expect(sendPasswordReset(" student@example.com ")).resolves.toBeNull();
    expect(mocks.buildAuthRouteUrl).toHaveBeenCalledWith("/reset-password/");
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("student@example.com", {
      redirectTo: "https://www.resunova.io/reset-password/",
    });
  });

  it("returns Supabase errors to the sign-in UI", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    await expect(signInWithEmail("student@example.com", "wrongpass")).resolves.toBe(
      "Invalid login credentials",
    );
  });
});
