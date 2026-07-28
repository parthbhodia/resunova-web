/**
 * Résumé Version → Boost handoff (phase 2). "Boost to a job" in the version
 * editor stashes the version, then navigates to Jobs. The next posting the user
 * boosts sources THIS version (sent as a resume_text + structured_resume override
 * to /api/jobs/boost) and its result chains as a CHILD of the version's lineage.
 * The stash is consumed once (cleared after the boost runs).
 */
import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import type { ResumeVersion } from "./resumeVersions";
import { structuredToPlainText } from "./resumeVersions";

const KEY = "rn_boost_version_v1";
export const BOOST_JOBS_URL = "/?view=jobs";

export interface StashedBoostVersion {
  id: string;
  rootId: string;
  version: number;
  name: string;
  structured: StructuredResume | null;
  extractedText: string;
}

/** Stash a version to boost. Returns false when there's no résumé content. */
export function stashVersionForBoost(v: ResumeVersion): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const text = v.extractedText && v.extractedText.trim().length >= 40
    ? v.extractedText.trim()
    : structuredToPlainText(v.structured);
  if (!text || !v.structured) return false; // Boost needs structured targets
  try {
    const payload: StashedBoostVersion = {
      id: v.id, rootId: v.rootId, version: v.version, name: v.name,
      structured: v.structured, extractedText: text,
    };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function readStashedBoostVersion(): StashedBoostVersion | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StashedBoostVersion;
    if (!p?.id || !p.structured || !p.extractedText) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearStashedBoostVersion(): void {
  if (typeof sessionStorage === "undefined") return;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
