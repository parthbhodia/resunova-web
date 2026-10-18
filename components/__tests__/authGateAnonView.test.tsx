import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

/**
 * `/?view=analyze` is a signed-out ENTRY POINT, not just a URL a visitor can be
 * handed: 4 of the 15 blog posts carry a Next <Link> CTA into it, so the gate
 * has to open the app shell on a CLIENT navigation — not only on a page load,
 * and not only on back/forward. Those posts sit on a marketing path, so the
 * navigation changes the pathname, which is what the dependency keys on.
 *
 * Reading the view once on mount (plus popstate) satisfied every direct-load
 * test and still failed in the browser: a <Link> pushes history and swaps the
 * pathname without firing popstate, so anonView stayed false and a signed-out
 * visitor who clicked "Try the analyzer" on a blog post got the marketing hero
 * under a URL that said analyze.
 *
 * The effect therefore re-reads on every pathname change. This pins that, so
 * dropping the dependency again fails here instead of in front of a reader.
 */

/** `usePathname` reads this, so a test can move the visitor between routes. */
let pathname = "/";

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      // Every case here is signed out: that is the only state anonView decides.
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

vi.mock("@/components/LandingPage", () => ({ default: () => <div>landing</div> }));
vi.mock("@/components/SignInDialog", () => ({ useSignInDialog: () => ({ openSignIn: vi.fn() }) }));

import AuthGate from "@/components/AuthGate";

/** Stands in for the app shell: present only when the gate lets the visitor in. */
function App() {
  return <div>app shell</div>;
}

beforeEach(() => {
  pathname = "/";
  window.history.replaceState({}, "", "/");
});

describe("AuthGate for a signed-out visitor arriving at /?view=", () => {
  it("opens the app shell on a direct load of the entry URL", async () => {
    window.history.replaceState({}, "", "/?view=analyze");
    render(<AuthGate><App /></AuthGate>);

    await waitFor(() => expect(screen.getByText("app shell")).toBeInTheDocument());
    expect(screen.queryByText("landing")).toBeNull();
  });

  it("opens the app shell when a <Link> navigates a marketing page into it", async () => {
    // Where a blog CTA click starts: a marketing route, no view in the URL.
    pathname = "/pricing";
    const { rerender } = render(<AuthGate><App /></AuthGate>);
    expect(screen.queryByText("landing")).toBeNull();

    // The click. Next pushes the new history entry and re-renders the gate with
    // the new pathname; no popstate, so the mount-time read is long gone. The
    // rerender is required: without it the gate still believes it is on
    // /pricing, where it renders children for ANY visitor, and this test would
    // pass against the broken gate for the wrong reason.
    await act(async () => {
      window.history.pushState({}, "", "/?view=analyze");
      pathname = "/";
    });
    rerender(<AuthGate><App /></AuthGate>);

    await waitFor(() => expect(screen.getByText("app shell")).toBeInTheDocument());
    expect(screen.queryByText("landing")).toBeNull();
  });

  it("still shows the landing page for a view that is not public", async () => {
    // The widening above must not become "any ?view= opens the app": an
    // unknown view is a signed-out visitor on the marketing page.
    window.history.replaceState({}, "", "/?view=interview-prep");
    render(<AuthGate><App /></AuthGate>);

    await waitFor(() => expect(screen.getByText("landing")).toBeInTheDocument());
    expect(screen.queryByText("app shell")).toBeNull();
  });
});