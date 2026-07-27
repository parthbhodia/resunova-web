import type { ReactNode } from "react";
import type { TBResumeData, TBContentSection, TBCustomSection } from "./types";
import type { CanvasEdit, CanvasEntryKind } from "@/components/canvas/canvasTypes";
import {
  CanvasBlock, EditableText, IcoPlus, IcoTrash, IcoUp, IcoDown, IcoSparkle, IcoDrag,
} from "@/components/canvas/CanvasPrimitives";
import { CanvasSortableGroup, SortableCanvasBlock } from "@/components/canvas/SortableCanvasBlock";
import { isCoreSectionSlot, parseCustomSectionId } from "./types";
import type { ResumeLayoutContext } from "@/lib/resumeLayout";
import {
  resumeBulletStyle,
  resumeCompanyLineStyle,
  resumeEntryBlockStyle,
  resumeJobRowStyle,
  resumeJobTitleStyle,
  resumeMetaSmallStyle,
  resumeMetaStyle,
  resumeSectionTitleStyle,
  resumeSecondaryEntryBlockStyle,
  resumeSkillsTextStyle,
  resumeSummaryStyle,
} from "@/lib/resumeLayout";

/**
 * Wraps children in a sortable group ONLY while editing. With `edit`
 * undefined — the PDF capture path — it is a bare fragment, so no dnd-kit
 * wrapper element can appear in the exported markup.
 */
function MaybeSortable({ edit, ids, onReorder, children }: {
  edit?: CanvasEdit;
  ids: string[];
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
}) {
  if (!edit) return <>{children}</>;
  return <CanvasSortableGroup ids={ids} onReorder={onReorder}>{children}</CanvasSortableGroup>;
}

