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
 * Race and ethnicity use the EEO-1 category names, spelled the way the EEOC
 * publishes them, because that spelling is what tells the extension whether
 * an answer also means "not Hispanic or Latino" (forms that ask that as a
 * separate Yes/No question). They are the same contract: the extension reads
 * these exact strings from `RACE_OPTIONS`.
 *
 * Two more answers are saved here that are not a pick from a list: "Is it OK to
 * text you" (`smsOptIn`, Yes or No) and the years of professional experience
 * (`yearsExperience`, a number written as text). Both are read the same way: a
 * blank one is never answered for the person.
 */

import type { ProfileFormState } from "@/lib/profileStorage";

export type ApplicationAnswerKey =
  | "eeoWorkUs"
  | "eeoSponsor"
  | "eeoDisability"
  | "eeoVeteran"
  | "eeoGender"
  | "eeoLgbtq"
  | "eeoRace"
  | "smsOptIn";

export type ApplicationAnswerQuestion = {
  key: ApplicationAnswerKey;
  label: string;
  options: readonly string[];
  /**
   * `eligibility` questions are required by most forms; `voluntary` ones are optional by law;
   * `communication` is a consent the person gives, so it is never pre-selected.
   */
  group: "eligibility" | "voluntary" | "communication";
  /** How the options are shown. Short Yes/No sets are chips; a long list of names is a dropdown. */
  control?: "chips" | "select";
};

const YES_NO = ["Yes", "No"] as const;
const YES_NO_DECLINE = ["Yes", "No", "Decline to state"] as const;

/**
 * The EEO-1 race and ethnicity categories, in the EEOC's own wording and order,
 * plus the decline option every form must offer. A person who is Hispanic or Latino
 * of any race picks "Hispanic or Latino"; every other category says "(Not Hispanic or
 * Latino)" because that is how the category is defined, not decoration.
 *
 * Two additions to the EEOC's list, both because real forms ask for them:
 *  - Asian comes in three subregions. Forms such as DoorDash's split it into
 *    "Asian: East Asian" and "Asian: South Asian", and a saved plain "Asian" cannot say
 *    which one the person is, so the extension would have to guess a distinct fact about
 *    them. A subregion here makes the answer certain. Plain "Asian" stays for forms that
 *    offer only Asian.
 *  - Middle Eastern or North African, the 2024 federal (OMB) category, which current
 *    forms list as its own option.
 *
 * Multi-select forms are not modelled: a form whose options cannot say one of these is
 * left for the person.
 */
export const RACE_OPTIONS = [
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
  {
    // No Decline option: leaving it blank is how a person declines to answer it, and the
    // extension never fills a blank one.
    key: "smsOptIn",
    label: "Is it OK to text you (SMS or WhatsApp) about your application?",
    options: YES_NO,
    group: "communication",
  },
];

/** The most years of experience the card accepts, and the extension reads. */
export const YEARS_EXPERIENCE_MAX = 60;

/**
 * Can this text be a years-of-experience answer the extension will use: a whole
 * number or one with a single decimal, from 0 to 60? The API applies the same test
 * and drops anything else rather than repairing it.
 */
export function isUsableYearsExperience(raw: string): boolean {
  return /^\d{1,2}(\.\d)?$/.test(raw) && Number(raw) <= YEARS_EXPERIENCE_MAX;
}

/**
 * Is this what a person may have typed so far? Letters, a minus sign, a second dot,
 * a second decimal digit and anything above the maximum are refused as they are
 * typed; "5." is allowed because it is on the way to "5.5". A clear is always allowed.
 */
export function isTypableYearsExperience(raw: string): boolean {
  if (raw === "") return true;
  return /^\d{1,2}(\.\d?)?$/.test(raw) && Number(raw) <= YEARS_EXPERIENCE_MAX;
}

/**
 * Why a saved value will not be used, or "" when it is fine or still being typed.
 * Computed at render and never written back: a value that came from somewhere else
 * is shown as it is.
 */
export function yearsExperienceProblem(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || isUsableYearsExperience(v) || /^\d{1,2}\.$/.test(v)) return "";
  return "That will not be used. Enter a number from 0 to 60, such as 6 or 5.5.";
}

/**
 * How many of the saved answers are one this editor can show as selected.
 * A stored value that is not one of the options (an older free-text answer)
 * is not counted: the control would show nothing selected for it.
 */
export function answeredCount(profile: Pick<ProfileFormState, ApplicationAnswerKey>): number {
  return APPLICATION_ANSWER_QUESTIONS.filter((q) => q.options.includes(profile[q.key])).length;
}
