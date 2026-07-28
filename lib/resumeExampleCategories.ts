import type { LucideIcon } from "lucide-react";
import {
  Code2,
  Briefcase,
  Target,
  BarChart3,
  Megaphone,
  DollarSign,
  Users,
  TrendingUp,
  HeadphonesIcon,
  Palette,
  Heart,
  GraduationCap,
} from "lucide-react";
import { PUBLIC_RESUME_EXAMPLES } from "@/lib/resumeExamplesCatalog";
import { roleResumeHref } from "@/lib/roleResumeData";

/**
 * Presentation metadata (icon + accent color + an optional deep-link into the
 * richer, published-research-backed role page) for each of the 12 real
 * catalog categories. Counts are NEVER hardcoded here — computed from the
 * actual example data at module load, so a category tile can never show a
 * number the catalog doesn't back.
 */
export type ResumeCategoryMeta = {
  name: string;
  icon: LucideIcon;
  /** Solid accent hex — rendered as a low-alpha tint background + solid icon color, theme-safe. */
  color: string;
  count: number;
  /** /resume-examples/{slug} — set only when a matching sourced role page exists. */
  roleHref: string | null;
};

// Hex, not Tailwind utility classes: this app's dark mode is driven by
// `[data-theme]` CSS custom properties (see app/globals.css), not Tailwind's
// `.dark`-class convention, so raw `bg-blue-50`-style classes never adapt for
// dark mode. A tinted-background-plus-solid-icon pattern reads fine in both.
const CATEGORY_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  "Software Engineering": { icon: Code2, color: "#2563eb" },
  "Project Management": { icon: Briefcase, color: "#7c3aed" },
  "Product Management": { icon: Target, color: "#4f46e5" },
  "Data Science": { icon: BarChart3, color: "#0891b2" },
  Marketing: { icon: Megaphone, color: "#db2777" },
  Finance: { icon: DollarSign, color: "#059669" },
  "Human Resources": { icon: Users, color: "#ea580c" },
  Sales: { icon: TrendingUp, color: "#e11d48" },
  "Customer Support": { icon: HeadphonesIcon, color: "#0284c7" },
  "Graphic Design": { icon: Palette, color: "#c026d3" },
  Healthcare: { icon: Heart, color: "#dc2626" },
  Education: { icon: GraduationCap, color: "#0d9488" },
};

/** Category -> role page slug, for categories with a matching sourced role page. */
const CATEGORY_ROLE_SLUG: Record<string, string> = {
  "Software Engineering": "software-engineer",
  "Data Science": "data-analyst",
  Healthcare: "registered-nurse",
  Sales: "sales-representative",
  "Project Management": "operations-manager",
  Finance: "financial-analyst",
  Marketing: "marketing-manager",
  "Product Management": "product-manager",
  "Human Resources": "recruiter",
  Education: "teacher",
  "Graphic Design": "graphic-designer",
  // Customer Support: no matching sourced role page yet.
};

function computeCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of PUBLIC_RESUME_EXAMPLES) counts[e.category] = (counts[e.category] ?? 0) + 1;
  return counts;
}

export const RESUME_CATEGORIES: ResumeCategoryMeta[] = (() => {
  const counts = computeCounts();
  return Object.keys(CATEGORY_ICON).map((name) => {
    const roleSlug = CATEGORY_ROLE_SLUG[name];
    return {
      name,
      icon: CATEGORY_ICON[name].icon,
      color: CATEGORY_ICON[name].color,
      count: counts[name] ?? 0,
      roleHref: roleSlug ? `${roleResumeHref(roleSlug)}/` : null,
    };
  });
})();

export const TOTAL_RESUME_EXAMPLES = PUBLIC_RESUME_EXAMPLES.length;
export const TOTAL_RESUME_CATEGORIES = RESUME_CATEGORIES.length;
