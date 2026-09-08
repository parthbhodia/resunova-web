/**
 * Single source of truth for résumé preview/PDF layout (Template Builder, Analyze, Tailor).
 * Spacing follows ATS-friendly single-column rules: symmetric page padding, tight bullets,
 * entryGap between jobs. Template Builder + AnalyzeLiveResumeBody both consume this module.
 */
import type { CSSProperties } from "react";
import type { TBFont, TBPageWidth, TBStylePreset, TBFontSize, TBLayout } from "@/components/TemplateBuilder/types";

export type { TBFont, TBPageWidth, TBStylePreset, TBFontSize, TBLayout };

export interface ResumeStylePresetOption {
  id: TBStylePreset;
  label: string;
  description: string;
  font: TBFont;
  accentColor: string;
  baseFont: number;
  bodyFont: number;
  metaFont: number;
  sectionFont: number;
  nameFont: number;
  lineHeight: number;
  summaryLineHeight: number;
  skillsLineHeight: number;
  sectionGap: number;
  entryGap: number;
  bulletGap: number;
  letterSpacing: number;
  /** Visual category grouping for the Style panel. */
  category?: "technical" | "creative";
  /**
   * The kind of role this look suits, and the label every template surface
   * leads with. It is a FIT, not a structure: presets differ in typography
   * and layout only, so no template carries role-specific sections and any
   * of them can hold any resume. Saying "best for" rather than naming a job
   * title is the difference between guidance and a claim we cannot keep.
   */
  bestFor: string;
  /** Forces a specific layout when this preset is active. */
  enforcedLayout?: TBLayout;
}

export interface ResumePageWidthOption {
  id: TBPageWidth;
  label: string;
  description: string;
  paddingX: number;
  paddingY: number;
}

/** US Letter width — WYSIWYG preview + Chromium export. */
export const RESUME_PAGE_WIDTH = "8.5in";

/** Shared constants not tied to a style preset. */
export const RESUME_LAYOUT_SHELL = {
  sectionTitleMarginBottom: 6,
  sectionTitlePaddingBottom: 2,
  contactMarginBottom: 16,
  headerNameMarginBottom: 3,
  headerNameLetterSpacing: 0.3,
  bulletIndentPx: 12,
  contactRowGap: 4,
  secondaryEntryMarginFloor: 5,
} as const;

