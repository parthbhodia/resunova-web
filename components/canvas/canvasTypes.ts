/**
 * Editing handles for the interactive canvas.
 *
 * `renderTbContentSection` is also the PDF capture path, so this is threaded
 * as an OPTIONAL parameter: when it is undefined the renderer emits exactly
 * the markup it always has, byte for byte, and the export is unaffected. Only
 * the on-screen editor passes it.
 */
export interface CanvasEdit {
  /** Commit a scalar field. `path` is schema-addressed, e.g. "profile.summary". */
  setField: (path: string, value: string) => void;
  /** Commit one bullet of an entry. */
  setBullet: (kind: CanvasEntryKind, id: string, index: number, value: string) => void;
  addBullet: (kind: CanvasEntryKind, id: string) => void;
  removeBullet: (kind: CanvasEntryKind, id: string, index: number) => void;
  /** Remove a whole entry (a job, a degree, a project). */
  removeEntry: (kind: CanvasEntryKind, id: string) => void;
  /** Reorder an entry within its section. */
  moveEntry: (kind: CanvasEntryKind, from: number, to: number) => void;
  /** Hand a block to the AI rewrite flow. */
  onAi?: (kind: CanvasEntryKind, id: string) => void;
  /** Signed-out users get the sign-in prompt instead of an AI call. */
  aiLocked?: boolean;
  /** One line of the free-text skill categories block. */
  setSkillLine: (index: number, value: string) => void;
  /** One line of a custom section (Certifications, Awards, …). */
  setCustomLine: (sectionId: string, index: number, value: string) => void;
  setCustomTitle: (sectionId: string, value: string) => void;
}

export type CanvasEntryKind = "experience" | "education" | "project";
