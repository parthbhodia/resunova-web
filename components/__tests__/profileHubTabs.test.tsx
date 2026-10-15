import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EMPTY_PROFILE } from "@/lib/profileStorage";
import { INITIAL_EXTRACTED_PROFILE } from "@/lib/resumeExtractorService";

const {
  mockFetchJobFilters,
  mockGetUser,
  mockSignInWithGoogle,
} = vi.hoisted(() => ({
  mockFetchJobFilters: vi.fn(),
  mockGetUser: vi.fn(),
  mockSignInWithGoogle: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/accountSettingsCards", () => ({
  EmailPreferencesCard: () => <div>Email preferences</div>,
  TailoringModeCard: () => <div>Resume tailoring</div>,
}));
vi.mock("@/lib/companyReferrers", async (orig) => ({
  ...(await orig<typeof import("@/lib/companyReferrers")>()),
  fetchMyReferrerProfile: vi.fn().mockResolvedValue(null),
  fetchMyReferralRequests: vi.fn().mockResolvedValue([]),
  upsertMyReferrerProfile: vi.fn(),
  createReferralRequest: vi.fn(),
  updateReferralRequestStatus: vi.fn(),
  fetchMySentReferralRequests: () => Promise.resolve([]),
  nudgeReferralRequest: vi.fn(),
}));
vi.mock("@/lib/jobFiltersApi", () => ({
  fetchJobFilters: mockFetchJobFilters,
}));
vi.mock("@/lib/anonScan", () => ({
  signInWithGoogle: mockSignInWithGoogle,
}));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { getUser: mockGetUser, getSession: vi.fn() },
  }),
}));

import { IntegrationsPanel, JobAlertsPanel, ReferralsPanel } from "@/components/profile/ProfileHubPanels";

beforeEach(() => {
  mockFetchJobFilters.mockResolvedValue([]);
  mockGetUser.mockResolvedValue({ data: { user: { email: "parth@example.com", identities: [] } } });
  mockSignInWithGoogle.mockResolvedValue(null);
});

describe("ReferralsPanel", () => {
  it("shows the referrer desk instead of the outreach tracker", async () => {
    render(<ReferralsPanel displayName="Parth Bhodia" title="Engineer" linkedin="" />);
    expect(await screen.findByText("Not signed up as a referrer yet")).toBeInTheDocument();
    expect(screen.getByLabelText("Company you work at")).toBeInTheDocument();
    expect(screen.queryByText(/Track the people you are asking/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Outreach list/i)).not.toBeInTheDocument();
  });
});

describe("JobAlertsPanel", () => {
  it("renders saved Jobs filters, match preferences, and email prefs", async () => {
    mockFetchJobFilters.mockResolvedValue([
      {
        id: "f1",
        name: "NYC backend",
        filters: { search: "backend", locationText: "New York", workModels: ["remote"], seniorities: ["senior"], empType: "any" },
        createdAt: "",
        updatedAt: "",
      },
    ]);
    const onEditTargets = vi.fn();
    render(
      <JobAlertsPanel
        roles="Backend Engineer"
        locations="New York"
        onEditTargets={onEditTargets}
      />,
    );
    expect(await screen.findByText("NYC backend")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("Email preferences")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit target roles" }));
    expect(onEditTargets).toHaveBeenCalledTimes(1);
  });
});

describe("IntegrationsPanel", () => {
  it("shows Google as connected when the auth identity is present", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "parth@example.com", identities: [{ provider: "google" }] } },
    });
    render(
      <IntegrationsPanel
        extracted={{
          ...INITIAL_EXTRACTED_PROFILE,
          name: "Parth",
          linkedin: "linkedin.com/in/parth",
          github: "github.com/parth",
        }}
        tailorDefaults={EMPTY_PROFILE}
        accountEmail="parth@example.com"
        onChangeLinks={vi.fn()}
        onOpenCareerProfile={vi.fn()}
      />,
    );
    expect(await screen.findByText(/Connected as parth@example.com/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("linkedin.com/in/parth")).toBeInTheDocument();
    expect(screen.getByDisplayValue("github.com/parth")).toBeInTheDocument();
    expect(screen.getByText("Resume tailoring")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
  });

  it("edits profile links in place instead of navigating away", async () => {
    const onChangeLinks = vi.fn();
    const onOpenCareerProfile = vi.fn();
    render(
      <IntegrationsPanel
        extracted={{
          ...INITIAL_EXTRACTED_PROFILE,
          linkedin: "linkedin.com/in/parth",
          github: "",
          portfolio: "",
        }}
        tailorDefaults={EMPTY_PROFILE}
        accountEmail="parth@example.com"
        onChangeLinks={onChangeLinks}
        onOpenCareerProfile={onOpenCareerProfile}
      />,
    );
    expect(screen.queryByRole("button", { name: /^(Edit|Add)$/ })).not.toBeInTheDocument();
    const linkedin = await screen.findByLabelText("LinkedIn URL");
    fireEvent.change(linkedin, { target: { value: "https://linkedin.com/in/new" } });
    expect(onChangeLinks).toHaveBeenCalledWith({
      linkedin: "https://linkedin.com/in/new",
      github: "",
      portfolio: "",
    });
    expect(onOpenCareerProfile).not.toHaveBeenCalled();
  });
});
