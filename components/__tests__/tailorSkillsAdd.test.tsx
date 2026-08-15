import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorFixExpansion, type FixSuggestion } from "@/components/tailor/TailorFixExpansion";
import type { QueueItem } from "@/lib/tailorWorkQueue";

/**
 * "Add to Skills instead" (founder-asked 2026-08-15). A bare tool keyword's
 * natural home is the Skills section — no bullet story to disturb, the
 * scanner counts it the same — so keyword rows offer it beside the bullet
 * weave, and as the honest fallback when no weave came back. Qualifications
 * and responsibilities never get it: a sentence-shaped requirement on a
 * skills list is the credential-in-a-bullet category error, mirrored.
 */

const kwItem: QueueItem = { id: "keyword:html", name: "HTML", kind: "keyword", status: "queued", detail: "" };
const qualItem: QueueItem = { id: "qualification:x", name: "5 years of Go", kind: "qualification", status: "queued", detail: "" };

const suggestion: FixSuggestion = {
  id: "gf1",
  section: "Work Experience",
  original: "Built frontends with HTMX.",
  suggested: "Built frontends with HTMX and HTML.",
  reason: "",
  priority: "high",
};

function renderExpansion(
  item: QueueItem,
  state: { phase: "ready"; suggestions: FixSuggestion[] },
  onAddSkill?: (i: { name: string }) => boolean,
) {
  const onClose = vi.fn();
  render(
    <TailorFixExpansion
      item={item}
      state={state}
      onApply={vi.fn()}
      onIgnore={vi.fn()}
      onTryFix={vi.fn()}
      onAddSkill={onAddSkill}
      onClose={onClose}
    />,
  );
  return { onClose };
}

describe("Add to Skills instead", () => {
  it("keyword rows offer it beside the versions, and it writes then closes", () => {
    const onAddSkill = vi.fn().mockReturnValue(true);
    const { onClose } = renderExpansion(kwItem, { phase: "ready", suggestions: [suggestion] }, onAddSkill);
    fireEvent.click(screen.getByRole("button", { name: "Add to Skills instead" }));
    expect(onAddSkill).toHaveBeenCalledWith({ name: "HTML" });
    expect(onClose).toHaveBeenCalled();
  });

  it("an already-listed term is said out loud, not silently pretended", () => {
    const onAddSkill = vi.fn().mockReturnValue(false);
    const { onClose } = renderExpansion(kwItem, { phase: "ready", suggestions: [suggestion] }, onAddSkill);
    fireEvent.click(screen.getByRole("button", { name: "Add to Skills instead" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Already listed in your Skills section.")).toBeInTheDocument();
  });

  it("is the honest fallback when no bullet weave came back", () => {
    const onAddSkill = vi.fn().mockReturnValue(true);
    renderExpansion(kwItem, { phase: "ready", suggestions: [] }, onAddSkill);
    // The empty-result copy owns the miss; the skills route is the way out.
    // (Typographic apostrophe in the rendered copy, hence the dot.)
    expect(screen.getByText(/we couldn.t write this one/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to Skills instead" }));
    expect(onAddSkill).toHaveBeenCalledWith({ name: "HTML" });
  });

  it("never renders on qualification rows", () => {
    renderExpansion(qualItem, { phase: "ready", suggestions: [suggestion] }, vi.fn().mockReturnValue(true));
    expect(screen.queryByRole("button", { name: "Add to Skills instead" })).toBeNull();
  });

  it("never renders when the caller cannot write", () => {
    renderExpansion(kwItem, { phase: "ready", suggestions: [suggestion] }, undefined);
    expect(screen.queryByRole("button", { name: "Add to Skills instead" })).toBeNull();
  });
});
