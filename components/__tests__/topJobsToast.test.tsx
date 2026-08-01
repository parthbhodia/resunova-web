import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TopJobsToast from "@/components/analyze/TopJobsToast";

const feedResponse = vi.fn();

vi.mock("@/lib/apiClient", () => ({
  apiFetch: (..._args: unknown[]) => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(feedResponse()),
  }),
}));

vi.mock("@/store/resumeAnalyzeStore", () => ({
  useResumeAnalyzeStore: (sel: (s: { structuredResume: unknown }) => unknown) =>
    sel({ structuredResume: { name: "Parth", contact: { email: "p@x.com" } } }),
}));

const job = (id: string, score: number) => ({
  id, title: `Role ${id}`, company: `Co ${id}`, url: "", location: "Remote",
  salaryMin: null, salaryMax: null, matchScore: score, matchedCount: 5,
  totalRequirements: 10, titleMatch: false, locationMatch: false,
});

beforeEach(() => {
  sessionStorage.clear();
  feedResponse.mockReset();
});

describe("TopJobsToast", () => {
  it("shows the top ranked matches with scores and a see-all CTA", async () => {
    feedResponse.mockReturnValue({
      ranked: true,
      jobs: [job("a", 82), job("b", 61), job("c", 12)],
    });
    render(<TopJobsToast />);
    await waitFor(() => expect(screen.getByText("Role a")).toBeTruthy());
    expect(screen.getByText("82%")).toBeTruthy();
    // Below the honesty floor: never advertised as a "top job for you".
    expect(screen.queryByText("Role c")).toBeNull();
    expect(screen.getByText(/See all matches/)).toBeTruthy();
  });

  it("renders nothing when the feed is not resume-ranked (no fake personalization)", async () => {
    feedResponse.mockReturnValue({ ranked: false, jobs: [job("a", 90)] });
    const { container } = render(<TopJobsToast />);
    await waitFor(() => expect(feedResponse).toHaveBeenCalled());
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("dismiss hides it and marks the resume as seen for the session", async () => {
    feedResponse.mockReturnValue({ ranked: true, jobs: [job("a", 82)] });
    render(<TopJobsToast />);
    await waitFor(() => expect(screen.getByText("Role a")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(screen.queryByText("Role a")).toBeNull();
    expect(sessionStorage.getItem("rn_topjobs_seen_v1")).toContain("[");
  });
});
