import type { TBResumeData, TBSectionSlot } from "@/components/TemplateBuilder/types";
import { parseCustomSectionId } from "@/components/TemplateBuilder/types";

function dateRange(start: string, end: string, current: boolean): string {
  const e = current ? "Present" : (end || "").trim();
  return [(start || "").trim(), e].filter(Boolean).join(" – ");
}

/**
 * Synthesize a plain-text résumé from the Template Builder's structured data so
 * it can be scored by `/api/analyze` (which reads résumé text). Honors
 * `sectionOrder` and skips `hiddenSections` so the scored document matches what
 * the user sees in the preview.
 */
export function tbResumeToPlainText(data: TBResumeData): string {
  const { profile, workExperiences, educations, projects, skills, customSections, sectionOrder, hiddenSections } = data;
  const hidden = new Set(hiddenSections || []);
  const out: string[] = [];

  // Header (always first)
  if (profile.name?.trim()) out.push(profile.name.trim());
  const contact = [profile.email, profile.phone, profile.location, profile.website, profile.linkedin, profile.github]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  if (contact.length) out.push(contact.join(" | "));
  out.push("");

  const renderSlot = (slot: TBSectionSlot) => {
    if (hidden.has(slot)) return;

    const customId = parseCustomSectionId(slot);
    if (customId) {
      const cs = customSections.find((c) => c.id === customId);
      if (cs && (cs.title.trim() || cs.lines.trim())) {
        out.push((cs.title.trim() || "Section").toUpperCase());
        cs.lines.split("\n").map((l) => l.trim()).filter(Boolean).forEach((l) => out.push(`- ${l}`));
        out.push("");
      }
      return;
    }

    switch (slot) {
      case "summary":
        if (profile.summary?.trim()) {
          out.push("PROFESSIONAL SUMMARY", profile.summary.trim(), "");
        }
        break;
      case "experience":
        if (workExperiences.some((w) => w.company || w.jobTitle || w.bullets)) {
          out.push("WORK EXPERIENCE");
          for (const w of workExperiences) {
            if (!(w.company || w.jobTitle || w.bullets)) continue;
            const head = [w.jobTitle, w.company].map((s) => (s || "").trim()).filter(Boolean).join(", ");
            const meta = [w.location, dateRange(w.startDate, w.endDate, w.current)]
              .map((s) => (s || "").trim()).filter(Boolean).join(" | ");
            out.push([head, meta].filter(Boolean).join("  —  "));
            w.bullets.split("\n").map((b) => b.trim()).filter(Boolean).forEach((b) => out.push(`- ${b}`));
          }
          out.push("");
        }
        break;
      case "education":
        if (educations.some((e) => e.school || e.degree)) {
          out.push("EDUCATION");
          for (const e of educations) {
            if (!(e.school || e.degree)) continue;
            const head = [e.degree, e.school].map((s) => (s || "").trim()).filter(Boolean).join(", ");
            const meta = [e.location, dateRange(e.startDate, e.endDate, false), e.gpa ? `GPA: ${e.gpa}` : ""]
              .map((s) => (s || "").trim()).filter(Boolean).join(" | ");
            out.push([head, meta].filter(Boolean).join("  —  "));
            if (e.coursework?.trim()) out.push(`Coursework: ${e.coursework.trim()}`);
          }
          out.push("");
        }
        break;
      case "projects":
        if (projects.some((p) => p.name || p.bullets)) {
          out.push("PROJECTS");
          for (const p of projects) {
            if (!(p.name || p.bullets)) continue;
            const head = [p.name, p.tech].map((s) => (s || "").trim()).filter(Boolean).join(" | ");
            const meta = [p.date, p.link].map((s) => (s || "").trim()).filter(Boolean).join(" | ");
            out.push([head, meta].filter(Boolean).join("  —  "));
            p.bullets.split("\n").map((b) => b.trim()).filter(Boolean).forEach((b) => out.push(`- ${b}`));
          }
          out.push("");
        }
        break;
      case "skills": {
        const feat = (skills.featuredSkills || []).map((f) => (f.skill || "").trim()).filter(Boolean);
        const desc = (skills.descriptions || "").split("\n").map((l) => l.trim()).filter(Boolean);
        if (feat.length || desc.length) {
          out.push("SKILLS");
          if (feat.length) out.push(feat.join(", "));
          desc.forEach((l) => out.push(l));
          out.push("");
        }
        break;
      }
    }
  };

  const order = sectionOrder && sectionOrder.length ? sectionOrder : ["summary", "experience", "education", "projects", "skills"];
  order.forEach(renderSlot);

  return out.join("\n").trim();
}

/**
 * Content-only signature (excludes styling/customization) used to detect when
 * the résumé has changed since the last Review run, so we can flag stale scores.
 */
export function tbResumeSignature(data: TBResumeData): string {
  const { profile, workExperiences, educations, projects, skills, customSections, sectionOrder, hiddenSections } = data;
  return JSON.stringify({ profile, workExperiences, educations, projects, skills, customSections, sectionOrder, hiddenSections });
}
