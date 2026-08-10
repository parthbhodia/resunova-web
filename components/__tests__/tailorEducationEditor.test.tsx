import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TailorFixExpansion } from "@/components/tailor/TailorFixExpansion";
import { itemAction } from "@/components/tailor/TailorWorkQueue";
import type { QueueItem } from "@/lib/tailorWorkQueue";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const item = (over: Partial<QueueItem> = {}): QueueItem => ({
  id: "q1",
  name: "Bachelor's degree in Computer Science",
  kind: "qualification",
  status: "queued",
  detail: "",
  ...over,
});

const doc = (): StructuredResume =>
  ({ full_name: "Jane", education: [], experience: [], projects: [], skills: [], extra_sections: [] }) as unknown as StructuredResume;

/**
 * The gate. A credential row is the ONE place the product could be talked into
 * writing a qualification onto someone's résumé, so which side of the line it
 * falls on is pinned in both directions.
 */
describe("who gets offered the education editor", () => {
  it("offers it when the résumé HAS the credential and the scanner missed the wording", () => {
    expect(itemAction(item(), "partial")).toBe("add_education");
  });

  it("NEVER offers it for a credential the résumé does not evidence", () => {
    // Offering a form here is offering to type in a degree you do not hold.
    expect(itemAction(item(), "not_evidenced")).toBe("no_action");
  });

  it("still sends an ordinary skill row to the bullet fixer", () => {
    // The tempting over-correction is to route everything away from the fixer.
    expect(itemAction(item({ name: "full stack development" }), "not_evidenced")).toBe("fix");
  });
});

describe("the education editor writes a real entry", () => {
  const state = { phase: "credential" } as const;

  it("seeds degree and field from the requirement", () => {
    render(
      <TailorFixExpansion
        item={item()} state={state} onApply={vi.fn()} onIgnore={vi.fn()} onClose={vi.fn()}
        onAddEducation={vi.fn()} structuredResume={doc()}
      />,
    );
    expect(screen.getByDisplayValue("Bachelor's")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Computer Science")).toBeInTheDocument();
  });

  it("will not save until a school is filled in", () => {
    render(
      <TailorFixExpansion
        item={item()} state={state} onApply={vi.fn()} onIgnore={vi.fn()} onClose={vi.fn()}
        onAddEducation={vi.fn()} structuredResume={doc()}
      />,
    );
    expect(screen.getByRole("button", { name: /Add to my résumé/i })).toBeDisabled();
  });

  it("hands a structured entry to the writer, not a string", async () => {
    const onAddEducation = vi.fn();
    const onClose = vi.fn();
    render(
      <TailorFixExpansion
        item={item()} state={state} onApply={vi.fn()} onIgnore={vi.fn()} onClose={onClose}
        onAddEducation={onAddEducation} structuredResume={doc()}
      />,
    );
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "UMBC" } });
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2024" } });
    fireEvent.click(screen.getByRole("button", { name: /Add to my résumé/i }));
    await waitFor(() => expect(onAddEducation).toHaveBeenCalledTimes(1));
    expect(onAddEducation.mock.calls[0][0]).toMatchObject({
      institution: "UMBC",
      degree: "Bachelor's in Computer Science",
      dates: "2024",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("warns about a duplicate but does not block it", () => {
    const existing = {
      ...doc(),
      education: [
        { institution: "UMBC", degree: "Bachelors in Computer Science", dates: "", location: "", bullets: [] },
      ],
    } as StructuredResume;
    render(
      <TailorFixExpansion
        item={item()} state={state} onApply={vi.fn()} onIgnore={vi.fn()} onClose={vi.fn()}
        onAddEducation={vi.fn()} structuredResume={existing}
      />,
    );
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "UMBC" } });
    expect(screen.getByText(/already in your Education/i)).toBeInTheDocument();
    // Blocking would stop someone listing a degree they hold. Warn, don't gate.
    expect(screen.getByRole("button", { name: /Add to my résumé/i })).not.toBeDisabled();
  });

  it("degrades to instructions when there is no résumé to write to", () => {
    // The /tailor-preview harness has no document; the card must still explain.
    render(
      <TailorFixExpansion
        item={item()} state={state} onApply={vi.fn()} onIgnore={vi.fn()} onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Add it in your Education section/i)).toBeInTheDocument();
  });

  it("tells the user not to add what they cannot prove", () => {
    render(
      <TailorFixExpansion
        item={item()} state={state} onApply={vi.fn()} onIgnore={vi.fn()} onClose={vi.fn()}
        onAddEducation={vi.fn()} structuredResume={doc()}
      />,
    );
    expect(screen.getByText(/Only add a credential you can actually prove/i)).toBeInTheDocument();
  });
});
