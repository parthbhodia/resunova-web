import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockFetchMyReferrerProfile,
  mockFetchMyReferralRequests,
  mockUpsertMyReferrerProfile,
  mockCreateReferralRequest,
} = vi.hoisted(() => ({
  mockFetchMyReferrerProfile: vi.fn(),
  mockFetchMyReferralRequests: vi.fn(),
  mockUpsertMyReferrerProfile: vi.fn(),
  mockCreateReferralRequest: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/companyReferrers", async (orig) => ({
  ...(await orig<typeof import("@/lib/companyReferrers")>()),
  fetchMyReferrerProfile: mockFetchMyReferrerProfile,
  fetchMyReferralRequests: mockFetchMyReferralRequests,
  upsertMyReferrerProfile: mockUpsertMyReferrerProfile,
  createReferralRequest: mockCreateReferralRequest,
  updateReferralRequestStatus: vi.fn(),
  deleteReferralRequest: vi.fn().mockResolvedValue(true),
}));

import { CompanyReferrerPanel } from "@/components/profile/CompanyReferrerPanel";

beforeEach(() => {
  mockFetchMyReferrerProfile.mockResolvedValue(null);
  mockFetchMyReferralRequests.mockResolvedValue([]);
  mockUpsertMyReferrerProfile.mockResolvedValue(null);
  mockCreateReferralRequest.mockResolvedValue({ request: null, error: "Could not log this referral. Add the candidate name and role." });
});

describe("CompanyReferrerPanel", () => {
  it("shows signup when the user has no referrer profile", async () => {
    render(<CompanyReferrerPanel displayName="Parth Bhodia" title="Software Engineer" linkedin="" />);
    expect(await screen.findByRole("button", { name: "Sign up as a referrer" })).toBeInTheDocument();
    expect(screen.getByText(/Not signed up as a referrer yet/)).toBeInTheDocument();
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
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    });
    mockFetchMyReferralRequests.mockResolvedValue([
      {
        id: "q1",
        referrerId: "r1",
        candidateName: "Alex Kim",
        candidateEmail: "alex@example.com",
        candidateLinkedin: null,
        role: "Backend Engineer",
        notes: "Applied last week.",
        source: "request",
        status: "requested",
        createdAt: new Date().toISOString(),
      },
    ]);
    render(<CompanyReferrerPanel displayName="Parth Bhodia" title="Software Engineer" linkedin="" />);
    expect(await screen.findByText("Incoming requests")).toBeInTheDocument();
    expect(screen.getByText("Alex Kim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause requests" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save referrer profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
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
      openToRefer: true,
      createdAt: "",
      updatedAt: "",
    });
    render(<CompanyReferrerPanel displayName="Parth Bhodia" title="Software Engineer" linkedin="" />);
    await screen.findByRole("button", { name: "Sign up as a referrer" });
    await userEvent.type(screen.getByLabelText("Company you work at"), "Acme");
    await userEvent.click(screen.getByRole("button", { name: "Sign up as a referrer" }));
    expect(mockUpsertMyReferrerProfile).toHaveBeenCalled();
    expect(await screen.findByText("Your referral link")).toBeInTheDocument();
  });
});