export const RESUME_STYLE_PRESETS: ResumeStylePresetOption[] = [
  {
    id: "executive",
    label: "Executive",
    description: "Roomy hierarchy that suits product, program, and leadership resumes.",
    bestFor: "Product & leadership",
    font: "Helvetica",
    accentColor: "#1e3a5f",
    baseFont: 11,
    bodyFont: 10,
    metaFont: 10,
    sectionFont: 11,
    nameFont: 16,
    lineHeight: 1.15,
    summaryLineHeight: 1.2,
    skillsLineHeight: 1.15,
    sectionGap: 11,
    entryGap: 8,
    bulletGap: 2,
    letterSpacing: 1,
    category: "technical",
  },
  {
    id: "modern",
    label: "Modern",
    description: "Tighter sans-serif that fits dense software and engineering resumes.",
    bestFor: "Software & engineering",
    font: "Helvetica",
    accentColor: "#0f5561",
    baseFont: 10.5,
    bodyFont: 10,
    metaFont: 10,
    sectionFont: 10.5,
    nameFont: 16,
    lineHeight: 1.1,
    summaryLineHeight: 1.15,
    skillsLineHeight: 1.1,
    sectionGap: 9,
    entryGap: 6,
    bulletGap: 1.5,
    letterSpacing: 0.9,
    category: "technical",
  },
  {
    id: "classic",
    label: "Classic",
    description: "Traditional serif for academic, research, and formal roles.",
    bestFor: "Academic & research",
    font: "Times-Roman",
    accentColor: "#1a1a1a",
    baseFont: 11,
    bodyFont: 10.5,
    metaFont: 10,
    sectionFont: 11,
    nameFont: 16,
    lineHeight: 1.15,
    summaryLineHeight: 1.2,
    skillsLineHeight: 1.15,
    sectionGap: 11,
    entryGap: 7,
    bulletGap: 2,
    letterSpacing: 0.8,
    category: "technical",
  },
  {
    id: "creative-teal",
    label: "Elise",
    description: "Dark sidebar and an initials badge, for design and brand roles.",
    bestFor: "Design & creative",
    font: "Helvetica",
    accentColor: "#0f5561",
    baseFont: 10.5,
    bodyFont: 10,
    metaFont: 9.5,
    sectionFont: 12,
    nameFont: 22,
    lineHeight: 1.15,
    summaryLineHeight: 1.25,
    skillsLineHeight: 1.2,
    sectionGap: 12,
    entryGap: 8,
    bulletGap: 3,
    letterSpacing: 1.2,
    category: "creative",
    enforcedLayout: "rightSidebar",
  },
  {
    id: "creative-banner",
    label: "Harper",
    description: "Bold header over a two-column body, for data and analytics roles.",
    bestFor: "Data & analytics",
    font: "Helvetica",
    accentColor: "#1e3a5f",
    baseFont: 10.5,
    bodyFont: 10,
    metaFont: 10,
    sectionFont: 11.5,
    nameFont: 22,
    lineHeight: 1.15,
    summaryLineHeight: 1.25,
    skillsLineHeight: 1.2,
    sectionGap: 12,
    entryGap: 8,
    bulletGap: 3,
    letterSpacing: 1,
    category: "creative",
    enforcedLayout: "topBannerRightSidebar",
  },
];

export const RESUME_PAGE_WIDTH_OPTIONS: ResumePageWidthOption[] = [
  {
    id: "narrow",
    label: "Narrow",
    description: "Generous margins: 1.0in sides, 0.75in top/bottom.",
    paddingX: 96,
    paddingY: 72,
  },
  {
    id: "standard",
    label: "Standard",
    description: "Recommended: 0.75in sides, ~0.56in top/bottom.",
    paddingX: 72,
    paddingY: 54,
  },
  {
    id: "wide",
    label: "Wide",
    description: "Maximum content space: 0.5in margins on all sides (ATS minimum).",
    paddingX: 48,
    paddingY: 48,
  },
];

const FONT_STACK: Record<TBFont, string> = {
  Helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "Times-Roman": "'Times New Roman', Georgia, serif",
  Courier: "'Courier New', Courier, monospace",
};

export function fontStackFor(font: TBFont): string {
  return FONT_STACK[font] ?? FONT_STACK.Helvetica;
}

export function getResumeStylePreset(id?: TBStylePreset): ResumeStylePresetOption {
  return RESUME_STYLE_PRESETS.find((p) => p.id === id) ?? RESUME_STYLE_PRESETS[0];
}

export function getResumePageWidth(id?: TBPageWidth): ResumePageWidthOption {
  return RESUME_PAGE_WIDTH_OPTIONS.find((o) => o.id === id) ?? RESUME_PAGE_WIDTH_OPTIONS[1];
}

/** Analyze/Tailor style chip ids (persisted in localStorage). */
export type ResumePreviewStyleId = "classic" | "modern" | "compact";

const PREVIEW_STYLE_TO_PRESET: Record<ResumePreviewStyleId, TBStylePreset> = {
  classic: "classic",
  modern: "modern",
  compact: "executive",
};

export interface ResumeLayoutContext {
  preset: ResumeStylePresetOption;
  page: ResumePageWidthOption;
  fontStack: string;
  accent: string;
}

const FONT_SIZE_SCALE: Record<TBFontSize, number> = {
  small: 0.92,
  medium: 1.0,
  large: 1.10,
};

