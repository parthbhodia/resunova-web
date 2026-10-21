import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/AppSidebar";
import { RAIL_ACCOUNT } from "@/components/app-shell/nav-config";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => push.mockClear());

function renderSidebar(opts: { anonMode?: boolean } = {}) {
  const onSignIn = vi.fn();
  render(
    <SidebarProvider defaultOpen>
      <AppSidebar
        active="home"
        onSwitchView={vi.fn()}
        onTemplateBuilderPage={false}
        onInterviewPrepPage={false}
        builderActive={false}
        navBuilderSubflow="tailor"
        advisorAllowed={false}
        isUmbc={false}
        theme="light"
        onToggleTheme={vi.fn()}
        userInitial="T"
        onHistoryOpenChange={vi.fn()}
        onGoBuilderFlow={vi.fn()}
        onSignOut={vi.fn()}
        anonMode={opts.anonMode ?? false}
        onSignIn={onSignIn}
      />
    </SidebarProvider>,
  );
  return { onSignIn };
}

describe("the Profile nav item", () => {
  it("sits in the utility group, not the document funnel", () => {
    expect(RAIL_ACCOUNT).toContain("profile");
  });

  it("is top-level and navigates to /profile in one click", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Profile and usage" }));
    expect(push).toHaveBeenCalledWith("/profile");
  });

  it("a guest's click opens sign-in instead of the profile", () => {
    const { onSignIn } = renderSidebar({ anonMode: true });
    fireEvent.click(screen.getByRole("button", { name: /Profile and usage/ }));
    expect(onSignIn).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
