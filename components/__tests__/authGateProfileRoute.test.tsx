import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockSignInWithGoogle = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ usePathname: () => "/profile" }));
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

describe("AuthGate account hub protection", () => {
  it("does not render the profile hub to a signed-out visitor", async () => {
    // /profile was in PUBLIC_ROUTES, so this route bypassed the gate entirely
    // and ProfilePage rendered its dashboard unauthenticated: the header read
    // "Signed in account" and the Sign out button was live.
    render(
      <AuthGate>
        <div>Signed in account</div>
      </AuthGate>,
    );

    expect(await screen.findByRole("heading", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(screen.queryByText("Signed in account")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
  });
});
