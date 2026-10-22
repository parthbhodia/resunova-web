import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

/**
 * A signed-out visitor who clicked "Write my cover letter" on /cover-letter.
 *
 * That page advertises `/?view=cover-letter` in three places (hero CTA, one
 * "Open in the builder" per layout, plus the mobile header menu). `cover-letter`
 * is not in PUBLIC_APP_VIEWS, so the gate answered with <LandingPage /> — the
 * visitor landed on the marketing hero under a URL still saying
 * `?view=cover-letter`. That reads as a broken link, not a decision.
 *
 * The fix keeps the URL and asks them to sign in, because the destination
 * machinery already works from `window.location`: `signInWithGoogle` stashes the
 * post-login destination and builds its OAuth `redirectTo` from the current URL,
 * so signing in in place drops them on the view they clicked.
 */

let pathname = "/";

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: currentSession } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

vi.mock("@/components/LandingPage", () => ({ default: () => <div>landing</div> }));
vi.mock("@/components/SignInDialog", () => ({ useSignInDialog: () => ({ openSignIn: vi.fn() }) }));

import AuthGate from "@/components/AuthGate";
import { gateContentForView } from "@/components/auth/gateContent";

/** Flipped per test: the prompt is the signed-out case, the shell is the after. */
let currentSession: unknown = null;

function App() {
  return <div>app shell</div>;
}

beforeEach(() => {
  pathname = "/";
  currentSession = null;
  window.history.replaceState({}, "", "/");
});

describe("AuthGate for a signed-out visitor asking for an account-bound view", () => {
  it("asks them to sign in at the view they requested, keeping the URL", async () => {
    window.history.replaceState({}, "", "/?view=cover-letter");
    render(<AuthGate><App /></AuthGate>);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: gateContentForView("cover-letter").headline })).toBeInTheDocument()
    );
    expect(screen.queryByText("landing")).toBeNull();
    expect(screen.queryByText("app shell")).toBeNull();
    // The whole point: the URL they asked for is still the URL they are on.
    expect(window.location.search).toBe("?view=cover-letter");
  });

  it("prompts on a <Link> navigation too, not only on a direct load", async () => {
    // The actual trip: /cover-letter is a marketing page, so the CTA is a
    // client navigation that changes the pathname and never fires popstate.
    pathname = "/cover-letter";
    const { rerender } = render(<AuthGate><App /></AuthGate>);

    await act(async () => {
      window.history.pushState({}, "", "/?view=cover-letter");
      pathname = "/";
    });
    rerender(<AuthGate><App /></AuthGate>);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: gateContentForView("cover-letter").headline })).toBeInTheDocument()
    );
    expect(screen.queryByText("app shell")).toBeNull();
  });

  it("still shows the marketing page when no view was requested", async () => {
    render(<AuthGate><App /></AuthGate>);

    await waitFor(() => expect(screen.getByText("landing")).toBeInTheDocument());
  });

  it("still shows the marketing page for a view the app cannot render", async () => {
    // A junk ?view= falls back to "home" in AppShell, so prompting for sign-in
    // would gate a page that renders fine without an account.
    window.history.replaceState({}, "", "/?view=interview-prep");
    render(<AuthGate><App /></AuthGate>);

    await waitFor(() => expect(screen.getByText("landing")).toBeInTheDocument());
    expect(screen.queryByText(/sign in to open/i)).toBeNull();
  });

  it("does not gate the home hub, which is the landing page's own destination", async () => {
    window.history.replaceState({}, "", "/?view=home");
    render(<AuthGate><App /></AuthGate>);

    await waitFor(() => expect(screen.getByText("landing")).toBeInTheDocument());
  });

  it("opens the view for a signed-in visitor, which is where signing in lands them", async () => {
    currentSession = { user: { id: "u1" }, access_token: "t1" };
    window.history.replaceState({}, "", "/?view=cover-letter");
    render(<AuthGate><App /></AuthGate>);

    await waitFor(() => expect(screen.getByText("app shell")).toBeInTheDocument());
    expect(screen.queryByText("landing")).toBeNull();
  });
});