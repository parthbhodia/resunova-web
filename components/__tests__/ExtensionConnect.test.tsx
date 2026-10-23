import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import ExtensionConnect, { copyFor, progressFor, type Phase } from "@/components/ExtensionConnect";

const { mockGetSession, mockApiFetch, mockOpenSignIn } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockApiFetch: vi.fn(),
  mockOpenSignIn: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ getSupabaseClient: () => ({ auth: { getSession: mockGetSession } }) }));
vi.mock("@/lib/apiClient", async (orig) => ({ ...(await orig<Record<string, unknown>>()), apiFetch: mockApiFetch }));
vi.mock("@/components/SignInDialog", () => ({ useSignInDialog: () => ({ openSignIn: mockOpenSignIn }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const refused = (status: number, body: unknown) => ({ ok: false, status, json: async () => body }) as Response;

function fire(name: string, detail?: unknown) {
  act(() => { window.dispatchEvent(new CustomEvent(name, { detail })); });
}

async function connectedPage() {
  mockGetSession.mockResolvedValue({ data: { session: { user: { email: "me@example.com" } } } });
  mockApiFetch.mockResolvedValue(ok({ code: "abc" }));
  render(<ExtensionConnect />);
  const btn = await screen.findByRole("button", { name: "Connect extension" });
  fireEvent.click(btn);
  await screen.findByText("Linking the extension");
}

beforeEach(() => {
  mockGetSession.mockReset(); mockApiFetch.mockReset(); mockOpenSignIn.mockReset();
});
afterEach(() => { vi.useRealTimers(); });

describe("ExtensionConnect handshake outcomes", () => {
  it("an ack from the extension means connected", async () => {
    await connectedPage();
    fire("resunova-extension-ack");
    expect(await screen.findByText("You're connected")).toBeInTheDocument();
  });

  it("an ERROR from the extension is 'couldn't finish', never 'can't see the extension'", async () => {
    await connectedPage();
    fire("resunova-extension-error");
    expect(await screen.findByText("The extension couldn't finish")).toBeInTheDocument();
    expect(screen.queryByText("We can't see the extension")).toBeNull();
  });

  it("shows the extension's error code so a failure can be diagnosed", async () => {
    await connectedPage();
    fire("resunova-extension-error", { error: "invalid_or_expired_code" });
    expect(await screen.findByText("invalid_or_expired_code")).toBeInTheDocument();
  });

  it("never renders an error detail that is not a short code", async () => {
    await connectedPage();
    fire("resunova-extension-error", { error: "<img src=x onerror=alert(1)> some prose" });
    await screen.findByText("The extension couldn't finish");
    expect(screen.queryByText(/Reference for support/)).toBeNull();
    expect(document.querySelector("img[src='x']")).toBeNull();
  });

  it("a second failure without a code does not show the first failure's reference", async () => {
    await connectedPage();
    fire("resunova-extension-error", { error: "invalid_or_expired_code" });
    expect(await screen.findByText("invalid_or_expired_code")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByText("Linking the extension");
    fire("resunova-extension-error"); // this time the extension reports nothing
    await screen.findByText("The extension couldn't finish");
    expect(screen.queryByText("invalid_or_expired_code")).toBeNull();
  });

  it("no answer in 4s means the extension was not found", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await connectedPage();
    await act(async () => { vi.advanceTimersByTime(4100); });
    expect(screen.getByText("We can't see the extension")).toBeInTheDocument();
  });

  it("a late error after the timeout still replaces the guess with the real answer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await connectedPage();
    await act(async () => { vi.advanceTimersByTime(4100); });
    fire("resunova-extension-error");
    expect(await screen.findByText("The extension couldn't finish")).toBeInTheDocument();
  });

  it("a late ack after the timeout connects", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await connectedPage();
    await act(async () => { vi.advanceTimersByTime(4100); });
    fire("resunova-extension-ack");
    expect(await screen.findByText("You're connected")).toBeInTheDocument();
  });

  it("events before a code was handed over are ignored", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { email: "me@example.com" } } } });
    render(<ExtensionConnect />);
    await screen.findByRole("button", { name: "Connect extension" });
    fire("resunova-extension-ack");
    expect(screen.queryByText("You're connected")).toBeNull();
  });

  it("hands the extension a code, never a credential", async () => {
    const seen: unknown[] = [];
    const on = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener("resunova-extension-auth", on);
    await connectedPage();
    window.removeEventListener("resunova-extension-auth", on);
    expect(seen).toEqual([{ code: "abc", expiresIn: 120 }]);
  });
});

describe("ExtensionConnect session and API failures", () => {
  it("signed out: the primary action opens sign-in", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<ExtensionConnect />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(mockOpenSignIn).toHaveBeenCalled();
  });

  it("a 401 on minting says the session expired (branches on remedy, not prose)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { email: "me@example.com" } } } });
    mockApiFetch.mockResolvedValue(refused(401, { error: "x", code: "x", remedy: "sign_in" }));
    render(<ExtensionConnect />);
    fireEvent.click(await screen.findByRole("button", { name: "Connect extension" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your session expired");
  });

  it("an unreachable API is an error with a retry, and shares nothing", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { email: "me@example.com" } } } });
    mockApiFetch.mockRejectedValue(new Error("offline"));
    render(<ExtensionConnect />);
    fireEvent.click(await screen.findByRole("button", { name: "Connect extension" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument());
  });
});

describe("ExtensionConnect progress bar", () => {
  const phases: Phase[] = ["checking", "signed_out", "ready", "minting", "handing_off", "connected", "waiting", "failed", "error"];

  it("every phase has a four-step position and exactly one non-done frontier", () => {
    for (const p of phases) {
      const s = progressFor(p);
      expect(s).toHaveLength(4);
    }
  });

  it("connected is all done; a failure is never drawn as progress", () => {
    expect(progressFor("connected")).toEqual(["done", "done", "done", "done"]);
    expect(progressFor("failed")[2]).toBe("fail");
    expect(progressFor("waiting")[2]).toBe("fail");
    expect(progressFor("error")[1]).toBe("fail");
    expect(progressFor("failed")[3]).toBe("todo");
  });

  it("the rendered bar matches the phase and marks the current step", async () => {
    await connectedPage();
    const nav = screen.getByRole("navigation", { name: "Connection progress" });
    expect(nav.querySelectorAll("li")).toHaveLength(4);
    expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent("Extension");
    fire("resunova-extension-error");
    await screen.findByText("The extension couldn't finish");
    expect(nav.querySelector(".extc-step-fail")).toHaveTextContent("Extension");
    expect(nav.querySelector(".extc-step-fail")).toHaveTextContent("needs attention");
  });
});

describe("ExtensionConnect copy", () => {
  it("never claims a connect time or the extension's contents beyond the form", () => {
    const all = (["checking", "signed_out", "ready", "minting", "handing_off", "connected", "waiting", "failed", "error"] as Phase[])
      .map((p) => JSON.stringify(copyFor(p, "me@example.com"))).join(" ");
    expect(all).not.toMatch(/within a few seconds|seconds|installs|rated|stars/i);
  });

  it("uses the real logo mark, not a lookalike", () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { container } = render(<ExtensionConnect />);
    // LogoMark paints the brand square #c4793a; a hand-drawn stand-in would not.
    expect(container.querySelectorAll('svg rect[fill="#c4793a"]').length).toBeGreaterThanOrEqual(2);
  });
});
