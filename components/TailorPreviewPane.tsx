"use client";

import { useCallback } from "react";
import AnnotatedResumePanel from "@/components/AnnotatedResumePanel";
import type { LiveBulletItem } from "@/lib/resumeBulletMatch";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

interface Props {
  extractedText: string;
  resumeHeader?: string[];
  company?: string;
  role?: string;
  /** Analyze-style bullet index map for preview highlights. */
  bulletAnalysis?: LiveBulletItem[];
  /** Structured resume (from /api/upload-resume) — renders the preview from typed fields. */
  structuredResume?: StructuredResume | null;
  previewLineOverrides?: Record<number, string>;
  gapFixTargetBulletIndices?: number[];
  tailorGapFixHighlights?: string[];
  tailorAppliedBulletIndices?: ReadonlySet<number>;
  /** Inline-edit parity with Analyze. When `onFieldEdit` is supplied, neutral
   *  bullets + generic fields become contentEditable and section headings gain
   *  rename + reorder — via `fieldsEditable`, NOT by dropping `presentationOnly`
   *  (which is overloaded for the full-width layout + gap-fix highlight gating). */
  fieldOverrides?: Record<string, string>;
  onFieldEdit?: (path: string, text: string) => void;
  /** Per-ANALYZED-bullet (index) popup rewrite draft + applied preview-line edits. */
  rewriteEdits?: Record<number, string>;
  patchBulletRewrite?: (bulletIndex: number, value: string | null) => void;
  patchPreviewLine?: (bulletIndex: number, value: string | null) => void;
  /** Clicking a preview bullet reports its index so the caller can open the
   *  corresponding sidebar section (the Tailor analog of Analyze's card link). */
  onBulletLinkedSelect?: (bulletIndex: number) => void;
  /** Optional DOCX export when a tailored folder exists. */
  onExportDocx?: () => void;
  exportDocxEnabled?: boolean;
  docxExportBusy?: boolean;
}

const noopPatch = () => {};

/**
 * Tailor results preview — same AnnotatedResumePanel + WYSIWYG HTML export as Analyze.
 * Editing is enabled via `fieldsEditable` (the contract AnalyzePreviewPane uses),
 * while `presentationOnly` stays on so the full-width layout + gap-fix highlights
 * are preserved (a prior attempt that flipped `presentationOnly` collapsed the pane).
 */
export default function TailorPreviewPane({
  extractedText,
  resumeHeader = [],
  company = "",
  role = "",
  bulletAnalysis = [],
  structuredResume = null,
  previewLineOverrides = {},
  gapFixTargetBulletIndices = [],
  tailorGapFixHighlights = [],
  tailorAppliedBulletIndices = new Set<number>(),
  fieldOverrides = {},
  onFieldEdit,
  rewriteEdits = {},
  patchBulletRewrite,
  patchPreviewLine,
  onBulletLinkedSelect,
  onExportDocx,
  exportDocxEnabled = false,
  docxExportBusy = false,
}: Props) {
  const handleExportDocx = useCallback(() => {
    onExportDocx?.();
  }, [onExportDocx]);
  // Opt-in: only enable editing when the caller wires a real handler, so any
  // read-only embed of this pane keeps today's presentation behavior.
  const editingEnabled = !!onFieldEdit;

  return (
    <AnnotatedResumePanel
      bulletAnalysis={bulletAnalysis}
      sectionFeedback={[]}
      activeCategory={null}
      rewriteEdits={rewriteEdits}
      patchBulletRewrite={patchBulletRewrite ?? noopPatch}
      previewLineOverrides={previewLineOverrides}
      patchPreviewLine={patchPreviewLine ?? noopPatch}
      onBulletLinkedSelect={onBulletLinkedSelect}
      extractedText={extractedText.trim() || null}
      structuredResume={structuredResume}
      structuredResumeAuthoritative
      resumeHeader={resumeHeader}
      presentationOnly
      fieldsEditable={editingEnabled}
      fieldOverrides={fieldOverrides}
      onFieldEdit={onFieldEdit}
      gapFixTargetBulletIndices={gapFixTargetBulletIndices}
      tailorGapFixHighlights={tailorGapFixHighlights}
      tailorAppliedBulletIndices={tailorAppliedBulletIndices}
      exportRoleLabel={role}
      onExportDocx={exportDocxEnabled ? handleExportDocx : undefined}
      exportDocxEnabled={exportDocxEnabled && !docxExportBusy}
      exportingResume={docxExportBusy}
    />
  );
}
