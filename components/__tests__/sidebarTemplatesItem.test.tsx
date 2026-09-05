import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/AppSidebar";

/**
 * Templates is a TOP-LEVEL nav item. Until now the only route to templates
 * was the Template Builder sub-item inside the collapsed Resume Builder
 * drawer — two clicks deep and invisible at rest — and users reported they
 * could not find the templates at all. One click, from any account state:
 * the gallery is public like the builder it leads into, so a guest click
 * must navigate, never bounce to sign-in.
 */

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

function renderSidebar(opts: { open?: boolean; anonMode?: boolean; onTemplatesPage?: boolean } = {}) {
  const onSignIn = vi.fn();
  render(
    <SidebarProvider defaultOpen={opts.open ?? true}>
      <AppSidebar
        active="home"
        onSwitchView={vi.fn()}
        onTemplateBuilderPage={false}
        onTemplatesPage={opts.onTemplatesPage ?? false}
        onInterviewPrepPage={false}
        builderActive={false}
        builderOpen={false}
        onBuilderOpenChange={vi.fn()}
        navBuilderSubflow="tailor"
        advisorAllowed={false}
        isUmbc={false}
        theme="light"
        onToggleTheme={vi.fn()}
        userInitial="T"
        historyOpen={false}
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

describe("the Templates nav item", () => {
  it("is top-level and navigates in one click", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Templates" }));
    expect(push).toHaveBeenCalledWith("/templates/");
  });

  it("navigates for a guest too, with no sign-in gate", () => {
    const { onSignIn } = renderSidebar({ anonMode: true });
    fireEvent.click(screen.getByRole("button", { name: "Templates" }));
    expect(push).toHaveBeenCalledWith("/templates/");
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("keeps its accessible name in the collapsed icon rail", () => {
    // Icon-only items with hover-only tooltips have NO accessible name — the
    // "nobody sees it" bug for a screen-reader user, fixed once in #264.
    renderSidebar({ open: false });
    expect(screen.getByRole("button", { name: "Templates" })).toBeInTheDocument();
  });

  it("does not light Home while on the templates page", () => {
    // Two active items at once is the drift the exclusion chain prevents.
    // base-nova marks active with a present-but-empty data-active attribute.
    renderSidebar({ onTemplatesPage: true });
    const templates = screen.getByRole("button", { name: "Templates" });
    expect(templates.hasAttribute("data-active")).toBe(true);
    // ONE active item, full stop — Home (the default view under a routed
    // page) must not light beside it.
    const activeButtons = [...document.querySelectorAll("button[data-active]")];
    expect(activeButtons).toHaveLength(1);
    expect(activeButtons[0]).toBe(templates);
  });
});
