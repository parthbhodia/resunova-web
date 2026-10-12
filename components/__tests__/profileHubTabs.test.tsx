import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EMPTY_PROFILE } from "@/lib/profileStorage";
import { INITIAL_EXTRACTED_PROFILE } from "@/lib/resumeExtractorService";

const {
  mockFetchReferralContacts,
  mockCreateReferralContact,
  mockFetchJobFilters,
  mockGetUser,
  mockSignInWithGoogle,
  mockApiFetch,
} = vi.hoisted(() => ({
  mockFetchReferralContacts: vi.fn(),
  mockCreateReferralContact: vi.fn(),
  mockFetchJobFilters: vi.fn(),
  mockGetUser: vi.fn(),
  mockSignInWithGoogle: vi.fn(),
  mockApiFetch: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/accountSettingsCards", () => ({
  EmailPreferencesCard: () => <div>Email preferences</div>,
  TailoringModeCard: () => <div>Resume tailoring</div>,
}));
vi.mock("@/lib/referralContacts", async (orig) => ({
  ...(await orig<typeof import("@/lib/referralContacts")>()),
  fetchReferralContacts: mockFetchReferralContacts,
  createReferralContact: mockCreateReferralContact,
  updateReferralContactStatus: vi.fn(),
  deleteReferralContact: vi.fn(),
}));
vi.mock("@/lib/jobFiltersApi", () => ({
  fetchJobFilters: mockFetchJobFilters,
}));
vi.mock("@/lib/apiClient", () => ({
  apiFetch: mockApiFetch,
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
  mockFetchReferralContacts.mockResolvedValue([]);
  mockCreateReferralContact.mockResolvedValue(null);
  mockFetchJobFilters.mockResolvedValue([]);
  mockGetUser.mockResolvedValue({ data: { user: { email: "parth@example.com", identities: [] } } });
  mockSignInWithGoogle.mockResolvedValue(null);
  mockApiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ applications: [] }),
  });
});

describe("ReferralsPanel", () => {
  it("shows live outreach contacts instead of a coming-soon placeholder", async () => {
    mockFetchReferralContacts.mockResolvedValue([
      {
        id: "c1",
        company: "Acme",
        contactName: "Priya Shah",
        contactTitle: "Staff engineer",
        contactUrl: null,
        relationship: "alumni",
        status: "contacted",
        notes: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    ]);
    render(<ReferralsPanel targetRoles="Software Engineer" />);
    expect(await screen.findByText("Priya Shah")).toBeInTheDocument();
    expect(screen.getByText(/Staff engineer · Acme/)).toBeInTheDocument();
    expect(screen.queryByText(/not live yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Jobs" })).toHaveAttribute("href", "/?view=jobs");
  });

  it("adds a contact through the real tracker", async () => {
    mockCreateReferralContact.mockResolvedValue({
      id: "c2",
      company: "Nimbus",
      contactName: "Alex Kim",
      contactTitle: null,
      contactUrl: null,
      relationship: "other",
      status: "to_contact",
      notes: null,
      createdAt: "",
      updatedAt: "",
    });
    render(<ReferralsPanel targetRoles="" />);
    await screen.findByText(/No referral contacts yet/i);
    await userEvent.type(screen.getByLabelText("Contact name"), "Alex Kim");
    await userEvent.type(screen.getByLabelText("Company"), "Nimbus");
    await userEvent.click(screen.getByRole("button", { name: "Add contact" }));
    expect(mockCreateReferralContact).toHaveBeenCalledWith({
      contactName: "Alex Kim",
      company: "Nimbus",
      contactTitle: "",
    });
    expect(await screen.findByText("Alex Kim")).toBeInTheDocument();
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
        onEditProfile={vi.fn()}
      />,
    );
    expect(await screen.findByText(/Connected as parth@example.com/)).toBeInTheDocument();
    expect(screen.getByText("linkedin.com/in/parth")).toBeInTheDocument();
    expect(screen.getByText("Resume tailoring")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
  });
});
