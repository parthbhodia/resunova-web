/**
 * educationEntry — turning a credential row into a real Education entry.
 *
 * A degree cannot be evidenced by rewriting an experience bullet, so credential
 * rows route here instead of to the gap-fix model (see `isCredentialRequirement`).
 * This module is the write half: the small amount of pure logic that turns four
 * typed fields into a `StructuredResumeEducation` and appends it.
 *
 * ⚠️ This path only ever opens on a `partial` verdict -- the résumé already
 * evidences the credential and the scanner cannot see the wording. It must
 * never open on `not_evidenced`, because then the form would be an invitation
 * to type in a degree the person does not hold. That gate lives in
 * `itemAction` and is test-pinned on both sides; this module assumes it held.
 */
import type {
  StructuredResume,
  StructuredResumeEducation,
} from "@/store/resumeAnalyzeStore";
import { requiredDegreeLevel, type DegreeLevel } from "@/lib/degreeRequirement";

export interface EducationDraft {
  /** "Master's", "Ph.D." — the credential itself. */
  degree: string;
  /** "Computer Science" — optional; plenty of entries are just the degree. */
  field: string;
  institution: string;
  /** Free text on purpose: "2024", "2021 – 2024" and "Expected 2026" are all real. */
  year: string;
}

/** How each level is written on a résumé, as a starting point the user edits. */
const LEVEL_LABEL: Record<DegreeLevel, string> = {
  associate: "Associate's",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Ph.D.",
};

/**
 * Seed the form from the requirement text so the common case is confirm-and-save
 * rather than retype. "Bachelor's degree in Computer Science" seeds both fields.
 *
 * The field of study is lifted verbatim from an "in ..." clause and deliberately
 * NOT validated against anything: the posting's phrasing is the whole reason
 * this row exists, and second-guessing it here would reintroduce the judgement
 * `degreeRequirementSatisfied` refuses to make.
 */
export function educationDraftFromRequirement(requirement: string): EducationDraft {
  const level = requiredDegreeLevel(requirement);
  const field = requirement.match(
    /\bin\s+([A-Za-z][A-Za-z&/ ,'-]{2,60}?)(?:\s+or\b|\s*[,.;]|$)/i,
  );
  return {
    degree: level ? LEVEL_LABEL[level] : "",
    field: (field?.[1] ?? "").trim(),
    institution: "",
    year: "",
  };
}

/**
 * A degree with no school is not a credential anyone can check, and the whole
 * point of this row is that the claim be verifiable. Year stays optional --
 * "Expected 2026" is common and an in-progress degree is still worth listing.
 */
export function isEducationDraftValid(d: EducationDraft): boolean {
  return d.degree.trim().length > 0 && d.institution.trim().length > 0;
}

/** "Master's" + "Computer Science" -> "Master's in Computer Science". */
export function formatDegreeLine(d: EducationDraft): string {
  const degree = d.degree.trim();
  const field = d.field.trim();
  if (!degree) return field;
  if (!field) return degree;
  return `${degree} in ${field}`;
}

export function educationDraftToEntry(d: EducationDraft): StructuredResumeEducation {
  return {
    institution: d.institution.trim(),
    degree: formatDegreeLine(d),
    dates: d.year.trim(),
    location: "",
    bullets: [],
  };
}

/**
 * Append the entry. Pure: returns a new document and never mutates the input,
 * because the caller feeds the result straight into React state.
 *
 * Appends rather than inserts by date. Education order on a résumé is the
 * author's -- most people lead with the highest or most recent degree, and
 * silently re-sorting someone's document to make room for one row is a bigger
 * edit than the one they asked for.
 */
export function appendEducation(
  structured: StructuredResume,
  entry: StructuredResumeEducation,
): StructuredResume {
  return {
    ...structured,
    education: [...(structured.education ?? []), entry],
  };
}

/**
 * True when this exact credential is already listed, compared on degree +
 * institution, case and punctuation folded.
 *
 * The row that opens this form is by definition one the résumé already
 * evidences, so "add it" can very easily mean "add it twice" -- the scanner
 * missing the wording does not mean the entry is absent.
 *
 * ⚠️ This is a SIGNAL, not a gate. The caller warns and still lets the user
 * save. A false positive here would block someone from listing a degree they
 * hold, which breaks the feature outright; a false negative costs them one
 * duplicate line they can delete. The failure modes are not symmetric, so the
 * comparison is deliberately not aggressive enough to be certain.
 *
 * Apostrophes and periods are DELETED rather than turned into spaces --
 * otherwise "Master's" folds to "master s" and never equals "Masters", and
 * "U.M.B.C." folds to "u m b c" and never equals "UMBC". Both were live bugs
 * until a test caught them.
 */
export function educationAlreadyPresent(
  structured: StructuredResume,
  entry: StructuredResumeEducation,
): boolean {
  const fold = (s: string) =>
    s.toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const deg = fold(entry.degree);
  const inst = fold(entry.institution);
  if (!deg || !inst) return false;
  return (structured.education ?? []).some(
    (e) => fold(e.degree) === deg && fold(e.institution) === inst,
  );
}
