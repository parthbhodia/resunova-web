import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TemplateFirstRunPicker from "@/components/TemplateBuilder/TemplateFirstRunPicker";
import { RESUME_EXAMPLE_INDEX } from "@/lib/resumeExamplesIndex";

const onPick = vi.fn();
const onPickExample = vi.fn();
const onSkip = vi.fn();

function mount() {
  return render(
    <TemplateFirstRunPicker onPick={onPick} onPickExample={onPickExample} onSkip={onSkip} />,
  );
}

function search(): HTMLInputElement {
  return document.querySelector("[data-first-run-search]") as HTMLInputElement;
}

beforeEach(() => {
  onPick.mockClear();
  onPickExample.mockClear();
  onSkip.mockClear();
});

describe("the cold open can find your role", () => {
  it("renders a search box over every example", () => {
    mount();
    expect(search()).toBeTruthy();
    expect(search().placeholder).toContain(String(RESUME_EXAMPLE_INDEX.length));
  });

  it("shows a chip for every category", () => {
    mount();
    const chips = document.querySelectorAll("[data-first-run-category]");
    expect(chips.length).toBe(new Set(RESUME_EXAMPLE_INDEX.map((r) => r.category)).size);
  });

  it("lists no examples until you ask for some", () => {
    mount();
    expect(document.querySelector("[data-first-run-examples]")).toBeNull();
  });

  it("typing a role surfaces matching examples", () => {
    mount();
    fireEvent.change(search(), { target: { value: "nurse" } });
    const cards = document.querySelectorAll("[data-first-run-example]");
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.getByText(/Entry-Level Registered Nurse/)).toBeTruthy();
  });

  it("a category chip alone browses that category", () => {
    mount();
    fireEvent.click(document.querySelector('[data-first-run-category="Healthcare"]') as Element);
    expect(document.querySelectorAll("[data-first-run-example]").length).toBeGreaterThan(0);
  });

  it("clear returns the picker to its resting state", () => {
    mount();
    fireEvent.change(search(), { target: { value: "nurse" } });
    fireEvent.click(document.querySelector("[data-first-run-clear]") as Element);
    expect(document.querySelector("[data-first-run-examples]")).toBeNull();
    expect(search().value).toBe("");
  });

  it("says so rather than showing an empty grid when nothing matches", () => {
    mount();
    fireEvent.change(search(), { target: { value: "zzzznotarole" } });
    expect(screen.getByText(/No examples match that/i)).toBeTruthy();
    expect(document.querySelectorAll("[data-first-run-example]").length).toBe(0);
  });
});

describe("starting from an example", () => {
  it("hands the builder a real document with the identity cleared", async () => {
    mount();
    fireEvent.change(search(), { target: { value: "entry-level registered nurse" } });
    fireEvent.click(document.querySelector("[data-first-run-example]") as Element);

    await waitFor(() => expect(onPickExample).toHaveBeenCalledTimes(1));
    const data = onPickExample.mock.calls[0][0];
    expect(data.workExperiences.some((w: { company: string }) => w.company.trim())).toBe(true);
    expect(data.profile.name).toBe("");
    expect(data.profile.email).toBe("");
    // Picking an example is not picking a style — the example carries its own.
    expect(onPick).not.toHaveBeenCalled();
  });

  it("tells the reader the sample experience is theirs to replace", () => {
    mount();
    fireEvent.change(search(), { target: { value: "nurse" } });
    expect(document.body.textContent).toMatch(/replaced with yours/i);
  });
});

describe("what the redesign must not lose", () => {
  it("still offers every template", () => {
    mount();
    expect(document.querySelectorAll("[data-first-run-card]").length).toBe(5);
  });

  it("still says a template is not a lock-in", () => {
    mount();
    expect(document.body.textContent).toMatch(/any template works for any role/i);
  });

  it("still lets you skip straight to writing", () => {
    mount();
    fireEvent.click(document.querySelector("[data-first-run-skip]") as Element);
    expect(onSkip).toHaveBeenCalled();
  });
});
