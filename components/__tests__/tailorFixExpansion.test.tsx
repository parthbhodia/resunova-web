import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorFixExpansion, type FixSuggestion } from "@/components/tailor/TailorFixExpansion";
import { itemAction } from "@/components/tailor/TailorWorkQueue";
import type { QueueItem } from "@/lib/tailorWorkQueue";

const item = (over: Partial<QueueItem> = {}): QueueItem => ({
  id: "qualification:ci/cd",
  name: "CI/CD",
  kind: "qualification",
  status: "queued",
  detail: "",
  ...over,
});

const sugg = (over: Partial<FixSuggestion> = {}): FixSuggestion => ({
  id: "s1",
  section: "Experience",
  original: "Built a data pipeline for nightly ingestion of vendor feeds.",
  suggested: "Built a data pipeline for nightly ingestion of vendor feeds, deployed through CI/CD.",
  reason: "Based on your pipeline project.",
  priority: "high",
  ...over,
});

describe("TailorFixExpansion", () => {
  it("offers Add to résumé / Edit first / Ignore on a ready suggestion", () => {
    const onApply = vi.fn();
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "ready", suggestions: [sugg()] }}
        onApply={onApply}
        onIgnore={() => undefined}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByText("Add to résumé"));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }), null);
    expect(screen.getByText("Edit first")).toBeTruthy();
    expect(screen.getByText("Ignore")).toBeTruthy();
  });

  it("two suggestions render as pickable versions and apply sends the picked one", () => {
    const onApply = vi.fn();
    const second = sugg({ id: "s2", section: "Shorter rewrite", suggested: "Shipped vendor-feed ingestion with CI/CD." });
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "ready", suggestions: [sugg(), second] }}
        onApply={onApply}
        onIgnore={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText("Pick a version")).toBeTruthy();
    fireEvent.click(screen.getByText("Shorter rewrite"));
    fireEvent.click(screen.getByText("Add to résumé"));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: "s2" }), null);
  });

  it("Edit first opens a textarea and applies the edited text", () => {
    const onApply = vi.fn();
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "ready", suggestions: [sugg()] }}
        onApply={onApply}
        onIgnore={() => undefined}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByText("Edit first"));
    const ta = screen.getByLabelText("Edit the suggestion") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "My own wording." } });
    fireEvent.click(screen.getByText("Add your version"));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }), "My own wording.");
  });

  it("zero suggestions owns the miss instead of judging the candidate", () => {
    // This used to read "Nothing honest to write — your résumé doesn't have
    // work this can be written from." A verdict about the person, and the
    // thing that usually produced it was our own validators dropping every
    // rewrite the model wrote. Paying users read it as "you are not qualified",
    // and said so.
    const onIgnore = vi.fn();
    const onTryFix = vi.fn();
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "ready", suggestions: [] }}
        onApply={() => undefined}
        onIgnore={onIgnore}
        onTryFix={onTryFix}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText("We couldn’t write this one")).toBeTruthy();
    expect(screen.getByText(/miss on our side, not a verdict on your experience/i)).toBeTruthy();
    expect(screen.queryByText(/doesn't have work this can be written from/i)).toBeNull();
    // A dead end with no way to retry is the other half of the complaint.
    fireEvent.click(screen.getByText("Try again"));
    expect(onTryFix).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Ignore"));
    expect(onIgnore).toHaveBeenCalled();
  });

  it("a failed fetch offers Try again, not only Close", () => {
    const onTryFix = vi.fn();
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "error", message: "Couldn't reach the writer just now." }}
        onApply={() => undefined}
        onIgnore={() => undefined}
        onTryFix={onTryFix}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByText("Try again"));
    expect(onTryFix).toHaveBeenCalled();
  });

  it("contextual info card explains and offers Try a fix / Ignore", () => {
    const onTryFix = vi.fn();
    render(
      <TailorFixExpansion
        item={item({ kind: "contextual", name: "advertisers" })}
        state={{ phase: "info" }}
        onApply={() => undefined}
        onIgnore={() => undefined}
        onTryFix={onTryFix}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(/keyword stuffing/)).toBeTruthy();
    fireEvent.click(screen.getByText("Try a fix"));
    expect(onTryFix).toHaveBeenCalled();
  });
});

describe("itemAction with the new states", () => {
  it("queued contextual gets What's this?, ignored gets Reconsider", () => {
    expect(itemAction(item({ kind: "contextual" }))).toBe("whats_this");
    expect(itemAction(item({ status: "ignored" }))).toBe("reconsider");
    expect(itemAction(item())).toBe("fix");
  });
});
