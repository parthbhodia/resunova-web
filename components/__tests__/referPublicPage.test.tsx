import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const search = vi.hoisted(() => ({ slug: "" }));
const {
  mockFetchReferrerBySlug,
  mockListOpenReferralCompanies,
  mockListOpenReferrersForCompany,
  mockCreateReferralRequest,
  mockFetchFeaturedCompanies,
} = vi.hoisted(() => ({
  mockFetchReferrerBySlug: vi.fn(),
  mockListOpenReferralCompanies: vi.fn(),
  mockListOpenReferrersForCompany: vi.fn(),
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
  fetchUserProfile: vi.fn().mockResolvedValue(null),
  fetchExtractedProfile: vi.fn().mockResolvedValue(null),
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
  listOpenReferrersForCompany: mockListOpenReferrersForCompany,
  createReferralRequest: mockCreateReferralRequest,
}));
vi.mock("@/lib/jobsApi", async (orig) => ({
  ...(await orig<typeof import("@/lib/jobsApi")>()),
  fetchFeaturedCompanies: (...args: unknown[]) => mockFetchFeaturedCompanies(...args),
}));

import ReferPublicPage from "@/components/refer/ReferPublicPage";
import { PublicSiteFrame } from "@/components/site/PublicSiteFrame";
import {
  REFERRER_COMPANIES_FAILED,
  REFERRER_LINK_INACTIVE,
  REFERRER_LOOKUP_FAILED,
  REFERRER_SESSION_FAILED,
} from "@/lib/companyReferrers";

/** Chrome lives on app/(marketing)/layout; wrap when asserting the shared header. */
function renderWithSiteChrome(ui: ReactNode) {
  return render(<PublicSiteFrame>{ui}</PublicSiteFrame>);
}

function loaded<T>(data: T) {
  return { ok: true as const, data };
}

beforeEach(() => {
  search.slug = "";
  mockFetchReferrerBySlug.mockResolvedValue(loaded(null));
  mockListOpenReferralCompanies.mockResolvedValue(loaded([]));
  mockListOpenReferrersForCompany.mockResolvedValue(loaded([]));
  mockFetchFeaturedCompanies.mockResolvedValue([]);
  mockCreateReferralRequest.mockResolvedValue({ request: null, error: "Could not send this request. Add your name, a valid email, the role you want, and a LinkedIn URL or resume PDF." });
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
  });

  it("lets signed-in candidates open a company and choose a specific referrer", async () => {
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

    mockListOpenReferrersForCompany.mockResolvedValue(loaded([{
      id: "r1",
      userId: "u1",
      displayName: "Morgan Lee",
      company: "Stripe",
      companySlug: "stripe",
      title: "Product Designer",
      linkedin: null,
      slug: "morgan-lee-at-stripe-abcdef",
      bio: "Design systems",
      openToRefer: true,
      referredCount: 3,
      createdAt: "",
      updatedAt: "",
    }]));
    await userEvent.click(screen.getByRole("button", { name: "View 2 open referrers at Stripe" }));
    expect(await screen.findByRole("heading", { name: "People who can refer you at Stripe" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Ask Morgan Lee for a referral at Stripe" }))
      .toHaveAttribute("href", "/refer/?s=morgan-lee-at-stripe-abcdef");
    expect(mockListOpenReferrersForCompany).toHaveBeenCalledWith("stripe");
  });

  it("opens the site menu with the same links as the header", async () => {
    const user = userEvent.setup();
    renderWithSiteChrome(<ReferPublicPage />);
    await user.click(await screen.findByRole("button", { name: "Open menu" }));
    const menu = screen.getByRole("navigation", { name: "Menu" });
    expect(within(menu).getByRole("link", { name: "Resume Builder" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Referrals" })).toHaveAttribute("aria-current", "page");
    // Signed-in visitors get Profile, not Sign in — same session the page body uses.
    expect(await within(menu).findByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(within(menu).queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Score my résumé" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
  });

  it("shows Sign in in the header when signed out", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderWithSiteChrome(<ReferPublicPage />);
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
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
    expect(screen.getByText(/does not submit it for them/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your name/)).toBeRequired();
    expect(screen.getByLabelText(/Your email/)).toBeRequired();
    expect(screen.getByLabelText(/Role you want/)).toBeRequired();
    expect(screen.getByLabelText(/LinkedIn URL/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Resume PDF/)).toBeInTheDocument();
  });

  it("prefills the ask form from the signed-in account", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "candidate", email: "alex@example.com", user_metadata: { full_name: "Alex Kim" } } } },
    });
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
    expect(await screen.findByDisplayValue("Alex Kim")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("alex@example.com")).toBeInTheDocument();
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
        candidateUserId: "candidate",
        candidateLinkedin: "https://linkedin.com/in/alex",
        resumePdfPath: null,
        candidatePhone: null,
        candidateYearsExperience: null,
        candidateHeadline: null,
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
    await userEvent.type(screen.getByLabelText(/Your name/), "Alex Kim");
    await userEvent.type(screen.getByLabelText(/Your email/), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/Role you want/), "Backend Engineer");
    await userEvent.type(screen.getByLabelText(/LinkedIn URL/), "https://linkedin.com/in/alex");
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(mockCreateReferralRequest).toHaveBeenCalledWith({
      referrerId: "r1",
      candidateName: "Alex Kim",
      candidateEmail: "alex@example.com",
      candidateLinkedin: "https://linkedin.com/in/alex",
      resumePdfPath: null,
      candidatePhone: "",
      candidateYearsExperience: "",
      candidateHeadline: "",
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
    await userEvent.type(screen.getByLabelText(/Your name/), "Alex Kim");
    await userEvent.type(screen.getByLabelText(/Your email/), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/Role you want/), "Backend Engineer");
    await userEvent.type(screen.getByLabelText(/LinkedIn URL/), "https://linkedin.com/in/alex");
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

  it("offers the directory when a referral link is paused or invalid", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue(loaded(null));
    render(<ReferPublicPage />);
    expect(await screen.findByText(/may have been paused or copied incorrectly/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse open referrers" })).toHaveAttribute("href", "/refer/");
  });

  it("says when the company directory fails to load", async () => {
    mockListOpenReferralCompanies.mockResolvedValue({ ok: false, error: REFERRER_COMPANIES_FAILED });
    render(<ReferPublicPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(REFERRER_COMPANIES_FAILED);
  });

  it("reports a session check failure instead of opening sign in", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    // Page body resolves session on mount; reject only on submit.
    mockGetSession
      .mockResolvedValueOnce({ data: { session: { user: { id: "candidate" } } } })
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
    await userEvent.type(screen.getByLabelText(/Your name/), "Alex Kim");
    await userEvent.type(screen.getByLabelText(/Your email/), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/Role you want/), "Backend Engineer");
    await userEvent.type(screen.getByLabelText(/LinkedIn URL/), "https://linkedin.com/in/alex");
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(REFERRER_SESSION_FAILED);
    expect(mockOpenSignIn).not.toHaveBeenCalled();
    expect(mockCreateReferralRequest).not.toHaveBeenCalled();
  });
});
