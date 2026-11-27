import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiFetch: mockFetch }));

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const LIVE = {
  id: "11111111-1111-4111-8111-111111111111", title: "Daily job alerts", body: "Up to 20 new jobs.",
  href: "/?view=jobs", cta: "Open", startsAt: "2026-11-27T10:00:00+00:00", endsAt: null, createdAt: null, status: "live",
};

let Panel: ComponentType;

beforeEach(async () => {
  vi.resetModules(); // the panel keeps its last list at module level
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === "/api/admin/announcements" && init?.method === "POST") return reply(201, { announcement: { ...LIVE, status: "live" } });
    if (path.endsWith("/end")) return reply(200, { changed: true });
    return reply(200, { announcements: [LIVE] });
  });
  Panel = (await import("@/components/AnnouncementsPanel")).default;
});

const posts = () => mockFetch.mock.calls.filter(([, init]) => init?.method === "POST");

describe("AnnouncementsPanel", () => {
  it("previews what people will see and publishes the typed announcement", async () => {
    render(<Panel />);
    await userEvent.type(screen.getByLabelText(/^Title/), "New feature");
    await userEvent.type(screen.getByLabelText(/^Text/), "Try it today.");
    await userEvent.click(screen.getByRole("button", { name: "Jobs" })); // link preset
    expect(screen.getByLabelText("Link")).toHaveValue("/?view=jobs");
    expect(document.querySelector("[data-announcement-preview]")).toHaveTextContent("New feature");

    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    const [path, init] = posts()[0];
    expect(path).toBe("/api/admin/announcements");
    expect(JSON.parse(String(init?.body))).toMatchObject({ title: "New feature", body: "Try it today.", href: "/?view=jobs" });
    expect(await screen.findByText(/Published/)).toBeInTheDocument();
  });

  it("stops a link that leaves the site in the form, without sending anything", async () => {
    render(<Panel />);
    await userEvent.type(screen.getByLabelText(/^Title/), "Hi");
    await userEvent.type(screen.getByLabelText(/^Text/), "There");
    await userEvent.type(screen.getByLabelText("Link"), "https://evil.com");
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText(/Full web addresses are not allowed/)).toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it("ends a live announcement through the end endpoint", async () => {
    render(<Panel />);
    await userEvent.click(await screen.findByRole("button", { name: "End Daily job alerts" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe(`/api/admin/announcements/${LIVE.id}/end`);
  });
});
