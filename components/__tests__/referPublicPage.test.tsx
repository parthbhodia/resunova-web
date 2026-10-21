import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const search = vi.hoisted(() => ({ slug: "" }));
/** Mutated per test: Pro by default so the ask form is usable. */
const mockPlanBody = vi.hoisted(() => ({
  value: { enforced: true, unlimited: true, plan: "pro" } as Record<string, unknown>,
  /** When false, scan-limit-status answers !ok (status flake). */
  ok: true,
}));
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
const { mockGetSession, mockOpenSignIn, mockSignInWithGoogle, mockOpenUpgrade } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOpenSignIn: vi.fn(),
  mockSignInWithGoogle: vi.fn(),
  mockOpenUpgrade: vi.fn(),
}));

function planStatus(body: Record<string, unknown>) {
  return { ok: true as const, status: 200, json: async () => body };
}

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
vi.mock("@/components/UpgradeDialog", () => ({
  useUpgradeDialog: () => ({ openUpgrade: mockOpenUpgrade }),
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
// apiFetch is only used for the plan gate here, so stub it rather than a global fetch.
vi.mock("@/lib/apiClient", async (orig) => ({
  ...(await orig<typeof import("@/lib/apiClient")>()),
  apiFetch: (path: string) => {
    if (path.includes("scan-limit-status")) {
      if (!mockPlanBody.ok) {
        return Promise.resolve({ ok: false as const, status: 500, json: async () => ({}) });
      }
      return Promise.resolve(planStatus(mockPlanBody.value));
    }
    return Promise.resolve(planStatus({}));
  },
}));

import ReferPublicPage from "@/components/refer/ReferPublicPage";
import { PublicSiteFrame } from "@/components/site/PublicSiteFrame";
import {
  REFERRAL_ASK_BLOCKED_COPY,
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
  mockPlanBody.value = { enforced: true, unlimited: true, plan: "pro" };
  mockPlanBody.ok = true;
  mockFetchReferrerBySlug.mockResolvedValue(loaded(null));
  mockListOpenReferralCompanies.mockResolvedValue(loaded([]));
  mockListOpenReferrersForCompany.mockResolvedValue(loaded([]));
  mockFetchFeaturedCompanies.mockResolvedValue([]);
  mockCreateReferralRequest.mockResolvedValue({ request: null, error: "Could not send this request. Add your name, a valid email, the role you want, and a LinkedIn URL or resume PDF." });
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: "candidate" } } } });
  mockOpenSignIn.mockReset();
  mockOpenUpgrade.mockReset();
  mockSignInWithGoogle.mockResolvedValue(null);
});

