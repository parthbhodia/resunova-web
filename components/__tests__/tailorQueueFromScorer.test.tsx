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
    // Every unmatched requirement is on screen with NO click. The queue used to
    // slice the flat list to five before banding, so a real posting rendered a
    // third of its gaps and hid the rest behind one control. Deliberately
    // asserted without touching the toggle: a test that clicks first cannot
    // tell "visible" from "reachable".
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

    // The band HEADER specifically. The gap-count banner above the tiles
    // carries the same phrase by design (it summarises the band it points at),
    // so an unscoped match finds two and proves neither.
    expect(screen.getByText("Could get you filtered out")).toBeInTheDocument();
    expect(screen.getByText("Worth adding")).toBeInTheDocument();
    expect(screen.getByText("About the employer")).toBeInTheDocument();
  });

  it("does not offer a fix button for an employer-domain row", async () => {
    // `dimensional modeling` comes back as domain_knowledge. Writing an
    // employer's context word into a bullet is the move the contextual class
    // exists to discourage, so the row explains itself instead.
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Terraform")).toBeInTheDocument());

    const row = screen.getByText("dimensional modeling").closest("li");
    expect(row).not.toBeNull();
    expect(row!.querySelector('input[type="checkbox"]')).toBeNull();
  });
});

describe("a row says what we are claiming about it", () => {
  it("does not call a requirement missing when the resume shows it", async () => {
    // The rater vouched for Kubernetes; the scanner cannot see it in the words
    // used. Telling that user "Not evidenced" is telling them they lack
    // something their own resume demonstrates, which is the credibility
    // failure this whole surface is built to avoid.
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        before: 38, after: 38, matchedBefore: 9, matched: 9, total: 24,
        gained: [], lost: [], applied: 0, truncated: {}, reason: "",
        unmatched: [
          { id: "c0", canonical: "Python", importance: "required", type: "technical_skill" },
        ],
      }),
    } as never);
    render(
      <TailorQueuePanel
        ratings={{ ...ratings,
          qualifications: { score: 40, missing: [], covered: [{ text: "Python", context: "Built ETL in Python." }] },
        } as never}
        addressedGaps={new Set()} fixAllBusy={false} onFixAll={vi.fn()}
        fetchFixSuggestions={vi.fn().mockResolvedValue([])}
        applyFixSuggestion={vi.fn().mockResolvedValue(undefined)}
        ignoredNames={new Set()} onToggleIgnored={vi.fn()}
        stale={false} onRecheck={vi.fn()} recheckBusy={false}
        requirementConcepts={[{ id: "c0", canonical: "Python" }]}
        currentResumeText={"Built ETL in Python at Acme."}
      />,
    );
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Partial match")).toBeInTheDocument());
    // Scoped to the row under test: the fixture's other rater gap is a real
    // "Not evidenced" and asserting globally would pass or fail for the wrong
    // reason.
    const row = screen.getByText("Python").closest("li");
    expect(row!.textContent).toContain("Partial match");
    expect(row!.textContent).not.toContain("Not evidenced");
  });

  it("asks you to add a keyword rather than to fix it", async () => {
    // "Fix this" on a row whose entire content is the word `Kubernetes`
    // overstates the work. Nothing is broken.
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Terraform")).toBeInTheDocument());
    const row = screen.getByText("Terraform").closest("li");
    expect(row!.textContent).toContain("Add");
    expect(row!.textContent).not.toContain("Fix this");
  });

  it("gives a contextual row no verdict word", async () => {
    // It already carries an information mark and an explainer; a third label
    // competing for the same glance is how all of them stop being read.
    renderPanel();
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Terraform")).toBeInTheDocument());
    const row = screen.getByText("dimensional modeling").closest("li");
    for (const v of ["Partial match", "Not evidenced", "Keyword · fits an existing bullet"]) {
      expect(row!.textContent).not.toContain(v);
    }
  });
});

describe("the queue reports what is already covered", () => {
  it("shows a covered requirement with its evidence, outside the review count", () => {
    // Covered requirements were invisible: a user reading "N to review" had no
    // way to see what they already meet, so the page only ever said what was
    // wrong. They must not inflate that N either.
    renderPanel();
    const header = screen.getByText(/hard requirements this posting screens on/i).textContent ?? "";
    expect(screen.getByText("Already covered")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("You have this")).toBeInTheDocument();
    // The fixture has 2 rater gaps and 1 covered item; the count is the gaps.
    expect(header).toContain("2");
  });

  it("offers no action on a covered row", async () => {
    renderPanel();
    const row = screen.getByText("Python").closest("li");
    expect(row!.textContent).toContain("No action");
    expect(row!.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("names the toggle for what it reveals", () => {
    // On a covered row the detail IS the evidence; "Why this matters" would
    // promise an explanation of a problem the user does not have.
    renderPanel();
    const row = screen.getByText("Python").closest("li");
    expect(row!.textContent).toContain("Show the evidence");
  });
});
