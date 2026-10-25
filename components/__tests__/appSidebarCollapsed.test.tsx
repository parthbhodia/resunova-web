import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/AppSidebar";

/**
 * The desktop nav is a rail, not a drawer.
 *
 * Tailor is one click. Guests hitting a non-public destination get the shared
 * sign-in modal. Cover letter, History and theme are not rail rows; they live
 * in the account menu. The icon-mode group-label hit target from #264 stays
 * pinned in the primitive, because a shadcn re-sync is exactly the edit that
 * would drop it.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
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

function renderSidebar(opts: { anonMode?: boolean } = {}) {
  const onGoBuilderFlow = vi.fn();
  const onSignIn = vi.fn();
  const onSwitchView = vi.fn();
  const onHistoryOpenChange = vi.fn();
  const onToggleTheme = vi.fn();
  render(
    <SidebarProvider>
      <AppSidebar
        active="home"
        onSwitchView={onSwitchView}
        onTemplateBuilderPage={false}
        onInterviewPrepPage={false}
        builderActive={false}
        navBuilderSubflow="tailor"
        advisorAllowed={false}
        isUmbc={false}
        theme="light"
        onToggleTheme={onToggleTheme}
        userInitial="T"
        onHistoryOpenChange={onHistoryOpenChange}
        onGoBuilderFlow={onGoBuilderFlow}
        onSignOut={vi.fn()}
        anonMode={opts.anonMode ?? false}
        onSignIn={onSignIn}
      />
    </SidebarProvider>,
  );
  return { onGoBuilderFlow, onSignIn, onSwitchView, onHistoryOpenChange, onToggleTheme };
}

describe("the rail", () => {
  it("sends Tailor to the tailor flow in one click", () => {
    const { onGoBuilderFlow } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Tailor" }));
    expect(onGoBuilderFlow).toHaveBeenCalledWith("tailor");
  });

  it("a guest can open Analyze, because that view is public", () => {
    const { onSignIn, onSwitchView } = renderSidebar({ anonMode: true });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    expect(onSwitchView).toHaveBeenCalledWith("analyze");
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("a guest's Resumes click opens sign-in", () => {
    const { onSignIn, onSwitchView } = renderSidebar({ anonMode: true });
    fireEvent.click(screen.getByRole("button", { name: /My Resumes/ }));
    expect(onSignIn).toHaveBeenCalled();
    expect(onSwitchView).not.toHaveBeenCalled();
  });

  it("a guest's Tailor click opens sign-in", () => {
    const { onGoBuilderFlow, onSignIn } = renderSidebar({ anonMode: true });
    fireEvent.click(screen.getByRole("button", { name: /Tailor/ }));
    expect(onSignIn).toHaveBeenCalled();
    expect(onGoBuilderFlow).not.toHaveBeenCalled();
  });

  it("has no collapse control and no Resume Builder drawer", () => {
    renderSidebar();
    expect(screen.queryByRole("button", { name: "Toggle Sidebar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Resume Builder/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My Resumes" })).toBeInTheDocument();
  });

  it("keeps Cover letter, History and theme in the account menu", () => {
    renderSidebar();
    expect(screen.queryByRole("button", { name: "Cover letter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "History" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByText("Your work")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cover letter" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Dark mode" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("menuitem", { name: "Contact" })).toBeInTheDocument();
  });

  it("switches the theme from the menu without leaving the state guessable", () => {
    const { onToggleTheme } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Dark mode" }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});

describe("a collapsed group label cannot eat clicks", () => {
  it("source pin: the icon-mode label is pointer-events-none", () => {
    const src = readFileSync("components/ui/sidebar.tsx", "utf8");
    const label = src.slice(src.indexOf("function SidebarGroupLabel"));
    expect(label).toContain("group-data-[collapsible=icon]:pointer-events-none");
  });
});
