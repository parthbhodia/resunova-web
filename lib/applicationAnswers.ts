/**
 * The standard answers almost every job application asks for.
 *
 * These live in `user_profiles.profile` (`ProfileFormState.eeo*`) and are read
 * back by the Resunova extension, which fills a question only from one of
 * these saved answers and leaves it alone when the key is empty. The option
 * strings are therefore a contract with that reader, not just display text:
 * it understands exactly "Yes", "No", "Decline to state" and, for gender,
 * "Male", "Female" and "Non-Binary". Change a string here and the extension
 * silently stops matching it.
 *
 * Race and ethnicity use the seven EEO-1 category names, spelled the way the
 * EEOC publishes them, because that spelling is what tells the extension whether
 * an answer also means "not Hispanic or Latino" (forms that ask that as a
 * separate Yes/No question). They are the same contract: the extension reads
 * these exact strings from `RACE_OPTIONS`.
 */

import type { ProfileFormState } from "@/lib/profileStorage";

export type ApplicationAnswerKey =
  | "eeoWorkUs"
  | "eeoSponsor"
  | "eeoDisability"
  | "eeoVeteran"
  | "eeoGender"
  | "eeoLgbtq"
  | "eeoRace";

export type ApplicationAnswerQuestion = {
  key: ApplicationAnswerKey;
  label: string;
  options: readonly string[];
  /** `eligibility` questions are required by most forms; `voluntary` ones are optional by law. */
  group: "eligibility" | "voluntary";
  /** How the options are shown. Short Yes/No sets are chips; a long list of names is a dropdown. */
  control?: "chips" | "select";
};

const YES_NO = ["Yes", "No"] as const;
const YES_NO_DECLINE = ["Yes", "No", "Decline to state"] as const;

/**
 * The EEO-1 race and ethnicity categories, in the EEOC's own wording and order,
 * plus the decline option every form must offer. A person who is Hispanic or Latino
 * of any race picks "Hispanic or Latino"; the other six all say "(Not Hispanic or
 * Latino)" because that is how the category is defined, not decoration. Multi-select
 * forms and the 2024 OMB categories (such as Middle Eastern or North African) are not
 * modelled: a form whose options cannot say one of these is left for the person.
 */
export const RACE_OPTIONS = [
  "Hispanic or Latino",
  "White (Not Hispanic or Latino)",
  "Black or African American (Not Hispanic or Latino)",
  "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
  "Asian (Not Hispanic or Latino)",
  "American Indian or Alaska Native (Not Hispanic or Latino)",
  "Two or More Races (Not Hispanic or Latino)",
  "Decline to state",
] as const;

export const APPLICATION_ANSWER_QUESTIONS: readonly ApplicationAnswerQuestion[] = [
  {
    key: "eeoWorkUs",
    label: "Are you legally authorized to work in the United States?",
    options: YES_NO,
    group: "eligibility",
  },
  {
    key: "eeoSponsor",
    label: "Will you now or in the future require visa sponsorship?",
    options: YES_NO,
    group: "eligibility",
  },
  {
    key: "eeoDisability",
    label: "Do you have a disability?",
    options: YES_NO_DECLINE,
    group: "voluntary",
  },
  {
    key: "eeoVeteran",
    label: "Are you a veteran?",
    options: YES_NO_DECLINE,
    group: "voluntary",
  },
  {
    key: "eeoGender",
    label: "What is your gender?",
    options: ["Male", "Female", "Non-Binary", "Decline to state"],
    group: "voluntary",
  },
  {
    key: "eeoRace",
    label: "How do you describe your race and ethnicity?",
    options: RACE_OPTIONS,
    group: "voluntary",
    control: "select",
  },
  {
    key: "eeoLgbtq",
    label: "Do you identify as LGBTQ+?",
    options: YES_NO_DECLINE,
    group: "voluntary",
  },
];

/**
 * How many of the saved answers are one this editor can show as selected.
 * A stored value that is not one of the options (an older free-text answer)
 * is not counted: the control would show nothing selected for it.
 */
export function answeredCount(profile: Pick<ProfileFormState, ApplicationAnswerKey>): number {
  return APPLICATION_ANSWER_QUESTIONS.filter((q) => q.options.includes(profile[q.key])).length;
}
