import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/AppSidebar";
import { RAIL_GROUPS, railActiveKey } from "@/components/app-shell/nav-config";
import { isPublicPath } from "@/components/AuthGate";
import { isPublicAppView } from "@/lib/anonScan";
import { JOBS_ENABLED } from "@/lib/featureFlags";
import { resetScansRemaining } from "@/components/app-shell/useScansRemaining";
import { railQuotaLines } from "@/components/app-shell/ScansRemainingPill";

/**
 * The always-on nav rail.
 *
 * This file replaces `appSidebarCollapsed.test.tsx`, and the swap is worth
 * recording because two of its protections are gone rather than moved:
 *
 *   - "keeps a visible sidebar trigger — the logo is not the only way out"
 *     protected your ability to get the nav BACK. There is no longer a state
 *     it can be away in, so the property holds by construction and a test for
 *     it would assert a control that should not exist.
 *   - "builder button still toggles the drawer, never navigates" asserted the
 *     exact behaviour the field report called broken. Its inverse is now the
 *     rule, and it is the first test below.
 *
 * Everything else survived and is re-aimed. The button is named "Tailor" now,
 * not "Resume Builder": the drawer it used to open is gone, so the label can
 * say what the click does.
 */

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));

const { mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { getSession: mockGetSession, onAuthStateChange: mockOnAuthStateChange },
  }),
}));
vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig<typeof import("@/lib/utils")>()),
  apiUrl: (p: string) => p,
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

const FREE_QUOTA = { enforced: true, unlimited: false, limit: 3, used: 1, remaining: 2 };

beforeEach(() => {
  push.mockClear();
  resetScansRemaining();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "tok", user: { id: "u1" } } },
  });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: () => {} } },
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => FREE_QUOTA,
  } as Response);
});

type Opts = {
  anonMode?: boolean;
  advisorAllowed?: boolean;
  quota?: unknown;
  active?: "home" | "analyze" | "library" | "jobs";
};

function renderRail(opts: Opts = {}) {
  if (opts.quota !== undefined) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => opts.quota,
    } as Response);
  }
  const handlers = {
    onSwitchView: vi.fn(),
    onGoBuilderFlow: vi.fn(),
    onSignIn: vi.fn(),
    onToggleTheme: vi.fn(),
    onHistoryOpen: vi.fn(),
    onSignOut: vi.fn(),
  };
  render(
    <SidebarProvider>
      <AppSidebar
        active={opts.active ?? "home"}
        onTemplateBuilderPage={false}
        onTemplatesPage={false}
        onInterviewPrepPage={false}
        builderActive={false}
        navBuilderSubflow="tailor"
        advisorAllowed={opts.advisorAllowed ?? false}
        isUmbc={false}
        theme="light"
        userInitial="T"
        anonMode={opts.anonMode ?? false}
        {...handlers}
      />
    </SidebarProvider>,
  );
  return handlers;
}

/* ── the drawer is gone, so the click goes somewhere ──────────── */

describe("the Tailor item navigates, it does not open a drawer", () => {
  it("one click goes to the tailor flow", () => {
    const { onGoBuilderFlow } = renderRail();
    fireEvent.click(screen.getByRole("button", { name: "Tailor" }));
    expect(onGoBuilderFlow).toHaveBeenCalledWith("tailor");
  });

  it("a guest's click gates to sign-in instead", () => {
    // `/tailor-2/` is not in AuthGate's PUBLIC_ROUTES, so a guest sent there
    // lands on the marketing landing page rather than on an explanation.
    const { onGoBuilderFlow, onSignIn } = renderRail({ anonMode: true });
    fireEvent.click(screen.getByRole("button", { name: "Tailor" }));
    expect(onSignIn).toHaveBeenCalled();
    expect(onGoBuilderFlow).not.toHaveBeenCalled();
  });
});

/* ── the guest gate is derived, not hand-written ──────────────── */

