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
 */

import type { ProfileFormState } from "@/lib/profileStorage";

export type ApplicationAnswerKey =
  | "eeoWorkUs"
  | "eeoSponsor"
  | "eeoDisability"
  | "eeoVeteran"
  | "eeoGender"
  | "eeoLgbtq";

export type ApplicationAnswerQuestion = {
  key: ApplicationAnswerKey;
  label: string;
  options: readonly string[];
  /** `eligibility` questions are required by most forms; `voluntary` ones are optional by law. */
  group: "eligibility" | "voluntary";
};

const YES_NO = ["Yes", "No"] as const;
const YES_NO_DECLINE = ["Yes", "No", "Decline to state"] as const;

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
