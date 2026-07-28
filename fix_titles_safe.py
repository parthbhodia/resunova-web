import os

path = 'components/TemplateBuilder/renderResumeSections.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

helper = '''
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

export function renderTbContentSection(
'''

if 'renderSectionTitle' not in content:
    content = content.replace('export function renderTbContentSection(', helper)
    
    # Replace normal sections
    content = content.replace('<div style={resumeSectionTitleStyle(ctx)}>Summary</div>', '{renderSectionTitle(ctx, "Summary")}')
    content = content.replace('<div style={resumeSectionTitleStyle(ctx)}>Experience</div>', '{renderSectionTitle(ctx, "Experience")}')
    content = content.replace('<div style={resumeSectionTitleStyle(ctx)}>Education</div>', '{renderSectionTitle(ctx, "Education")}')
    content = content.replace('<div style={resumeSectionTitleStyle(ctx)}>Projects</div>', '{renderSectionTitle(ctx, "Projects")}')
    content = content.replace('<div style={resumeSectionTitleStyle(ctx)}>Skills</div>', '{renderSectionTitle(ctx, "Skills")}')
    
    # Replace custom sections
    custom_orig = '''        <div style={resumeSectionTitleStyle(ctx)}>
          {edit
            ? <EditableText value={title || "Additional"}
                onCommit={(v) => edit.setCustomTitle(section.id, v)} />
            : title || "Additional"}
        </div>'''
        
    custom_new = '''        {renderSectionTitle(ctx, edit
            ? <EditableText value={title || "Additional"}
                onCommit={(v) => edit.setCustomTitle(section.id, v)} />
            : title || "Additional")}'''
            
    content = content.replace(custom_orig, custom_new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