describe("ReferPublicPage", () => {
  it("shows the company directory to unsigned visitors", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockListOpenReferralCompanies.mockResolvedValue(loaded([
      { company: "Stripe", companySlug: "stripe", companyDomain: "stripe.com", companyLocation: "San Francisco, CA", companyWebsite: "https://stripe.com/", openCount: 2, referredCount: 5 },
    ]));
    render(<ReferPublicPage />);
    expect(await screen.findByRole("heading", { name: "Ask an employee for a referral" })).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Companies with open referrers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stripe" })).toBeInTheDocument();
    expect(screen.getByLabelText("Filter companies")).toBeInTheDocument();
    expect(mockListOpenReferralCompanies).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  });

  it("asks for sign-in at the ask, not at the page", async () => {
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
      bio: "Backend, intern",
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      referredCount: 12,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);

    // The referrer and the form are public.
    expect(await screen.findByText("Parth Bhodia")).toBeInTheDocument();
    expect(screen.getByText(/Ask for a referral at Acme/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Full name/), "Alex Kim");
    await userEvent.type(screen.getByLabelText(/Email the referrer/), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/Role you want a referral for/), "Backend Engineer");
    await userEvent.type(screen.getByLabelText(/LinkedIn profile URL/), "https://linkedin.com/in/alex");

    // Only the action asks for an account: submit resolves to sign_in before
    // any field validation or write.
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(mockOpenSignIn).toHaveBeenCalledWith(expect.objectContaining({
      title: "Sign in to ask for a referral",
    }));
    expect(mockCreateReferralRequest).not.toHaveBeenCalled();
  });

  it("shows Be the first for a signed-in empty directory", async () => {
    render(<ReferPublicPage />);
    expect(await screen.findByRole("heading", { name: "Ask an employee for a referral" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Be the first" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Publish your referrer profile" })).toHaveAttribute("href", "/profile?tab=referrals");
  });

  it("lets signed-in candidates open a company and choose a specific referrer", async () => {
    mockListOpenReferralCompanies.mockResolvedValue(loaded([
      { company: "Stripe", companySlug: "stripe", companyDomain: "stripe.com", companyLocation: "San Francisco, CA", companyWebsite: "https://stripe.com/", openCount: 2, referredCount: 5 },
      { company: "Acme", companySlug: "acme", companyDomain: "", companyLocation: "", companyWebsite: "", openCount: 1, referredCount: 0 },
    ]));
    render(<ReferPublicPage />);
    expect(await screen.findByRole("list", { name: "Companies with open referrers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stripe" })).toBeInTheDocument();
    expect(screen.getByText(/2 open referrers · 5 referred/)).toBeInTheDocument();
    expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument();
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
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

  it("opens a shared referrer link for unsigned visitors", async () => {
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
      bio: "Backend, intern",
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      referredCount: 12,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);
    expect(await screen.findByText("Parth Bhodia")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Someone shared a referral link with you" })).not.toBeInTheDocument();
    expect(mockFetchReferrerBySlug).toHaveBeenCalledWith("parth-bhodia-at-acme-abcdef");
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      referredCount: 12,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);
    expect(await screen.findByRole("button", { name: "Ask for a referral" })).toBeInTheDocument();
    expect(screen.getByText("Parth Bhodia")).toBeInTheDocument();
    expect(screen.getByLabelText("12 referred")).toBeInTheDocument();
    expect(screen.getByText(/Ask for a referral at Acme/)).toBeInTheDocument();
    expect(screen.getByText(/does not submit it for them/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toBeRequired();
    expect(screen.getByLabelText(/Email the referrer/)).toBeRequired();
    expect(screen.getByLabelText(/Role you want a referral for/)).toBeRequired();
    expect(screen.getByLabelText(/LinkedIn profile URL/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Résumé PDF/)).toBeInTheDocument();
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
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
    await userEvent.type(screen.getByLabelText(/Full name/), "Alex Kim");
    await userEvent.type(screen.getByLabelText(/Email the referrer/), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/Role you want a referral for/), "Backend Engineer");
    await userEvent.type(screen.getByLabelText(/LinkedIn profile URL/), "https://linkedin.com/in/alex");
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

  it("walls a free-plan candidate out of sending, and offers Pro", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    // Production omits `plan` on the metered free tier. That must still be Pro,
    // never a second sign-in prompt for someone who already has a session.
    mockPlanBody.value = { enforced: true, unlimited: false };
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);

    // The form still renders: the user sees what they would be asking for.
    const submit = await screen.findByRole("button", { name: "Ask for a referral" });
    expect(submit).toBeDisabled();
    expect(await screen.findByRole("button", { name: "See Pro" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByText(REFERRAL_ASK_BLOCKED_COPY.upgrade)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "See Pro" }));
    expect(mockOpenUpgrade).toHaveBeenCalledWith({ source: "referral-ask" });
    expect(mockCreateReferralRequest).not.toHaveBeenCalled();
  });

  it("still blocks a free candidate who submits by keyboard", async () => {
    // The disabled button is an affordance, not the gate.
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockPlanBody.value = { enforced: true, unlimited: false, plan: null };
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    const form = document.querySelector("form")!;
    await userEvent.type(screen.getByLabelText(/Full name/), "Alex Kim");
    await userEvent.type(screen.getByLabelText(/Email the referrer/), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/Role you want a referral for/), "Backend Engineer");
    await userEvent.type(screen.getByLabelText(/LinkedIn profile URL/), "https://linkedin.com/in/alex");
    await userEvent.click(document.activeElement ?? form);
    form.requestSubmit();
    await waitFor(() => expect(mockCreateReferralRequest).not.toHaveBeenCalled());
  });

  it("lets a university seat ask without hitting the wall", async () => {
    // An institution seat reports unlimited, not plan: "pro".
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockPlanBody.value = { enforced: false, unlimited: true, plan: "institution" };
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);
    expect(await screen.findByRole("button", { name: "Ask for a referral" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "See Pro" })).not.toBeInTheDocument();
  });

  it("lets metered Pro ask (plan pro, not unlimited)", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockPlanBody.value = {
      enforced: true,
      unlimited: false,
      plan: "pro",
      limit: 30,
      used: 4,
      remaining: 26,
    };
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
    expect(await screen.findByRole("button", { name: "Ask for a referral" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "See Pro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("offers Pro, not sign-in, when the plan status call fails for a signed-in user", async () => {
    // A 500 used to collapse into plan:null → sign_in. Signed-in must stay on
    // the upgrade wall so we never ask them to authenticate again.
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockPlanBody.ok = false;
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
    expect(await screen.findByRole("button", { name: "See Pro" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByText(REFERRAL_ASK_BLOCKED_COPY.upgrade)).toBeInTheDocument();
  });

  it("loads a named referrer while unsigned and still blocks the send", async () => {
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      referredCount: 0,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);
    // The row itself is public now: the slug is looked up without a session.
    expect(await screen.findByText("Parth Bhodia")).toBeInTheDocument();
    expect(mockFetchReferrerBySlug).toHaveBeenCalledWith("parth-bhodia-at-acme-abcdef");
    expect(screen.getByLabelText(/Email the referrer/)).toBeInTheDocument();
    // Nothing is written until the visitor authenticates.
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    };
    mockFetchReferrerBySlug.mockResolvedValue(loaded(openReferrer));
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    mockFetchReferrerBySlug.mockResolvedValue(loaded(null));
    await userEvent.type(screen.getByLabelText(/Full name/), "Alex Kim");
    await userEvent.type(screen.getByLabelText(/Email the referrer/), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/Role you want a referral for/), "Backend Engineer");
    await userEvent.type(screen.getByLabelText(/LinkedIn profile URL/), "https://linkedin.com/in/alex");
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
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    }));
    // Mount resolves the session more than once (the page body gate, then the
    // plan check). Counting calls would make this test break whenever the hook
    // order changes, so let everything succeed until the form is on screen and
    // only then start rejecting.
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "candidate" } } } });
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    await userEvent.type(screen.getByLabelText(/Full name/), "Alex Kim");
    await userEvent.type(screen.getByLabelText(/Email the referrer/), "alex@example.com");
    await userEvent.type(screen.getByLabelText(/Role you want a referral for/), "Backend Engineer");
    await userEvent.type(screen.getByLabelText(/LinkedIn profile URL/), "https://linkedin.com/in/alex");
    mockGetSession.mockRejectedValue(new Error("offline"));
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(REFERRER_SESSION_FAILED);
    expect(mockOpenSignIn).not.toHaveBeenCalled();
    expect(mockOpenUpgrade).not.toHaveBeenCalled();
    expect(mockCreateReferralRequest).not.toHaveBeenCalled();
  });
});