describe("a nav click and a pasted URL reach the same verdict", () => {
  it("every rail item declares exactly one destination", () => {
    // The gate reads `view` OR `route`. An item with neither falls through to
    // "gated", which is safe but silent — this makes the omission loud.
    for (const item of RAIL_GROUPS.flat()) {
      const declared = [item.view, item.route].filter(Boolean);
      expect(declared, `${item.key} must declare one destination`).toHaveLength(1);
    }
  });

  it("each item's lock matches what AuthGate would do to its destination", () => {
    // This is the bug class, pinned at the source rather than per item: two
    // hand-kept lists disagreed about `jobs`, and the shipped sidebar wrote
    // `if (anonMode) onSignIn()` inline on the builder and interview-prep
    // clicks, matching their routes only by luck.
    for (const item of RAIL_GROUPS.flat()) {
      const expected = item.view ? !isPublicAppView(item.view) : !isPublicPath(item.route ?? "");
      const { onSignIn, onSwitchView, onGoBuilderFlow } = renderRail({ anonMode: true });
      fireEvent.click(screen.getByRole("button", { name: item.label }));
      const wentSomewhere =
        push.mock.calls.length > 0 ||
        onSwitchView.mock.calls.length > 0 ||
        onGoBuilderFlow.mock.calls.length > 0;
      expect(onSignIn.mock.calls.length > 0, `${item.key} lock`).toBe(expected);
      expect(wentSomewhere, `${item.key} navigation`).toBe(!expected);
      cleanup();
      push.mockClear();
    }
  });

  it("the public items are the ones a guest can actually reach", () => {
    // Spelled out, because the loop above would stay green if BOTH sides
    // flipped together. Analyze, Templates and (when enabled) Jobs are the
    // signup-free funnel entries; everything else needs an account.
    const open = RAIL_GROUPS.flat()
      .filter((i) => (i.view ? isPublicAppView(i.view) : isPublicPath(i.route ?? "")))
      .map((i) => i.key);
    expect(open.sort()).toEqual(
      JOBS_ENABLED ? ["analyze", "jobs", "templates"] : ["analyze", "templates"],
    );
  });
});

/* ── labels, not tooltips ─────────────────────────────────────── */

describe("every rail item has a visible accessible name", () => {
  it("names come from rendered text, not aria-label or a tooltip", () => {
    renderRail();
    for (const item of RAIL_GROUPS.flat()) {
      const btn = screen.getByRole("button", { name: item.label });
      // The NAME is the visible word. An icon-only item with a hover tooltip
      // has no accessible name at all — the "nobody sees it" bug that #264
      // patched by hand on four items, structural here.
      expect(btn.textContent).toContain(item.label);
      expect(btn.hasAttribute("aria-label")).toBe(false);
    }
  });
});

/* ── exactly one item lights ──────────────────────────────────── */

describe("railActiveKey returns at most one key", () => {
  const base = {
    active: "home" as const,
    builderActive: false,
    navBuilderSubflow: "tailor" as const,
    onTemplatesPage: false,
    onTemplateBuilderPage: false,
    onInterviewPrepPage: false,
    onCareerProfilePage: false,
  };

  it("a routed page beats the stale ?view= underneath it", () => {
    // While you are on /templates the shell's `active` still reads "home".
    // This is the two-items-lit drift the old eight-times-repeated exclusion
    // chain existed to suppress.
    expect(railActiveKey({ ...base, onTemplatesPage: true })).toBe("templates");
    expect(railActiveKey({ ...base, onInterviewPrepPage: true })).toBe("prep");
    expect(railActiveKey({ ...base, onTemplateBuilderPage: true })).toBe("templates");
  });

  it("the builder's own subflow decides between Tailor and Templates", () => {
    expect(railActiveKey({ ...base, builderActive: true })).toBe("tailor");
    expect(
      railActiveKey({ ...base, builderActive: true, navBuilderSubflow: "template" }),
    ).toBe("templates");
  });

  it("a view no rail item owns lights nothing", () => {
    // Career Profile, Cover letter, Advisor and Account live in the account
    // menu. Lighting Home for them would claim you are somewhere you are not.
    expect(railActiveKey({ ...base, onCareerProfilePage: true })).toBeNull();
    expect(railActiveKey({ ...base, active: "account" as never })).toBeNull();
  });

  it("the rendered rail lights exactly one button", () => {
    renderRail({ active: "library" });
    // Asserted as a COUNT, not a per-item read: base-nova marks active with a
    // present-but-empty data-active attribute, so `getAttribute === "true"`
    // passes for the wrong reason.
    const lit = [...document.querySelectorAll("button[data-active]")];
    expect(lit).toHaveLength(1);
    expect(lit[0]).toBe(screen.getByRole("button", { name: "Résumés" }));
  });
});

/* ── the quota and the fix for it agree ───────────────────────── */

