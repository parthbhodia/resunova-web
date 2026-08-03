import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

/**
 * Drives the real AuthGate through the event sequence a tab switch produces.
 *
 * The helper tests pin the rule; this pins that AuthGate is wired to it. A
 * correct rule with the component still calling setSession(s) directly would
 * pass those and fail this, which is the failure that reached the user.
 */

let emit: ((event: string, session: unknown) => void) | null = null;
const session = { user: { id: "u1" }, access_token: "t1" };

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        emit = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/tailor-2" }));
vi.mock("@/components/LandingPage", () => ({ default: () => <div>landing</div> }));
vi.mock("@/components/SignInDialog", () => ({ useSignInDialog: () => ({ openSignIn: vi.fn() }) }));

import AuthGate from "@/components/AuthGate";

/** Stands in for work in progress: it counts its own mounts, so a remount is
 *  observable rather than inferred from what happens to be on screen. */
let mounts = 0;
function Work() {
  const [id] = useState(() => ++mounts);
  return <div>work #{id}</div>;
}

beforeEach(() => { emit = null; mounts = 0; });

describe("AuthGate across a tab switch", () => {
  it("keeps the app mounted when a refocus re-emit carries no session", async () => {
    render(<AuthGate><Work /></AuthGate>);
    await waitFor(() => expect(screen.getByText("work #1")).toBeInTheDocument());

    // What supabase-js does on refocus: re-emit, sometimes with no session.
    await act(async () => { emit!("TOKEN_REFRESHED", null); });
    await act(async () => { emit!("SIGNED_IN", null); });

    expect(screen.getByText("work #1")).toBeInTheDocument();
    expect(screen.queryByText(/sign in to continue/i)).toBeNull();
    // Still the FIRST mount: the subtree was never torn down and rebuilt.
    expect(mounts).toBe(1);
  });

  it("still gates on an explicit sign out", async () => {
    render(<AuthGate><Work /></AuthGate>);
    await waitFor(() => expect(screen.getByText("work #1")).toBeInTheDocument());

    await act(async () => { emit!("SIGNED_OUT", null); });

    await waitFor(() => expect(screen.getByText(/sign in to continue/i)).toBeInTheDocument());
    expect(screen.queryByText("work #1")).toBeNull();
  });
});
