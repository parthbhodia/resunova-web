import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/AppSidebar";
import { RAIL_APPLY } from "@/components/app-shell/nav-config";

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

describe("the Referrals nav item", () => {
  it("sits in the apply section of the rail", () => {
    expect(RAIL_APPLY).toContain("refer");
  });

  it("is top-level and navigates to /refer/ in one click", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Referrals" }));
    expect(push).toHaveBeenCalledWith("/refer/");
  });

  it("navigates for a guest too, with no sign-in gate", () => {
    const { onSignIn } = renderSidebar({ anonMode: true });
    fireEvent.click(screen.getByRole("button", { name: "Referrals" }));
    expect(push).toHaveBeenCalledWith("/refer/");
    expect(onSignIn).not.toHaveBeenCalled();
  });
});
