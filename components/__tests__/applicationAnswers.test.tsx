import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ApplicationAnswers, { birthDateProblem, type AnswersSaveState } from "@/components/profile/ApplicationAnswers";
import { RACE_OPTIONS } from "@/lib/applicationAnswers";
import { EMPTY_PROFILE, type ProfileFormState } from "@/lib/profileStorage";

/**
 * Until this card existed there was nowhere in the app to set work authorization
 * or sponsorship. The only editor was in a component nothing imports, and the
 * live ledger renders only after a résumé is uploaded.
 */

function setup(
  initial: Partial<ProfileFormState> = {},
  saveState: AnswersSaveState = "saved",
  extra: Partial<React.ComponentProps<typeof ApplicationAnswers>> = {},
) {
  const onChange = vi.fn();
  const value = { ...EMPTY_PROFILE, ...initial };
  render(<ApplicationAnswers value={value} onChange={onChange} saveState={saveState} {...extra} />);
  return { onChange, value };
}

const sponsorship = () => screen.getByRole("radiogroup", { name: /require visa sponsorship/i });
const workAuth = () => screen.getByRole("radiogroup", { name: /authorized to work/i });
const lastValue = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0] as ProfileFormState;

describe("the questions", () => {
  it("asks seven as chip groups, each its own group, and race and ethnicity as a dropdown", () => {
    setup();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(7);
    expect(screen.getByRole("combobox", { name: /race and ethnicity/i })).toBeInTheDocument();
    expect(workAuth()).toBeInTheDocument();
    expect(sponsorship()).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /disability/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /veteran/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /gender/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /LGBTQ/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /OK to text you/i })).toBeInTheDocument();
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

  it("keeps every field disabled until the saved profile loads", () => {
    setup({}, "loading");
    expect(screen.getByRole("textbox", { name: "Preferred first name" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Country" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "City and state" })).toBeDisabled();
  });

  it("saves the city the Chrome extension asks for, and nothing else with it", () => {
    // The widget lists "Your city" as missing and links here. Until this field
    // existed the only source was a résumé upload, so a person with no résumé
    // had nowhere to type it.
    const { onChange } = setup({ roles: "Data Analyst", country: "United States" });
    const city = screen.getByRole("textbox", { name: "City and state" });
    expect(city).toHaveValue("");

    fireEvent.change(city, { target: { value: "Baltimore, MD" } });
    const next = lastValue(onChange);
    expect(next.currentLocation).toBe("Baltimore, MD");
    expect(next.country).toBe("United States");
    expect(next.roles).toBe("Data Analyst");
  });

  it("shows a saved city and describes the expected format to a screen reader", () => {
    setup({ currentLocation: "Austin, TX" });
    const city = screen.getByRole("textbox", { name: "City and state" });
    expect(city).toHaveValue("Austin, TX");
    // The hint is a description, never part of the accessible name.
    expect(city).toHaveAccessibleDescription(/City, State/);
  });
});

describe("contact details typed for applications", () => {
  const RESUME = {
    name: "Ada Lovelace",
    email: "ada@resume.example",
    phone: "555-0100",
    linkedin: "linkedin.com/in/ada",
    github: "github.com/ada",
    portfolio: "ada.dev",
  };
  const BOXES: [string, keyof ProfileFormState][] = [
    ["Full name", "typedName"],
    ["Email", "typedEmail"],
    ["Phone", "typedPhone"],
    ["LinkedIn", "typedLinkedin"],
    ["GitHub", "typedGithub"],
    ["Portfolio or website", "typedPortfolio"],
  ];

  it("offers all six, each writing its own typed key and nothing else", () => {
    for (const [label, key] of BOXES) {
      const { onChange } = setup({ roles: "Data Analyst" }, "saved", { resume: RESUME });
      fireEvent.change(screen.getAllByRole("textbox", { name: label })[0], { target: { value: "typed value" } });
      const next = lastValue(onChange);
      expect(next[key]).toBe("typed value");
      // Every other typed key is still blank, and the rest of the record is intact.
      for (const [, other] of BOXES) if (other !== key) expect(next[other]).toBe("");
      expect(next.roles).toBe("Data Analyst");
      document.body.innerHTML = "";
    }
  });

  it("shows what the résumé says as the placeholder, so blank is visibly 'use the résumé's'", () => {
    setup({}, "saved", { resume: RESUME });
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveAttribute("placeholder", "Ada Lovelace");
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveAttribute("placeholder", "555-0100");
    expect(screen.getByRole("textbox", { name: "GitHub" })).toHaveAttribute("placeholder", "github.com/ada");
    // A typed value shows as the value, not the placeholder.
    document.body.innerHTML = "";
    setup({ typedPhone: "555-9999" }, "saved", { resume: RESUME });
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("555-9999");
  });

  it("falls back to the sign-in address for Email, and to a neutral hint with no résumé", () => {
    setup({}, "saved", { accountEmail: "me@login.example" });
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("placeholder", "me@login.example");
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveAttribute("placeholder", "From your résumé");
  });

  it("clearing a box writes a blank, which means use the résumé's again", () => {
    const { onChange } = setup({ typedPhone: "555-9999" }, "saved", { resume: RESUME });
    fireEvent.change(screen.getByRole("textbox", { name: "Phone" }), { target: { value: "" } });
    expect(lastValue(onChange).typedPhone).toBe("");
  });

  it("turns browser autofill off, so a saved browser profile cannot be written and autosaved unseen", () => {
    setup({}, "saved", { resume: RESUME });
    for (const [label] of BOXES) {
      expect(screen.getByRole("textbox", { name: label })).toHaveAttribute("autocomplete", "off");
    }
  });

  it("keeps every contact box disabled until the saved profile loads", () => {
    setup({}, "loading", { resume: RESUME });
    for (const [label] of BOXES) expect(screen.getByRole("textbox", { name: label })).toBeDisabled();
  });
});

describe("how the fields are laid out", () => {
  it("restores MUI's content-box on its inputs, which the app's unlayered reset otherwise flattens", () => {
    // jsdom does no layout, so the visible failure (every box one line high, a dropdown's value
    // clipped to nothing) cannot be seen here. It is pinned as a source fact instead, and was
    // verified in a real browser: MUI's rule sits in @layer mui, `* { box-sizing: border-box }`
    // in globals.css does not, and an unlayered rule beats a layered one whatever its specificity.
    const source = readFileSync(join(process.cwd(), "components/profile/ApplicationAnswers.tsx"), "utf8");
    expect(source).toMatch(/\.aa-card \.MuiInputBase-input\s*\{\s*box-sizing:\s*content-box;/);
    expect(source).toMatch(/className="aa-card"/);
    expect(readFileSync(join(process.cwd(), "app/globals.css"), "utf8")).toMatch(
      /\*,\s*\*::before,\s*\*::after\s*\{\s*box-sizing:\s*border-box;/,
    );
  });
});

describe("date of birth", () => {
  const dob = () => screen.getByLabelText("Date of birth");

  it("writes the typed date to its own key and nothing else", () => {
    const { onChange } = setup({ roles: "Data Analyst", eeoWorkUs: "Yes" });
    fireEvent.change(dob(), { target: { value: "1990-03-04" } });
    const next = lastValue(onChange);
    expect(next.dateOfBirth).toBe("1990-03-04");
    expect(next.roles).toBe("Data Analyst");
    expect(next.eeoWorkUs).toBe("Yes");
    expect(next.typedName).toBe("");
  });

  it("is a real date input, so the browser's picker prevents a malformed value", () => {
    setup();
    expect(dob()).toHaveAttribute("type", "date");
  });

  it("shows a saved date, and survives a null where a string was expected", () => {
    setup({ dateOfBirth: "1990-03-04" });
    expect(dob()).toHaveValue("1990-03-04");
    document.body.innerHTML = "";
    // A stored JSON null overrides the empty default when the record is spread.
    setup({ dateOfBirth: null as unknown as string });
    expect(dob()).toHaveValue("");
  });

  it("does not flip the box from uncontrolled to controlled when a stored null becomes a date", () => {
    // A JSON null in the saved record overrides the empty default. If it reached the
    // input as null, React would treat the box as uncontrolled and warn the moment a
    // real date arrived. The box has to be controlled from the first render.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const onChange = vi.fn();
      const { rerender } = render(
        <ApplicationAnswers
          value={{ ...EMPTY_PROFILE, dateOfBirth: null as unknown as string }}
          onChange={onChange}
          saveState="saved"
        />,
      );
      rerender(
        <ApplicationAnswers value={{ ...EMPTY_PROFILE, dateOfBirth: "1990-03-04" }} onChange={onChange} saveState="saved" />,
      );
      const warned = spy.mock.calls.filter((c) => /controlled|should not be null/i.test(String(c[0])));
      expect(warned).toEqual([]);
      expect(dob()).toHaveValue("1990-03-04");
    } finally {
      spy.mockRestore();
    }
  });

  it("says where it is used and where it is not, so blank reads as a choice", () => {
    setup();
    expect(screen.getByText(/only filled when an application asks for it/i)).toBeInTheDocument();
    expect(screen.getByText(/never read from your résumé/i)).toBeInTheDocument();
    expect(screen.getByText(/never shown to the AI/i)).toBeInTheDocument();
  });

  it("turns browser autofill off, so a saved birthday cannot be written and autosaved unseen", () => {
    setup();
    expect(dob()).toHaveAttribute("autocomplete", "off");
  });

  it("clearing it writes a blank", () => {
    const { onChange } = setup({ dateOfBirth: "1990-03-04" });
    fireEvent.change(dob(), { target: { value: "" } });
    expect(lastValue(onChange).dateOfBirth).toBe("");
  });

  it("is disabled until the saved profile has loaded", () => {
    setup({}, "loading");
    expect(dob()).toBeDisabled();
  });

  it("warns when a saved date would not be used, instead of saving it quietly", () => {
    setup({ dateOfBirth: "2999-01-01" });
    expect(dob()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/will not be used/i)).toBeInTheDocument();
    document.body.innerHTML = "";
    setup({ dateOfBirth: "1990-03-04" });
    expect(dob()).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/will not be used/i)).not.toBeInTheDocument();
  });

  describe("birthDateProblem", () => {
    const now = new Date(2026, 10, 2, 12, 0, 0); // 2 Nov 2026, local
    it.each([
      ["1990-03-04", ""],
      ["2026-11-02", ""], // today is fine
      ["1900-01-01", ""], // the floor is inclusive
      ["", ""], // blank is not a problem
      ["   ", ""],
      [null, ""],
      [undefined, ""],
    ])("accepts %j", (raw, expected) => {
      expect(birthDateProblem(raw as string, now)).toBe(expected);
    });
    it.each([["2026-11-03"], ["2999-01-01"], ["1899-12-31"], ["03/04/1990"], ["1990-3-4"], ["not a date"]])(
      "rejects %j",
      (raw) => {
        expect(birthDateProblem(raw, now)).toMatch(/will not be used/);
      },
    );
  });
});

