import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const search = vi.hoisted(() => ({ slug: "" }));
const {
  mockFetchReferrerBySlug,
  mockSearchOpenReferrers,
  mockCreateReferralRequest,
} = vi.hoisted(() => ({
  mockFetchReferrerBySlug: vi.fn(),
  mockSearchOpenReferrers: vi.fn(),
  mockCreateReferralRequest: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search.slug ? { s: search.slug } : undefined),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
const { mockGetSession, mockOpenSignIn } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOpenSignIn: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));
vi.mock("@/components/SignInDialog", () => ({
  useSignInDialog: () => ({ openSignIn: mockOpenSignIn }),
}));
vi.mock("@/lib/companyReferrers", async (orig) => ({
  ...(await orig<typeof import("@/lib/companyReferrers")>()),
  fetchReferrerBySlug: mockFetchReferrerBySlug,
  searchOpenReferrers: mockSearchOpenReferrers,
  createReferralRequest: mockCreateReferralRequest,
}));

import ReferPublicPage from "@/components/refer/ReferPublicPage";

beforeEach(() => {
  search.slug = "";
  mockFetchReferrerBySlug.mockResolvedValue(null);
  mockSearchOpenReferrers.mockResolvedValue([]);
  mockCreateReferralRequest.mockResolvedValue({ request: null, error: "Could not send this request. Add your name, a valid email, and the role you want." });
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: "candidate" } } } });
  mockOpenSignIn.mockReset();
});

describe("ReferPublicPage", () => {
  it("shows company search when no slug is present", async () => {
    render(<ReferPublicPage />);
    expect(await screen.findByRole("heading", { name: "Ask an employee for a referral" })).toBeInTheDocument();
    expect(screen.getByLabelText("Company name")).toBeInTheDocument();
  });

  it("renders the ask form for an open referrer slug", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue({
      id: "r1",
      userId: "u1",
      displayName: "Parth Bhodia",
      company: "Acme",
      companySlug: "acme",
      title: "Software Engineer",
      linkedin: null,
      slug: "parth-bhodia-at-acme-abcdef",
      bio: "Backend, intern",
      openToRefer: true,
      referredCount: 12,
      createdAt: "",
      updatedAt: "",
    });
    render(<ReferPublicPage />);
    expect(await screen.findByRole("button", { name: "Ask for a referral" })).toBeInTheDocument();
    expect(screen.getByText("Parth Bhodia")).toBeInTheDocument();
    expect(screen.getByLabelText("12 referred")).toBeInTheDocument();
    expect(screen.getByText("Ask for a referral at Acme")).toBeInTheDocument();
    expect(screen.getByText(/does not submit the referral into Acme/)).toBeInTheDocument();
  });

  it("sends a request from the public form", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue({
      id: "r1",
      userId: "u1",
      displayName: "Parth Bhodia",
      company: "Acme",
      companySlug: "acme",
      title: "Software Engineer",
      linkedin: null,
      slug: "parth-bhodia-at-acme-abcdef",
      bio: null,
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    });
    mockCreateReferralRequest.mockResolvedValue({
      request: {
        id: "q1",
        referrerId: "r1",
        candidateName: "Alex Kim",
        candidateEmail: "alex@example.com",
        candidateLinkedin: null,
        role: "Backend Engineer",
        notes: "Pitch",
        source: "request",
        status: "requested",
        createdAt: "",
      },
      error: null,
    });
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    await userEvent.type(screen.getByLabelText("Your name"), "Alex Kim");
    await userEvent.type(screen.getByLabelText("Your email"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Role you want"), "Backend Engineer");
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(mockCreateReferralRequest).toHaveBeenCalledWith({
      referrerId: "r1",
      candidateName: "Alex Kim",
      candidateEmail: "alex@example.com",
      candidateLinkedin: "",
      role: "Backend Engineer",
      notes: "",
      source: "request",
    });
    expect(await screen.findByText("Request sent")).toBeInTheDocument();
  });

  it("asks the candidate to sign in before sending", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFetchReferrerBySlug.mockResolvedValue({
      id: "r1",
      userId: "u1",
      displayName: "Parth Bhodia",
      company: "Acme",
      companySlug: "acme",
      title: "Software Engineer",
      linkedin: null,
      slug: "parth-bhodia-at-acme-abcdef",
      bio: null,
      openToRefer: true,
      referredCount: 0,
      createdAt: "",
      updatedAt: "",
    });
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    await userEvent.type(screen.getByLabelText("Your name"), "Alex Kim");
    await userEvent.type(screen.getByLabelText("Your email"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Role you want"), "Backend Engineer");
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(mockOpenSignIn).toHaveBeenCalled();
    expect(mockCreateReferralRequest).not.toHaveBeenCalled();
  });

  it("explains when the referrer paused before submit", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    const openReferrer = {
      id: "r1",
      userId: "u1",
      displayName: "Parth Bhodia",
      company: "Acme",
      companySlug: "acme",
      title: "Software Engineer",
      linkedin: null,
      slug: "parth-bhodia-at-acme-abcdef",
      bio: null,
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    };
    mockFetchReferrerBySlug.mockResolvedValue(openReferrer);
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    mockFetchReferrerBySlug.mockResolvedValue(null);
    await userEvent.type(screen.getByLabelText("Your name"), "Alex Kim");
    await userEvent.type(screen.getByLabelText("Your email"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Role you want"), "Backend Engineer");
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(await screen.findByText("This referral link is not active.")).toBeInTheDocument();
    expect(mockCreateReferralRequest).not.toHaveBeenCalled();
  });
});
