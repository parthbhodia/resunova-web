import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockFetchMyReferrerProfile,
  mockFetchMyReferralRequests,
  mockUpsertMyReferrerProfile,
  mockCreateReferralRequest,
  mockFetchMySentReferralRequests,
} = vi.hoisted(() => ({
  mockFetchMyReferrerProfile: vi.fn(),
  mockFetchMyReferralRequests: vi.fn(),
  mockUpsertMyReferrerProfile: vi.fn(),
  mockCreateReferralRequest: vi.fn(),
  mockFetchMySentReferralRequests: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/productNotices", () => ({
  setReferralInboxOpen: vi.fn(),
  persistLastSeenReferral: vi.fn().mockResolvedValue(undefined),
  persistLastSeenSentReferral: vi.fn().mockResolvedValue(undefined),
  onReferralInboxRefresh: () => () => {},
  onSentReferralRefresh: () => () => {},
  markRewardIdsSeen: vi.fn(),
  rewardNotificationId: (entry: { id: string; kind: string; status: string }) =>
    `${entry.id}:${entry.kind}:${entry.status}`,
}));

vi.mock("@/lib/companyReferrers", async (orig) => ({
  ...(await orig<typeof import("@/lib/companyReferrers")>()),
  fetchMyReferrerProfile: mockFetchMyReferrerProfile,
  fetchMyReferralRequests: mockFetchMyReferralRequests,
  upsertMyReferrerProfile: mockUpsertMyReferrerProfile,
  createReferralRequest: mockCreateReferralRequest,
  updateReferralRequestStatus: vi.fn(),
  deleteReferralRequest: vi.fn().mockResolvedValue(true),
  fetchMySentReferralRequests: mockFetchMySentReferralRequests,
  nudgeReferralRequest: vi.fn(),
}));

import { CompanyReferrerPanel } from "@/components/profile/CompanyReferrerPanel";
import { REFERRER_PROFILE_REQUIRED } from "@/lib/companyReferrers";

beforeEach(() => {
  mockFetchMyReferrerProfile.mockResolvedValue(null);
  mockFetchMyReferralRequests.mockResolvedValue([]);
  mockUpsertMyReferrerProfile.mockResolvedValue(null);
  mockCreateReferralRequest.mockResolvedValue({ request: null, error: "Could not log this referral. Add the candidate name and role." });
  mockFetchMySentReferralRequests.mockResolvedValue([]);
});

describe("CompanyReferrerPanel", () => {
  it("shows signup when the user has no referrer profile", async () => {
    render(<CompanyReferrerPanel displayName="Parth Bhodia" title="Software Engineer" linkedin="" />);
    expect(await screen.findByRole("button", { name: "Sign up as a referrer" })).toBeInTheDocument();
    expect(screen.getByText(/Not signed up as a referrer yet/)).toBeInTheDocument();
    expect(screen.getByText("Your requests")).toBeInTheDocument();
  });

  it("shows the live inbox and copy link after signup exists", async () => {
    mockFetchMyReferrerProfile.mockResolvedValue({
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
      referredCount: 3,
      createdAt: "",
      updatedAt: "",
    });
    mockFetchMyReferralRequests.mockResolvedValue([
      {
        id: "q1",
        referrerId: "r1",
        candidateName: "Alex Kim",
        candidateEmail: "alex@example.com",
        candidateUserId: null,
        candidateLinkedin: null,
        resumePdfPath: null,
        candidatePhone: null,
        candidateYearsExperience: null,
        candidateHeadline: null,
        role: "Backend Engineer",
        notes: "Applied last week.",
        source: "request",
        status: "requested",
        createdAt: new Date().toISOString(),
      },
    ]);
    render(<CompanyReferrerPanel displayName="Parth Bhodia" title="Software Engineer" linkedin="" />);
    expect(await screen.findByText("Incoming requests")).toBeInTheDocument();
    expect(screen.getByLabelText("3 referred")).toBeInTheDocument();
    expect(screen.getByText("Alex Kim")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View profile" })).toHaveAttribute("href", "/refer/candidate/?r=q1");
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause requests" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save referrer profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Confirm remove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("saves a new referrer profile", async () => {
    mockUpsertMyReferrerProfile.mockResolvedValue({
      id: "r1",
      userId: "u1",
      displayName: "Parth Bhodia",
      company: "Acme",
      companySlug: "acme",
      title: "Software Engineer",
      linkedin: "",
      slug: "parth-bhodia-at-acme-abcdef",
      bio: "Backend",
      companyLocation: "San Francisco, CA",
      companyWebsite: "https://example.com",
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    });
    render(<CompanyReferrerPanel displayName="Parth Bhodia" title="Software Engineer" linkedin="" />);
    await screen.findByRole("button", { name: "Sign up as a referrer" });
    await userEvent.type(screen.getByLabelText("Company name"), "Acme");
    await userEvent.type(screen.getByLabelText("Company website"), "https://acme.com");
    await userEvent.type(screen.getByLabelText("Company location"), "Austin, TX");
    await userEvent.click(screen.getByRole("button", { name: "Sign up as a referrer" }));
    expect(mockUpsertMyReferrerProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        company: "Acme",
        companyWebsite: "https://acme.com",
        companyLocation: "Austin, TX",
      }),
    );
    expect(await screen.findByText("You're signed up to refer")).toBeInTheDocument();
    expect(await screen.findByText("Your referral link")).toBeInTheDocument();
  });

  it("refuses signup without a company website or location", async () => {
    render(<CompanyReferrerPanel displayName="Parth Bhodia" title="Software Engineer" linkedin="" />);
    await screen.findByRole("button", { name: "Sign up as a referrer" });
    await userEvent.type(screen.getByLabelText("Company name"), "Acme");
    await userEvent.click(screen.getByRole("button", { name: "Sign up as a referrer" }));
    expect(mockUpsertMyReferrerProfile).not.toHaveBeenCalled();
    expect(
      (await screen.findAllByText(REFERRER_PROFILE_REQUIRED)).length,
    ).toBeGreaterThan(0);
  });
});
