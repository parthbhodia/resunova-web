/**
 * What the sign-in modal says, per intent.
 *
 * WHY A PRODUCER AND NOT COPY AT THE CALL SITE
 * --------------------------------------------
 * Every one of the ~10 gated actions used to hand `openSignIn` its own
 * hand-written `{ title, reason }`. Two costs. The copy drifted — nine
 * variations of one sentence, each edited separately — and every title was
 * phrased as OUR requirement ("Sign in to run ATS & job match") rather than
 * what the visitor gets, which is the exact defect the gate page was rebuilt to
 * fix. The copy lives here now and a call site passes a key.
 *
 * WHY IT BORROWS FROM THE GATE
 * ----------------------------
 * `interview_prep`, `library` and the generic fallback are read straight off
 * `gateContentFor`. A visitor can reach the same destination through a full
 * page (signed out, typed the URL) or through this modal (clicked something),
 * and those two surfaces disagreeing about what the destination offers is a
 * real defect — it shipped once already, when the gate started leading with
 * Google and the modal still buried it under an OR. Sharing the producer makes
 * the disagreement unexpressible for those three, and a test pins it.
 *
 * ⚠️ Every number here is interpolated from `lib/planLimits`. A literal "3
 * scans a day" in copy becomes a lie in front of a paying user the day
 * POLICY_V1 moves.
 */

import {
  FREE_INTERVIEW_DAILY_LIMIT,
  FREE_SCAN_DAILY_LIMIT,
} from "@/lib/planLimits";
import { gateContentFor } from "./gateContent";

export type SignInAsk = {
  /**
   * What you clicked, named. Half of not feeling bounced is still knowing
   * where you were — the same reason the gate page carries one.
   */
  eyebrow: string;
  /** The gain. Never "Sign in to …", which leads with our requirement. */
  headline: string;
  /** One line on what happens next. Optional: silence beats filler. */
  why?: string;
};

export type SignInAskKey =
  | "resume_scan"
  | "scan_allowance_spent"
  | "rescore"
  | "edit_resume"
  | "tailor_match"
  | "jobs_rank"
  | "jobs_optimize"
  | "interview_prep"
  | "contacts"
  | "apply"
  | "library"
  | "tracker"
  | "advisor";

/** Lift the gate's wording for a destination both surfaces can reach. */
function fromGate(pathname: string): SignInAsk {
  const content = gateContentFor(pathname);
  return { eyebrow: content.eyebrow, headline: content.headline, why: content.lede };
}

const ASKS: Record<SignInAskKey, () => SignInAsk> = {
  resume_scan: () => ({
    eyebrow: "Résumé scan",
    headline: `${FREE_SCAN_DAILY_LIMIT} scans a day, and every report saved to your account.`,
    why: "You'll come straight back here when you're done.",
  }),
  // The guest spent their one free per-IP scan. Same destination, different
  // fact — telling them about an allowance they have already used reads as a
  // product that is not listening.
  scan_allowance_spent: () => ({
    eyebrow: "Résumé scan",
    headline: `An account gets you ${FREE_SCAN_DAILY_LIMIT} scans a day instead of one.`,
    why: "Free, and every report stays in your history.",
  }),
  rescore: () => ({
    eyebrow: "Résumé scan",
    headline: "Re-score after an edit, and keep both versions.",
    why: "Every scan keeps its full report, so you can see what changed and why.",
  }),
  edit_resume: () => ({
    eyebrow: "Analyze",
    headline: "Edit your résumé here and watch the score move.",
    why: "Changes save to your account, so nothing is lost between sessions.",
  }),
  tailor_match: () => ({
    eyebrow: "Job match",
    headline: "See how this posting scores your résumé, bullet by bullet.",
    why: "Then fix the gaps in your own words, without leaving the page.",
  }),
  jobs_rank: () => ({
    eyebrow: "Jobs",
    headline: "Openings ranked against your own résumé.",
    why: "Browsing is public. Signing in is what sorts the list for you.",
  }),
  jobs_optimize: () => ({
    eyebrow: "Tailor to this job",
    headline: "A version of your résumé written for this posting.",
    why: "Saved alongside the job, so you can find it when they reply.",
  }),
  interview_prep: () => fromGate("/interview-prep"),
  contacts: () => ({
    eyebrow: "Hiring contacts",
    headline: "The recruiter or HR address attached to this posting.",
    why: "Where we have one. Available on Pro.",
  }),
  apply: () => ({
    eyebrow: "Apply",
    headline: "Keep track of what you applied to, and when.",
    why: "We'll record this application and can tailor your résumé to the role.",
  }),
  library: () => fromGate("/my-resumes"),
  tracker: () => ({
    eyebrow: "Applications",
    headline: "Every application you've sent, and where it stands.",
    why: "Saved to your account, so the list survives closing the tab.",
  }),
  advisor: () => ({
    eyebrow: "Advisor",
    headline: "Your cohort's readiness, in one view.",
    why: "Advisors sign in with their institution Google account so access can be checked against the roster.",
  }),
};

/** The interview-prep cap, for any surface that wants to name it. */
export const INTERVIEW_PREP_FREE_LIMIT = FREE_INTERVIEW_DAILY_LIMIT;

/**
 * Resolve an intent to copy. An unknown or absent key falls back to the gate's
 * own generic line rather than a greeting — "Welcome to Resunova" over a
 * specific reason was the most persuasive sentence this dialog had, thrown
 * away.
 */
export function signInAskFor(key?: SignInAskKey | null): SignInAsk {
  const build = key ? ASKS[key] : undefined;
  return build ? build() : fromGate("/__generic__");
}

/** Exported for tests: every key must resolve, and none may lead with "Sign in to". */
export const SIGN_IN_ASK_KEYS = Object.keys(ASKS) as SignInAskKey[];
