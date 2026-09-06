import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/AppSidebar";

/**
 * The collapsed icon rail, after two field reports in one message:
 * "it is not clicking the tailor icon properly and the hamburger icon
 * disappears".
 *
 * (1) Collapsed, the builder icon used to expand the sidebar and open the
 * drawer — a dead click to anyone expecting navigation, since every other
 * rail icon navigates in one click. It now goes to the tailor flow.
 * (2) Collapsed, the ONLY expand control was the logo, and a logo does not
 * read as a control. The trigger stays visible in the rail.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));

// jsdom has no matchMedia; the sidebar's use-mobile hook needs one.
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

function renderSidebar(opts: { open: boolean; anonMode?: boolean } & Record<string, unknown>) {
  const onGoBuilderFlow = vi.fn();
  const onBuilderOpenChange = vi.fn();
  const onSignIn = vi.fn();
  const onSwitchView = vi.fn();
  render(
    <SidebarProvider defaultOpen={opts.open}>
      <AppSidebar
        active="home"
        onSwitchView={onSwitchView}
        onTemplateBuilderPage={false}
        onTemplatesPage={false}
        onInterviewPrepPage={false}
        builderActive={false}
        builderOpen={false}
        onBuilderOpenChange={onBuilderOpenChange}
        navBuilderSubflow="tailor"
        advisorAllowed={false}
        isUmbc={false}
        theme="light"
        onToggleTheme={vi.fn()}
        userInitial="T"
        historyOpen={false}
        onHistoryOpenChange={vi.fn()}
        onGoBuilderFlow={onGoBuilderFlow}
        onSignOut={vi.fn()}
        anonMode={opts.anonMode ?? false}
        onSignIn={onSignIn}
      />
    </SidebarProvider>,
  );
  return { onGoBuilderFlow, onBuilderOpenChange, onSignIn, onSwitchView };
}

describe("collapsed rail", () => {
  it("keeps a visible sidebar trigger — the logo is not the only way out", () => {
    // Scoped to the HEADER: the sidebar chrome has its own edge-hover rail
    // control with the same accessible name, and that invisible strip is
    // exactly what the field report proved nobody finds.
    renderSidebar({ open: false });
    const header = document.querySelector('[data-slot="sidebar-header"]') as HTMLElement;
    expect(header).not.toBeNull();
    expect(within(header).getByRole("button", { name: "Toggle Sidebar" })).toBeInTheDocument();
    // The logo-as-expand bonus survives alongside it.
    expect(within(header).getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
  });

  it("tailor icon navigates in one click instead of just expanding", () => {
    const { onGoBuilderFlow, onBuilderOpenChange } = renderSidebar({ open: false });
    fireEvent.click(screen.getByRole("button", { name: "Resume Builder" }));
    expect(onGoBuilderFlow).toHaveBeenCalledWith("tailor");
    expect(onBuilderOpenChange).not.toHaveBeenCalled();
  });

  it("a guest's tailor click gates to sign-in, matching the expanded drawer", () => {
    const { onGoBuilderFlow, onSignIn } = renderSidebar({ open: false, anonMode: true });
    fireEvent.click(screen.getByRole("button", { name: "Resume Builder" }));
    expect(onSignIn).toHaveBeenCalled();
    expect(onGoBuilderFlow).not.toHaveBeenCalled();
  });
});

describe("expanded rail", () => {
  it("builder button still toggles the drawer, never navigates", () => {
    const { onGoBuilderFlow, onBuilderOpenChange } = renderSidebar({ open: true });
    fireEvent.click(screen.getByRole("button", { name: /Resume Builder/ }));
    expect(onBuilderOpenChange).toHaveBeenCalledWith(true);
    expect(onGoBuilderFlow).not.toHaveBeenCalled();
  });
});

describe("a collapsed group label cannot eat clicks", () => {
  it("source pin: the icon-mode label is pointer-events-none", () => {
    // jsdom cannot hit-test, so this is a source pin with the browser
    // evidence attached: the label collapses by pulling itself up 32px at
    // opacity 0, and WITHOUT pointer-events-none that parks an invisible
    // hit target over the icon above it — a Playwright drive measured the
    // "Library" label intercepting every click aimed at the builder icon
    // (field: "not clicking the tailor icon properly"). A shadcn re-sync of
    // ui/sidebar.tsx is exactly the edit that would silently drop this.
    const src = readFileSync("components/ui/sidebar.tsx", "utf8");
    const label = src.slice(src.indexOf("function SidebarGroupLabel"));
    expect(label).toContain("group-data-[collapsible=icon]:pointer-events-none");
  });
});
