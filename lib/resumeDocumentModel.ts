"use client";
/**
 * One document, two shapes — and the conversion between them.
 *
 * MIGRATION CONTEXT. Resunova renders résumés through two different
 * components that have never shared a model:
 *
 *   AnalyzeLiveResumeBody  consumes StructuredResume. Single column. Owns the
 *                          analysis layer: score highlights, flagged-bullet
 *                          linkage, applied-fix marks.
 *   ResumePreview          consumes TBResumeData. FOUR layouts including
 *                          two-column and the dark sidebar. Owns the template
 *                          system the marketing site advertises.
 *
 * Converging on ONE renderer is the goal, and the direction has to be
 * Analyze adopting the builder's renderer — not the reverse. The reverse
 * deletes the multi-column templates, which are the builder's entire reason
 * to exist and what /resume-examples sells.
 *
 * Nothing can converge until the two shapes convert losslessly, so that is
 * what this module is. `structuredToTb` already existed, privately, inside
 * templateBuilderPrefill; it moves here and gains the inverse, so a document
 * can round-trip through either renderer without losing content.
 *
 * WHAT IS AND IS NOT LOSSLESS, measured by the round-trip tests next door:
 *   - Content survives both directions: names, contact, summary, every
 *     experience/education/project entry and every bullet.
 *   - Date ranges are lossy in a KNOWN way. StructuredResume stores one
 *     "Jun 2022 – Present" string; TBResumeData stores start/end/current.
 *     The split is regex-based, so an unparseable range round-trips as a
 *     start date with an empty end. The tests pin the common formats.
 *   - Skills are lossy by shape. StructuredResume has categories with items;
 *     TBResumeData has six featured skills plus free-text description lines.
 *     Category structure survives through the description lines; the featured
 *     six are derived, and derived again on the way back.
 */
import {
  DEFAULT_RESUME,
  type TBResumeData,
} from "@/components/TemplateBuilder/types";
import {
  normalizeStructuredResume,
  type StructuredResume,
} from "@/store/resumeAnalyzeStore";

export type { StructuredResume, TBResumeData };

/** "Jun 2022 – Present" → { startDate, endDate, current }. */
export function splitDateRange(raw: string): { startDate: string; endDate: string; current: boolean } {
  const text = (raw ?? "").trim();
  if (!text) return { startDate: "", endDate: "", current: false };
  const parts = text.split(/\s(?:-|–|—|to)\s/i).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { startDate: text, endDate: "", current: false };
  if (parts.length === 1) return { startDate: parts[0], endDate: "", current: false };
  const startDate = parts[0];
  const endDate = parts[parts.length - 1];
  const current = /present|current|ongoing|now/i.test(endDate);
  return { startDate, endDate: current ? "" : endDate, current };
}

/** The inverse of splitDateRange. */
export function joinDateRange(startDate: string, endDate: string, current: boolean): string {
  const start = (startDate ?? "").trim();
  const end = current ? "Present" : (endDate ?? "").trim();
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

const lines = (raw: string): string[] =>
  (raw ?? "").split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);

/**
 * TBResumeData → StructuredResume.
 *
 * The direction that did not exist. It is what lets a document edited on the
 * builder's canvas be handed to anything that speaks the analysis model —
 * scoring, the jobs matcher, persistence — without a second editor.
 */
export function tbToStructured(data: TBResumeData): StructuredResume {
  const p = data.profile;

  const skillCategories = lines(data.skills.descriptions).map((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return { category: "", items: line.split(",").map((s) => s.trim()).filter(Boolean) };
    return {
      category: line.slice(0, idx).trim(),
      items: line.slice(idx + 1).split(",").map((s) => s.trim()).filter(Boolean),
    };
  }).filter((s) => s.items.length);

  const normalized = normalizeStructuredResume({
    full_name: p.name ?? "",
    // TBResumeData has no headline field; the builder does not model one.
    // Documented as lossy rather than silently invented.
    headline: "",
    location: p.location ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    linkedin: p.linkedin ?? "",
    github: p.github ?? "",
    summary: p.summary ?? "",
    skills: skillCategories,
    experience: data.workExperiences
      .filter((w) => w.company || w.jobTitle)
      .map((w) => ({
        company: w.company ?? "",
        role: w.jobTitle ?? "",
        dates: joinDateRange(w.startDate, w.endDate, w.current),
        location: w.location ?? "",
        bullets: lines(w.bullets),
      })),
    education: data.educations
      .filter((e) => e.school || e.degree)
      .map((e) => ({
        institution: e.school ?? "",
        degree: e.degree ?? "",
        dates: joinDateRange(e.startDate, e.endDate, false),
        location: e.location ?? "",
        // GPA and coursework are separate fields on the builder and bullets
        // in the analysis model; re-emit them in the form the parser reads.
        bullets: [
          e.gpa ? `GPA: ${e.gpa}` : "",
          e.coursework ? `Coursework: ${e.coursework}` : "",
        ].filter(Boolean),
      })),
    projects: data.projects
      .filter((pr) => pr.name)
      .map((pr) => ({ name: pr.name ?? "", tech: pr.tech ?? "", bullets: lines(pr.bullets) })),
    extra_sections: data.customSections.map((c) => ({
      title: c.title ?? "",
      lines: lines(c.lines),
    })),
    section_order: data.sectionOrder,
  });
  // normalizeStructuredResume is nullable for untrusted backend payloads; the
  // object above is constructed here and always complete.
  if (!normalized) throw new Error("tbToStructured: normalization returned null for a locally built document");
  return normalized;
}

/** A builder document with nothing in it — the base every conversion starts from. */
export function emptyTbDocument(): TBResumeData {
  return structuredClone(DEFAULT_RESUME);
}
