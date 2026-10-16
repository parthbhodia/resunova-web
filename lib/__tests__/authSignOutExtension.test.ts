import { describe, it, expect, vi, beforeEach } from "vitest";

const { calls, mockApiFetch, mockSignOut } = vi.hoisted(() => {
  const calls: string[] = [];
  return {
    calls,
    mockApiFetch: vi.fn(async (path: string) => {
      calls.push(`api:${path}`);
      return { ok: true } as Response;
    }),
    mockSignOut: vi.fn(async () => {
      calls.push("supabase:signOut");
    }),
  };
});

vi.mock("@/lib/apiClient", () => ({ apiFetch: mockApiFetch }));
vi.mock("@/lib/supabase", () => ({ getSupabaseClient: () => ({ auth: { signOut: mockSignOut } }) }));
vi.mock("@/lib/clientCache", () => ({ invalidateCache: vi.fn() }));

import { signOutAndReturnHome } from "@/lib/authSignOut";

beforeEach(() => {
  calls.length = 0;
  Object.defineProperty(window, "location", { value: { assign: vi.fn() }, writable: true });
});

describe("signOutAndReturnHome", () => {
  it("revokes extension sessions BEFORE the Supabase token is gone", async () => {
    await signOutAndReturnHome();
    expect(calls).toEqual(["api:/api/extension/revoke-all", "supabase:signOut"]);
  });

  it("still signs out when the revoke fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("down"));
    await signOutAndReturnHome();
    expect(mockSignOut).toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith("/");
  });
});