export const RESUME_FONT_SIZE_OPTIONS: ReadonlyArray<{
  id: TBFontSize;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  { id: "small", label: "Small", shortLabel: "S", description: "Fits more content" },
  { id: "medium", label: "Medium", shortLabel: "M", description: "Default balance" },
  { id: "large", label: "Large", shortLabel: "L", description: "Easy to read" },
];

export function resolveResumeLayout(opts: {
  stylePreset?: TBStylePreset;
  pageWidth?: TBPageWidth;
  font?: TBFont;
  accentColor?: string;
  fontSize?: TBFontSize;
}): ResumeLayoutContext {
  const preset = getResumeStylePreset(opts.stylePreset);
  const page = getResumePageWidth(opts.pageWidth);
  const font = opts.font ?? preset.font;
  const scale = FONT_SIZE_SCALE[opts.fontSize ?? "medium"] ?? 1.0;
  const scaledPreset: ResumeStylePresetOption = scale === 1.0 ? preset : {
    ...preset,
    // Floor body/base at 10pt (ATS minimum) and cap name at 14–16pt regardless of scale.
    baseFont: Math.max(10, preset.baseFont * scale),
    bodyFont: Math.max(10, preset.bodyFont * scale),
    metaFont: preset.metaFont * scale,
    sectionFont: preset.sectionFont * scale,
    nameFont: Math.max(14, Math.min(16, preset.nameFont * scale)),
  };
  return {
    preset: scaledPreset,
    page,
    fontStack: fontStackFor(font),
    accent: opts.accentColor ?? preset.accentColor,
  };
}

export function resumeLayoutFromPreviewStyle(
  styleId: ResumePreviewStyleId,
  pageWidthId: TBPageWidth = "standard",
  accentColor?: string,
  fontSize: TBFontSize = "medium",
  font?: TBFont,
): ResumeLayoutContext {
  return resolveResumeLayout({
    stylePreset: PREVIEW_STYLE_TO_PRESET[styleId],
    pageWidth: pageWidthId,
    accentColor,
    fontSize,
    font,
  });
}

/** CSS custom properties for AnnotatedResumePanel paper + AnalyzeLiveResumeBody. */
export function resumeLayoutCssVars(ctx: ResumeLayoutContext): Record<string, string> {
  const { preset, page, fontStack } = ctx;
  return {
    "--az-resume-heading-font": fontStack,
    "--az-resume-body-font": fontStack,
    "--az-resume-ui-font": fontStack,
    "--az-resume-base-font-size": `${preset.baseFont}px`,
    "--az-resume-body-font-size": `${preset.bodyFont}px`,
    "--az-resume-line-height": String(preset.lineHeight),
    "--az-resume-summary-line-height": String(preset.summaryLineHeight),
    "--az-resume-skills-line-height": String(preset.skillsLineHeight),
    "--az-resume-name-size": `${preset.nameFont}px`,
    "--az-resume-section-size": `${preset.sectionFont}px`,
    "--az-resume-section-tracking": `${preset.letterSpacing}px`,
    "--az-resume-paper-padding": `${page.paddingY}px ${page.paddingX}px`,
    "--az-resume-section-margin-top": `${preset.sectionGap}px`,
    "--az-resume-section-title-margin-bottom": `${RESUME_LAYOUT_SHELL.sectionTitleMarginBottom}px`,
    "--az-resume-entry-gap": `${preset.entryGap}px`,
    "--az-resume-bullet-gap": `${preset.bulletGap}px`,
    "--az-resume-contact-margin-bottom": `${RESUME_LAYOUT_SHELL.contactMarginBottom}px`,
    "--az-resume-header-name-margin-bottom": `${RESUME_LAYOUT_SHELL.headerNameMarginBottom}px`,
    "--resume-paper-accent": ctx.accent,
    "--resume-paper-inverse-text": "#ffffff",
    "--resume-paper-inverse-muted": "rgba(255, 255, 255, 0.7)",
  };
}

