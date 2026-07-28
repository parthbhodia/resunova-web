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

  it("jobs is browsable signed-out, matching the public-browse contract", () => {
    // The backend serves an unranked feed to anonymous visitors; the nav must
    // not contradict that by demanding sign-in first.
    expect(isPublicAppView("jobs")).toBe(true);
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

    fireEvent.click(getByText("Jobs"));
    expect(onSelect).toHaveBeenCalledWith("jobs");
    expect(onSignIn).not.toHaveBeenCalled();
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
