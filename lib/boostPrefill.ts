/**
 * Boost → Tailor handoff. The Boost panel (on a job detail page) stashes the
 * user's résumé + this job's JD + the boost selections into sessionStorage,
 * then navigates to the builder's tailor flow (?view=builder&flow=tailor&
 * intent=job). The builder's existing intent=job prefill picks up the résumé +
 * JD keys and runs the tailor loop against this job — no builder changes
 * needed. The boost-specific keys (sections/keywords/notes/depth) are stashed
 * for the builder to optionally pre-seed gap fixes (future enhancement).
 */
import {
  TAILOR_PREFILL_JD,
  TAILOR_PREFILL_COMPANY,
  TAILOR_PREFILL_ROLE,
} from "@/lib/tailorPrefill";

// Builder reads these for the résumé itself (same keys Analyze→Builder uses).
const PROFILE_KEY = "rn_builder_profile_prefill";
const STRUCTURED_KEY = "rn_builder_structured_prefill";

// Boost selections — read by a later builder enhancement to pre-seed gap fixes.
export const BOOST_SECTIONS_KEY = "rn_boost_sections";
export const BOOST_KEYWORDS_KEY = "rn_boost_keywords";
export const BOOST_NOTES_KEY = "rn_boost_notes";
export const BOOST_DEPTH_KEY = "rn_boost_depth";

export type BoostHandoff = {
  resumeText: string;
  structuredResume: Record<string, unknown> | null;
  jd: string;
  company: string;
  role: string;
  sections: string[];
  keywords: string[];
  notes: Record<string, string>;
  depth: "quick" | "full";
};

/** True when there's enough to tailor (a résumé to work from). */
export function canBoost(h: Pick<BoostHandoff, "resumeText">): boolean {
  return !!h.resumeText && h.resumeText.trim().length > 0;
}

export function stashBoostHandoff(h: BoostHandoff): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    sessionStorage.setItem(PROFILE_KEY, h.resumeText);
    if (h.structuredResume) {
      sessionStorage.setItem(STRUCTURED_KEY, JSON.stringify(h.structuredResume));
    } else {
      sessionStorage.removeItem(STRUCTURED_KEY);
    }
    if (h.jd?.trim()) sessionStorage.setItem(TAILOR_PREFILL_JD, h.jd.trim());
    if (h.company?.trim()) sessionStorage.setItem(TAILOR_PREFILL_COMPANY, h.company.trim());
    if (h.role?.trim()) sessionStorage.setItem(TAILOR_PREFILL_ROLE, h.role.trim());
    sessionStorage.setItem(BOOST_SECTIONS_KEY, JSON.stringify(h.sections));
    sessionStorage.setItem(BOOST_KEYWORDS_KEY, JSON.stringify(h.keywords));
    sessionStorage.setItem(BOOST_NOTES_KEY, JSON.stringify(h.notes));
    sessionStorage.setItem(BOOST_DEPTH_KEY, h.depth);
    return true;
  } catch {
    return false; // quota / private mode
  }
}
