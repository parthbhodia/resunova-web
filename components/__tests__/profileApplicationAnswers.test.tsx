import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EMPTY_PROFILE, type ProfileFormState } from "@/lib/profileStorage";

/**
 * The seam that matters: the card on the live /profile page. The component has
 * its own tests; these drive the page, because the bugs this feature closes were
 * all in how it is reached and saved, not in the chips.
 *
 *  - an account with NO uploaded résumé (the one that reported this) must still
 *    see the card, since the Career profile ledger only renders after an upload;
 *  - choosing an answer must reach `user_profiles` without dropping other fields;
 *  - nothing may be written just by opening the page.
 */

const h = vi.hoisted(() => ({
  qs: { current: "tab=career-profile" },
  fetchUserProfile: vi.fn(),
  upsertUserProfile: vi.fn(),
  fetchExtractedProfile: vi.fn(),
  upsertExtractedProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(h.qs.current),
}));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getUser: () => Promise.resolve({ data: { user: { email: "ada@example.com" } } }) } }),
  fetchUserProfile: h.fetchUserProfile,
  upsertUserProfile: h.upsertUserProfile,
  fetchExtractedProfile: h.fetchExtractedProfile,
  upsertExtractedProfile: h.upsertExtractedProfile,
}));
vi.mock("@/components/ScanUsageWidget", () => ({ ScanUsageWidget: () => <div>usage</div> }));
vi.mock("@/components/PlanBillingCard", () => ({ default: () => <div>billing</div> }));
vi.mock("@/components/profile/ProfileHubPanels", () => ({
  IntegrationsPanel: () => <div>integrations</div>,
  JobAlertsPanel: () => <div>alerts</div>,
  ReferralsPanel: () => <div>referrals</div>,
}));
vi.mock("@/lib/productNotices", () => ({
  subscribeReferralAlerts: () => () => {},
}));
vi.mock("@/lib/authSignOut", () => ({ signOutAndReturnHome: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

import ProfilePage from "@/components/profile/ProfilePage";

const saved = (over: Partial<ProfileFormState> = {}): ProfileFormState => ({
  ...EMPTY_PROFILE,
  roles: "Data Analyst",
  tone: "formal",
  ...over,
});

const workAuth = () => screen.getByRole("radiogroup", { name: /authorized to work/i });
const sponsorship = () => screen.getByRole("radiogroup", { name: /require visa sponsorship/i });

let scrollSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  h.qs.current = "tab=career-profile";
  h.fetchExtractedProfile.mockResolvedValue(null); // no résumé uploaded
  h.fetchUserProfile.mockResolvedValue(saved({ eeoWorkUs: "Yes" }));
  h.upsertUserProfile.mockResolvedValue(undefined);
  h.upsertExtractedProfile.mockResolvedValue(undefined);
  localStorage.clear();
  scrollSpy = vi.fn();
  Element.prototype.scrollIntoView = scrollSpy as unknown as typeof Element.prototype.scrollIntoView;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("an account with no résumé", () => {
  it("still gets the card, and the upload prompt is what the ledger shows", async () => {
    render(<ProfilePage />);
    // The ledger is gated on an uploaded résumé; the card must not be.
    expect(await screen.findByText("Application answers")).toBeInTheDocument();
    // Positive control: the page did render its Career profile card, with no ledger in it.
    expect(screen.getByText("Your career profile")).toBeInTheDocument();
    expect(screen.queryByText("Application defaults")).not.toBeInTheDocument();
  });

  it("shows the answers already saved once the profile has loaded", async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(within(workAuth()).getByRole("radio", { name: "Yes" })).toBeChecked());
    expect(within(sponsorship()).getByRole("radio", { name: "Yes" })).not.toBeChecked();
  });
});

describe("saving", () => {
  it("writes a chosen answer to user_profiles and keeps the rest of the record", async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(within(workAuth()).getByRole("radio", { name: "Yes" })).toBeChecked());

    await userEvent.click(within(sponsorship()).getByRole("radio", { name: "No" }));
    const card = document.getElementById("application-answers")!;
    expect(within(card).getByRole("status")).toHaveTextContent("Unsaved changes");

    // The page autosaves on a 1.5s debounce.
    await waitFor(() => expect(h.upsertUserProfile).toHaveBeenCalled(), { timeout: 5000 });
    const written = h.upsertUserProfile.mock.calls.at(-1)?.[0] as ProfileFormState;
    expect(written.eeoSponsor).toBe("No");
    expect(written.eeoWorkUs).toBe("Yes");
    expect(written.roles).toBe("Data Analyst");
    expect(written.tone).toBe("formal");
    await waitFor(() => expect(within(card).getByRole("status")).toHaveTextContent("Saved automatically"));
  }, 10000);

  it("writes nothing just because the page was opened", async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(within(workAuth()).getByRole("radio", { name: "Yes" })).toBeChecked());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2000));
    });
    expect(h.upsertUserProfile).not.toHaveBeenCalled();
  }, 10000);
});

describe("before the saved profile arrives", () => {
  it("cannot be edited, so the load cannot overwrite an edit or an edit the load", async () => {
    let release: (p: ProfileFormState) => void = () => {};
    h.fetchUserProfile.mockReturnValue(new Promise<ProfileFormState>((res) => { release = res; }));

    render(<ProfilePage />);
    await screen.findByText("Application answers");
    for (const r of within(workAuth()).getAllByRole("radio")) expect(r).toBeDisabled();

    await act(async () => {
      release(saved({ eeoWorkUs: "No" }));
    });
    await waitFor(() => expect(within(workAuth()).getByRole("radio", { name: "No" })).toBeChecked());
    for (const r of within(workAuth()).getAllByRole("radio")) expect(r).toBeEnabled();
  });
});

describe("where it is reachable", () => {
  it("is not on the other tabs", async () => {
    h.qs.current = "tab=usage";
    render(<ProfilePage />);
    await screen.findByText("usage");
    expect(screen.queryByText("Application answers")).not.toBeInTheDocument();
  });

  it("scrolls to the card for the extension's deep link", async () => {
    h.qs.current = "tab=career-profile&edit=application-answers";
    render(<ProfilePage />);
    await screen.findByText("Application answers");
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    const target = scrollSpy.mock.instances.at(-1) as unknown as HTMLElement;
    expect(target.id).toBe("application-answers");
  });

  it("does not scroll without the deep link", async () => {
    render(<ProfilePage />);
    await screen.findByText("Application answers");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
