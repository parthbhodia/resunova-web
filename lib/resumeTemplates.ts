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
}

/** Only Harshibar is exposed in the product UI for now (others kept commented for later). */
export const RESUME_STYLE_TEMPLATES: ResumeStyleTemplate[] = [
  {
    id: "harshibar-ats",
    label: "Harshibar",
    description:
      "MIT-style ATS layout: \\resumeSubheading, \\resumeProjectHeading, fontawesome5 icons, sans-serif (tgheros). Requires pdflatex + texlive-fontawesome5 + Fira Mono.",
    referenceFolder: "Harshibar_Template1",
  },
  {
    id: "freshman-ats",
    label: "Freshman ATS",
    description: "Clean ATS-friendly resume template with clear section headings.",
    referenceFolder: "Freshman_ATS",
  },
  {
    id: "graphic",
    label: "Graphic",
    description: "Modern CV template with a bold black-and-white header.",
    referenceFolder: "Graphic_CV",
  },
  {
    id: "corporate",
    label: "Corporate",
    description: "Corporate ATS-friendly template with right-aligned headers and clean sections.",
    referenceFolder: "Corporate_CV",
  },
  {
    id: "social",
    label: "Social",
    description: "Modern ATS-friendly CV template with a bold dark sidebar layout.",
    referenceFolder: "Social_CV",
  },
  {
    id: "executive",
    label: "Executive",
    description: "Premium executive resume template with bold colour blocks and a modern column layout.",
    referenceFolder: "Executive_CV",
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
