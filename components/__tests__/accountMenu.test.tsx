import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The account menu's identity header and plan strip.
 *
 * ⚠️ `useScansRemaining` keeps its reading in a MODULE-LEVEL store so the rail
 * and the bottom nav cannot disagree about the same number. That store
 * survives unmount, so every test here resets modules and re-imports, the
 * same arrangement the admin-panel tests use. Without it the second test
 * inherits the first one's plan.
 */

const openUpgrade = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

function statusBody(over: Record<string, unknown>) {
  return { enforced: true, unlimited: false, plan: "free", limit: 3, used: 1, remaining: 2, ...over };
}

async function renderMenu(
  body: Record<string, unknown> | "error",
  props: Record<string, unknown> = {},
) {
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      body === "error"
        ? ({ ok: false, status: 500, json: async () => ({}) } as unknown as Response)
        : ({ ok: true, status: 200, json: async () => body } as unknown as Response),
    ),
  );
  const { AppSidebarUser } = await import("../app-shell/AppSidebarUser");
  const user = userEvent.setup();
  render(
    <AppSidebarUser
      initial="P"
      userName="Parth Bhodia"
      userEmail="parth@example.com"
      anonMode={false}
      advisorAllowed={false}
      theme="light"
      onToggleTheme={vi.fn()}
      onProfile={vi.fn()}
      onMyResumes={vi.fn()}
      onCoverLetter={vi.fn()}
      onHistory={vi.fn()}
      onAdvisor={vi.fn()}
      onAccount={vi.fn()}
      onUpgrade={openUpgrade}
      onSignOut={vi.fn()}
      {...props}
    />,
  );
  // The trigger renames itself when signed out, so resolve it either way.
  await user.click(screen.getByRole("button", { name: /^Account( menu)?$/ }));
  return user;
}

