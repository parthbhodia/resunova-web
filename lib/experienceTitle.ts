/**
 * Experience job titles: parse the preview header line, pick which role to
 * retitle, and decide when a posting-aligned title is defensible.
 *
 * The paper already lets you click-edit `exp.N.head`, but until this module
 * those edits were cosmetic: applyFieldOverridesToStructured skipped non-bullet
 * paths, so the scorer and the structured doc kept the old role. Role title
 * changes now write through the same override map as bullets.
 *
 * Aggressive mode may retitle an EXISTING role toward the posting. It never
 * invents an employer or a new job. Intern/student → staff/director is refused
 * even in aggressive mode; the user can still type that themselves.
 */

import { resolveTailoringMode } from "@/lib/tailoringModeDefault";

export function titlesEqual(a: string, b: string): boolean {
  return normalizeTitle(a) === normalizeTitle(b);
}

function normalizeTitle(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function looksLikeDates(s: string): boolean {
  const t = String(s ?? "").trim();
  if (!t) return false;
  if (/\b(19|20)\d{2}\b/.test(t)) return true;
  if (/\b(present|current)\b/i.test(t)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\b/i.test(t)) return true;
  return false;
}

/** Same order AnalyzeLiveResumeBody uses: role | company | location | dates. */
export function experienceHeaderLine(entry: {
  role?: string;
  company?: string;
  location?: string;
  dates?: string;
}): string {
  return [entry.role, entry.company, entry.location, entry.dates]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" | ");
}

export function splitExperienceHeader(line: string): string[] {
  return String(line ?? "")
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Write a preview header line back onto a structured experience row.
 *
 * One segment is a title-only edit (company/dates stay). More segments follow
 * the header order, with a date-looking last piece landing in `dates`.
 */
export function applyHeaderLineToExperience<T extends {
  role?: string;
  company?: string;
  location?: string;
  dates?: string;
}>(entry: T, line: string): T {
  const parts = splitExperienceHeader(line);
  if (!parts.length) return entry;
  entry.role = parts[0];
  if (parts.length === 1) return entry;
  if (parts.length === 2) {
    if (looksLikeDates(parts[1])) entry.dates = parts[1];
    else entry.company = parts[1];
    return entry;
  }
  entry.company = parts[1];
  if (parts.length === 3) {
    if (looksLikeDates(parts[2])) entry.dates = parts[2];
    else entry.location = parts[2];
    return entry;
  }
  entry.location = parts[2];
  entry.dates = parts.slice(3).join(" | ");
  return entry;
}

export function effectiveExperienceRole(
  entry: { role?: string } | undefined,
  index: number,
  overrides?: Record<string, string>,
): string {
  const roleOver = overrides?.[`exp.${index}.role`]?.trim();
  if (roleOver) return roleOver;
  const headOver = overrides?.[`exp.${index}.head`]?.trim();
  if (headOver) {
    const first = splitExperienceHeader(headOver)[0];
    if (first) return first;
  }
  return (entry?.role ?? "").trim();
}

const JUNIOR = /\b(intern|internship|co-?op|student|trainee|apprentice)\b/i;
const SENIOR_JUMP = /\b(staff|principal|distinguished|fellow|director|vp|vice president|head of|chief)\b/i;

/**
 * A title the model (or aggressive one-click) may apply without the user
 * typing it. Returns the trimmed suggestion, or null when it should not land.
 */
export function defensibleRoleTitle(current: string, suggested: string): string | null {
  const next = String(suggested ?? "").trim();
  const from = String(current ?? "").trim();
  if (!next) return null;
  if (titlesEqual(from, next)) return null;
  if (from && JUNIOR.test(from) && SENIOR_JUMP.test(next) && !JUNIOR.test(next)) return null;
  return next;
}

function significantTitleTokens(s: string): string[] {
  const stop = new Set(["and", "the", "of", "for", "to", "in", "at", "a", "an", "or", "sr", "jr"]);
  return normalizeTitle(s)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stop.has(t));
}

/** Closest existing role: employer match, then current title, then JD overlap, else most recent (index 0). */
export function pickExperienceIndex(
  experience: ReadonlyArray<{ role?: string; company?: string }>,
  opts?: { employer?: string; currentRole?: string; jdTitle?: string },
): number {
  if (!experience.length) return -1;
  const wantCo = (opts?.employer ?? "").trim().toLowerCase();
  if (wantCo) {
    const i = experience.findIndex((e) => {
      const company = (e.company ?? "").trim().toLowerCase();
      const label = [e.role, e.company].map((s) => (s ?? "").trim()).filter(Boolean).join(" ").toLowerCase();
      if (company === wantCo || label === wantCo) return true;
      if (company.length >= 3 && wantCo.length >= 3) {
        return company.includes(wantCo) || wantCo.includes(company);
      }
      return false;
    });
    if (i >= 0) return i;
  }
  const wantRole = (opts?.currentRole ?? "").trim().toLowerCase();
  if (wantRole) {
    const i = experience.findIndex((e) => (e.role ?? "").trim().toLowerCase() === wantRole);
    if (i >= 0) return i;
  }
  const jd = (opts?.jdTitle ?? "").trim();
  if (jd) {
    const jdTokens = new Set(significantTitleTokens(jd));
    let best = 0;
    let bestScore = -1;
    experience.forEach((e, i) => {
      const overlap = significantTitleTokens(e.role ?? "").filter((t) => jdTokens.has(t)).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        best = i;
      }
    });
    return best;
  }
  return 0;
}

export type RoleTitleSuggestion = {
  suggested_role?: string;
  original_role?: string;
  employer?: string;
};

/**
 * Aggressive mode: if the writer did not send a role title, use the posting's
 * title on the closest existing role. Model-supplied `suggested_role` wins when
 * it is defensible.
 */
export function attachAggressiveRoleTitle<T extends RoleTitleSuggestion>(
  suggestions: T[],
  experience: ReadonlyArray<{ role?: string; company?: string }>,
  jdTitle: string,
  mode: string | null | undefined,
): T[] {
  if (resolveTailoringMode(mode) !== "aggressive") {
    return suggestions.map((s) => (s.suggested_role ? { ...s, suggested_role: undefined } : s));
  }
  const jd = jdTitle.trim();
  if (!jd || !experience.length) return suggestions;
  return suggestions.map((s) => {
    const idx = pickExperienceIndex(experience, {
      employer: s.employer,
      currentRole: s.original_role,
      jdTitle: jd,
    });
    const current = idx >= 0 ? (experience[idx].role ?? "").trim() : (s.original_role ?? "").trim();
    const fromModel = defensibleRoleTitle(current, s.suggested_role ?? "");
    if (fromModel) {
      return { ...s, suggested_role: fromModel, original_role: s.original_role?.trim() || current };
    }
    const fallback = defensibleRoleTitle(current, jd);
    if (!fallback) {
      if (s.suggested_role) return { ...s, suggested_role: undefined };
      return s;
    }
    return { ...s, suggested_role: fallback, original_role: current };
  });
}
