import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TargetsEditor, { addUnique, splitList } from "@/components/profile/TargetsEditor";
import { EMPTY_PROFILE, type ProfileFormState } from "@/lib/profileStorage";

/**
 * `roles` and `locations` decide what the Jobs feed ranks. Before this editor
 * existed there was no way to change either after onboarding, and the button
 * that claimed to do it had no onClick.
 */

function setup(initial: Partial<ProfileFormState> = {}) {
  const onChange = vi.fn();
  const value = { ...EMPTY_PROFILE, ...initial };
  render(<TargetsEditor value={value} onChange={onChange} />);
  return { onChange, value };
}

/** The value the caller would hold after applying the last onChange. */
function lastValue(onChange: ReturnType<typeof vi.fn>) {
  return onChange.mock.calls.at(-1)?.[0] as ProfileFormState;
}

describe("target roles can actually be changed", () => {
  it("adds a typed role", async () => {
    const { onChange } = setup();
    await userEvent.type(screen.getByLabelText("Add a target role"), "Platform Engineer");
    await userEvent.click(screen.getByRole("button", { name: "Add role" }));
    expect(lastValue(onChange).roles).toBe("Platform Engineer");
  });

  it("appends rather than replacing", async () => {
    const { onChange } = setup({ roles: "Software Engineer" });
    await userEvent.type(screen.getByLabelText("Add a target role"), "Data Analyst");
    await userEvent.click(screen.getByRole("button", { name: "Add role" }));
    expect(lastValue(onChange).roles).toBe("Software Engineer, Data Analyst");
  });

  it("removes a role", async () => {
    const { onChange } = setup({ roles: "Software Engineer, Data Analyst" });
    await userEvent.click(screen.getByRole("button", { name: "Remove Software Engineer" }));
    expect(lastValue(onChange).roles).toBe("Data Analyst");
  });

  it("Enter adds without submitting anything", async () => {
    const { onChange } = setup();
    await userEvent.type(screen.getByLabelText("Add a target role"), "Nurse{Enter}");
    expect(lastValue(onChange).roles).toBe("Nurse");
  });

  it("a suggestion adds in one click", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Product Manager/ }));
    expect(lastValue(onChange).roles).toBe("Product Manager");
  });

  it("hides a suggestion already on the list", () => {
    setup({ roles: "Product Manager" });
    expect(screen.queryByRole("button", { name: /^Product Manager$/ })).not.toBeInTheDocument();
  });
});

describe("locations and tone", () => {
  it("adds a location without touching roles", async () => {
    const { onChange } = setup({ roles: "Software Engineer" });
    await userEvent.type(screen.getByLabelText("Add a target location"), "Remote{Enter}");
    const v = lastValue(onChange);
    expect(v.locations).toBe("Remote");
    expect(v.roles).toBe("Software Engineer");
  });

  it("sets tone and marks it chosen", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("radio", { name: "Formal" }));
    expect(lastValue(onChange).tone).toBe("formal");
  });

  it("shows the current tone as checked", () => {
    setup({ tone: "friendly" });
    expect(screen.getByRole("radio", { name: "Friendly" })).toBeChecked();
  });
});

describe("addUnique", () => {
  it("refuses a case-insensitive duplicate", () => {
    // Otherwise "remote" and "Remote" both reach the feed as separate targets.
    expect(addUnique(["Remote"], "remote")).toEqual(["Remote"]);
  });

  it("keeps the typed casing of a genuinely new entry", () => {
    expect(addUnique(["Remote"], "NYC")).toEqual(["Remote", "NYC"]);
  });

  it("ignores blank input", () => {
    expect(addUnique(["Remote"], "   ")).toEqual(["Remote"]);
  });

  it("round-trips through the comma-joined storage format", () => {
    expect(splitList(" Software Engineer ,, Data Analyst ")).toEqual([
      "Software Engineer", "Data Analyst",
    ]);
  });
});