export function resumeLayoutCssVarsForPreviewStyle(
  styleId: ResumePreviewStyleId,
  pageWidthId: TBPageWidth = "standard",
  accentColor?: string,
  fontSize: TBFontSize = "medium",
  font?: TBFont,
): Record<string, string> {
  return resumeLayoutCssVars(resumeLayoutFromPreviewStyle(styleId, pageWidthId, accentColor, fontSize, font));
}

/** Template Builder `ResumePreview` page root. */
export function resumePageRootStyle(
  ctx: ResumeLayoutContext,
  opts?: { showShadow?: boolean },
): CSSProperties {
  return {
    background: "#ffffff",
    color: "#1a1a1a",
    fontFamily: ctx.fontStack,
    fontSize: ctx.preset.baseFont,
    lineHeight: ctx.preset.lineHeight,
    padding: `${ctx.page.paddingY}px ${ctx.page.paddingX}px`,
    minHeight: "11in",
    width: RESUME_PAGE_WIDTH,
    maxWidth: "100%",
    boxSizing: "border-box",
    boxShadow: opts?.showShadow !== false ? "0 2px 16px rgba(0,0,0,0.18)" : undefined,
    margin: "0 auto",
  };
}

export function resumeSectionTitleStyle(ctx: ResumeLayoutContext): CSSProperties {
  return {
    fontSize: ctx.preset.sectionFont,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ctx.preset.letterSpacing,
    color: ctx.accent,
    borderBottom: `0.5px solid ${ctx.accent}`,
    paddingBottom: RESUME_LAYOUT_SHELL.sectionTitlePaddingBottom,
    marginBottom: RESUME_LAYOUT_SHELL.sectionTitleMarginBottom,
    marginTop: ctx.preset.sectionGap,
  };
}

export function resumeNameStyle(ctx: ResumeLayoutContext): CSSProperties {
  return {
    fontSize: ctx.preset.nameFont,
    fontWeight: 700,
    letterSpacing: RESUME_LAYOUT_SHELL.headerNameLetterSpacing,
    marginBottom: RESUME_LAYOUT_SHELL.headerNameMarginBottom,
    color: "#111",
  };
}

export function resumeContactStyle(ctx: ResumeLayoutContext): CSSProperties {
  return {
    fontSize: ctx.preset.metaFont + 0.5,
    color: "#555",
    marginBottom: RESUME_LAYOUT_SHELL.contactMarginBottom,
    display: "flex",
    flexWrap: "wrap",
    gap: RESUME_LAYOUT_SHELL.contactRowGap,
  };
}

export function resumeJobRowStyle(): CSSProperties {
  return { display: "flex", justifyContent: "space-between", alignItems: "baseline" };
}

export function resumeJobTitleStyle(ctx: ResumeLayoutContext): CSSProperties {
  return { fontWeight: 700, fontSize: ctx.preset.baseFont };
}

export function resumeMetaStyle(ctx: ResumeLayoutContext): CSSProperties {
  return { fontSize: ctx.preset.metaFont + 0.5, color: "#666" };
}

export function resumeCompanyLineStyle(ctx: ResumeLayoutContext): CSSProperties {
  return { fontSize: ctx.preset.baseFont - 0.5, color: "#333" };
}

export function resumeBulletStyle(ctx: ResumeLayoutContext): CSSProperties {
  return {
    fontSize: ctx.preset.bodyFont,
    marginLeft: RESUME_LAYOUT_SHELL.bulletIndentPx,
    marginBottom: ctx.preset.bulletGap,
    color: "#222",
  };
}

export function resumeSummaryStyle(ctx: ResumeLayoutContext): CSSProperties {
  return {
    fontSize: ctx.preset.bodyFont,
    color: "#333",
    lineHeight: ctx.preset.summaryLineHeight,
    margin: 0,
  };
}

export function resumeMetaSmallStyle(ctx: ResumeLayoutContext): CSSProperties {
  return { fontSize: ctx.preset.metaFont, color: "#666" };
}

export function resumeEntryBlockStyle(ctx: ResumeLayoutContext): CSSProperties {
  return { marginBottom: ctx.preset.entryGap };
}

