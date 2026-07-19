/**
 * Résumé Version → Tailor handoff. "Tailor to a job" on a version stashes the
 * version's résumé (text + structured) and any JD context into sessionStorage,
 * then navigates to the builder's tailor flow (?view=builder&flow=tailor&
 * intent=job). The builder's EXISTING intent=job prefill picks up these keys and
 * runs the tailor loop against the version — no ResumeBuilder changes needed
 * (same mechanism as the Boost→Tailor and Analyze→Tailor handoffs).
 */
import {
  TAILOR_PREFILL_JD,
  TAILOR_PREFILL_COMPANY,
  TAILOR_PREFILL_ROLE,
} from "@/lib/tailorPrefill";
import { structuredToPlainText, type ResumeVersion } from "@/lib/resumeVersions";

// Builder reads these for the résumé itself (same keys Analyze/Boost → Builder use).
const PROFILE_KEY = "rn_builder_profile_prefill";
const STRUCTURED_KEY = "rn_builder_structured_prefill";

/**
 * Stash a version for the tailor flow. Returns true if something usable was
 * stashed (there's résumé text to tailor). Prefers the version's own
 * extractedText, falling back to a flatten of its structured doc.
 */
export function stashVersionForTailor(version: Pick<ResumeVersion, "structured" | "extractedText" | "jdText" | "jdCompany" | "jdTitle">): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const text =
    version.extractedText && version.extractedText.trim().length >= 40
      ? version.extractedText.trim()
      : structuredToPlainText(version.structured);
  if (!text || text.trim().length === 0) return false;
  try {
    sessionStorage.setItem(PROFILE_KEY, text);
    if (version.structured) sessionStorage.setItem(STRUCTURED_KEY, JSON.stringify(version.structured));
    else sessionStorage.removeItem(STRUCTURED_KEY);
    // Carry the version's JD target forward when it has one (a tailored version).
    if (version.jdText?.trim()) sessionStorage.setItem(TAILOR_PREFILL_JD, version.jdText.trim());
    if (version.jdCompany?.trim()) sessionStorage.setItem(TAILOR_PREFILL_COMPANY, version.jdCompany.trim());
    if (version.jdTitle?.trim()) sessionStorage.setItem(TAILOR_PREFILL_ROLE, version.jdTitle.trim());
    return true;
  } catch {
    return false; // quota / private mode
  }
}

/** The URL the builder's intent=job prefill consumes. */
export const VERSION_TAILOR_URL = "/?view=builder&flow=tailor&intent=job";
