/**
 * structuredToPlainText — flatten a structured résumé into the plain text the
 * scoring endpoints accept.
 *
 * Lived in lib/resumeVersions.ts until that feature was deleted (2026-08-07,
 * zero rows in resume_versions after months live). The helper itself is pure
 * and unrelated to versioning, and Tailor still needs it, so it was kept and
 * moved here rather than going down with the feature.
 */
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

export function structuredToPlainText(s: StructuredResume | null): string {
  if (!s) return "";
  const lines: string[] = [];
  if (s.full_name) lines.push(s.full_name);
  if (s.headline) lines.push(s.headline);
  const contact = [s.email, s.phone, s.location, s.linkedin, s.github].filter(Boolean);
  if (contact.length) lines.push(contact.join(" · "));
  if (s.summary) lines.push("", "SUMMARY", s.summary);
  if (s.experience?.length) {
    lines.push("", "EXPERIENCE");
    for (const e of s.experience) {
      lines.push([e.role, e.company, e.location, e.dates].filter(Boolean).join(" · "));
      for (const b of e.bullets ?? []) if (b) lines.push(`• ${b}`);
    }
  }
  if (s.projects?.length) {
    lines.push("", "PROJECTS");
    for (const p of s.projects) {
      lines.push([p.name, p.tech].filter(Boolean).join(" · "));
      for (const b of p.bullets ?? []) if (b) lines.push(`• ${b}`);
    }
  }
  if (s.education?.length) {
    lines.push("", "EDUCATION");
    for (const ed of s.education) {
      lines.push([ed.institution, ed.degree, ed.dates].filter(Boolean).join(" · "));
      for (const b of ed.bullets ?? []) if (b) lines.push(`• ${b}`);
    }
  }
  if (s.skills?.length) {
    lines.push("", "SKILLS");
    for (const sk of s.skills) lines.push(`${sk.category}: ${(sk.items ?? []).join(", ")}`);
  }
  return lines.join("\n").trim();
}
