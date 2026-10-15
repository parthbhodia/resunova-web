import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignInWithGoogle = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ usePathname: () => "/refer" }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));
vi.mock("@/lib/authSignOut", () => ({
  clearForceLandingAfterSignOut: vi.fn(),
  readForceLandingAfterSignOut: () => false,
  subscribeForceLandingAfterSignOut: () => () => {},
}));
vi.mock("@/lib/anonScan", () => ({
  signInWithGoogle: mockSignInWithGoogle,
  urlRequestsPublicAppView: () => false,
}));
vi.mock("@/components/SignInDialog", () => ({
  useSignInDialog: () => ({ openSignIn: vi.fn() }),
}));
vi.mock("@/components/LandingPage", () => ({ default: () => <div>Landing page</div> }));
vi.mock("@/components/app-shell/AppShellSkeleton", () => ({ default: () => <div>Loading app</div> }));

import AuthGate from "@/components/AuthGate";

describe("AuthGate referral protection", () => {
  it("shows the referral-specific sign-in gate instead of rendering referral data", async () => {
    render(
      <AuthGate>
        <div>Private referral directory</div>
      </AuthGate>,
    );

    expect(await screen.findByRole("heading", { name: "Sign in to view referrals" })).toBeInTheDocument();
    expect(screen.queryByText("Private referral directory")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(mockSignInWithGoogle).toHaveBeenCalledOnce();
  });
});
