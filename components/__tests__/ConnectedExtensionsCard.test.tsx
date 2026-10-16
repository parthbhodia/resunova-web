import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectedExtensionsCard, { describeSession } from "@/components/ConnectedExtensionsCard";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiFetch: mockApiFetch }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

function res(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const S1 = { id: "s1", createdAt: "2026-10-01T00:00:00Z", lastSeenAt: "2026-10-10T00:00:00Z", expiresAt: "2026-11-09T00:00:00Z" };
const S2 = { id: "s2", createdAt: "2026-10-05T00:00:00Z", lastSeenAt: null, expiresAt: "2026-11-04T00:00:00Z" };

beforeEach(() => mockApiFetch.mockReset());

describe("ConnectedExtensionsCard", () => {
  it("lists sessions and disconnects only the one clicked", async () => {
    mockApiFetch.mockImplementation(async (path: string) =>
      path === "/api/extension/sessions" ? res({ sessions: [S1, S2] }) : res({ ok: true }),
    );
    render(<ConnectedExtensionsCard />);
    const buttons = await screen.findAllByRole("button", { name: /^Disconnect extension/ });
    expect(buttons).toHaveLength(2);

    await userEvent.click(buttons[0]);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/extension/sessions/s1/revoke", { method: "POST" });
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /^Disconnect extension/ })).toHaveLength(1),
    );
  });

  it("disconnect all calls revoke-all and empties the list", async () => {
    mockApiFetch.mockImplementation(async (path: string) =>
      path === "/api/extension/sessions" ? res({ sessions: [S1, S2] }) : res({ ok: true, revoked: 2 }),
    );
    render(<ConnectedExtensionsCard />);
    await userEvent.click(await screen.findByRole("button", { name: "Disconnect all" }));
    expect(mockApiFetch).toHaveBeenCalledWith("/api/extension/revoke-all", { method: "POST" });
    expect(await screen.findByText(/No extension is connected/)).toBeInTheDocument();
  });

  it("offers no disconnect-all for a single session", async () => {
    mockApiFetch.mockResolvedValue(res({ sessions: [S1] }));
    render(<ConnectedExtensionsCard />);
    await screen.findByRole("button", { name: /^Disconnect extension/ });
    expect(screen.queryByRole("button", { name: "Disconnect all" })).toBeNull();
  });

  it("keeps the row and says so when a disconnect fails", async () => {
    mockApiFetch.mockImplementation(async (path: string) =>
      path === "/api/extension/sessions" ? res({ sessions: [S1] }) : res({ error: "x" }, 503),
    );
    render(<ConnectedExtensionsCard />);
    await userEvent.click(await screen.findByRole("button", { name: /^Disconnect extension/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn.t disconnect/);
    expect(screen.getByRole("button", { name: /^Disconnect extension/ })).toBeInTheDocument();
  });

  it("a load failure is an error with retry, never 'none connected'", async () => {
    mockApiFetch.mockResolvedValueOnce(res({ error: "unauthorized" }, 401));
    render(<ConnectedExtensionsCard />);
    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText(/No extension is connected/)).toBeNull();
  });

  it("describes a session without inventing a last-seen date", () => {
    expect(describeSession(S2)).not.toMatch(/last active/);
    expect(describeSession(S1)).toMatch(/Connected .* · last active .* · expires /);
  });
});
