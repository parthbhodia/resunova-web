import { afterEach, describe, expect, it, vi } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabaseClient: () => ({ from: mockFrom }) }));

import {
  ANNOUNCEMENT_READ_TIMEOUT_MS,
  announcementToNotice,
  fetchLiveAnnouncements,
  isInAppPath,
} from "@/lib/announcements";

/** The chain the reader calls: from().select().order().limit() → a promise. */
function reads(result: Promise<unknown> | unknown) {
  mockFrom.mockReturnValue({
    select: () => ({ order: () => ({ limit: () => Promise.resolve(result) }) }),
  });
}

const row = (over = {}) => ({ id: "a1", title: "Daily job alerts", body: "Up to 20 new jobs.", href: "/?view=jobs", cta: "Turn it on", ...over });

afterEach(() => {
  mockFrom.mockReset();
  vi.useRealTimers();
});

describe("the link rule", () => {
  // Written out by hand: resunova-api (services/announcements.py) and migration
  // 072 enforce the same rule, and a change must be made in all three.
  it("accepts a path inside the app and nothing that could leave it", () => {
    for (const ok of ["/", "/?view=jobs", "/profile?tab=referrals", "/" + "a".repeat(199)]) {
      expect(isInAppPath(ok), ok).toBe(true);
    }
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "profile", "", "/a b", "/ x", "/" + "a".repeat(200), null, 5]) {
      expect(isInAppPath(bad), String(bad)).toBe(false);
    }
  });
});

describe("announcementToNotice", () => {
  it("prefixes the id so a dismissal cannot collide with a notice written in code", () => {
    expect(announcementToNotice(row())).toEqual({
      id: "announcement:a1", title: "Daily job alerts", body: "Up to 20 new jobs.", href: "/?view=jobs", cta: "Turn it on",
    });
    expect(announcementToNotice(row({ cta: "  " }))?.cta).toBe("Open");
  });

  it("drops a row that is incomplete or whose link leaves the site", () => {
    expect(announcementToNotice(row({ href: "https://evil.com" }))).toBeNull();
    expect(announcementToNotice(row({ title: "  " }))).toBeNull();
    expect(announcementToNotice(row({ id: "" }))).toBeNull();
  });
});

describe("fetchLiveAnnouncements", () => {
  it("returns the usable rows and silently drops the unsafe one", async () => {
    reads({ data: [row(), row({ id: "a2", href: "//evil.com" })], error: null });
    const out = await fetchLiveAnnouncements();
    expect(out.map((n) => n.id)).toEqual(["announcement:a1"]);
  });

  it("is an empty list, not an error, when the read fails, throws or stalls", async () => {
    reads({ data: null, error: { message: 'relation "announcements" does not exist' } });
    expect(await fetchLiveAnnouncements()).toEqual([]);

    mockFrom.mockImplementation(() => { throw new Error("no client"); });
    expect(await fetchLiveAnnouncements()).toEqual([]);

    vi.useFakeTimers();
    mockFrom.mockReturnValue({ select: () => ({ order: () => ({ limit: () => new Promise(() => {}) }) }) });
    const pending = fetchLiveAnnouncements();
    await vi.advanceTimersByTimeAsync(ANNOUNCEMENT_READ_TIMEOUT_MS);
    expect(await pending).toEqual([]);
  });
});