beforeEach(() => openUpgrade.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("the account menu says whose account it is", () => {
  /**
   * ⚠️ THE ONE JOB THIS MENU HAS THAT NOTHING ELSE IN THE SHELL DOES. Before
   * the rebuild it showed one letter in an avatar and never named the account,
   * which matters here specifically: a student can hold a personal account and
   * a university one, and the product behaves differently for each.
   */
  it("names the signed-in account", async () => {
    await renderMenu(statusBody({}));
    expect(await screen.findByText("Parth Bhodia")).toBeInTheDocument();
    expect(screen.getByText("parth@example.com")).toBeInTheDocument();
  });

  /** An account with no display name falls back to the address, never to a guess. */
  it("falls back to the email rather than inventing a name", async () => {
    await renderMenu(statusBody({}), { userName: null });
    expect(await screen.findByText("parth@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Parth Bhodia")).toBeNull();
  });

  it("asks a signed-out visitor to sign in and claims nothing about them", async () => {
    await renderMenu(statusBody({}), { anonMode: true, userName: null, userEmail: null });
    expect(await screen.findByText("Not signed in")).toBeInTheDocument();
    expect(screen.queryByText(/scans left/)).toBeNull();
    expect(screen.queryByRole("menuitem", { name: /upgrade/i })).toBeNull();
  });
});

describe("the plan strip claims only what it knows", () => {
  it("shows the count and the upgrade button on a metered account", async () => {
    await renderMenu(statusBody({}));
    expect(await screen.findByText("2 of 3 scans left")).toBeInTheDocument();
    expect(screen.getByText("Free plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeInTheDocument();
  });

  /**
   * ⚠️ One predicate drives the meter and the button, so a subscriber can
   * never be shown a dead CTA beside a row reading Unlimited. This repo has
   * shipped the other version of this bug: the quota card hard-coded a "UMBC"
   * badge for every unlimited account, so a paying Pro user was told they were
   * at a university.
   */
  it("shows a Pro account its plan and no upsell", async () => {
    await renderMenu(statusBody({ unlimited: true, plan: "pro", limit: null, remaining: null }));
    expect(await screen.findByText("PRO")).toBeInTheDocument();
    expect(screen.queryByText(/scans left/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Upgrade to Pro" })).toBeNull();
  });

  /**
   * ⚠️ FOUND BY A MUTATION, not by reading. The strip hard-coded "Free plan"
   * for every metered reading, and `planLabel`'s own contract allows a
   * metered Pro account — so a paying customer was told they were on Free.
   * AGENTS.md names that exact rule. Nothing covered it because every other
   * metered fixture here happens to be a free account.
   */
  it("does not call a metered subscriber a free account", async () => {
    await renderMenu(statusBody({ plan: "pro", limit: 30, remaining: 12, used: 18 }));
    expect(await screen.findByText("12 of 30 scans left")).toBeInTheDocument();
    expect(screen.getByText("Pro plan")).toBeInTheDocument();
    expect(screen.queryByText("Free plan")).toBeNull();
  });

  /**
   * ⚠️ The parent gates `onUpgrade` on the same predicate as the rail's own
   * Upgrade button. Without this the guard inside the strip was untested: the
   * only case that would have caught it is an unlimited account, where the
   * strip returns null before ever reaching the button.
   */
  it("renders no upgrade button when the parent offers no upgrade", async () => {
    await renderMenu(statusBody({}), { onUpgrade: undefined });
    expect(await screen.findByText("2 of 3 scans left")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upgrade/i })).toBeNull();
  });

  it("names a university account as such", async () => {
    await renderMenu(statusBody({ unlimited: true, plan: "institution", limit: null, remaining: null }));
    expect(await screen.findByText("UNIVERSITY")).toBeInTheDocument();
  });

  /**
   * ⚠️ An outage must not read as an allowance. A blank strip would say
   * "nothing metered here" and a zeroed meter would say "you are out"; both
   * are claims we cannot make when the request failed.
   */
  it("says it could not check rather than implying a number", async () => {
    await renderMenu("error");
    expect(await screen.findByText("Couldn't check your plan")).toBeInTheDocument();
    expect(screen.queryByText(/scans left/)).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("the menu's shape", () => {
  /**
   * ⚠️ Arrow-key navigation inside a menu only visits elements with the
   * menuitem role. The first version of the footer rendered Contact, Terms and
   * Privacy as plain anchors in a flex div, which looks identical and is
   * reachable by mouse alone.
   */
  it("keeps the legal links as menu items, not bare anchors", async () => {
    await renderMenu(statusBody({}));
    for (const name of ["Contact", "Terms", "Privacy"]) {
      const item = await screen.findByRole("menuitem", { name });
      expect(item).toBeInTheDocument();
      // ⚠️ And still an anchor. A first mutation only deleted the `render`
      // prop, which leaves a div that keeps the menuitem role, so the role
      // check alone passed over a link that no longer navigates.
      expect(item.tagName).toBe("A");
      expect(item).toHaveAttribute("href");
    }
  });

  /** It opened to go somewhere; a copyright line is chrome. */
  it("has no copyright line", async () => {
    await renderMenu(statusBody({}));
    await screen.findByText("Parth Bhodia");
    expect(screen.queryByText(/©/)).toBeNull();
  });

  /**
   * ⚠️ Every other row navigates and closes. This one changes what you are
   * looking at, so closing would hide the switch at the moment it moves.
   */
  it("stays open when the theme is toggled", async () => {
    const onToggleTheme = vi.fn();
    const user = await renderMenu(statusBody({}), { onToggleTheme });
    const row = await screen.findByRole("menuitem", { name: /dark mode/i });
    await user.click(row);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText("Parth Bhodia")).toBeInTheDocument());
  });

  it("offers the theme row as a pressed-state control", async () => {
    await renderMenu(statusBody({}), { theme: "dark" });
    const row = await screen.findByRole("menuitem", { name: /light mode/i });
    expect(row).toHaveAttribute("aria-pressed", "true");
  });
});
