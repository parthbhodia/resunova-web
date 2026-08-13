import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TailorQueuePanel } from "@/components/tailor/TailorQueuePanel";
import { deriveWorkQueue } from "@/lib/tailorWorkQueue";
import { applyOptimisticGapAddressed } from "@/lib/tailorGapFix";

/**
 * Two field reports from one screenshot session, both queue-surface honesty
 * failures, both driven here through the REAL panel.
 *
 * (1) "after i selected and approved, it removed the second fix? where did it
 * go?" — applying a fix moved the gap from `missing` into `resolved_by_user`,
 * a field NOTHING on the queue surface rendered. The user's own completed
 * work vanished, violating the queue's first invariant: a queue item never
 * silently disappears.
 *
 * (2) "wtf does this even mean?" — one card carried a "Not evidenced" chip
 * beside a note saying the scanner already counts the term as matched. Both
 * halves were individually true (term present, substance thin) and together
 * they were a flat contradiction; the verdict vocabulary simply had no word
 * for that state. Now it does (`unbacked`), and the row leaves the
 * filtered-out band, because nothing can screen out a term that IS in the
 * document.
 */

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiClient";

const ratings = {
  overall_score: 42,
  match_score: 42,
  job_title: { matched: true, jd_title: "Staff Fullstack Developer", resume_title: "Senior Fullstack Developer", score: 67 },
  qualifications: {
    score: 40,
    covered: [],
    missing: [
      { text: "Ownership of complex production systems", analysis: "No explicit ownership demonstrated." },
      { text: "Distributed backend services", analysis: "Backend services mentioned but no distributed evidence." },
    ],
  },
  responsibilities: { score: 35, covered: [], missing: [] },
  keywords: {
    found_count: 9,
    total_count: 22,
    direct_skills: { found: [], missing: ["Go"] },
    contextual: { found: [], missing: [] },
  },
  whats_working: [],
  gaps: [],
  verdict: "",
} as never;

/** The row `<li>`, located by its own attribute — a text query can resolve to
 *  a wrapper with identical textContent (the DESIGN.md leaf-vs-wrapper trap). */
function rowFor(name: string): HTMLElement | null {
  return document.querySelector(`li[data-queue-row="${name}"]`);
}

function renderPanel(r: unknown, extra: Record<string, unknown> = {}) {
  return render(
    <TailorQueuePanel
      ratings={r as never}
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
      {...extra}
    />,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("an applied fix stays on screen", () => {
  it("keeps the row visible as applied after the optimistic move", () => {
    // The REAL post-apply shape: missing → resolved_by_user, produced by the
    // same helper the apply path calls — the bug lived in the seam between
    // what apply writes and what the queue reads, so the test spans the seam.
    const after = applyOptimisticGapAddressed(
      ratings, "Ownership of complex production systems", "qualification",
    );
    renderPanel(after);
    const row = rowFor("Ownership of complex production systems");
    expect(row).not.toBeNull();
    expect(row!.getAttribute("data-status")).toBe("applied");
    // With the way back to the change every applied row offers.
    expect(row!.textContent).toContain("See it");
  });

  it("keeps the receipt in the band where the user pressed Fix", () => {
    const after = applyOptimisticGapAddressed(
      ratings, "Ownership of complex production systems", "qualification",
    );
    renderPanel(after);
    const row = rowFor("Ownership of complex production systems");
    const band = row!.parentElement!.closest("li");
    expect(band?.textContent).toContain("Could get you filtered out");
  });

  it("does not count the applied row as open work", () => {
    const after = applyOptimisticGapAddressed(
      ratings, "Ownership of complex production systems", "qualification",
    );
    renderPanel(after);
    // Two open rows remain (the second qualification + the keyword); the
    // header must not re-count the finished one.
    expect(screen.getByText(/2 gaps left to review|Start with the blocker/)).toBeInTheDocument();
  });

  it("unit: deriveWorkQueue renders resolved_by_user rows as applied", () => {
    const after = applyOptimisticGapAddressed(
      ratings, "Ownership of complex production systems", "qualification",
    );
    const rows = deriveWorkQueue(after as never, new Set());
    const applied = rows.find((r) => r.name === "Ownership of complex production systems");
    expect(applied?.status).toBe("applied");
    // Same band it was fixed in — the user watched it there.
    expect(applied?.kind).toBe("qualification");
  });
});

/**
 * The contradiction only exists on the MERGED queue: `unbacked` is the verdict
 * for a rater gap whose term the scanner already counts, and the scanner's
 * side of that only arrives with the score-preview recount. So these drive
 * the panel with concepts + résumé text and a mocked recount, exactly like
 * the panel behaves on /tailor-2.
 */
describe("the mentioned-not-proven card is coherent", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // The recount leaves "Distributed backend services" OFF the unmatched
    // list — the scanner counts the term as present — while the rater's
    // missing row for it survives the merge. That pair is the reported card.
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        before: 42, after: 42, matchedBefore: 9, matched: 9, total: 22,
        gained: [], lost: [], applied: 0, truncated: {}, reason: "",
        unmatched: [
          { id: "c0", canonical: "Terraform", importance: "required", type: "tool" },
        ],
      }),
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderMerged(r: unknown = ratings) {
    renderPanel(r, {
      requirementConcepts: [
        { id: "c0", canonical: "Terraform" },
        { id: "c1", canonical: "Distributed backend services" },
      ],
      currentResumeText: "Built distributed backend services in Go at Acme.",
    });
    await vi.advanceTimersByTimeAsync(600);
    await waitFor(() => expect(screen.getByText("Terraform")).toBeInTheDocument());
  }

  it("renders the unbacked chip, never Not evidenced beside an already-counted note", async () => {
    await renderMerged();
    const row = rowFor("Distributed backend services");
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain("Mentioned, not proven");
    expect(row!.textContent).not.toContain("Not evidenced");
  });

  it("banded as upside, not under the filtered-out claim", async () => {
    // A term that is present in the document cannot fail a keyword screen.
    await renderMerged();
    const row = rowFor("Distributed backend services");
    const band = row!.parentElement!.closest("li");
    expect(band?.textContent).toContain("Worth adding");
    expect(band?.textContent).not.toContain("filtered out");
  });

  it("explains what fixing it is FOR when the percentage will not move", async () => {
    await renderMerged();
    const row = rowFor("Distributed backend services");
    fireEvent.click(screen.getAllByText("Why this matters").find((el) => row!.contains(el))!);
    // The old note explained our bookkeeping and made the fix look pointless
    // ("then what is the use of fixing it?", quoted from the field). The new
    // one names the beneficiary.
    expect(row!.textContent).toMatch(/recruiter reading the bullet/i);
    expect(row!.textContent).not.toMatch(/counts this as matched/i);
  });

  it("an applied row on the merged queue keeps its ✓ and its band", async () => {
    // The recount can flip a term to matched right after an apply. At that
    // moment the row turns rater-only — and the band override must NOT move
    // the receipt out from under the user ("where did it go?", one band
    // over).
    const after = applyOptimisticGapAddressed(
      ratings, "Distributed backend services", "qualification",
    );
    await renderMerged(after);
    const row = rowFor("Distributed backend services");
    expect(row).not.toBeNull();
    expect(row!.getAttribute("data-status")).toBe("applied");
    expect(row!.textContent).not.toContain("Mentioned, not proven");
    const band = row!.parentElement!.closest("li");
    expect(band?.textContent).toContain("Could get you filtered out");
  });
});
