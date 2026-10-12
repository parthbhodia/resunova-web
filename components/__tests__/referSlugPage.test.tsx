import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ReferPublicPage from "@/components/refer/ReferPublicPage";
import type { CompanyReferrer } from "@/lib/companyReferrers";

/**
 * The single-employee ask page, after the redesign.
 *
 * What it looked like before: an eyebrow reading "EMPLOYEE REFERRAL", an
 * identity card whose third line was "Ask for a referral at {company}", and
 * then five identical grey boxes with placeholder-only labels. Nothing on the
 * page said who would read the request or what happened after sending it, on a
 * page whose whole job is to get a stranger to write three paragraphs about
 * themselves.
 */

const { mockFetchReferrerBySlug } = vi.hoisted(() => ({
  mockFetchReferrerBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("s=priya-at-stripe-abc123"),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/BrandLogo", () => ({ LogoFull: () => <span>Resunova</span> }));
vi.mock("@/components/SignInDialog", () => ({ useSignInDialog: () => ({ openSignIn: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }),
}));
vi.mock("@/lib/companyReferrers", async (orig) => ({
  ...(await orig<typeof import("@/lib/companyReferrers")>()),
  fetchReferrerBySlug: mockFetchReferrerBySlug,
  searchOpenReferrers: vi.fn().mockResolvedValue([]),
  createReferralRequest: vi.fn(),
}));

const REFERRER: CompanyReferrer = {
  id: "r1",
  userId: "u1",
  displayName: "Priya R.",
  title: "Staff Engineer, Payments Platform",
  company: "Stripe",
  companySlug: "stripe",
  linkedin: null,
  bio: "Backend, infra and platform roles.",
  slug: "priya-at-stripe-abc123",
  openToRefer: true,
  referredCount: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as CompanyReferrer;

beforeEach(() => {
  cleanup();
  mockFetchReferrerBySlug.mockResolvedValue(REFERRER);
});

describe("the ask page names the person and the destination", () => {
  it("leads with who can refer, not with 'employee referral'", async () => {
    render(<ReferPublicPage />);
    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Priya R. can refer at Stripe.");
    expect(screen.getByText("Referral · Stripe")).toBeInTheDocument();
  });

  /**
   * ⚠️ The unspoken question on this page is whether this is an application or
   * a favour. It is a favour, and the answer appears twice on purpose — as the
   * lede and as step 2 — because it is what makes the form worth filling in.
   */
  it("says the employee decides", async () => {
    render(<ReferPublicPage />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText(/They decide whether to submit you/)).toBeInTheDocument();
    expect(screen.getByText(/or decline — both are honest answers/)).toBeInTheDocument();
  });

  it("names the recipient on the button, so it is clear where it goes", async () => {
    render(<ReferPublicPage />);
    expect(await screen.findByRole("button", { name: "Send to Priya R." })).toBeInTheDocument();
  });
});

describe("edge cases that a real row can produce", () => {
  /**
   * ⚠️ `title` is `text not null default ''` in migration 044. The signup path
   * refuses an empty one, but a row seeded any other way rendered
   * ". They signed up to refer candidates…" — a leading orphan period.
   */
  it("joins identity without an orphan period when title is empty", async () => {
    mockFetchReferrerBySlug.mockResolvedValue({ ...REFERRER, title: "", bio: "Infra roles." });
    render(<ReferPublicPage />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText("Infra roles.")).toBeInTheDocument();
    expect(screen.queryByText(/^\. /)).toBeNull();
  });

  it("falls back to a true sentence when there is no bio", async () => {
    mockFetchReferrerBySlug.mockResolvedValue({ ...REFERRER, bio: null });
    render(<ReferPublicPage />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText(/Staff Engineer, Payments Platform\. They signed up to refer/)).toBeInTheDocument();
  });

  /** displayName is capped at 80 chars, which overflows the button. */
  it("clips a long name on the button without changing what is sent", async () => {
    const long = "Bartholomew Fitzwilliam-Harrington the Third";
    mockFetchReferrerBySlug.mockResolvedValue({ ...REFERRER, displayName: long });
    render(<ReferPublicPage />);
    const btn = await screen.findByRole("button", { name: /^Send to / });
    expect((btn.textContent ?? "").length).toBeLessThan(40);
    // The full name still appears where there is room for it.
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(long);
  });

  /** A paused desk must not render the form at all. */
  it("says the link is inactive rather than showing a dead form", async () => {
    mockFetchReferrerBySlug.mockResolvedValue(null);
    render(<ReferPublicPage />);
    expect(await screen.findByText(/This referral link is not active/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Send to / })).toBeNull();
  });
});

describe("the form is checkable before you send it", () => {
  /**
   * ⚠️ Placeholder-as-label disappears the moment you type, so a visitor could
   * not re-read their own form. `aria-label` covered screen readers and left
   * sighted users with five identical grey boxes.
   */
  it.each([
    "Your name",
    "Your email",
    "Role you want",
    "LinkedIn or résumé link",
    "Why this role, in three lines",
  ])("labels %s visibly", async (label) => {
    render(<ReferPublicPage />);
    await screen.findByRole("heading", { level: 1 });
    // A real <label> element, not just an aria-label attribute.
    const field = screen.getByLabelText(label);
    expect(field).toBeInTheDocument();
    expect(screen.getByText(label).tagName).not.toBe("INPUT");
  });

  it("tells the candidate what the employee actually reads", async () => {
    render(<ReferPublicPage />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText(/what they will actually open/)).toBeInTheDocument();
    expect(screen.getByText(/read this before anything else/)).toBeInTheDocument();
  });
});

describe("what happens after sending is stated", () => {
  it("walks the three steps the code really takes", async () => {
    render(<ReferPublicPage />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText("You send it")).toBeInTheDocument();
    expect(screen.getByText("They review")).toBeInTheDocument();
    expect(screen.getByText("Referred")).toBeInTheDocument();
    expect(screen.getByText(/Nobody else at Stripe sees it/)).toBeInTheDocument();
  });

  /** The claim that bounds what the product does. */
  it("keeps the ATS limit, and names the company in it", async () => {
    render(<ReferPublicPage />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText(/never writes into Stripe.s applicant system/)).toBeInTheDocument();
  });
});
