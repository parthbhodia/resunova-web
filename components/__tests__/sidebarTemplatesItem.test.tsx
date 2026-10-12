import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/AppSidebar";

/**
 * Templates is a TOP-LEVEL nav item. The only route to templates used to be
 * the Template Builder sub-item inside the collapsed Resume Builder drawer,
 * two clicks deep and invisible at rest, and users reported they could not
 * find the templates at all. One click, from any account state: the gallery
 * is public like the builder it leads into, so a guest click must navigate,
 * never bounce to sign-in.
 *
 * The drawer that caused this is gone entirely now (see `navRail.test.tsx`),
 * which makes these four cheaper to hold rather than redundant: a rail item
 * is still something a later edit can gate, rename or point elsewhere.
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

function renderSidebar(opts: { anonMode?: boolean; onTemplatesPage?: boolean } = {}) {
  const onSignIn = vi.fn();
  render(
    <SidebarProvider>
      <AppSidebar
        active="home"
        onSwitchView={vi.fn()}
        onTemplateBuilderPage={false}
        onTemplatesPage={opts.onTemplatesPage ?? false}
        onInterviewPrepPage={false}
        builderActive={false}
        navBuilderSubflow="tailor"
        advisorAllowed={false}
        isUmbc={false}
        theme="light"
        onToggleTheme={vi.fn()}
        userInitial="T"
        onHistoryOpen={vi.fn()}
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

  it("carries its accessible name from visible text, with no icon-only state", () => {
    // Icon-only items with hover-only tooltips have NO accessible name: the
    // "nobody sees it" bug for a screen-reader user, patched by hand in #264
    // and structural now that the rail has no state in which labels hide.
    renderSidebar();
    const btn = screen.getByRole("button", { name: "Templates" });
    expect(btn.textContent).toContain("Templates");
    expect(btn.hasAttribute("aria-label")).toBe(false);
  });

  it("does not light Home while on the templates page", () => {
    // Two active items at once is the drift `railActiveKey` now prevents by
    // returning at most one key, where this used to be an exclusion chain
    // repeated on every item. base-nova marks active with a present-but-empty
    // data-active attribute, so a `getAttribute === "true"` read passes for
    // the wrong reason.
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
