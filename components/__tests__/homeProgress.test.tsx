/**
 * Home: what it says you've built.
 *
 * Two claims under test. First, "Best ATS score" must be an ATS score — the
 * dashboard was maxing across tailored rows, whose `score` is a JD MATCH
 * percentage, so one well-matched tailored résumé could put a number under
 * that heading that no scan ever produced. Second, the right rail: a finished
 * checklist is five struck-through lines in the most persistent slot on the
 * page, and it should give way to the one thing nothing else here says.
 */

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HomeDashboard from "@/components/HomeDashboard";
import { invalidateCache } from "@/lib/clientCache";
import type { LibraryItem } from "@/lib/supabase";

const { mockGetSession, mockItems, mockProfile } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockItems: vi.fn(),
  mockProfile: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
  fetchLibraryItems: mockItems,
  fetchUserProfile: mockProfile,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/UpgradeDialog", () => ({ useUpgradeDialog: () => vi.fn() }));
vi.mock("@/lib/apiClient", () => ({
  apiFetch: (path: string) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(
          path.includes("/api/applications")
            ? { stats: { saved: 1, applied: 2, interviewing: 0, offer: 0, rejected: 0, archived: 0, total: 3 } }
            : { enforced: true, unlimited: false, limit: 3, used: 1, remaining: 2, usedLast7Days: 2 },
        ),
    }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const at = (day: number) => `2026-06-${String(day).padStart(2, "0")}T12:00:00.000Z`;

/** An analysis row: `score` here is the general ATS quality grade. */
const analyzed = (score: number, day: number, scoreSource?: string | null): LibraryItem =>
  ({
    kind: "analyzed",
    key: `analyzed:${day}`,
    id: `a${day}`,
    title: "Résumé",
    subtitle: "Resume analysis",
    score,
    createdAt: at(day),
    isDefault: false,
    analysis: { id: `a${day}`, label: "Résumé", score, createdAt: at(day), scoreSource, result: {} },
  }) as LibraryItem;

/** A tailored row: `score` here is `ratings.match_score` against ONE job. */
const tailored = (matchScore: number, day: number): LibraryItem =>
  ({
    kind: "tailored",
    key: `tailored:${day}`,
    id: `t${day}`,
    title: "Acme",
    subtitle: "Engineer",
    score: matchScore,
    createdAt: at(day),
    isDefault: false,
    record: { folder: `f${day}`, score: matchScore, created_at: at(day) },
  }) as unknown as LibraryItem;

function setup(items: LibraryItem[]) {
  invalidateCache();
  mockGetSession.mockResolvedValue({
    data: { session: { user: { email: "p@x.com" }, access_token: "t" } },
  });
  mockItems.mockResolvedValue(items);
  mockProfile.mockResolvedValue({ displayName: "Parth" });
  return render(<HomeDashboard />);
}

/** The value rendered inside the StatCard with this label. */
function statValue(label: string): string {
  const el = screen.getByText(label).parentElement?.querySelectorAll("span")[1];
  return el?.textContent ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Best ATS score", () => {
  it("ignores a tailored résumé's JD match percentage", async () => {
    // 91 is "this résumé covers 91% of one posting's requirements", not a
    // grade. Printing it under "Best ATS score" is a different number wearing
    // this one's name.
    setup([tailored(91, 12), analyzed(68, 10)]);
    await waitFor(() => expect(statValue("Best ATS score")).toBe("68"));
  });

  it("ignores a save-edit estimate", async () => {
    // An estimate is the deterministic projection shown while edits are
    // pending. A headline "best" built on a projection is unfalsifiable.
    setup([analyzed(95, 20, "estimate"), analyzed(72, 10)]);
    await waitFor(() => expect(statValue("Best ATS score")).toBe("72"));
  });

  it("still reports a real best across measured scans", async () => {
    setup([analyzed(72, 10), analyzed(84, 20, "llm")]);
    await waitFor(() => expect(statValue("Best ATS score")).toBe("84"));
  });
});

describe("the right rail", () => {
  it("keeps the checklist while there is setup left", async () => {
    setup([analyzed(72, 10)]); // no tailored résumé yet
    await waitFor(() => expect(screen.getByText("Get set up")).toBeInTheDocument());
    expect(screen.queryByText("Your progress")).not.toBeInTheDocument();
  });

  it("gives way to progress once the checklist is done", async () => {
    setup([analyzed(72, 10), analyzed(84, 20), tailored(91, 15)]);
    await waitFor(() => expect(screen.getByText("Your progress")).toBeInTheDocument());
    // The finished list is gone, not merely struck through.
    expect(screen.queryByText("Get set up")).not.toBeInTheDocument();
    expect(screen.queryByText("Tailor a résumé to a job")).not.toBeInTheDocument();
  });

  it("reports the arc across measured scans", async () => {
    setup([analyzed(72, 10), analyzed(84, 20), tailored(91, 15)]);
    await waitFor(() => expect(screen.getByText("Up 12 since Jun 10")).toBeInTheDocument());
    expect(screen.getByText(/Across 2 scored scans/)).toBeInTheDocument();
  });

  it("does not read a tailored match score as progress", async () => {
    // One scan plus a tailored row is not two data points: 72 → 91 would be a
    // fabricated 19-point climb built from two different measurements.
    setup([analyzed(72, 10), tailored(91, 20)]);
    await waitFor(() => expect(screen.getByText("Your progress")).toBeInTheDocument());
    expect(screen.queryByText(/^Up /)).not.toBeInTheDocument();
  });

  it("tells a one-scan user what produces an arc", async () => {
    // More than half the people who scan never come back for a second one, and
    // nothing in the product said the second scan is where the value is.
    setup([analyzed(72, 10), tailored(91, 20)]);
    await waitFor(() => expect(screen.getByText(/Scan again after your next edit/)).toBeInTheDocument());
    expect(screen.getByText(/on Jun 10/)).toBeInTheDocument();
  });
});

describe("the greeting", () => {
  it("does not promise a history a fresh account does not have", async () => {
    setup([]);
    await waitFor(() => expect(screen.getByText(/Start with a scan/)).toBeInTheDocument());
    expect(screen.queryByText(/pick up where you left off/i)).not.toBeInTheDocument();
  });

  it("picks up where you left off once there is something to pick up", async () => {
    setup([analyzed(72, 10)]);
    await waitFor(() => expect(screen.getByText(/Pick up where you left off/)).toBeInTheDocument());
  });
});

describe("the template shelf", () => {
  it("renders on Home, pointing at the templates users could not find", async () => {
    // Founder-directed after repeated reports that the resume templates were
    // unfindable: Home carries an explicit section leading to them. The strip
    // itself is covered in templateGalleryPage.test.tsx; this pins the seam —
    // that HomeDashboard actually mounts it.
    setup([]);
    await waitFor(() =>
      expect(screen.getByTestId("home-template-strip")).toBeInTheDocument(),
    );
    expect(screen.getByText("Start from a template")).toBeInTheDocument();
  });
});
