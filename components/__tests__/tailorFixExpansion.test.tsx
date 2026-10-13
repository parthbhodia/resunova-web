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
    expect(screen.queryByTestId("role-title-offer")).toBeNull();
    expect(screen.getByText("Edit first")).toBeTruthy();
    expect(screen.getByText("Ignore")).toBeTruthy();
  });

  it("an empty original is shown as a new line, not a blank Your bullet", () => {
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "ready", suggestions: [sugg({ original: "", suggested: "Set up CI/CD for 12 services." })] }}
        onApply={() => undefined}
        onIgnore={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText("New line")).toBeTruthy();
    expect(screen.queryByText("Your bullet")).toBeNull();
    expect(screen.getByText("Set up CI/CD for 12 services.")).toBeTruthy();
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
    fireEvent.click(screen.getByText("Try again as is"));
    expect(onTryFix).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Ignore"));
    expect(onIgnore).toHaveBeenCalled();
  });

  const resume = {
    full_name: "", headline: "", location: "", email: "", phone: "", linkedin: "", github: "",
    summary: "", skills: [], education: [], projects: [], extra_sections: [],
    experience: [
      { company: "Acme", role: "Platform Engineer", dates: "", location: "", bullets: ["Ran the on-call rotation."] },
      { company: "Globex", role: "Developer", dates: "", location: "", bullets: [] },
    ],
  };

  it("the empty state takes the user's facts and tools and sends them back to the writer", () => {
    // The row used to end here. The user is the one person who knows what
    // they did, and the state took nothing from them.
    const onRewriteWithGuidance = vi.fn();
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "ready", suggestions: [] }}
        onApply={() => undefined}
        onIgnore={() => undefined}
        onRewriteWithGuidance={onRewriteWithGuidance}
        structuredResume={resume}
        onClose={() => undefined}
      />,
    );
    const write = screen.getByRole("button", { name: "Write it from this" }) as HTMLButtonElement;
    // Nothing typed, nothing to send: the button waits.
    expect(write.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/where did you do this/i), { target: { value: "Platform Engineer · Acme" } });
    fireEvent.change(screen.getByLabelText(/what did you do/i), { target: { value: "set up the deploy pipeline" } });
    fireEvent.change(screen.getByLabelText(/tools you used/i), { target: { value: "GitHub Actions, Terraform" } });
    fireEvent.change(screen.getByLabelText(/anything the writer should know/i), { target: { value: "one line only" } });
    expect(write.disabled).toBe(false);
    fireEvent.click(write);
    expect(onRewriteWithGuidance).toHaveBeenCalledWith({
      facts: { where: "Platform Engineer · Acme", what: "set up the deploy pipeline", outcome: "" },
      tools: ["GitHub Actions", "Terraform"],
      steer: "one line only",
    });
  });

  it("Write it myself drafts from the facts, lets the user pick the role, and adds the line", async () => {
    const onAddOwnBullet = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "ready", suggestions: [] }}
        onApply={() => undefined}
        onIgnore={() => undefined}
        onAddOwnBullet={onAddOwnBullet}
        structuredResume={resume}
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByLabelText(/what did you do/i), { target: { value: "set up the deploy pipeline" } });
    fireEvent.change(screen.getByLabelText(/tools you used/i), { target: { value: "GitHub Actions" } });
    fireEvent.click(screen.getByText("Write it myself"));
    const ta = screen.getByLabelText("Write the bullet yourself") as HTMLTextAreaElement;
    expect(ta.value).toBe("Set up the deploy pipeline using GitHub Actions");
    fireEvent.change(screen.getByLabelText("Which role this goes under"), { target: { value: "exp.1" } });
    fireEvent.change(ta, { target: { value: "Set up the deploy pipeline in GitHub Actions for 12 services." } });
    fireEvent.click(screen.getByText("Add this line"));
    await screen.findByText("Add this line");
    expect(onAddOwnBullet).toHaveBeenCalledWith(
      "Set up the deploy pipeline in GitHub Actions for 12 services.",
      "exp.1",
      ["GitHub Actions"],
    );
  });

  it("a failed fetch still lets the user write the line themselves", () => {
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "error", message: "Couldn't reach the writer just now." }}
        onApply={() => undefined}
        onIgnore={() => undefined}
        onAddOwnBullet={vi.fn()}
        structuredResume={resume}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByText("Write it myself"));
    expect(screen.getByLabelText("Write the bullet yourself")).toBeTruthy();
  });

  it("without a résumé to hang a line on, Write it myself does not render", () => {
    render(
      <TailorFixExpansion
        item={item()}
        state={{ phase: "ready", suggestions: [] }}
        onApply={() => undefined}
        onIgnore={() => undefined}
        onAddOwnBullet={vi.fn()}
        onClose={() => undefined}
      />,
    );
    expect(screen.queryByText("Write it myself")).toBeNull();
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

  it("offers to retitle the role when the suggestion carries suggested_role", () => {
    const onApply = vi.fn();
    render(
      <TailorFixExpansion
        item={item()}
        state={{
          phase: "ready",
          suggestions: [sugg({
            suggested_role: "Senior Fullstack Engineer",
            original_role: "Software Engineer",
            employer: "Acme",
          })],
        }}
        onApply={onApply}
        onIgnore={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByTestId("role-title-offer")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Add to résumé"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ suggested_role: "Senior Fullstack Engineer" }),
      null,
    );
  });

  it("can keep the current title when the retitle box is unchecked", () => {
    const onApply = vi.fn();
    render(
      <TailorFixExpansion
        item={item()}
        state={{
          phase: "ready",
          suggestions: [sugg({
            suggested_role: "Senior Fullstack Engineer",
            original_role: "Software Engineer",
          })],
        }}
        onApply={onApply}
        onIgnore={() => undefined}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Add to résumé"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ suggested_role: undefined }),
      null,
    );
  });
});

describe("itemAction with the new states", () => {
  it("queued contextual gets What's this?, ignored gets Reconsider", () => {
    expect(itemAction(item({ kind: "contextual" }))).toBe("whats_this");
    expect(itemAction(item({ status: "ignored" }))).toBe("reconsider");
    expect(itemAction(item())).toBe("fix");
  });

  it("a row the pass could not write asks the user instead of ending", () => {
    // Previously null: a dash and no control. The one person who can add
    // what the résumé lacks is the user.
    expect(itemAction(item({ status: "not_coverable" }))).toBe("tell_us");
    expect(itemAction(item({ status: "not_coverable", kind: "keyword" }))).toBe("tell_us");
    expect(itemAction(item({ status: "not_coverable", kind: "contextual" }))).toBe("whats_this");
    // A credential still goes through the honesty routing, never to a bullet form.
    expect(itemAction(item({ status: "not_coverable", name: "Master's degree in CS" }))).toBe("no_fabrication");
    expect(itemAction(item({ status: "not_coverable", name: "Master's degree in CS" }), "partial")).toBe("add_education");
  });
});
