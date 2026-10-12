import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  usePathname: () => "/refer",
  useSearchParams: () => new URLSearchParams(search.slug ? { s: search.slug } : undefined),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
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
import {
  REFERRER_LINK_INACTIVE,
  REFERRER_LOOKUP_FAILED,
  REFERRER_SEARCH_FAILED,
  REFERRER_SESSION_FAILED,
} from "@/lib/companyReferrers";

function loaded<T>(data: T) {
  return { ok: true as const, data };
}

beforeEach(() => {
  search.slug = "";
  mockFetchReferrerBySlug.mockResolvedValue(loaded(null));
  mockSearchOpenReferrers.mockResolvedValue(loaded([]));
  mockCreateReferralRequest.mockResolvedValue({ request: null, error: "Could not send this request. Add your name, a valid email, and the role you want." });
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: "candidate" } } } });
  mockOpenSignIn.mockReset();
});

describe("ReferPublicPage", () => {
  it("shows company search when no slug is present", async () => {
    render(<ReferPublicPage />);
    expect(await screen.findByRole("heading", { name: "Ask an employee for a referral" })).toBeInTheDocument();
    expect(screen.getByLabelText("Company name")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resunova home" })).toBeInTheDocument();
    const referrals = screen.getAllByRole("link", { name: "Referrals" });
    expect(referrals.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument();
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

  it("asks the candidate to sign in before sending", async () => {
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
    await screen.findByRole("button", { name: "Ask for a referral" });
    await userEvent.type(screen.getByLabelText("Your name"), "Alex Kim");
    await userEvent.type(screen.getByLabelText("Your email"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Role you want"), "Backend Engineer");
    await userEvent.click(screen.getByRole("button", { name: "Ask for a referral" }));
    // ⚠️ Not just "was called": the sign-in copy lives in ONE keyed producer
    // (components/auth/signInAsk.ts) and the old `{ title, reason }` options
    // are deleted, so a bare toHaveBeenCalled() would pass against the API
    // that no longer exists. Pin the key, and pin that no copy rides along.
    expect(mockOpenSignIn).toHaveBeenCalledWith({ ask: "referral_ask" });
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

  /**
   * ⚠️ THE FIXTURES ABOVE ALL CARRY A TITLE, AND THAT IS WHY THIS IS SEPARATE.
   * `company_referrers.title` is `text not null default ''` (migration 044), so
   * a row seeded outside the signup path has none. Every template that
   * interpolated it rendered an orphan leading period — a defect that survived
   * a full rewrite of this feature, because each template re-derived the join.
   *
   * ⚠️ AND THE HELPER'S OWN UNIT TESTS CANNOT SEE THIS. Reverting the call site
   * to the naive template left `joinReferrerSentences`' tests green and these
   * component tests green, because no fixture exercised an empty title. This
   * renders the real row shape so the CALL SITE is pinned, not just the rule.
   */
  it("renders an untitled referrer without an orphan leading period", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue(loaded({
      id: "r1",
      userId: "u1",
      displayName: "Parth Bhodia",
      company: "Acme",
      companySlug: "acme",
      title: "",
      linkedin: null,
      slug: "parth-bhodia-at-acme-abcdef",
      bio: "Backend, intern",
      openToRefer: true,
      referredCount: 0,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    expect(screen.getByText("Backend, intern")).toBeInTheDocument();
    expect(screen.queryByText(". Backend, intern")).not.toBeInTheDocument();
  });

  it("falls back to a whole sentence when an untitled referrer has no bio", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue(loaded({
      id: "r1",
      userId: "u1",
      displayName: "Parth Bhodia",
      company: "Acme",
      companySlug: "acme",
      title: "",
      linkedin: null,
      slug: "parth-bhodia-at-acme-abcdef",
      bio: null,
      openToRefer: true,
      referredCount: 0,
      createdAt: "",
      updatedAt: "",
    }));
    render(<ReferPublicPage />);
    await screen.findByRole("button", { name: "Ask for a referral" });
    expect(
      screen.getByText("They signed up to refer candidates at this company."),
    ).toBeInTheDocument();
  });

  /** The finder row has the mirror defect: no title leaves "at Acme" dangling. */
  it("lists an untitled referrer without a dangling 'at'", async () => {
    mockSearchOpenReferrers.mockResolvedValue(loaded([{
      id: "r1",
      userId: "u1",
      displayName: "Parth Bhodia",
      company: "Acme",
      companySlug: "acme",
      title: "",
      linkedin: null,
      slug: "parth-bhodia-at-acme-abcdef",
      bio: null,
      openToRefer: true,
      referredCount: 0,
      createdAt: "",
      updatedAt: "",
    }]));
    render(<ReferPublicPage />);
    await userEvent.type(screen.getByLabelText("Company name"), "Acme");
    expect(await screen.findByText("Acme")).toBeInTheDocument();
    expect(screen.queryByText(/^\s*at Acme/)).not.toBeInTheDocument();
  });

  it("says when a referral link fails to load", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockFetchReferrerBySlug.mockResolvedValue({ ok: false, error: REFERRER_LOOKUP_FAILED });
    render(<ReferPublicPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(REFERRER_LOOKUP_FAILED);
  });

  it("says when referrer search fails", async () => {
    mockSearchOpenReferrers.mockResolvedValue({ ok: false, error: REFERRER_SEARCH_FAILED });
    render(<ReferPublicPage />);
    await userEvent.type(screen.getByLabelText("Company name"), "Ac");
    expect(await screen.findByRole("alert")).toHaveTextContent(REFERRER_SEARCH_FAILED);
  });

  it("reports a session check failure instead of opening sign in", async () => {
    search.slug = "parth-bhodia-at-acme-abcdef";
    mockGetSession.mockRejectedValue(new Error("offline"));
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
