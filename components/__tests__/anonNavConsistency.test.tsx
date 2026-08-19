import { JOBS_ENABLED } from "@/lib/featureFlags";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { PUBLIC_APP_VIEWS, isPublicAppView } from "@/lib/anonScan";
import { isPublicPath } from "@/components/AuthGate";
import { AppBottomNav } from "@/components/app-shell/AppBottomNav";
import type { AppView } from "@/components/app-shell/nav-config";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

/**
 * A signed-out visitor must get the SAME answer whether they paste a URL or
 * click the nav. These used to be three hand-kept lists and they disagreed:
 * `/?view=jobs` loaded fine from a link but hit a sign-in wall from the
 * sidebar, and Interview Prep silently bounced to the landing page.
 */
describe("anonymous access is consistent between URL and navigation", () => {
  it("every public app view is reachable by click, not just by URL", () => {
    for (const view of PUBLIC_APP_VIEWS) {
      expect(isPublicAppView(view)).toBe(true);
    }
  });

  it("jobs follows the JOBS_ENABLED flag in BOTH directions", () => {
    // The backend still serves an unranked feed to anonymous visitors, so when
    // Jobs is on, the nav must not contradict that by demanding sign-in. While
    // it is off (extraction pipeline stopped) the view must not be reachable at
    // all — a public view with no nav entry is the URL/nav disagreement this
    // whole file exists to prevent, just in the opposite direction.
    expect(isPublicAppView("jobs")).toBe(JOBS_ENABLED);
  });

  it("account-bound views stay locked", () => {
    for (const view of ["library", "cover-letter", "account", "advisor"]) {
      expect(isPublicAppView(view)).toBe(false);
    }
  });

  it("interview prep is not a public route, so the nav must ask for sign-in", () => {
    // If this ever becomes public, the sidebar's anon guard should go with it —
    // otherwise signed-out users get a sign-in prompt for a page they could use.
    expect(isPublicPath("/interview-prep")).toBe(false);
    expect(isPublicAppView("interview-prep")).toBe(false);
  });
});

describe("AppBottomNav honours the shared list", () => {
  function renderNav(onSelect: () => void, onSignIn: () => void) {
    return render(
      <AppBottomNav
        active={"home" as AppView}
        builderActive={false}
        onSelect={onSelect}
        onBuilder={vi.fn()}
        theme="dark"
        onToggleTheme={vi.fn()}
        onHistoryOpen={vi.fn()}
        onBugReport={vi.fn()}
        onSignOut={vi.fn()}
        userInitial="P"
        anonMode
        onSignIn={onSignIn}
      />,
    );
  }

  it("navigates for a public view instead of demanding sign-in", () => {
    const onSelect = vi.fn();
    const onSignIn = vi.fn();
    const { getByText } = renderNav(onSelect, onSignIn);

    // Analyze rather than Jobs: Jobs leaves the bottom bar entirely while
    // JOBS_ENABLED is false, and this test is about the public-view CONTRACT,
    // not about which tab happens to be public today.
    fireEvent.click(getByText("Analyze"));
    expect(onSelect).toHaveBeenCalledWith("analyze");
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("hidden views are absent from the bottom bar, not merely inert", () => {
    // The regression this guards: a tab that renders but no-ops reads as a
    // broken app rather than a removed feature.
    const { queryByText } = renderNav(vi.fn(), vi.fn());
    if (JOBS_ENABLED) expect(queryByText("Jobs")).not.toBeNull();
    else expect(queryByText("Jobs")).toBeNull();
  });

  it("asks for sign-in on a locked view", () => {
    const onSelect = vi.fn();
    const onSignIn = vi.fn();
    const { getByText } = renderNav(onSelect, onSignIn);

    fireEvent.click(getByText("Home"));
    expect(onSignIn).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalledWith("home");
  });
});