function parseBullets(raw: string): string[] {
  return raw.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

/**
 * `edit` is OPTIONAL on purpose. This function is also the PDF capture path:
 * when it is omitted the output is byte-identical to what it has always been,
 * so the export cannot be affected by anything the on-screen editor does.
 */
export function renderTbContentSection(
  section: TBContentSection,
  data: TBResumeData,
  ctx: ResumeLayoutContext,
  edit?: CanvasEdit,
): ReactNode {
  const { profile, workExperiences, educations, projects, skills } = data;

  /** Entry-level actions: reorder, hand to AI, delete. */
  const entryActions = (kind: CanvasEntryKind, id: string, idx: number, count: number) => [
    // onClick is a no-op by design: this button's job is to be grabbed.
    // SortableCanvasBlock spreads dnd-kit's listeners onto it by key.
    { key: "drag", label: "Drag to reorder", icon: <IcoDrag />, onClick: () => {} },
    { key: "up", label: "Move up", icon: <IcoUp />, disabled: idx === 0,
      onClick: () => edit!.moveEntry(kind, idx, idx - 1) },
    { key: "down", label: "Move down", icon: <IcoDown />, disabled: idx === count - 1,
      onClick: () => edit!.moveEntry(kind, idx, idx + 1) },
    ...(kind !== "education" ? [{ key: "add", label: "Add bullet", icon: <IcoPlus />,
      onClick: () => edit!.addBullet(kind, id) }] : []),
    ...(edit!.onAi ? [{ key: "ai", label: edit!.aiLocked ? "Sign in to use AI" : "Fix with AI",
      icon: <IcoSparkle />, tone: "ai" as const, onClick: () => edit!.onAi!(kind, id) }] : []),
    { key: "del", label: "Delete block", icon: <IcoTrash />, tone: "danger" as const,
      onClick: () => edit!.removeEntry(kind, id) },
  ];

  const bulletActions = (kind: CanvasEntryKind, id: string, i: number) => [
    { key: "add", label: "Add bullet below", icon: <IcoPlus />, onClick: () => edit!.addBullet(kind, id) },
    { key: "del", label: "Delete bullet", icon: <IcoTrash />, tone: "danger" as const,
      onClick: () => edit!.removeBullet(kind, id, i) },
  ];

  switch (section) {
    case "summary":
      if (!profile.summary.trim()) return null;
      return (
        <>
          <div style={resumeSectionTitleStyle(ctx)}>Summary</div>
          {edit ? (
            <EditableText as="p" multiline value={profile.summary} style={resumeSummaryStyle(ctx)}
              placeholder="Write a two-line summary…"
              onCommit={(v) => edit.setField("profile.summary", v)} />
          ) : (
            <p style={resumeSummaryStyle(ctx)}>{profile.summary}</p>
          )}
        </>
      );
    case "experience":
      if (!workExperiences.some((w) => w.company || w.jobTitle)) return null;
      return (
        <>
          <div style={resumeSectionTitleStyle(ctx)}>Experience</div>
          <MaybeSortable edit={edit} ids={workExperiences.filter((w) => w.company || w.jobTitle).map((w) => w.id)}
            onReorder={(f, t) => edit!.moveEntry("experience", f, t)}>
          {workExperiences.filter((w) => w.company || w.jobTitle).map((w, idx, arr) => {
            const dateStr = [w.startDate, w.current ? "Present" : w.endDate].filter(Boolean).join(" – ");
            const bullets = parseBullets(w.bullets);
            const body = (
              <>
                <div style={resumeJobRowStyle()}>
                  {edit
                    ? <EditableText value={w.jobTitle} placeholder="Job Title" style={resumeJobTitleStyle(ctx)}
                        onCommit={(v) => edit.setField(`work.${w.id}.jobTitle`, v)} />
                    : <span style={resumeJobTitleStyle(ctx)}>{w.jobTitle || "Job Title"}</span>}
                  <span style={resumeMetaStyle(ctx)}>{dateStr}</span>
                </div>
                <div style={resumeJobRowStyle()}>
                  {edit
                    ? <EditableText value={w.company} placeholder="Company" style={resumeCompanyLineStyle(ctx)}
                        onCommit={(v) => edit.setField(`work.${w.id}.company`, v)} />
                    : <span style={resumeCompanyLineStyle(ctx)}>{w.company}</span>}
                  {w.location && <span style={resumeMetaStyle(ctx)}>{w.location}</span>}
                </div>
                {bullets.map((b, i) => (
                  edit ? (
                    <CanvasBlock key={i} dense actions={bulletActions("experience", w.id, i)}>
                      <div style={resumeBulletStyle(ctx)}>• <EditableText value={b} multiline
                        onCommit={(v) => edit.setBullet("experience", w.id, i, v)} /></div>
                    </CanvasBlock>
                  ) : <div key={i} style={resumeBulletStyle(ctx)}>• {b}</div>
                ))}
              </>
            );
            return edit ? (
              <SortableCanvasBlock key={w.id} id={w.id} actions={entryActions("experience", w.id, idx, arr.length)}>
                <div style={resumeEntryBlockStyle(ctx)}>{body}</div>
              </SortableCanvasBlock>
            ) : (
              <div key={w.id} style={resumeEntryBlockStyle(ctx)}>{body}</div>
            );
          })}
          </MaybeSortable>
        </>
      );
    case "education":
      if (!educations.some((e) => e.school || e.degree)) return null;
      return (
        <>
          <div style={resumeSectionTitleStyle(ctx)}>Education</div>
          <MaybeSortable edit={edit} ids={educations.filter((e) => e.school || e.degree).map((e) => e.id)}
            onReorder={(f, t) => edit!.moveEntry("education", f, t)}>
          {educations.filter((e) => e.school || e.degree).map((e, idx, arr) => {
            const dateStr = [e.startDate, e.endDate].filter(Boolean).join(" – ");
            const eduBody = (
              <div style={resumeSecondaryEntryBlockStyle(ctx)}>
                <div style={resumeJobRowStyle()}>
                  {edit
                    ? <EditableText value={e.school} placeholder="School" style={resumeJobTitleStyle(ctx)}
                        onCommit={(v) => edit.setField(`edu.${e.id}.school`, v)} />
                    : <span style={resumeJobTitleStyle(ctx)}>{e.school || "School"}</span>}
                  <span style={resumeMetaStyle(ctx)}>{dateStr}</span>
                </div>
                <div style={resumeJobRowStyle()}>
                  {edit
                    ? <EditableText value={e.degree} placeholder="Degree" style={resumeCompanyLineStyle(ctx)}
                        onCommit={(v) => edit.setField(`edu.${e.id}.degree`, v)} />
                    : <span style={resumeCompanyLineStyle(ctx)}>{e.degree}</span>}
                  {e.gpa && <span style={resumeMetaStyle(ctx)}>GPA: {e.gpa}</span>}
                </div>
                {e.location && <div style={resumeMetaSmallStyle(ctx)}>{e.location}</div>}
                {e.coursework && <div style={resumeMetaSmallStyle(ctx)}>Coursework: {e.coursework}</div>}
              </div>
            );
            return edit ? (
              <SortableCanvasBlock key={e.id} id={e.id} actions={entryActions("education", e.id, idx, arr.length)}>{eduBody}</SortableCanvasBlock>
            ) : <div key={e.id}>{eduBody}</div>;
          })}
          </MaybeSortable>
        </>
      );
    case "projects":
      if (!projects.some((p) => p.name)) return null;
      return (
        <>
          <div style={resumeSectionTitleStyle(ctx)}>Projects</div>
          <MaybeSortable edit={edit} ids={projects.filter((p) => p.name).map((p) => p.id)}
            onReorder={(f, t) => edit!.moveEntry("project", f, t)}>
          {projects.filter((p) => p.name).map((p, idx, arr) => {
            const bullets = parseBullets(p.bullets);
            const projBody = (
              <div style={resumeSecondaryEntryBlockStyle(ctx)}>
                <div style={resumeJobRowStyle()}>
                  <span style={resumeJobTitleStyle(ctx)}>
                    {edit
                      ? <EditableText value={p.name} placeholder="Project"
                          onCommit={(v) => edit.setField(`proj.${p.id}.name`, v)} />
                      : p.name}
                    {p.tech ? <span style={{ fontWeight: 400, color: "#444" }}> | {p.tech}</span> : ""}
                  </span>
                  {p.date && <span style={resumeMetaStyle(ctx)}>{p.date}</span>}
                </div>
                {p.link && <div style={resumeMetaSmallStyle(ctx)}>{p.link}</div>}
                {bullets.map((b, i) => (
                  edit ? (
                    <CanvasBlock key={i} dense actions={bulletActions("project", p.id, i)}>
                      <div style={resumeBulletStyle(ctx)}>• <EditableText value={b} multiline
                        onCommit={(v) => edit.setBullet("project", p.id, i, v)} /></div>
                    </CanvasBlock>
                  ) : <div key={i} style={resumeBulletStyle(ctx)}>• {b}</div>
                ))}
              </div>
            );
            return edit ? (
              <SortableCanvasBlock key={p.id} id={p.id} actions={entryActions("project", p.id, idx, arr.length)}>{projBody}</SortableCanvasBlock>
            ) : <div key={p.id}>{projBody}</div>;
          })}
          </MaybeSortable>
        </>
      );
    case "skills": {
      const featuredWithSkill = skills.featuredSkills.filter((f) => f.skill.trim());
      if (!featuredWithSkill.length && !skills.descriptions.trim()) return null;
      // Featured skills render as a plain highlighted list — no proficiency
      // dots (self-assessed ratings carry no signal for recruiters/ATS).
      return (
        <>
          <div style={resumeSectionTitleStyle(ctx)}>Skills</div>
          {featuredWithSkill.length > 0 && (
            <div style={{ ...resumeSkillsTextStyle(ctx), fontWeight: 600, color: "#222", marginBottom: 2 }}>
              {featuredWithSkill.map((fs) => fs.skill).join("  ·  ")}
            </div>
          )}
          {skills.descriptions.trim() && (
            <div style={resumeSkillsTextStyle(ctx)}>
              {skills.descriptions.split("\n").filter(Boolean).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </>
      );
    }
    default:
      return null;
  }
}

function renderCustomSection(section: TBCustomSection, ctx: ResumeLayoutContext): ReactNode {
  const title = section.title.trim();
  const lines = section.lines.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  if (!title && !lines.length) return null;
  return (
    <>
      <div style={resumeSectionTitleStyle(ctx)}>{title || "Additional"}</div>
      {lines.map((line, i) => (
        <div key={i} style={resumeBulletStyle(ctx)}>• {line}</div>
      ))}
    </>
  );
}

export function renderSectionSlot(
  slot: string,
  data: TBResumeData,
  ctx: ResumeLayoutContext,
  edit?: CanvasEdit,
): ReactNode {
  const customId = parseCustomSectionId(slot);
  if (customId) {
    const section = data.customSections.find((c) => c.id === customId);
    return section ? renderCustomSection(section, ctx) : null;
  }
  if (isCoreSectionSlot(slot)) {
    return renderTbContentSection(slot, data, ctx, edit);
  }
  return null;
}
