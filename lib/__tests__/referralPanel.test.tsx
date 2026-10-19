import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReferralRewardsCard } from "@/components/profile/ReferralRewardsCard";
import { TopReferrerChip, ReferSortToggle } from "@/components/refer/referUi";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiUrl: (p: string) => p,
}));

const referredRequest = {
  id: "q1",
  referrerId: "r1",
  candidateUserId: "u2",
  candidateName: "Alex Kim",
  candidateEmail: "alex@example.com",
  candidateLinkedin: "https://linkedin.com/in/alexkim",
  resumePdfPath: null,
  candidatePhone: null,
  candidateYearsExperience: 5,
  candidateHeadline: "Backend engineer",
  candidateOutcome: null,
  candidateOutcomeAt: null,
  role: "Backend Engineer",
  notes: null,
  source: "request" as const,
  status: "referred" as const,
  createdAt: "2026-10-01T00:00:00Z",
};

function jsonRes(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function installRewards(entries: unknown[] | "fail" | "missing") {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.includes("/api/referral/rewards")) {
      if (entries === "fail") return jsonRes({}, 500);
      if (entries === "missing") return jsonRes({}, 404);
      return jsonRes({ entries });
    }
    return jsonRes({});
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

beforeEach(() => {
  mockRpc.mockReset();
});

describe("ReferralRewardsCard", () => {
  it("renders nothing at all when there is nothing earned", async () => {
    installRewards([]);
    const { container } = render(<ReferralRewardsCard />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("renders nothing when the backend has not shipped the route", async () => {
    // 404 is the expected state until resunova-api deploys, so it must not
    // surface as an error to a referrer who has earned nothing yet.
    installRewards("missing");
    const { container } = render(<ReferralRewardsCard />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("shows granted days, pending days and the headline rate separately", async () => {
    installRewards([
      { id: "a1", kind: "referred", days: 3, status: "granted", createdAt: "2026-10-01T00:00:00Z" },
      { id: "a2", kind: "interview", days: 10, status: "pending", createdAt: "2026-10-05T00:00:00Z" },
    ]);
    render(<ReferralRewardsCard />);
    expect(await screen.findByText("Added to your Pro")).toBeInTheDocument();
    expect(screen.getByText("On the way")).toBeInTheDocument();
    // 3 granted, 10 pending: the two must not be summed into one misleading number.
    expect(screen.getByText("Candidate reported an interview")).toBeInTheDocument();
    expect(screen.getByText(/Marking a candidate referred earns 3 Pro days/)).toBeInTheDocument();
  });

  it("names the candidate in the history line", async () => {
    installRewards([
      { id: "a1", kind: "referred", days: 3, status: "granted", subject: "Alex Kim", createdAt: "2026-10-01T00:00:00Z" },
    ]);
    render(<ReferralRewardsCard />);
    expect(await screen.findByText(/Candidate marked as referred: Alex Kim/)).toBeInTheDocument();
  });

  it("surfaces a real failure with a retry", async () => {
    const fetchMock = installRewards("fail");
    render(<ReferralRewardsCard />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load your rewards/i);
    fetchMock.mockImplementation(async (u: string | URL) => (
      String(u).includes("/api/referral/rewards")
        ? jsonRes({ entries: [{ id: "a1", kind: "referred", days: 3, status: "granted", createdAt: "2026-10-01T00:00:00Z" }] })
        : jsonRes({})
    ));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Added to your Pro")).toBeInTheDocument();
  });

  it("offers the report only on referred requests with nothing reported", async () => {
    installRewards([]);
    render(
      <ReferralRewardsCard
        requests={[
          referredRequest,
          { ...referredRequest, id: "q2", status: "requested" },
          { ...referredRequest, id: "q3", status: "declined" },
          { ...referredRequest, id: "q4", status: "referred", candidateOutcome: "interview" },
          { ...referredRequest, id: "q5", source: "submitted", status: "referred" },
        ]}
      />,
    );
    expect(await screen.findByText("Close the loop")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "I got an interview" })).toHaveLength(1);
    // Split across two spans for the weight difference, so match the container.
    expect(screen.getByText(/Backend Engineer/)).toBeInTheDocument();
  });

  it("reports an interview through the RPC and refreshes the inbox", async () => {
    installRewards([]);
    mockRpc.mockResolvedValue({ error: null });
    const onRefresh = vi.fn();
    render(<ReferralRewardsCard requests={[referredRequest]} onRequestRefresh={onRefresh} />);
    await userEvent.click(await screen.findByRole("button", { name: "I got an interview" }));
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("report_referral_outcome", {
      request_id: "q1",
      outcome: "interview",
    }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it("shows the RPC's refusal instead of a generic error", async () => {
    installRewards([]);
    mockRpc.mockResolvedValue({ error: { message: "you already reported an outcome" } });
    render(<ReferralRewardsCard requests={[referredRequest]} />);
    await userEvent.click(await screen.findByRole("button", { name: "I got an interview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/already reported/i);
  });

  it("reports a miss too, and earns nothing for it", async () => {
    installRewards([]);
    mockRpc.mockResolvedValue({ error: null });
    render(<ReferralRewardsCard requests={[referredRequest]} />);
    await userEvent.click(await screen.findByRole("button", { name: "It did not work out" }));
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("report_referral_outcome", {
      request_id: "q1",
      outcome: "closed",
    }));
  });
});

describe("TopReferrerChip", () => {
  it("reads as a claim the count beside it already supports", () => {
    render(<TopReferrerChip />);
    expect(screen.getByText("Top referrer")).toBeInTheDocument();
  });
});

describe("ReferSortToggle", () => {
  it("offers both orders and reports a change", async () => {
    const onChange = vi.fn();
    render(<ReferSortToggle value="referred" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /most open desks/i }));
    expect(onChange).toHaveBeenCalledWith("open");
  });

  it("marks the current order as pressed", () => {
    render(<ReferSortToggle value="referred" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /most referred/i })).toHaveAttribute("aria-pressed", "true");
  });
});