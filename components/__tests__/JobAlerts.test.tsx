import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobAlertNudge, JobAlertsCard } from "@/components/jobs/JobAlerts";
import {
  EMPTY_NUDGE_STATE,
  NUDGE_SEEN_KEY,
  NUDGE_STATE_KEY,
  alertCriteria,
  nudgeAllowed,
  recordDismissal,
  useJobAlertsPref,
} from "@/lib/jobAlerts";

const { mockApiFetch, mockTrack } = vi.hoisted(() => ({ mockApiFetch: vi.fn(), mockTrack: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiFetch: mockApiFetch }));
vi.mock("@/lib/analytics", () => ({ trackEvent: mockTrack }));

const DAY = 24 * 60 * 60 * 1000;
const STORED = { accountChanges: true, scanLimit: false, features: true, referralAsks: false, jobDigest: false };

function jsonRes(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

function installApi(stored: Record<string, unknown> = STORED, postOk = true) {
  mockApiFetch.mockImplementation(async (_url: string, opts?: RequestInit) =>
    opts?.method === "POST" ? jsonRes({ ok: postOk }, postOk) : jsonRes(stored),
  );
}

function postedBody(): Record<string, unknown> {
  const call = mockApiFetch.mock.calls.find(([, o]) => (o as RequestInit | undefined)?.method === "POST");
  return JSON.parse(String((call![1] as RequestInit).body));
}

function Harness({ place }: { place?: "feed" | "empty" }) {
  const pref = useJobAlertsPref(true);
  return place ? <JobAlertNudge pref={pref} place={place} /> : <JobAlertsCard pref={pref} criteria="Data engineer · Remote" onEditCriteria={() => {}} />;
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockTrack.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  installApi();
});

describe("ask rules", () => {
  const now = 100 * DAY;
  it("asks only when alerts are known to be off", () => {
    expect(nudgeAllowed(false, EMPTY_NUDGE_STATE, false, now)).toBe(true);
    expect(nudgeAllowed(true, EMPTY_NUDGE_STATE, false, now)).toBe(false);
    expect(nudgeAllowed(null, EMPTY_NUDGE_STATE, false, now)).toBe(false);
  });
  it("asks at most once per visit", () => {
    expect(nudgeAllowed(false, EMPTY_NUDGE_STATE, true, now)).toBe(false);
  });
  it("waits 14 days after Not now, then stops after two", () => {
    const once = recordDismissal(EMPTY_NUDGE_STATE, now);
    expect(nudgeAllowed(false, once, false, now + 13 * DAY)).toBe(false);
    expect(nudgeAllowed(false, once, false, now + 14 * DAY)).toBe(true);
    const twice = recordDismissal(once, now + 14 * DAY);
    expect(nudgeAllowed(false, twice, false, now + 400 * DAY)).toBe(false);
  });
  it("describes the alert from the saved profile", () => {
    expect(alertCriteria("Data engineer, ML engineer, Analyst", "Remote")).toBe("Data engineer, ML engineer +1 · Remote");
    expect(alertCriteria("", "")).toBeNull();
  });
});

describe("JobAlertsCard", () => {
  it("turns the daily email on and keeps every other email preference", async () => {
    render(<Harness />);
    await userEvent.click(await screen.findByRole("button", { name: "Turn on daily email" }));
    await screen.findByRole("button", { name: "Turn off" });
    expect(postedBody()).toEqual({ ...STORED, jobDigest: true });
    expect(JSON.parse(localStorage.getItem("rn_notify_prefs_v1")!).jobDigest).toBe(true);
    expect(mockTrack).toHaveBeenCalledWith("job_alert_enabled", { place: "sidebar" });
  });

  it("stays off and shows an error when the save fails", async () => {
    installApi(STORED, false);
    render(<Harness />);
    await userEvent.click(await screen.findByRole("button", { name: "Turn on daily email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save");
    expect(screen.getByRole("button", { name: "Turn on daily email" })).toBeInTheDocument();
  });

  it("renders nothing until the preference has loaded", () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<Harness />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("JobAlertNudge", () => {
  it("shows once, and Not now records a dismissal", async () => {
    render(<Harness place="feed" />);
    await userEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("button", { name: "Not now" })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(NUDGE_STATE_KEY)!).dismissals).toBe(1);
    expect(sessionStorage.getItem(NUDGE_SEEN_KEY)).toBe("1");
    expect(mockTrack).toHaveBeenCalledWith("job_alert_ask_dismissed", { place: "feed" });
  });

  it("never shows when alerts are already on", async () => {
    installApi({ ...STORED, jobDigest: true });
    render(<Harness place="feed" />);
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Not now" })).not.toBeInTheDocument();
  });

  it("does not ask again in the same visit", async () => {
    sessionStorage.setItem(NUDGE_SEEN_KEY, "1");
    render(<Harness place="empty" />);
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Not now" })).not.toBeInTheDocument();
  });

  it("turning on from the ask confirms it", async () => {
    render(<Harness place="empty" />);
    await userEvent.click(await screen.findByRole("button", { name: "Turn on daily email" }));
    expect(await screen.findByText("Daily jobs email is on")).toBeInTheDocument();
    expect(postedBody().jobDigest).toBe(true);
  });
});
