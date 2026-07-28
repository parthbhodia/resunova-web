import re

with open('components/TemplateBuilder/renderResumeSections.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add the wrapper function
wrapper_func = """
function renderSectionWithBookmarkGrid(ctx: ResumeLayoutContext, title: string, content: ReactNode) {
  if (ctx.preset.id === "teal-bookmark") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 24, marginBottom: ctx.preset.sectionGap }}>
        <div style={{ fontWeight: 700, color: "#000", fontSize: ctx.preset.sectionFont }}>{title}</div>
        <div style={{ minWidth: 0 }}>{content}</div>
      </div>
    );
  }
  return (
    <>
      {title && !ctx.preset.id.startsWith("teal-") && <div style={resumeSectionTitleStyle(ctx)}>{title}</div>}
      {title && ctx.preset.id.startsWith("teal-") && ctx.preset.id !== "teal-bookmark" && <div style={resumeSectionTitleStyle(ctx)}>{title}</div>}
      {content}
    </>
  );
}
"""

content = content.replace('export function renderTbContentSection', wrapper_func + '\nexport function renderTbContentSection')

# 2. Refactor summary
summary_old = """        <>
          {!ctx.preset.id.startsWith("teal-") && <div style={resumeSectionTitleStyle(ctx)}>Summary</div>}
          {edit ? (
            <EditableText as="p" multiline value={profile.summary} style={resumeSummaryStyle(ctx)}
              placeholder="Write a two-line summary…"
              onCommit={(v) => edit.setField("profile.summary", v)} />
          ) : (
            <p style={resumeSummaryStyle(ctx)}>{profile.summary}</p>
          )}
        </>"""
summary_new = """        renderSectionWithBookmarkGrid(ctx, "Professional Summary", (
          edit ? (
            <EditableText as="p" multiline value={profile.summary} style={resumeSummaryStyle(ctx)}
              placeholder="Write a two-line summary…"
              onCommit={(v) => edit.setField("profile.summary", v)} />
          ) : (
            <p style={resumeSummaryStyle(ctx)}>{profile.summary}</p>
          )
        ))"""
content = content.replace(summary_old, summary_new)

# 3. Refactor experience
experience_old = """        <>
          <div style={resumeSectionTitleStyle(ctx)}>Work Experience</div>
          <MaybeSortable edit={edit} ids={workExperiences.filter((w) => w.company || w.jobTitle).map((w) => w.id)}
            onReorder={(f, t) => edit!.moveEntry("experience", f, t)}>"""
experience_new = """        renderSectionWithBookmarkGrid(ctx, "Work Experience", (
          <MaybeSortable edit={edit} ids={workExperiences.filter((w) => w.company || w.jobTitle).map((w) => w.id)}
            onReorder={(f, t) => edit!.moveEntry("experience", f, t)}>"""
content = content.replace(experience_old, experience_new)
content = content.replace('          </MaybeSortable>\n        </>', '          </MaybeSortable>\n        ))')

# 4. Swap company and job title for teal-bookmark
job_row_old = """                <div style={resumeJobRowStyle()}>
                  {edit
                    ? <EditableText value={w.jobTitle} placeholder="Job Title" style={resumeJobTitleStyle(ctx)}
                        onCommit={(v) => edit.setField(work..jobTitle, v)} />
                    : <span style={resumeJobTitleStyle(ctx)}>{w.jobTitle || "Job Title"}</span>}
                  <span style={resumeMetaStyle(ctx)}>{dateStr}</span>
                </div>
                <div style={resumeJobRowStyle()}>
                  {edit
                    ? <EditableText value={w.company} placeholder="Company" style={resumeCompanyLineStyle(ctx)}
                        onCommit={(v) => edit.setField(work..company, v)} />
                    : <span style={resumeCompanyLineStyle(ctx)}>{w.company}</span>}
                  {w.location && <span style={resumeMetaStyle(ctx)}>{w.location}</span>}
                </div>"""
job_row_new = """                {ctx.preset.id === "teal-bookmark" ? (
                  <>
                    <div style={resumeJobRowStyle()}>
                      {edit
                        ? <EditableText value={w.company} placeholder="Company" style={{ ...resumeCompanyLineStyle(ctx), color: "#000", fontWeight: 700 }}
                            onCommit={(v) => edit.setField(work..company, v)} />
                        : <span style={{ ...resumeCompanyLineStyle(ctx), color: "#000", fontWeight: 700 }}>{w.company}</span>}
                      <span style={resumeMetaStyle(ctx)}>{dateStr}</span>
                    </div>
                    <div style={{ ...resumeJobRowStyle(), marginBottom: 4 }}>
                      {edit
                        ? <EditableText value={w.jobTitle} placeholder="Job Title" style={{ ...resumeJobTitleStyle(ctx), fontWeight: 400, color: "#eab308" }}
                            onCommit={(v) => edit.setField(work..jobTitle, v)} />
                        : <span style={{ ...resumeJobTitleStyle(ctx), fontWeight: 400, color: "#eab308" }}>{w.jobTitle || "Job Title"}</span>}
                      {w.location && <span style={resumeMetaStyle(ctx)}>{w.location}</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={resumeJobRowStyle()}>
                      {edit
                        ? <EditableText value={w.jobTitle} placeholder="Job Title" style={resumeJobTitleStyle(ctx)}
                            onCommit={(v) => edit.setField(work..jobTitle, v)} />
                        : <span style={resumeJobTitleStyle(ctx)}>{w.jobTitle || "Job Title"}</span>}
                      <span style={resumeMetaStyle(ctx)}>{dateStr}</span>
                    </div>
                    <div style={resumeJobRowStyle()}>
                      {edit
                        ? <EditableText value={w.company} placeholder="Company" style={resumeCompanyLineStyle(ctx)}
                            onCommit={(v) => edit.setField(work..company, v)} />
                        : <span style={resumeCompanyLineStyle(ctx)}>{w.company}</span>}
                      {w.location && <span style={resumeMetaStyle(ctx)}>{w.location}</span>}
                    </div>
                  </>
                )}"""
content = content.replace(job_row_old, job_row_new)

# 5. Refactor education
education_old = """        <>
          <div style={resumeSectionTitleStyle(ctx)}>Education</div>
          <MaybeSortable edit={edit} ids={educations.filter((e) => e.school || e.degree).map((e) => e.id)}
            onReorder={(f, t) => edit!.moveEntry("education", f, t)}>"""
education_new = """        renderSectionWithBookmarkGrid(ctx, "Education", (
          <MaybeSortable edit={edit} ids={educations.filter((e) => e.school || e.degree).map((e) => e.id)}
            onReorder={(f, t) => edit!.moveEntry("education", f, t)}>"""
content = content.replace(education_old, education_new)
content = content.replace('          </MaybeSortable>\n        </>', '          </MaybeSortable>\n        ))', 1)

# 6. Refactor projects
projects_old = """        <>
          <div style={resumeSectionTitleStyle(ctx)}>Projects</div>
          <MaybeSortable edit={edit} ids={projects.filter((p) => p.name).map((p) => p.id)}
            onReorder={(f, t) => edit!.moveEntry("project", f, t)}>"""
projects_new = """        renderSectionWithBookmarkGrid(ctx, "Projects", (
          <MaybeSortable edit={edit} ids={projects.filter((p) => p.name).map((p) => p.id)}
            onReorder={(f, t) => edit!.moveEntry("project", f, t)}>"""
content = content.replace(projects_old, projects_new)
content = content.replace('          </MaybeSortable>\n        </>', '          </MaybeSortable>\n        ))', 1)

# 7. Refactor skills
skills_old = """        <>
          <div style={resumeSectionTitleStyle(ctx)}>Skills</div>
          <MaybeSortable edit={edit} ids={skills.featuredSkills.filter((s) => s.skill).map((_, i) => String(i))}
            onReorder={(f, t) => edit!.moveEntry("skill", f, t)}>"""
skills_new = """        renderSectionWithBookmarkGrid(ctx, "Skills", (
          <MaybeSortable edit={edit} ids={skills.featuredSkills.filter((s) => s.skill).map((_, i) => String(i))}
            onReorder={(f, t) => edit!.moveEntry("skill", f, t)}>"""
content = content.replace(skills_old, skills_new)
content = content.replace('          </MaybeSortable>\n        </>', '          </MaybeSortable>\n        ))', 1)

# 8. Refactor custom sections
custom_old = """        <>
          <div style={resumeSectionTitleStyle(ctx)}>{customSec.name || "Custom Section"}</div>
          <MaybeSortable edit={edit} ids={customSec.items.map((it) => it.id)}
            onReorder={(f, t) => edit!.moveEntry("custom", f, t)}>"""
custom_new = """        renderSectionWithBookmarkGrid(ctx, customSec.name || "Custom Section", (
          <MaybeSortable edit={edit} ids={customSec.items.map((it) => it.id)}
            onReorder={(f, t) => edit!.moveEntry("custom", f, t)}>"""
content = content.replace(custom_old, custom_new)
content = content.replace('          </MaybeSortable>\n        </>', '          </MaybeSortable>\n        ))', 1)

with open('components/TemplateBuilder/renderResumeSections.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
