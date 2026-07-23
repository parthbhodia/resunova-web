import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountSettingsPage from "@/components/AccountSettingsPage";

const { mockGetUser, mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getUser: mockGetUser, getSession: mockGetSession } }),
}));
vi.mock("@/lib/authSignOut", () => ({ signOutAndReturnHome: mockSignOut }));
// Pass through the real module (PlanBillingCard renders ui/button, which needs
// `cn`); only apiUrl is stubbed so fetches hit the relative-path fetch mock.
vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiUrl: (p: string) => p,
}));
// Render next/link as a plain anchor so the "Profile" cross-link is a real element.
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

function jsonRes(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

const NOTIFY_KEY = "rn_notify_prefs_v1";

/** Default happy-path network: signed in, free tier, default prefs, POST ok. */
function installFetch(postOk = true) {
  const fetchMock = vi.fn(async (url: string | URL, opts?: RequestInit) => {
    const u = String(url);
    if (u.includes("/api/scan-limit-status")) return jsonRes({ enforced: false, unlimited: false });
    if (u.includes("/api/profile/notify-prefs")) {
      if (opts?.method === "POST") return jsonRes({ ok: postOk }, postOk);
      return jsonRes({ accountChanges: true, scanLimit: false, features: false });
    }
    return jsonRes({});
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

beforeEach(() => {
  mockGetUser.mockResolvedValue({ data: { user: { email: "parth@example.com" } } });
  mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
  installFetch();
});

describe("AccountSettingsPage — composition", () => {
  it("renders the header, the Profile cross-link, and all account cards", async () => {
    render(<AccountSettingsPage />);
    expect(screen.getByRole("heading", { name: "Account settings" })).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plan & usage" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Email preferences" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visibility" })).toBeInTheDocument();
    // career data must NOT appear here
    expect(screen.queryByText(/Equal employment/i)).not.toBeInTheDocument();
  });
});

describe("AccountSettingsPage — AccountCard", () => {
  it("shows the signed-in email once auth resolves", async () => {
    render(<AccountSettingsPage />);
    expect(await screen.findByText("parth@example.com")).toBeInTheDocument();
  });

  it("distinguishes an auth-fetch failure from being signed out, and retries", async () => {
    mockGetUser.mockReset();
    mockGetUser.mockRejectedValueOnce(new Error("network")).mockResolvedValue({
      data: { user: { email: "back@example.com" } },
    });
    render(<AccountSettingsPage />);
    expect(await screen.findByText(/Couldn.t load your account/)).toBeInTheDocument();
    expect(screen.queryByText("Not signed in")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("back@example.com")).toBeInTheDocument();
  });

  it("confirms before signing out", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AccountSettingsPage />);
    await screen.findByText("parth@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Sign out/ }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("does NOT sign out if the confirm is dismissed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AccountSettingsPage />);
    await screen.findByText("parth@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Sign out/ }));
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe("AccountSettingsPage — Email preferences", () => {
  it("toggles a pref optimistically, POSTs it, persists to localStorage, and shows ✓ Saved", async () => {
    const fetchMock = installFetch(true);
    render(<AccountSettingsPage />);
    const sw = await screen.findByRole("switch", { name: /daily scan limit/i });
    expect(sw).toHaveAttribute("aria-checked", "false");

    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true"); // optimistic flip
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    expect(await screen.findByText("✓ Saved", undefined, { timeout: 3000 })).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(
      ([u, o]) => String(u).includes("notify-prefs") && (o as RequestInit | undefined)?.method === "POST",
    );
    expect(postCall).toBeTruthy();
    expect(JSON.parse((postCall![1] as RequestInit).body as string).scanLimit).toBe(true);
    expect(JSON.parse(localStorage.getItem(NOTIFY_KEY)!).scanLimit).toBe(true);
  });

  it("shows an error state when the save fails", async () => {
    installFetch(false); // POST returns ok:false
    render(<AccountSettingsPage />);
    const sw = await screen.findByRole("switch", { name: /new features/i });
    await userEvent.click(sw);
    expect(await screen.findByText(/Couldn.t save/, undefined, { timeout: 3000 })).toBeInTheDocument();
  });
});
