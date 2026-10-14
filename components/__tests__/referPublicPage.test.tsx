import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const search = vi.hoisted(() => ({ slug: "" }));
const {
  mockFetchReferrerBySlug,
  mockListOpenReferralCompanies,
  mockCreateReferralRequest,
  mockFetchFeaturedCompanies,
} = vi.hoisted(() => ({
  mockFetchReferrerBySlug: vi.fn(),
  mockListOpenReferralCompanies: vi.fn(),
  mockCreateReferralRequest: vi.fn(),
  mockFetchFeaturedCompanies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/refer",
  useSearchParams: () => new URLSearchParams(search.slug ? { s: search.slug } : undefined),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
const { mockGetSession, mockOpenSignIn, mockSignInWithGoogle } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOpenSignIn: vi.fn(),
  mockSignInWithGoogle: vi.fn(),
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
vi.mock("@/lib/anonScan", () => ({
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
}));
vi.mock("@/lib/companyReferrers", async (orig) => ({
  ...(await orig<typeof import("@/lib/companyReferrers")>()),
  fetchReferrerBySlug: mockFetchReferrerBySlug,
  listOpenReferralCompanies: mockListOpenReferralCompanies,
  createReferralRequest: mockCreateReferralRequest,
}));
vi.mock("@/lib/jobsApi", async (orig) => ({
  ...(await orig<typeof import("@/lib/jobsApi")>()),
  fetchFeaturedCompanies: (...args: unknown[]) => mockFetchFeaturedCompanies(...args),
}));

import ReferPublicPage from "@/components/refer/ReferPublicPage";
import {
  REFERRER_COMPANIES_FAILED,
  REFERRER_LINK_INACTIVE,
  REFERRER_LOOKUP_FAILED,
  REFERRER_SESSION_FAILED,
} from "@/lib/companyReferrers";

function loaded<T>(data: T) {
  return { ok: true as const, data };
}

beforeEach(() => {
  search.slug = "";
  mockFetchReferrerBySlug.mockResolvedValue(loaded(null));
  mockListOpenReferralCompanies.mockResolvedValue(loaded([]));
  mockFetchFeaturedCompanies.mockResolvedValue([]);
  mockCreateReferralRequest.mockResolvedValue({ request: null, error: "Could not send this request. Add your name, a valid email, and the role you want." });
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: "candidate" } } } });
  mockOpenSignIn.mockReset();
  mockSignInWithGoogle.mockResolvedValue(null);
});

describe("ReferPublicPage", () => {
  it("allures unsigned visitors with Google sign-in and hides the directory", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<ReferPublicPage />);
    expect(await screen.findByRole("heading", { name: "Get employee referrals" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Filter companies")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Companies with open referrers" })).not.toBeInTheDocument();
    expect(mockListOpenReferralCompanies).not.toHaveBeenCalled();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("starts Google OAuth from the locked gate", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<ReferPublicPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));
    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });

  it("shows Be the first for a signed-in empty directory", async () => {
    render(<ReferPublicPage />);
    expect(await screen.findByRole("heading", { name: "Ask an employee for a referral" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Be the first" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Publish your referrer profile" })).toHaveAttribute("href", "/profile?tab=referrals");
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument();
  });

  it("renders open companies as a logo grid without person cards when signed in", async () => {
    mockListOpenReferralCompanies.mockResolvedValue(loaded([
      { company: "Stripe", companySlug: "stripe", companyDomain: "stripe.com", openCount: 2, referredCount: 5 },
      { company: "Acme", companySlug: "acme", companyDomain: "", openCount: 1, referredCount: 0 },
    ]));
    render(<ReferPublicPage />);
    expect(await screen.findByRole("list", { name: "Companies with open referrers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stripe" })).toBeInTheDocument();
    expect(screen.getByText("2 open referrers · 5 referred")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByLabelText("Filter companies")).toBeInTheDocument();
    expect(screen.queryByText(/Software Engineer at/)).not.toBeInTheDocument();
  });

  it("opens the site menu with the same links as the header", async () => {
    const user = userEvent.setup();
    render(<ReferPublicPage />);
    await user.click(await screen.findByRole("button", { name: "Open menu" }));
    const menu = screen.getByRole("navigation", { name: "Menu" });
    expect(within(menu).getByRole("link", { name: "Resume Builder" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Referrals" })).toHaveAttribute("aria-current", "page");
    expect(within(menu).getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Score my résumé" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
  });

  it("locks a share link behind Google until signed in", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<ReferPublicPage />);
    expect(await screen.findByRole("heading", { name: "Someone shared a referral link with you" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(mockFetchReferrerBySlug).not.toHaveBeenCalled();
    expect(screen.queryByText("Parth Bhodia")).not.toBeInTheDocument();
  });

  it("renders the ask form for an open referrer slug", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue(loaded({
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
    }));
    render(<ReferPublicPage />);
    expect(await screen.findByRole("button", { name: "Ask for a referral" })).toBeInTheDocument();
    expect(screen.getByText("Parth Bhodia")).toBeInTheDocument();
    expect(screen.getByLabelText("12 referred")).toBeInTheDocument();
    expect(screen.getByText("Ask for a referral at Acme")).toBeInTheDocument();
    expect(screen.getByText(/does not submit the referral into Acme/)).toBeInTheDocument();
  });

  it("sends a request from the public form", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue(loaded({
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
    }));
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

  it("does not load a referrer while unsigned, even if the slug is known", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFetchReferrerBySlug.mockResolvedValue(loaded({
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
    }));
    render(<ReferPublicPage />);
    expect(await screen.findByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(mockFetchReferrerBySlug).not.toHaveBeenCalled();
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
    mockFetchReferrerBySlug.mockResolvedValue(loaded(openReferrer));
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    mockFetchReferrerBySlug.mockResolvedValue(loaded(null));
    await userEvent.type(screen.getByLabelText("Your name"), "Alex Kim");
    await userEvent.type(screen.getByLabelText("Your email"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Role you want"), "Backend Engineer");
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(await screen.findByText(REFERRER_LINK_INACTIVE)).toBeInTheDocument();
    expect(mockCreateReferralRequest).not.toHaveBeenCalled();
  });

  it("says when a referral link fails to load", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue({ ok: false, error: REFERRER_LOOKUP_FAILED });
    render(<ReferPublicPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(REFERRER_LOOKUP_FAILED);
  });

  it("says when the company directory fails to load", async () => {
    mockListOpenReferralCompanies.mockResolvedValue({ ok: false, error: REFERRER_COMPANIES_FAILED });
    render(<ReferPublicPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(REFERRER_COMPANIES_FAILED);
  });

  it("reports a session check failure instead of opening sign in", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockGetSession
      .mockResolvedValueOnce({ data: { session: { user: { id: "candidate" } } } })
      .mockRejectedValueOnce(new Error("offline"));
    mockFetchReferrerBySlug.mockResolvedValue(loaded({
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
    }));
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    await userEvent.type(screen.getByLabelText("Your name"), "Alex Kim");
    await userEvent.type(screen.getByLabelText("Your email"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Role you want"), "Backend Engineer");
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(REFERRER_SESSION_FAILED);
    expect(mockOpenSignIn).not.toHaveBeenCalled();
    expect(mockCreateReferralRequest).not.toHaveBeenCalled();
  });
});
