import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApplicationAnswers, { type AnswersSaveState } from "@/components/profile/ApplicationAnswers";
import { EMPTY_PROFILE, type ProfileFormState } from "@/lib/profileStorage";

/**
 * Until this card existed there was nowhere in the app to set work authorization
 * or sponsorship. The only editor was in a component nothing imports, and the
 * live ledger renders only after a résumé is uploaded.
 */

function setup(initial: Partial<ProfileFormState> = {}, saveState: AnswersSaveState = "saved") {
  const onChange = vi.fn();
  const value = { ...EMPTY_PROFILE, ...initial };
  render(<ApplicationAnswers value={value} onChange={onChange} saveState={saveState} />);
  return { onChange, value };
}

const sponsorship = () => screen.getByRole("radiogroup", { name: /require visa sponsorship/i });
const workAuth = () => screen.getByRole("radiogroup", { name: /authorized to work/i });
const lastValue = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0] as ProfileFormState;

describe("the questions", () => {
  it("asks all six, each as its own group", () => {
    setup();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(6);
    expect(workAuth()).toBeInTheDocument();
    expect(sponsorship()).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /disability/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /veteran/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /gender/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /LGBTQ/i })).toBeInTheDocument();
  });

  it("offers Yes and No only on the two eligibility questions", () => {
    setup();
    for (const group of [workAuth(), sponsorship()]) {
      const names = within(group).getAllByRole("radio").map((r) => (r as HTMLInputElement).value);
      expect(names).toEqual(["Yes", "No"]);
    }
  });

  it("offers a decline option on every voluntary question", () => {
    setup();
    for (const name of [/disability/i, /veteran/i, /gender/i, /LGBTQ/i]) {
      const group = screen.getByRole("radiogroup", { name });
      expect(within(group).getByRole("radio", { name: "Decline to state" })).toBeInTheDocument();
    }
  });

  it("says out loud that a blank answer stays blank", () => {
    setup();
    expect(screen.getByText(/Anything you leave blank stays blank/)).toBeInTheDocument();
  });
});

describe("application autofill details", () => {
  it("shows and saves preferred first name and country", async () => {
    const { onChange } = setup({ preferredName: "Alex", country: "Canada" });
    const preferredName = screen.getByRole("textbox", { name: "Preferred first name" });
    const country = screen.getByRole("textbox", { name: "Country" });
    expect(preferredName).toHaveValue("Alex");
    expect(country).toHaveValue("Canada");

    fireEvent.change(preferredName, { target: { value: "Avery" } });
    expect(lastValue(onChange).preferredName).toBe("Avery");
    expect(lastValue(onChange).country).toBe("Canada");

    fireEvent.change(country, { target: { value: "United States" } });
    expect(lastValue(onChange).country).toBe("United States");
  });

  it("keeps both fields disabled until the saved profile loads", () => {
    setup({}, "loading");
    expect(screen.getByRole("textbox", { name: "Preferred first name" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Country" })).toBeDisabled();
  });
});

describe("saving an answer", () => {
  it("writes exactly the value the extension reads", async () => {
    const { onChange } = setup();
    await userEvent.click(within(workAuth()).getByRole("radio", { name: "Yes" }));
    expect(lastValue(onChange).eeoWorkUs).toBe("Yes");
    await userEvent.click(within(sponsorship()).getByRole("radio", { name: "No" }));
    expect(lastValue(onChange).eeoSponsor).toBe("No");
  });

  it("uses the hyphenated gender option the extension matches", async () => {
    const { onChange } = setup();
    await userEvent.click(
      within(screen.getByRole("radiogroup", { name: /gender/i })).getByRole("radio", { name: "Non-Binary" }),
    );
    expect(lastValue(onChange).eeoGender).toBe("Non-Binary");
  });

  it("changes only the answer touched and keeps the rest of the profile", async () => {
    // The whole record is upserted, so a patch that dropped a field would erase it.
    const { onChange } = setup({ roles: "Data Analyst", tone: "formal", eeoWorkUs: "Yes" });
    await userEvent.click(within(sponsorship()).getByRole("radio", { name: "No" }));
    const next = lastValue(onChange);
    expect(next.eeoSponsor).toBe("No");
    expect(next.eeoWorkUs).toBe("Yes");
    expect(next.roles).toBe("Data Analyst");
    expect(next.tone).toBe("formal");
  });

  it("gives each question its own radio name, so a real browser cannot link them", () => {
    // jsdom does not enforce radio-group exclusivity across a shared name the way a
    // browser does, so the test above cannot see this. The names are the contract:
    // one per question, shared by every option inside it.
    setup();
    const names = screen.getAllByRole("radiogroup").map((group) => {
      const inGroup = new Set(within(group).getAllByRole("radio").map((r) => (r as HTMLInputElement).name));
      expect(inGroup.size).toBe(1);
      return [...inGroup][0];
    });
    expect(new Set(names).size).toBe(names.length);
  });

  it("shows the saved answer as selected", () => {
    setup({ eeoWorkUs: "No", eeoVeteran: "Decline to state" });
    expect(within(workAuth()).getByRole("radio", { name: "No" })).toBeChecked();
    expect(within(workAuth()).getByRole("radio", { name: "Yes" })).not.toBeChecked();
    expect(
      within(screen.getByRole("radiogroup", { name: /veteran/i })).getByRole("radio", { name: "Decline to state" }),
    ).toBeChecked();
  });
});

describe("clearing an answer", () => {
  it("offers Clear only once an answer exists", () => {
    setup();
    expect(screen.queryByRole("button", { name: /Clear your answer/ })).not.toBeInTheDocument();
  });

  it("empties just that question", async () => {
    const { onChange } = setup({ eeoWorkUs: "Yes", eeoSponsor: "No" });
    await userEvent.click(screen.getByRole("button", { name: /Clear your answer to: Will you now or in the future require visa sponsorship/ }));
    const next = lastValue(onChange);
    expect(next.eeoSponsor).toBe("");
    expect(next.eeoWorkUs).toBe("Yes");
  });
});

describe("a value this card cannot show as selected", () => {
  it("says what is saved instead of looking unanswered", () => {
    setup({ eeoWorkUs: "yes, I think" });
    expect(screen.getByText(/Saved as “yes, I think”/)).toBeInTheDocument();
    for (const r of within(workAuth()).getAllByRole("radio")) expect(r).not.toBeChecked();
  });
});

describe("before the saved profile has loaded", () => {
  it("cannot be edited, because the load would overwrite the edit", () => {
    setup({}, "loading");
    for (const r of screen.getAllByRole("radio")) expect(r).toBeDisabled();
  });

  it("is editable once loaded", () => {
    setup({}, "saved");
    for (const r of screen.getAllByRole("radio")) expect(r).toBeEnabled();
  });

  it("disables Clear too", () => {
    setup({ eeoWorkUs: "Yes" }, "loading");
    expect(screen.getByRole("button", { name: /Clear your answer/ })).toBeDisabled();
  });
});

describe("the save line", () => {
  it.each([
    ["saved", "Saved automatically"],
    ["saving", "Saving…"],
    ["unsaved", "Unsaved changes"],
    ["loading", "Loading your answers…"],
  ] as const)("says %s", (state, text) => {
    setup({}, state);
    expect(screen.getByRole("status")).toHaveTextContent(text);
  });

  it("counts the answers", () => {
    setup({ eeoWorkUs: "Yes", eeoSponsor: "No", eeoGender: "Male" });
    expect(screen.getByText("3 of 6 answered")).toBeInTheDocument();
  });
});
