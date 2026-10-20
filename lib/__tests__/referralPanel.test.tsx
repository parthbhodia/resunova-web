import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReferralRewardsCard } from "@/components/profile/ReferralRewardsCard";
import { SentReferralsCard } from "@/components/profile/SentReferralsCard";
import { TopReferrerChip, ReferSortToggle } from "@/components/refer/referUi";
import type { SentReferralRequest } from "@/lib/companyReferrers";

const { mockRpc, mockSentRows } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockSentRows: { current: [] as SentReferralRequest[] },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

vi.mock("@/lib/companyReferrers", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchMySentReferralRequests: async () => mockSentRows.current,
}));

vi.mock("@/lib/productNotices", () => ({
  persistLastSeenSentReferral: vi.fn(async () => {}),
  onSentReferralRefresh: vi.fn(() => () => {}),
}));

vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiUrl: (p: string) => p,
}));

function sentRequest(overrides: Partial<SentReferralRequest> = {}): SentReferralRequest {
  return {
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
    source: "request",
    status: "referred",
    createdAt: "2026-10-01T00:00:00Z",
    referrerName: "Sam Lee",
    referrerCompany: "Acme",
    referrerReferredCount: 4,
    ...overrides,
  };
}

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

  it("leaves outcome reporting to the candidate but shows what they reported", async () => {
    installRewards([
      { id: "a1", kind: "interview", days: 10, status: "granted", subject: "Alex Kim", createdAt: "2026-10-05T00:00:00Z" },
    ]);
    render(<ReferralRewardsCard requests={[sentRequest({ candidateOutcome: "placed", candidateOutcomeAt: "2026-10-12T00:00:00Z" })]} />);
    expect(await screen.findByText(/Candidate reported an interview/)).toBeInTheDocument();
    expect(screen.getByText("What candidates told us")).toBeInTheDocument();
    expect(screen.getByText("I got the job")).toBeInTheDocument();
    // The referrer cannot report: the RPC accepts the candidate only, so the
    // card must not offer buttons that are guaranteed to fail.
    expect(screen.queryByText("Close the loop")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I got an interview" })).not.toBeInTheDocument();
  });

  it("stays visible for a miss even though a miss pays nothing", async () => {
    installRewards([]);
    render(<ReferralRewardsCard requests={[sentRequest({ candidateOutcome: "closed", candidateOutcomeAt: "2026-10-12T00:00:00Z" })]} />);
    expect(await screen.findByText("What candidates told us")).toBeInTheDocument();
    expect(screen.getByText("It did not work out")).toBeInTheDocument();
  });
});

describe("SentReferralsCard", () => {
  it("asks for an outcome only once the referrer marks the request referred", async () => {
    mockSentRows.current = [
      sentRequest({ id: "q1" }),
      sentRequest({ id: "q2", status: "requested" }),
      sentRequest({ id: "q3", status: "declined" }),
      sentRequest({ id: "q4", candidateUserId: null }),
    ];
    render(<SentReferralsCard />);
    expect(await screen.findByText("How did it go?")).toBeInTheDocument();
    expect(screen.getAllByText("How did it go?")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "I got an interview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I got an offer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I got the job" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "It did not work out" })).toBeInTheDocument();
  });

  it("reports an interview and tells the candidate what the referrer earned", async () => {
    mockSentRows.current = [sentRequest()];
    mockRpc.mockResolvedValue({ error: null });
    render(<SentReferralsCard />);
    await userEvent.click(await screen.findByRole("button", { name: "I got an interview" }));
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("report_referral_outcome", {
      request_id: "q1",
      outcome: "interview",
    }));
    expect(await screen.findByText("Sam Lee gets 10 Pro days on their Pro account.")).toBeInTheDocument();
    expect(screen.getByText(/You told us:/)).toHaveTextContent(/I got an interview/);
  });

  it("shows the RPC's refusal instead of a generic error", async () => {
    mockSentRows.current = [sentRequest()];
    mockRpc.mockResolvedValue({ error: { message: "you already reported an outcome" } });
    render(<SentReferralsCard />);
    await userEvent.click(await screen.findByRole("button", { name: "I got an interview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/already reported/i);
  });

  it("reports a miss too, and earns nothing for it", async () => {
    mockSentRows.current = [sentRequest()];
    mockRpc.mockResolvedValue({ error: null });
    render(<SentReferralsCard />);
    await userEvent.click(await screen.findByRole("button", { name: "It did not work out" }));
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("report_referral_outcome", {
      request_id: "q1",
      outcome: "closed",
    }));
    expect(await screen.findByText(/No reward for a referral that did not work out/)).toBeInTheDocument();
  });

  it("offers only forward steps after an interview", async () => {
    mockSentRows.current = [sentRequest({ candidateOutcome: "interview", candidateOutcomeAt: "2026-10-10T00:00:00Z" })];
    render(<SentReferralsCard />);
    expect(await screen.findByText(/You told us:/)).toHaveTextContent(/I got an interview/);
    expect(screen.queryByRole("button", { name: "I got an interview" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I got an offer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I got the job" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "It did not work out" })).toBeInTheDocument();
  });

  it("records the hire but treats it as final", async () => {
    mockSentRows.current = [sentRequest({ candidateOutcome: "offer", candidateOutcomeAt: "2026-10-10T00:00:00Z" })];
    mockRpc.mockResolvedValue({ error: null });
    render(<SentReferralsCard />);
    await userEvent.click(await screen.findByRole("button", { name: "I got the job" }));
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("report_referral_outcome", {
      request_id: "q1",
      outcome: "placed",
    }));
    expect(await screen.findByText("Thanks for the update")).toBeInTheDocument();
    expect(screen.queryByText(/gets 10 Pro days/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I got the job" })).not.toBeInTheDocument();
  });

  it("pays the 10 days when the hire is the first thing reported", async () => {
    mockSentRows.current = [sentRequest()];
    mockRpc.mockResolvedValue({ error: null });
    render(<SentReferralsCard />);
    await userEvent.click(await screen.findByRole("button", { name: "I got the job" }));
    expect(await screen.findByText("Sam Lee gets 10 Pro days on their Pro account.")).toBeInTheDocument();
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