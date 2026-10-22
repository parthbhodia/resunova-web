/**
 * When opening Résumé Builder → Tailor from Library, we stash company / role /
 * JD in sessionStorage so the builder can prefill fields (same pattern as
 * Analyze → Builder for JD).
 *
 * The résumé travels the same way. Tailor's first step is "Your resume", and
 * it is satisfied only by profile text: a saved version whose job was stashed
 * but whose résumé was not landed the user on an empty upload step, which
 * reads as being sent back to Analyze. Every "tailor from a saved version"
 * entry point goes through this one function so none of them can drift.
 */
import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { structuredToPlainText } from "@/lib/structuredResumeText";

export const TAILOR_PREFILL_JD = "rn_builder_jd_prefill";
export const TAILOR_PREFILL_COMPANY = "rn_builder_company_prefill";
export const TAILOR_PREFILL_ROLE = "rn_builder_role_prefill";
/** Read by ResumeBuilder's `intent=job` handoff (and the Analyze handoff). */
export const TAILOR_PREFILL_PROFILE = "rn_builder_profile_prefill";
export const TAILOR_PREFILL_STRUCTURED = "rn_builder_structured_prefill";

export function stashTailorPrefillFromLibrary(meta: {
  company?: string | null;
  role?: string | null;
  job_description?: string | null;
  /** `{ profile, structured }` as written by saveTailorMatchToLibrary. */
  resume_doc?: Record<string, unknown> | null;
}): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const jd = meta.job_description?.trim();
    if (jd) sessionStorage.setItem(TAILOR_PREFILL_JD, jd);
    const c = meta.company?.trim();
    if (c) sessionStorage.setItem(TAILOR_PREFILL_COMPANY, c);
    const r = meta.role?.trim();
    if (r) sessionStorage.setItem(TAILOR_PREFILL_ROLE, r);

    // The handoff does not consume these keys, so a version with no stored
    // résumé must clear them, or Tailor loads whichever résumé was stashed last.
    sessionStorage.removeItem(TAILOR_PREFILL_PROFILE);
    sessionStorage.removeItem(TAILOR_PREFILL_STRUCTURED);

    const doc = meta.resume_doc ?? null;
    const rawStructured = doc?.structured ?? doc?.structuredResume;
    const structured =
      rawStructured && typeof rawStructured === "object" ? (rawStructured as StructuredResume) : null;
    const profile =
      (typeof doc?.profile === "string" ? doc.profile.trim() : "") ||
      structuredToPlainText(structured).trim();

    if (profile) sessionStorage.setItem(TAILOR_PREFILL_PROFILE, profile);
    if (profile && structured) {
      sessionStorage.setItem(TAILOR_PREFILL_STRUCTURED, JSON.stringify(structured));
    }
  } catch {
    /* quota / private mode */
  }
}
