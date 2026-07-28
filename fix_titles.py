import os
import re

path = 'components/TemplateBuilder/renderResumeSections.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''
function renderSectionTitle(ctx: ResumeLayoutContext, title: ReactNode) {
  if (!title) return null;
  if (ctx.preset.id.startsWith("teal-line-")) {
    return (
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <div style={{ ...resumeSectionTitleStyle(ctx), marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>{title}</div>
        <div style={{ flex: 1, height: 1.5, background: "rgba(0,0,0,0.1)", marginLeft: 12 }}></div>
      </div>
    );
  }
  return <div style={resumeSectionTitleStyle(ctx)}>{title}</div>;
}

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
      {title && renderSectionTitle(ctx, title)}
      {content}
    </>
  );
}
'''

content = re.sub(r'function renderSectionWithBookmarkGrid.*?return \(\s*<>\s*\{title.*?</>\s*\);\s*\}', replacement, content, flags=re.DOTALL)

# Replace <div style={resumeSectionTitleStyle(ctx)}>Skills</div>
content = content.replace('<div style={resumeSectionTitleStyle(ctx)}>Skills</div>', '{renderSectionTitle(ctx, "Skills")}')

# Replace <div style={resumeSectionTitleStyle(ctx)}> with {edit ? ... }
# For custom sections:
custom_section_orig = '''    return (
      <>
        <div style={resumeSectionTitleStyle(ctx)}>
          {edit
            ? <EditableText value={title || "Additional"}
                onCommit={(v) => edit.setCustomTitle(section.id, v)} />
            : title || "Additional"}
        </div>
        <MaybeSortable edit={edit} ids={lines.map((l) => l.id)}'''
        
custom_section_new = '''    return (
      <>
        {renderSectionTitle(ctx, edit
            ? <EditableText value={title || "Additional"}
                onCommit={(v) => edit.setCustomTitle(section.id, v)} />
            : title || "Additional")}
        <MaybeSortable edit={edit} ids={lines.map((l) => l.id)}'''

content = content.replace(custom_section_orig, custom_section_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
