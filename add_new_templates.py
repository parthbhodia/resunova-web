import os
import re

# 1. Add presets to resumeLayout.ts
path = 'lib/resumeLayout.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

presets_to_add = '''  { id: "teal-line-split", label: "Split Sidebar", description: "Teal HQ Split Sidebar template", font: "Helvetica", accentColor: "#297860", baseFont: 11, bodyFont: 10, metaFont: 10, sectionFont: 11, nameFont: 28, lineHeight: 1.4, summaryLineHeight: 1.5, skillsLineHeight: 1.5, sectionGap: 16, entryGap: 16, bulletGap: 4, letterSpacing: 0 },
  { id: "teal-line-classic", label: "Classic Left Header", description: "Teal HQ Classic Left Header template", font: "Helvetica", accentColor: "#297860", baseFont: 11, bodyFont: 10, metaFont: 10, sectionFont: 11, nameFont: 28, lineHeight: 1.4, summaryLineHeight: 1.5, skillsLineHeight: 1.5, sectionGap: 16, entryGap: 16, bulletGap: 4, letterSpacing: 0 },
  { id: "teal-line-bold", label: "Bold Classic Header", description: "Teal HQ Bold Classic Header", font: "Helvetica", accentColor: "#4a3c75", baseFont: 11, bodyFont: 10, metaFont: 10, sectionFont: 11, nameFont: 28, lineHeight: 1.4, summaryLineHeight: 1.5, skillsLineHeight: 1.5, sectionGap: 16, entryGap: 16, bulletGap: 4, letterSpacing: 0 },'''

if 'teal-line-split' not in content:
    content = content.replace('  { id: "teal-bookmark"', presets_to_add + '\n  { id: "teal-bookmark"')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 2. Add layouts to types.ts
path = 'components/TemplateBuilder/types.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'teal-skills-sidebar' not in content:
    content = content.replace('export type TBLayout = "single" | "twoColumn" | "teal-split" | "teal-centered" | "teal-single";', 'export type TBLayout = "single" | "twoColumn" | "teal-split" | "teal-centered" | "teal-single" | "teal-skills-sidebar" | "teal-left-header";')
    content = content.replace('"teal-bookmark";', '"teal-bookmark" | "teal-line-split" | "teal-line-classic" | "teal-line-bold";')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