describe("Upgrade renders only where upgrading means something", () => {
  it("a metered account gets a count and a labelled Upgrade", async () => {
    renderRail();
    await waitFor(() => expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument());
    // The label matters: the reference comp draws a bare crown, which carries
    // no accessible name and does not say what it buys.
    expect(screen.getByRole("button", { name: "Upgrade" }).textContent).toContain("Upgrade");
    // Through the producer, not a hand-typed "2": the rail names what the
    // number counts rather than showing a bare numeral, and a literal here
    // would be a second copy of that wording.
    const [top, bottom] = railQuotaLines(2, 3);
    expect(screen.getByText(top)).toBeInTheDocument();
    expect(screen.getByText(bottom)).toBeInTheDocument();
  });

  it("an unlimited plan gets neither", async () => {
    renderRail({ quota: { enforced: true, unlimited: true, plan: "admin" } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    // Same predicate as the count, deliberately: "Upgrade" in front of an
    // admin or Pro account is a dead CTA, and a count beside it would be a
    // second claim about a plan that has no quota.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Upgrade" })).not.toBeInTheDocument(),
    );
  });

  it("a guest is asked to sign in, not to pay", async () => {
    renderRail({ anonMode: true, quota: { enforced: true, requiresSignIn: true } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upgrade" })).not.toBeInTheDocument();
  });
});

/* ── nothing was deleted, it moved ────────────────────────────── */

describe("the account menu holds every surface the rail dropped", () => {
  it("Cover letter, History, Profile, Account settings and Contact are all one click away", async () => {
    const handlers = renderRail();
    await userEvent.click(screen.getByRole("button", { name: /Account/ }));

    await userEvent.click(await screen.findByRole("menuitem", { name: "Cover letter" }));
    expect(handlers.onSwitchView).toHaveBeenCalledWith("cover-letter");

    await userEvent.click(screen.getByRole("button", { name: /Account/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "History" }));
    expect(handlers.onHistoryOpen).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Account/ }));
    expect(await screen.findByRole("menuitem", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Account settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Contact" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });

  it("the theme toggle names the mode it switches TO", async () => {
    const handlers = renderRail();
    await userEvent.click(screen.getByRole("button", { name: /Account/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Dark mode" }));
    expect(handlers.onToggleTheme).toHaveBeenCalled();
  });

  it("Advisor appears for an advisor and for nobody else", async () => {
    renderRail({ advisorAllowed: false });
    await userEvent.click(screen.getByRole("button", { name: /Account/ }));
    await screen.findByRole("menuitem", { name: "Profile" });
    // A menu row nobody can use is worse than no row.
    expect(screen.queryByRole("menuitem", { name: "Advisor" })).not.toBeInTheDocument();
  });

  it("Advisor is reachable when allowed — the rail is its only other route", async () => {
    const handlers = renderRail({ advisorAllowed: true });
    await userEvent.click(screen.getByRole("button", { name: /Account/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Advisor" }));
    expect(handlers.onSwitchView).toHaveBeenCalledWith("advisor");
  });
});

/* ── the rail has one width, and stays that way ───────────────── */

describe("there is no collapsed state to be stuck in", () => {
  it("source pin: the rail is collapsible=\"none\" and the provider is uncontrolled", () => {
    // ⚠️ THIS IS A PIN ON AN ABSENCE, which is the only kind of test that can
    // hold a deletion. "The navbar is always shrinked" shipped because THREE
    // mechanisms disagreed about one width — a collapse on every `switchView`,
    // a workspace-route default, and a persisted flag — and each was added in
    // good faith by someone who could not see the other two. Re-adding any one
    // of them is a one-line edit that no behavioural test would notice,
    // because jsdom does not do layout and 84px vs 232px is layout.
    const rail = readFileSync("components/app-shell/AppSidebar.tsx", "utf8");
    expect(rail).toContain('collapsible="none"');

    const shell = readFileSync("components/AppShell.tsx", "utf8");
    const provider = shell.slice(
      shell.indexOf("<SidebarProvider"),
      shell.indexOf("{!isMobile &&"),
    );
    expect(provider).not.toContain("open=");
    expect(provider).not.toContain("onOpenChange");
    expect(provider).not.toContain("defaultOpen");
    // The storage key went with the state it persisted. A reader left behind
    // would restore a preference nothing can honour.
    expect(shell).not.toContain("readSidebarCollapsed");
    expect(shell).not.toContain("writeSidebarCollapsed");
  });
});

/* ── the click-eater pin, now conditional on its own premise ──── */

describe("a collapsed group label cannot eat clicks", () => {
  it("source pin: live only while some surface uses collapsible=\"icon\"", () => {
    // ⚠️ THIS PIN IS CURRENTLY INERT AND SAYS SO RATHER THAN READING GREEN.
    // The bug it guards: `SidebarGroupLabel` collapses by pulling itself up
    // 32px at opacity 0, and without pointer-events-none that parks an
    // invisible hit target over the icon above it — a Playwright drive
    // measured the "Library" label intercepting every click aimed at the
    // builder icon (field: "not clicking the tailor icon properly").
    //
    // The rail is collapsible="none" and renders no SidebarGroupLabel, so
    // that CSS cannot execute today. Rather than delete the knowledge or
    // keep an assertion that can never fail usefully, the precondition is
    // MEASURED from the source: adopt icon mode anywhere and this starts
    // checking the class for real.
    const usesIconMode = [
      "components/app-shell/AppSidebar.tsx",
      "components/app-shell/AppBottomNav.tsx",
    ].some((f) => readFileSync(f, "utf8").includes('collapsible="icon"'));

    if (!usesIconMode) {
      expect(usesIconMode).toBe(false);
      return;
    }
    const src = readFileSync("components/ui/sidebar.tsx", "utf8");
    const label = src.slice(src.indexOf("function SidebarGroupLabel"));
    expect(label).toContain("group-data-[collapsible=icon]:pointer-events-none");
  });
});
