import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TailorFixExpansion, type FixSuggestion } from "@/components/tailor/TailorFixExpansion";
import type { QueueItem } from "@/lib/tailorWorkQueue";

/**
 * The server's risk ladder, rendered where the founder actually picks
 * versions. Aggressive mode ships unevidenced-tech rewrites instead of
 * dropping them (founder-directed 2026-08-13) — the api marks each one with
 * `risk_level` + `unverified_terms` — and the /tailor-2 picker was dropping
 * both fields on the floor, so a C++ splice into a PostgreSQL bullet looked
 * exactly like a clean fix. Founder, pasting one: "Do you think this makes
 * sense ? adding C++ like this ?" The ship-instead-of-drop design is only
 * honest while the mark is visible.
 */

const item: QueueItem = {
  id: "keyword:c++",
  name: "C++",
  kind: "keyword",
  status: "queued",
  detail: "",
};

const suggestion = (over: Partial<FixSuggestion>): FixSuggestion => ({
  id: "gf1",
  section: "Work Experience",
  original: "Designed and optimized PostgreSQL schemas for a high-traffic CMS.",
  suggested: "Designed and optimized PostgreSQL schemas for a high-traffic CMS, integrating C++ for performance-critical services.",
  reason: "",
  priority: "high",
  ...over,
});

function renderReady(suggestions: FixSuggestion[]) {
  return render(
    <TailorFixExpansion
      item={item}
      state={{ phase: "ready", suggestions }}
      onApply={vi.fn()}
      onIgnore={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe("the version picker shows the server's risk verdicts", () => {
  it("a high-risk version carries the badge and names the unbacked words", () => {
    renderReady([suggestion({ risk_level: "high", unverified_terms: ["C++"] })]);
    expect(screen.getByText("High risk")).toBeInTheDocument();
    const caution = screen.getByTestId("unverified-terms");
    expect(caution.textContent).toContain("C++");
    expect(caution.textContent).toMatch(/rides on your word/i);
  });

  it("a medium-risk version reads Review and names the unsourced numeral", () => {
    renderReady([suggestion({ risk_level: "medium", unverified_numerals: ["40%"] })]);
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByTestId("unverified-terms").textContent).toContain("40%");
  });

  it("a clean version carries no badge and no caution", () => {
    // Crying wolf is the other way to kill the badge: if every version is
    // marked, none is.
    renderReady([suggestion({})]);
    expect(screen.queryByText("High risk")).toBeNull();
    expect(screen.queryByText("Review")).toBeNull();
    expect(screen.queryByTestId("unverified-terms")).toBeNull();
  });

  it("each version wears its own badge in a multi-version picker", () => {
    renderReady([
      suggestion({ id: "gf1", risk_level: "high", unverified_terms: ["C++"] }),
      suggestion({ id: "gf2", suggested: "A different clean rewrite of the bullet.", reason: "" }),
    ]);
    // One badge, on the risky option only.
    expect(screen.getAllByText("High risk")).toHaveLength(1);
  });
});