export function resumeSecondaryEntryBlockStyle(ctx: ResumeLayoutContext): CSSProperties {
  return {
    marginBottom: Math.max(
      RESUME_LAYOUT_SHELL.secondaryEntryMarginFloor,
      ctx.preset.entryGap - RESUME_LAYOUT_SHELL.secondaryEntryMarginFloor,
    ),
  };
}

export function resumeSkillsGridStyle(isSidebar?: boolean): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isSidebar ? "1fr" : "repeat(3, 1fr)",
    gap: "4px 16px",
    marginBottom: RESUME_LAYOUT_SHELL.sectionTitleMarginBottom,
  };
}

export function resumeSkillsTextStyle(ctx: ResumeLayoutContext): CSSProperties {
  return {
    fontSize: ctx.preset.bodyFont,
    color: "#333",
    lineHeight: ctx.preset.skillsLineHeight,
  };
}

/* ── Analyze/Tailor block builders (structured + text paths) ── */

export type ResumeSectionRole =
  | "education"
  | "experience"
  | "skills"
  | "projects"
  | "summary"
  | "activities"
  | "other";

export function isTechnologiesLine(line: string): boolean {
  return /^technologies\s*:/i.test(line.trim());
}

export function paragraphBlockStyle(
  role: ResumeSectionRole | null,
  lines: string[],
): CSSProperties {
  if (role === "summary" || role === "skills") {
    return { marginTop: 0, marginBottom: 0 };
  }
  if (role === "experience") {
    if (lines.some((l) => isTechnologiesLine(l))) {
      return { marginTop: 0, marginBottom: "var(--az-resume-entry-gap, 8px)" };
    }
    return { marginTop: 0, marginBottom: 2 };
  }
  if (role === "education") {
    return { marginTop: 0, marginBottom: 2 };
  }
  return { marginTop: 0, marginBottom: 4 };
}

export function bulletsBlockStyle(role: ResumeSectionRole | null): CSSProperties {
  if (role === "experience") {
    return { marginTop: 0, marginBottom: 2 };
  }
  return { marginTop: 0, marginBottom: 4 };
}

/** Inline <style> for AnalyzeLiveResumeBody bullet rows — values use CSS vars from resumeLayoutCssVars. */
export const RESUME_BULLET_STYLESHEET = `
  .az-resume-bullet {
    position: relative;
    padding: 0 4px 0 12px;
    border-radius: 2px;
    margin-bottom: var(--az-resume-bullet-gap, 2px);
    cursor: default;
    transition: background 0.12s;
  }
  .az-resume-bullet--tailor {
    padding: 2px 6px 2px 14px;
  }
  .az-resume-bullet::before {
    content: "•";
    position: absolute;
    left: 0;
    top: 0.15em;
    color: var(--resume-paper-dim);
    font-size: var(--az-resume-body-font-size, 10px);
    line-height: inherit;
  }
  .az-clean-export .az-resume-bullet {
    border-left-color: transparent !important;
    background: transparent !important;
    box-shadow: none !important;
    animation: none !important;
    cursor: default !important;
  }
  .az-clean-export .az-score-badge,
  .az-clean-export .az-preview-applied-mark {
    display: none !important;
  }
  .az-highlights-off .az-resume-bullet,
  .az-highlights-off [data-bullet-idx] {
    background: transparent !important;
    border-left: none !important;
    box-shadow: none !important;
    animation: none !important;
  }
  .az-highlights-off .az-metric {
    font-weight: inherit !important;
    color: inherit !important;
    background: transparent !important;
  }
  .az-highlights-off .az-gap-pill,
  .az-highlights-off .az-change-hl,
  .az-highlights-off .az-kw-pill,
  .az-clean-export .az-gap-pill,
  .az-clean-export .az-change-hl,
  .az-clean-export .az-kw-pill {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    font-weight: inherit !important;
    display: inline !important;
  }
`;
