import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SaveScanPrompt from "@/components/analyze/SaveScanPrompt";
import SaveToProfilePrompt from "@/components/analyze/SaveToProfilePrompt";
import { FREE_SCAN_DAILY_LIMIT } from "@/components/UpgradeDialog";

// A structured résumé must be present for either prompt to render.
let structuredResume: unknown = { full_name: "Parth Bhodia", email: "p@x.com" };

vi.mock("@/store/resumeAnalyzeStore", () => ({
  useResumeAnalyzeStore: (sel: (s: { structuredResume: unknown }) => unknown) =>
    sel({ structuredResume }),
}));

// The account writes the profile prompt performs. Both early-RETURN without a
// session in production, which is exactly what made the signed-out path claim a
// false success — so the spies here must record ZERO calls for an anon render.
const upsertExtractedProfile = vi.fn(() => Promise.resolve());
const upsertUserProfile = vi.fn(() => Promise.resolve());
vi.mock("@/lib/supabase", () => ({
  upsertExtractedProfile: (...a: unknown[]) => upsertExtractedProfile(...(a as [])),
  upsertUserProfile: (...a: unknown[]) => upsertUserProfile(...(a as [])),
  getSupabaseClient: () => ({ auth: { getSession: () => Promise.resolve({ data: { session: null } }) } }),
}));

const PREWALL_KEY = "rn_prewall_events_v1";
const stashedEvents = (): { event: string }[] => {
  try {
    return JSON.parse(localStorage.getItem(PREWALL_KEY) || "[]");
  } catch {
    return [];
  }
};

beforeEach(() => {
  localStorage.clear();
  structuredResume = { full_name: "Parth Bhodia", email: "p@x.com" };
  upsertExtractedProfile.mockClear();
  upsertUserProfile.mockClear();
});

describe("SaveScanPrompt · anonymous capture", () => {
  it("asks an anonymous visitor to save the report they just got", () => {
    render(<SaveScanPrompt isAnon score={72} onSignIn={() => {}} />);
    expect(screen.getByTestId("save-scan-prompt")).toBeTruthy();
    expect(screen.getByText(/Your score of 72 lives only in this browser/)).toBeTruthy();
  });

  it("renders nothing for a signed-in user, who has nothing to capture", () => {
    render(<SaveScanPrompt isAnon={false} score={72} onSignIn={() => {}} />);
    expect(screen.queryByTestId("save-scan-prompt")).toBeNull();
  });

  it("renders nothing before a résumé has been scanned", () => {
    structuredResume = null;
    render(<SaveScanPrompt isAnon score={null} onSignIn={() => {}} />);
    expect(screen.queryByTestId("save-scan-prompt")).toBeNull();
  });

  it("omits the number rather than inventing one when no score is available", () => {
    render(<SaveScanPrompt isAnon score={null} onSignIn={() => {}} />);
    expect(screen.getByText(/This report lives only in this browser/)).toBeTruthy();
    expect(screen.queryByText(/Your score of/)).toBeNull();
  });

  it("quotes the real free-tier limit, so the offer cannot drift from the policy", () => {
    render(<SaveScanPrompt isAnon score={72} onSignIn={() => {}} />);
    expect(
      screen.getByText(new RegExp(`keep your history and get ${FREE_SCAN_DAILY_LIMIT} scans a day`)),
    ).toBeTruthy();
  });

  it("opens sign-in when the visitor accepts", () => {
    const onSignIn = vi.fn();
    render(<SaveScanPrompt isAnon score={72} onSignIn={onSignIn} />);
    fireEvent.click(screen.getByText("Save my report"));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("dismiss hides it and remembers the résumé across a remount", () => {
    const { unmount } = render(<SaveScanPrompt isAnon score={72} onSignIn={() => {}} />);
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(screen.queryByTestId("save-scan-prompt")).toBeNull();
    unmount();
    render(<SaveScanPrompt isAnon score={72} onSignIn={() => {}} />);
    expect(screen.queryByTestId("save-scan-prompt")).toBeNull();
  });

  it("re-offers for a DIFFERENT résumé after one was dismissed", () => {
    const { unmount } = render(<SaveScanPrompt isAnon score={72} onSignIn={() => {}} />);
    fireEvent.click(screen.getByLabelText("Dismiss"));
    unmount();
    structuredResume = { full_name: "Someone Else", email: "other@x.com" };
    render(<SaveScanPrompt isAnon score={64} onSignIn={() => {}} />);
    expect(screen.getByTestId("save-scan-prompt")).toBeTruthy();
  });

  // Anonymous events cannot insert into client_events (RLS keys on auth.uid()),
  // so the funnel only exists if these are STASHED for the post-sign-in flush.
  it("stashes the funnel events rather than dropping them while signed out", () => {
    const { unmount } = render(<SaveScanPrompt isAnon score={72} onSignIn={() => {}} />);
    expect(stashedEvents().map((e) => e.event)).toContain("capture_prompt_shown");
    fireEvent.click(screen.getByText("Save my report"));
    expect(stashedEvents().map((e) => e.event)).toContain("capture_signin_started");
    unmount();

    localStorage.removeItem(PREWALL_KEY);
    structuredResume = { full_name: "Third Person", email: "t@x.com" };
    render(<SaveScanPrompt isAnon score={51} onSignIn={() => {}} />);
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(stashedEvents().map((e) => e.event)).toContain("capture_prompt_dismissed");
  });

  // The guard has to survive a CHANGING score on the same résumé — a rescore
  // moves the score, which re-fires the effect. An identical re-render proves
  // nothing here, because the dep array already suppresses that on its own.
  it("logs the shown event once per résumé, even when the score changes under it", () => {
    const { rerender } = render(<SaveScanPrompt isAnon score={72} onSignIn={() => {}} />);
    rerender(<SaveScanPrompt isAnon score={80} onSignIn={() => {}} />);
    rerender(<SaveScanPrompt isAnon score={84} onSignIn={() => {}} />);
    expect(stashedEvents().filter((e) => e.event === "capture_prompt_shown")).toHaveLength(1);
  });
});

describe("SaveToProfilePrompt · the false-success guard", () => {
  // The shipped bug: upsertExtractedProfile / upsertUserProfile both early-return
  // without a session, so a signed-out click wrote localStorage only and still
  // rendered "Saved to your Profile." This is the regression that must stay dead.
  it("does not render for a signed-out visitor", () => {
    const { container } = render(<SaveToProfilePrompt signedIn={false} />);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(screen.queryByText(/Save this résumé to your Profile/)).toBeNull();
  });

  it("cannot reach the account writes while signed out", () => {
    render(<SaveToProfilePrompt signedIn={false} />);
    expect(screen.queryByText("Save to Profile")).toBeNull();
    expect(upsertExtractedProfile).not.toHaveBeenCalled();
    expect(upsertUserProfile).not.toHaveBeenCalled();
  });

  it("never claims success to a signed-out visitor", () => {
    render(<SaveToProfilePrompt signedIn={false} />);
    expect(screen.queryByText("Saved to your Profile.")).toBeNull();
  });

  it("still offers the save to a signed-in user", () => {
    render(<SaveToProfilePrompt signedIn />);
    expect(screen.getByText(/Save this résumé to your Profile/)).toBeTruthy();
  });
});
