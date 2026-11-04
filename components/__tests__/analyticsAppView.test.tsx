import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { APP_VIEW_TITLES } from "@/lib/appViewTitle";

/**
 * `app_view` — the event that tells a signed-in app screen apart from the
 * marketing homepage.
 *
 * The titled page_view in app/layout.tsx covers entry at `/?view=…`, but bare
 * "/" is the landing page for a signed-out visitor and the app home for a
 * signed-in one, and nothing available when that script runs can tell them
 * apart. AppShell renders only when the app shell is genuinely on screen, so
 * its mount IS the disambiguation — which makes "does the effect actually
 * fire" the thing worth pinning.
 *
 * ⚠️ This is a jsdom mount, not a browser one. The dev-bypass static export
 * renders the GUEST state, so a signed-in app shell is not reachable there.
 */

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const { searchParams } = vi.hoisted(() => ({ searchParams: { current: new URLSearchParams() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => searchParams.current,
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  }),
}));

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics", () => ({
  trackEvent,
  analyticsReady: () => true,
}));

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  cleanup();
  trackEvent.mockClear();
  searchParams.current = new URLSearchParams();
});

async function mountShell(search: string) {
  searchParams.current = new URLSearchParams(search);
  const AppShell = (await import("@/components/AppShell")).default;
  render(<AppShell><div>body</div></AppShell>);
}

describe("app_view", () => {
  it("fires for the view the shell is rendering", async () => {
    await mountShell("?view=analyze");
    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith("app_view", { view: "analyze" });
    });
  });

  /**
   * ⚠️ The case the inline script cannot reach. A signed-in user on bare "/"
   * is on the app home; the layout script deliberately leaves that titled as
   * marketing because it has no way to know. If this stops firing, the app
   * home silently merges back into the marketing row.
   */
  it("fires for the app home on a bare path, which the layout script cannot label", async () => {
    await mountShell("");
    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith("app_view", { view: "home" });
    });
  });

  it("sets a document title distinct from the marketing one", async () => {
    await mountShell("?view=jobs");
    await waitFor(() => {
      expect(document.title).toBe(APP_VIEW_TITLES.jobs);
    });
  });

  it("reports an unknown view as home rather than inventing a dimension value", async () => {
    await mountShell("?view=nonsense");
    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith("app_view", { view: "home" });
    });
  });
});
