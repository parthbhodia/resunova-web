/**
 * LaTeX layout templates for Résumé Builder / generate-stream.
 * Each `referenceFolder` must exist under the backend LIBRARY_ROOT with a .tex file.
 */

export interface ResumeStyleTemplate {
  id: string;
  label: string;
  description: string;
  /** Folder name under LIBRARY_ROOT whose .tex defines macros and visual structure */
  referenceFolder: string;
  /**
   * Visual grouping shown in the Style & Customization panel.
   * - "technical": clean, ATS-safe, industry best-practice layouts
   * - "creative": visually rich templates with distinct design identity
   */
  category: "technical" | "creative";
}

export const RESUME_STYLE_TEMPLATES: ResumeStyleTemplate[] = [
  // ── Technical ──────────────────────────────────────────────────────────────
  {
    id: "harshibar-ats",
    label: "Harshibar",
    description: "MIT-style ATS layout popular in top tech companies. Clean sans-serif with fontawesome5 icons. Industry gold-standard for software engineers.",
    referenceFolder: "Harshibar_Template1",
    category: "technical",
  },
  {
    id: "freshman-ats",
    label: "Freshman ATS",
    description: "Clear hierarchical headings optimised for applicant-tracking systems. Best for early-career engineers and CS graduates.",
    referenceFolder: "Freshman_ATS",
    category: "technical",
  },
  {
    id: "corporate",
    label: "Corporate",
    description: "Right-aligned dates, conservative typography, clean section dividers. Preferred by finance, consulting, and enterprise hiring teams.",
    referenceFolder: "Corporate_CV",
    category: "technical",
  },
  {
    id: "executive",
    label: "Executive",
    description: "Premium two-column header with bold colour blocks. Signals seniority and leadership — ideal for director-level and above.",
    referenceFolder: "Executive_CV",
    category: "technical",
  },
  // ── Creative ────────────────────────────────────────────────────────────────
  {
    id: "graphic",
    label: "Graphic",
    description: "Bold black-and-white header with strong typographic contrast. Great for design, media, and marketing roles.",
    referenceFolder: "Graphic_CV",
    category: "creative",
  },
  {
    id: "social",
    label: "Social",
    description: "Dark sidebar accent with a modern split layout. Stands out in creative industries and digital-product teams.",
    referenceFolder: "Social_CV",
    category: "creative",
  },
];

export const DEFAULT_REFERENCE_FOLDER = "Harshibar_Template1";

export function isValidResumeStyleFolder(folder: string): boolean {
  return RESUME_STYLE_TEMPLATES.some((t) => t.referenceFolder === folder);
}

/** One chip per distinct referenceFolder. */
export function distinctStyleTemplates(): ResumeStyleTemplate[] {
  const seen = new Set<string>();
  const out: ResumeStyleTemplate[] = [];
  for (const t of RESUME_STYLE_TEMPLATES) {
    if (seen.has(t.referenceFolder)) continue;
    seen.add(t.referenceFolder);
    out.push(t);
  }
  return out;
}

export function hasMultipleStyleTemplates(): boolean {
  return distinctStyleTemplates().length > 1;
}
