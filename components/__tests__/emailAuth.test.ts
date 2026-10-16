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
