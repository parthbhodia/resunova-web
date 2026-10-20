import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
  signInWithGoogle: vi.fn(),
  urlRequestsPublicAppView: () => false,
}));
vi.mock("@/components/SignInDialog", () => ({
  useSignInDialog: () => ({ openSignIn: vi.fn() }),
}));
vi.mock("@/components/LandingPage", () => ({ default: () => <div>Landing page</div> }));
vi.mock("@/components/app-shell/AppShellSkeleton", () => ({ default: () => <div>Loading app</div> }));

import AuthGate from "@/components/AuthGate";

describe("AuthGate referral directory", () => {
  it("renders the referral page for a signed-out visitor", () => {
    // /refer used to be gated at the route boundary (migration 052's privacy
    // model). The directory is public now and only the ask needs an account,
    // which the form itself handles, so the route must not wall first.
    render(
      <AuthGate>
        <div>Open referral directory</div>
      </AuthGate>,
    );

    expect(screen.getByText("Open referral directory")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sign in to view referrals" })).not.toBeInTheDocument();
  });
});
