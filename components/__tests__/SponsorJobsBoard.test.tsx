/**
 * Sponsor board: paywall keys off contactsLocked (never an empty list), the
 * pro path renders contacts, and funnel events dedup. jsdom + mocked API.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackJobEvent = vi.fn(async (_postingId: string, _event: string) => {});
const fetchJobDetail = vi.fn();
vi.mock("@/lib/jobsApi", () => ({
  fetchJobDetail: (id: string) => fetchJobDetail(id),
  trackJobEvent: (id: string, ev: string) => trackJobEvent(id, ev),
}));
const createCheckoutSession = vi.fn(async (_key: string) => ({ error: "checkout_unavailable" }));
vi.mock("@/lib/billingApi", () => ({
  createCheckoutSession: (key: string) => createCheckoutSession(key),
  PLAN_PRICE_LABELS: {
    pro_monthly: { title: "Pro Monthly", price: "$19", cadence: "per month" },
    pro_quarterly: { title: "Pro Quarterly", price: "$39", cadence: "every 3 months", note: "$13/mo — save 32%" },
  },
}));

import SponsorJobsBoard from "@/components/SponsorJobsBoard";

const FEED_JOB = {
  id: "p1",
  title: "Backend Engineer",
  company: "Stripe",
  url: "https://x",
  location: "New York, NY",
  workModel: "hybrid",
  h1bSponsor: true,
  h1bCertifiedCount: 47,
  h1bMedianWage: 128000,
  postedAt: new Date().toISOString(),
  matchScore: 71,
};

// `signedIn` comes from the feed payload — the component takes the server's
// word for whether the request was authenticated rather than probing the
// client session, so that is what these tests vary.
function mockFeed(jobs: unknown[], signedIn = true) {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ jobs, ranked: true, signedIn }),
  })) as unknown as typeof fetch);
}

beforeEach(() => {
  trackJobEvent.mockClear();
  fetchJobDetail.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SponsorJobsBoard", () => {
  it("renders sponsor cards with the honest badge", async () => {
    mockFeed([FEED_JOB]);
    render(<SponsorJobsBoard />);
    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    expect(screen.getByText("Filed 47 H-1B LCAs · median $128k")).toBeInTheDocument();
  });

  it("shows the zero-results state, not a blank pane", async () => {
    mockFeed([]);
    render(<SponsorJobsBoard />);
    await waitFor(() =>
      expect(screen.getByText(/No sponsor-matched postings right now/)).toBeInTheDocument(),
    );
  });

  it("shows an error card on feed failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch);
    render(<SponsorJobsBoard />);
    await waitFor(() => expect(screen.getByText(/couldn't load/i)).toBeInTheDocument());
  });

  it("locked detail → paywall card + paywall_view once, even on re-open", async () => {
    mockFeed([FEED_JOB]);
    fetchJobDetail.mockResolvedValue({
      jdText: "JD text", url: "https://x", contacts: [], contactsLocked: true,
      matched: [], missing: [], injectableKeywords: [], matchScore: 71, matchedCount: 1, totalRequirements: 2,
    });
    render(<SponsorJobsBoard />);
    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Backend Engineer"));
    await waitFor(() => expect(screen.getByTestId("paywall-card")).toBeInTheDocument());
    // close + re-open: no duplicate events
    fireEvent.click(screen.getByText("Backend Engineer"));
    fireEvent.click(screen.getByText("Backend Engineer"));
    const events = trackJobEvent.mock.calls.map((c) => c[1]);
    expect(events.filter((e) => e === "paywall_view")).toHaveLength(1);
    expect(events.filter((e) => e === "reveal_click")).toHaveLength(1);
  });

  it("paywall offers BOTH plans; each starts its own checkout, one checkout_start", async () => {
    mockFeed([FEED_JOB]);
    fetchJobDetail.mockResolvedValue({
      jdText: "JD text", url: "https://x", contacts: [], contactsLocked: true,
      matched: [], missing: [], injectableKeywords: [], matchScore: 71, matchedCount: 1, totalRequirements: 2,
    });
    render(<SponsorJobsBoard />);
    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Backend Engineer"));
    await waitFor(() => expect(screen.getByTestId("paywall-card")).toBeInTheDocument());

    expect(screen.getByTestId("checkout-monthly")).toHaveTextContent("$19/mo");
    expect(screen.getByTestId("checkout-quarterly")).toHaveTextContent("$39/3 mo");
    expect(screen.getByText("$13/mo — save 32%")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("checkout-quarterly"));
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledWith("pro_quarterly"));
    expect(trackJobEvent.mock.calls.filter((c) => c[1] === "checkout_start")).toHaveLength(1);
  });

  it("unlocked detail with contacts → contacts card, no paywall", async () => {
    mockFeed([FEED_JOB]);
    fetchJobDetail.mockResolvedValue({
      jdText: "JD text", url: "https://x", contactsLocked: false,
      contacts: [{ email: "hr@stripe.com", type: "hr", source: "dol_lca", confidence: 1, pocTitle: "Director of HR", createdAt: null }],
      matched: [], missing: [], injectableKeywords: [], matchScore: 71, matchedCount: 1, totalRequirements: 2,
    });
    render(<SponsorJobsBoard />);
    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Backend Engineer"));
    await waitFor(() => expect(screen.getByTestId("contacts-card")).toBeInTheDocument());
    expect(screen.queryByTestId("paywall-card")).not.toBeInTheDocument();
    expect(screen.getByText(/hr@stripe\.com/)).toBeInTheDocument();
  });

  it("empty contacts WITHOUT contactsLocked shows neither card (no fake paywall)", async () => {
    mockFeed([FEED_JOB]);
    fetchJobDetail.mockResolvedValue({
      jdText: "JD text", url: "https://x", contacts: [], contactsLocked: false,
      matched: [], missing: [], injectableKeywords: [], matchScore: 71, matchedCount: 1, totalRequirements: 2,
    });
    render(<SponsorJobsBoard />);
    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Backend Engineer"));
    await waitFor(() => expect(screen.getByText("JD text")).toBeInTheDocument());
    expect(screen.queryByTestId("paywall-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("contacts-card")).not.toBeInTheDocument();
  });

  it("signed-out + locked shows the sign-in card instead of the paywall", async () => {
    mockFeed([FEED_JOB], false);
    fetchJobDetail.mockResolvedValue({
      jdText: "JD", url: "", contacts: [], contactsLocked: true,
      matched: [], missing: [], injectableKeywords: [], matchScore: null, matchedCount: 0, totalRequirements: 0,
    });
    render(<SponsorJobsBoard />);
    await waitFor(() => expect(screen.getByText("Backend Engineer")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Backend Engineer"));
    await waitFor(() => expect(screen.getByTestId("signin-card")).toBeInTheDocument());
    expect(screen.queryByTestId("paywall-card")).not.toBeInTheDocument();
  });
});
