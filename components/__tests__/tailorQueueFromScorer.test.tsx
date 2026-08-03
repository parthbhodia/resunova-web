import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TailorQueuePanel } from "@/components/tailor/TailorQueuePanel";

/**
 * The reported bug, driven through the REAL panel.
 *
 * The unit tests prove the merge is correct given both lists. These prove the
 * panel actually asks for the second list and renders it, which is the half the
 * user experiences: a scoreboard reading "9 of 24" above three rows to fix.
 *
 * Everything is mocked at the network boundary, so the panel's own wiring
 * (useLiveCoverage -> fetchLiveCoverage -> the merge) is exercised for real.
 */

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";

const RATER_GAPS = ["Kubernetes", "mentor engineers"];

/** Six scored requirements: two the rater also named, four it never mentioned. */
const SCORED_UNMATCHED = [
  "Kubernetes",
  "mentor engineers",
  "Terraform",
  "Snowflake",
  "dbt transformations",
  "dimensional modeling",
];

const ratings = {
  overall_score: 38,
  match_score: 38,
  job_title: { matched: false, jd_title: "Data Engineer", resume_title: "Analyst", score: 40 },
  qualifications: {
    score: 40,
    missing: [{ text: "Kubernetes", analysis: "No container work shown." }],
    covered: [{ text: "Python", context: "Built ETL in Python." }],
  },
  responsibilities: {
    score: 35,
    missing: [{ text: "mentor engineers", analysis: "No mentoring shown." }],
    covered: [],
  },
  keywords: {
    found_count: 9,
    total_count: 24,
    direct_skills: { found: [], missing: [] },
    contextual: { found: [], missing: [] },
  },
  whats_working: [],
  gaps: [],
  verdict: "",
};

/**
 * What extraction says each of those is.
 *
 * Undefined for the two rater-named ones on purpose: a backend deployed before
 * `type` existed sends none, and those rows must still land somewhere sane.
 */
const TYPE_OF: Record<string, string | undefined> = {
  Terraform: "tool",
  Snowflake: "tool",
  "dbt transformations": "technical_skill",
  "dimensional modeling": "domain_knowledge",
};

function coverageResponse(unmatched: string[]) {
  return {
    ok: true,
    json: async () => ({
      before: 38,
      after: 38,
      matchedBefore: 9,
      matched: 9,
      total: 24,
      gained: [],
      lost: [],
      unmatched: unmatched.map((canonical, i) => ({
        id: `c${i}`,
        canonical,
        importance: "required",
        type: TYPE_OF[canonical],
      })),
      applied: 0,
      truncated: {},
      reason: "",
    }),
  };
}

function renderPanel() {
  return render(
    <TailorQueuePanel
      ratings={ratings as never}
      addressedGaps={new Set()}
      fixAllBusy={false}
      onFixAll={vi.fn()}
      fetchFixSuggestions={vi.fn().mockResolvedValue([])}
      applyFixSuggestion={vi.fn().mockResolvedValue(undefined)}
      ignoredNames={new Set()}
      onToggleIgnored={vi.fn()}
      stale={false}
      onRecheck={vi.fn()}
      recheckBusy={false}
      requirementConcepts={SCORED_UNMATCHED.map((c, i) => ({ id: `c${i}`, canonical: c }))}
      currentResumeText={"Built ETL in Python at Acme.\nShipped a reporting pipeline."}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(apiFetch).mockResolvedValue(coverageResponse(SCORED_UNMATCHED) as never);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("the queue accounts for what the percentage is complaining about", () => {
  it("starts from the rater's short list before a recount lands", () => {
    // Byte-for-byte the queue that shipped. If this ever fails, the change is
    // no longer additive and an offline backend would change the queue.
    renderPanel();
    for (const name of RATER_GAPS) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText("Terraform")).toBeNull();
  });

  it("grows a row per unmatched requirement once the recount lands", async () => {
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Terraform")).toBeInTheDocument());
    // The queue shows its top 5 and offers the rest behind one control, so the
    // count lives on that button. Six unmatched requirements, five shown.
    expect(screen.getByRole("button", { name: /show 1 more/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show 1 more/i }));
    for (const name of SCORED_UNMATCHED) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("shows a requirement once, not twice under two wordings", async () => {
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Terraform")).toBeInTheDocument());
    // "Kubernetes" is on both lists; two rows would be the merge failing open.
    expect(screen.getAllByText("Kubernetes")).toHaveLength(1);
  });

  it("keeps the rater-only queue when the recount is unavailable", async () => {
    // An outage here must degrade to the previous behaviour, never to an empty
    // queue: this surface is how the user does the work.
    vi.mocked(apiFetch).mockRejectedValue(new Error("offline"));
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    for (const name of RATER_GAPS) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("keeps the rater-only queue against a backend with no unmatched field", async () => {
    // The api half can deploy after the web half. Missing key must not empty
    // the queue.
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ matched: 9, total: 24, gained: [], lost: [] }),
    } as never);
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    for (const name of RATER_GAPS) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});

describe("the bands say what kind of problem each row is", () => {
  it("does not put every scored requirement under one header", async () => {
    // These all shipped as `qualification`, so a wall of unrelated rows sat
    // under "Could get you filtered out" and the headers stopped meaning
    // anything. Asserted through the rendered panel, since the band header is
    // the thing the user actually reads.
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Terraform")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /show \d+ more/i }));

    expect(screen.getByText(/could get you filtered out/i)).toBeInTheDocument();
    expect(screen.getByText(/worth adding/i)).toBeInTheDocument();
    expect(screen.getByText(/about the employer/i)).toBeInTheDocument();
  });

  it("does not offer a fix button for an employer-domain row", async () => {
    // `dimensional modeling` comes back as domain_knowledge. Writing an
    // employer's context word into a bullet is the move the contextual class
    // exists to discourage, so the row explains itself instead.
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Terraform")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /show \d+ more/i }));

    const row = screen.getByText("dimensional modeling").closest("li");
    expect(row).not.toBeNull();
    expect(row!.querySelector('input[type="checkbox"]')).toBeNull();
  });
});