describe("race and ethnicity", () => {
  const race = () => screen.getByRole("combobox", { name: /race and ethnicity/i }) as HTMLSelectElement;

  it("offers exactly the EEO-1 categories in the EEOC's wording, then Decline, after a blank", () => {
    setup();
    const shown = Array.from(race().options).map((o) => o.value);
    expect(shown).toEqual([
      "",
      "Hispanic or Latino",
      "White (Not Hispanic or Latino)",
      "Black or African American (Not Hispanic or Latino)",
      "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
      "Asian (Not Hispanic or Latino)",
      "Asian: East Asian (Not Hispanic or Latino)",
      "Asian: South Asian (Not Hispanic or Latino)",
      "Asian: Southeast Asian (Not Hispanic or Latino)",
      "American Indian or Alaska Native (Not Hispanic or Latino)",
      "Middle Eastern or North African (Not Hispanic or Latino)",
      "Two or More Races (Not Hispanic or Latino)",
      "Decline to state",
    ]);
    // The same list the extension is told to read.
    expect(shown.slice(1)).toEqual([...RACE_OPTIONS]);
  });

  it("saves the subregion of Asian that a form such as DoorDash's asks for", () => {
    const { onChange } = setup({ roles: "Data Analyst" });
    fireEvent.change(race(), { target: { value: "Asian: South Asian (Not Hispanic or Latino)" } });
    const next = lastValue(onChange);
    expect(next.eeoRace).toBe("Asian: South Asian (Not Hispanic or Latino)");
    expect(next.roles).toBe("Data Analyst");
  });

  it("shows a saved subregion as selected instead of reading as unanswered", () => {
    setup({ eeoRace: "Asian: East Asian (Not Hispanic or Latino)" });
    expect(race()).toHaveValue("Asian: East Asian (Not Hispanic or Latino)");
    expect(screen.queryByText(/Saved as/)).not.toBeInTheDocument();
  });

  it("writes the chosen category to its own key and nothing else", () => {
    const { onChange } = setup({ roles: "Data Analyst", eeoGender: "Female" });
    fireEvent.change(race(), { target: { value: "Asian (Not Hispanic or Latino)" } });
    const next = lastValue(onChange);
    expect(next.eeoRace).toBe("Asian (Not Hispanic or Latino)");
    expect(next.eeoGender).toBe("Female");
    expect(next.roles).toBe("Data Analyst");
  });

  it("shows the saved category as selected", () => {
    setup({ eeoRace: "Hispanic or Latino" });
    expect(race()).toHaveValue("Hispanic or Latino");
  });

  it("starts unanswered, and the blank option is the way back", () => {
    const { onChange } = setup({ eeoRace: "Decline to state" });
    expect(race()).toHaveValue("Decline to state");
    fireEvent.change(race(), { target: { value: "" } });
    expect(lastValue(onChange).eeoRace).toBe("");
  });

  it("says what is saved when it is not one of the categories, instead of looking unanswered", () => {
    setup({ eeoRace: "Caucasian" });
    expect(screen.getByText(/Saved as “Caucasian”/)).toBeInTheDocument();
    expect(race()).toHaveValue("");
  });

  it("counts as an answer only when it is one of the categories", () => {
    setup({ eeoRace: "Asian (Not Hispanic or Latino)" });
    expect(screen.getByText("1 of 8 answered")).toBeInTheDocument();
    document.body.innerHTML = "";
    setup({ eeoRace: "Caucasian" });
    expect(screen.getByText("0 of 8 answered")).toBeInTheDocument();
  });

  it("is disabled until the saved profile has loaded", () => {
    setup({}, "loading");
    expect(race()).toBeDisabled();
  });

  it("is introduced as optional, with Decline to state always valid", () => {
    setup();
    expect(screen.getByText(/“Decline to state” is always a valid answer/)).toBeInTheDocument();
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

describe("text messages from employers", () => {
  const sms = () => screen.getByRole("radiogroup", { name: /OK to text you/i });

  it("offers Yes and No only, with nothing chosen and nothing to clear until the person answers", () => {
    // A consent is never pre-selected. A card that opened with "Yes" ticked would be giving
    // the person's consent for them.
    setup();
    expect(within(sms()).getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["Yes", "No"]);
    for (const r of within(sms()).getAllByRole("radio")) expect(r).not.toBeChecked();
    expect(within(sms()).queryByRole("button", { name: /Clear/ })).not.toBeInTheDocument();
  });

  it("writes the answer to its own key and nothing else", async () => {
    const { onChange } = setup({ eeoWorkUs: "Yes", roles: "Data Analyst" });
    await userEvent.click(within(sms()).getByRole("radio", { name: "Yes" }));
    const next = lastValue(onChange);
    expect(next.smsOptIn).toBe("Yes");
    expect(next.eeoWorkUs).toBe("Yes");
    expect(next.roles).toBe("Data Analyst");
  });

  it("shows a saved answer, and Clear is the way back to unanswered", async () => {
    const { onChange } = setup({ smsOptIn: "No" });
    expect(within(sms()).getByRole("radio", { name: "No" })).toBeChecked();
    await userEvent.click(within(sms()).getByRole("button", { name: /Clear your answer/ }));
    expect(lastValue(onChange).smsOptIn).toBe("");
  });

  it("says it is a consent that is never chosen for the person", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Messages from employers" })).toBeInTheDocument();
    expect(screen.getByText(/consent you give, so it is never chosen for you/)).toBeInTheDocument();
  });

  it("writes nothing just because the card was opened", () => {
    const { onChange } = setup({ smsOptIn: "Yes", yearsExperience: "6" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is disabled until the saved profile has loaded", () => {
    setup({}, "loading");
    for (const r of within(sms()).getAllByRole("radio")) expect(r).toBeDisabled();
  });
});

describe("years of professional experience", () => {
  const years = () => screen.getByRole("textbox", { name: "Years of professional experience" }) as HTMLInputElement;

  it("saves what is typed to its own key and nothing else", () => {
    const { onChange } = setup({ roles: "Data Analyst" });
    fireEvent.change(years(), { target: { value: "6" } });
    const next = lastValue(onChange);
    expect(next.yearsExperience).toBe("6");
    expect(next.roles).toBe("Data Analyst");
  });

  it("takes one decimal, and a clear", () => {
    const { onChange } = setup({ yearsExperience: "5" });
    fireEvent.change(years(), { target: { value: "5.5" } });
    expect(lastValue(onChange).yearsExperience).toBe("5.5");
    fireEvent.change(years(), { target: { value: "" } });
    expect(lastValue(onChange).yearsExperience).toBe("");
  });

  it.each(["abc", "6 years", "-1", "5.55", "61", "99", "1e2", "5,5"])("does not take %j as it is typed", (typed) => {
    const { onChange } = setup({ yearsExperience: "6" });
    fireEvent.change(years(), { target: { value: typed } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a saved value that will not be used as it is, says so, and never rewrites it", () => {
    const { onChange } = setup({ yearsExperience: "six" });
    expect(years()).toHaveValue("six");
    expect(screen.getByText(/That will not be used\. Enter a number from 0 to 60/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("says what it is for when the value is fine, so blank reads as a choice", () => {
    setup({ yearsExperience: "6" });
    expect(screen.getByText(/Leave it blank to skip/)).toBeInTheDocument();
    expect(screen.queryByText(/will not be used/)).not.toBeInTheDocument();
  });

  it("brings up a number pad on a phone, and turns browser autofill off", () => {
    setup();
    expect(years()).toHaveAttribute("inputmode", "decimal");
    expect(years()).toHaveAttribute("autocomplete", "off");
  });

  it("survives a stored null where a string was expected", () => {
    setup({ yearsExperience: null as unknown as string });
    expect(years()).toHaveValue("");
  });

  it("is disabled until the saved profile has loaded", () => {
    setup({}, "loading");
    expect(years()).toBeDisabled();
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
    expect(screen.getByText("3 of 8 answered")).toBeInTheDocument();
  });
});
