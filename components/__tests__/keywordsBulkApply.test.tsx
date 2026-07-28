import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { KeywordsSection } from "@/components/ratings/KeywordsSection";
import type { KeywordsRating } from "@/lib/types";

const keywords: KeywordsRating = {
  found_count: 7,
  total_count: 13,
  direct_skills: { found: ["Python"], missing: ["C++", "Go", "compilers"] },
  contextual: { found: [], missing: ["data structures or algorithms", "performance analysis"] },
};

function renderSection(overrides: Partial<Parameters<typeof KeywordsSection>[0]> = {}) {
  return render(
    <KeywordsSection
      keywords={keywords}
      skillCategories={["Languages", "Tools"]}
      {...overrides}
    />,
  );
}

describe("KeywordsSection — bulk apply", () => {
  it("adds the checked direct skills to the chosen category", () => {
    const onAddSkills = vi.fn();
    const { getByLabelText, getByText } = renderSection({ onAddSkills });

    fireEvent.click(getByLabelText("Select C++"));
    fireEvent.click(getByLabelText("Select Go"));
    fireEvent.change(getByLabelText("Add to"), { target: { value: "Tools" } });
    fireEvent.click(getByText("Add 2 to skills"));

    expect(onAddSkills).toHaveBeenCalledWith(["C++", "Go"], "Tools");
  });

  it("select all covers the whole group and clears again", () => {
    const onAddSkills = vi.fn();
    const { getAllByText, getByText } = renderSection({ onAddSkills });

    // Two groups render a Select all; the first is Missing Direct Skills.
    fireEvent.click(getAllByText("Select all")[0]);
    fireEvent.click(getByText("Add 3 to skills"));
    expect(onAddSkills).toHaveBeenCalledWith(["C++", "Go", "compilers"], "Languages");

    fireEvent.click(getAllByText("Clear all")[0]);
    expect(getByText("Add to skills")).toBeDisabled();
  });

  it("keeps direct-skill and contextual selections in separate actions", () => {
    const onAddSkills = vi.fn();
    const onFixKeywords = vi.fn();
    const { getByLabelText, getByText } = renderSection({ onAddSkills, onFixKeywords });

    fireEvent.click(getByLabelText("Select C++"));
    fireEvent.click(getByLabelText("Select performance analysis"));

    fireEvent.click(getByText("Add 1 to skills"));
    expect(onAddSkills).toHaveBeenCalledWith(["C++"], "Languages");

    fireEvent.click(getByText("⚡ Fix 1 with AI"));
    expect(onFixKeywords).toHaveBeenCalledWith(["performance analysis"]);
  });

  it("batches every selected contextual gap into one call", () => {
    const onFixKeywords = vi.fn();
    const { getAllByText, getByText } = renderSection({ onFixKeywords });

    fireEvent.click(getAllByText("Select all")[1]);
    fireEvent.click(getByText("⚡ Fix 2 with AI"));

    expect(onFixKeywords).toHaveBeenCalledTimes(1);
    expect(onFixKeywords).toHaveBeenCalledWith([
      "data structures or algorithms",
      "performance analysis",
    ]);
  });

  it("hides the bulk bars when the parent supplies no handler", () => {
    const { queryByText, queryByLabelText } = renderSection();
    expect(queryByText(/to skills$/)).toBeNull();
    expect(queryByText(/Fix .*with AI/)).toBeNull();
    expect(queryByLabelText("Add to")).toBeNull();
  });

  it("drops a keyword from the missing list once it is addressed", () => {
    const { queryByLabelText } = renderSection({ addressedGaps: new Set(["C++"]) });
    expect(queryByLabelText("Select C++")).toBeNull();
    expect(queryByLabelText("Select Go")).toBeTruthy();
  });
});
