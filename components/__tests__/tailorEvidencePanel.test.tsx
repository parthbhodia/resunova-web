import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TailorQueuePanel } from "@/components/tailor/TailorQueuePanel";

/**
 * The v8 evidence pass, driven through the REAL panel with the network
 * mocked: the frequency chip and its ordering arrive only via the panel's own
 * stamp call, the See-it link only via its resolver over the preview state it
 * already holds, and the checklist strip ONLY on a live recount — the
 * fallback path's rater counts are a different dataset, and drawing them
 * would be the two-numbers bug the ATS tile already refuses.
 */

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";

const ratings = {
  overall_score: 38,
  match_score: 38,
  job_title: { matched: false, jd_title: "Platform Engineer", resume_title: "Analyst", score: 40 },
  qualifications: { score: 40, missing: [], covered: [] },
  responsibilities: { score: 35, missing: [], covered: [] },
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

const UNMATCHED = ["Snowflake", "Terraform"];

function coverageOk() {
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
      unmatched: UNMATCHED.map((canonical, i) => ({
        id: `c${i}`,
        canonical,
        importance: "required",
        type: "tool",
      })),
      applied: 0,
      truncated: {},
      reason: "",
    }),
  };
}

// Terraform repeats; Snowflake appears once — so despite Snowflake coming
// first from extraction, Terraform must render first in the keyword band.
const JD =
  "You will own Terraform modules. Terraform everywhere. Snowflake occasionally.";

function renderPanel(over: Partial<React.ComponentProps<typeof TailorQueuePanel>> = {}) {
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
      onImprove={vi.fn()}
      improveBusy={false}
      requirementConcepts={UNMATCHED.map((c, i) => ({ id: `c${i}`, canonical: c }))}
      currentResumeText={"Built pipelines at Acme.\nManaged Terraform stacks daily."}
      jobDescription={JD}
      bulletAnalysis={[
        { originalBullet: "Built pipelines at Acme." },
        { originalBullet: "Managed Terraform stacks daily." },
      ]}
      lineOverrides={{}}
      onSeeItem={vi.fn()}
      {...over}
    />,
  );
}

describe("the evidence pass through the real panel", () => {
  it("stamps frequency, orders by it, resolves See-it, and draws the strip", async () => {
    vi.mocked(apiFetch).mockResolvedValue(coverageOk() as never);
    renderPanel();

    // Frequency: Terraform ×2 gets the chip; Snowflake ×1 gets none.
    await waitFor(() => {
      expect(screen.getByText("×2 in posting")).toBeInTheDocument();
    });
    const chips = document.querySelectorAll("[data-freq-chip]");
    expect(chips).toHaveLength(1);

    // Ordering: extraction said Snowflake first; emphasis says Terraform first.
    const rows = [...document.querySelectorAll("[data-queue-row]")].map(
      (el) => el.textContent ?? "",
    );
    const ti = rows.findIndex((t) => t.includes("Terraform"));
    const si = rows.findIndex((t) => t.includes("Snowflake"));
    expect(ti).toBeGreaterThanOrEqual(0);
    expect(si).toBeGreaterThanOrEqual(0);
    expect(ti).toBeLessThan(si);

    // See-it: Terraform sits verbatim in a preview bullet; Snowflake does not.
    const links = screen.getAllByRole("button", { name: /see it in your résumé/i });
    expect(links).toHaveLength(1);

    // The strip draws the recount's own numbers.
    expect(screen.getByTestId("requirement-checklist")).toBeInTheDocument();
    expect(screen.getByText(/9 of 24/)).toBeInTheDocument();
  });

  it("draws NO strip without a live recount", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error("down"));
    renderPanel();
    // Let the failed fetch settle; the panel falls back to the rater queue.
    await waitFor(() => {
      expect(vi.mocked(apiFetch)).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("requirement-checklist")).toBeNull();
  });
});
