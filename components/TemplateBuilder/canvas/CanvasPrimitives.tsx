"use client";
/**
 * Canvas editing primitives: type directly on the paper, with per-block
 * actions that appear on hover.
 *
 * Two rules govern everything here, because this markup ends up inside the
 * PDF capture:
 *
 *  1. Every piece of editing chrome carries `az-pdf-ignore`, which
 *     `cleanForExport` in useHtmlPdfExport strips from the clone before it
 *     goes to Chromium. Chrome that forgets the class prints.
 *  2. Nothing here may reference app-theme CSS variables (--border, --muted,
 *     …). Those are not defined in the export's self-contained stylesheet, so
 *     they resolve to nothing in the PDF. Editing affordances use literal
 *     colours; the document text keeps the --resume-paper-* vars it already
 *     had.
 */
import { useRef, type CSSProperties, type ReactNode } from "react";

const ACCENT = "#2563eb";

/**
 * contentEditable bound to a schema field, committing on blur.
 *
 * Deliberately uncontrolled: React must not re-render this node while the
 * caret is inside it, or the caret jumps to position 0 on every keystroke.
 * `suppressContentEditableWarning` acknowledges that, and the value is read
 * back out of the DOM at blur instead of being driven by state.
 */
export function EditableText({
  value, onCommit, style, placeholder, as = "span", multiline = false,
}: {
  value: string;
  onCommit: (next: string) => void;
  style?: CSSProperties;
  placeholder?: string;
  as?: "span" | "div" | "p";
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as "span";

  return (
    <Tag
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-canvas-editable="true"
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? "").trim();
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        // Enter commits on a single-line field; Escape always reverts.
        if (e.key === "Enter" && !multiline) { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === "Escape") { e.currentTarget.textContent = value; e.currentTarget.blur(); }
      }}
      style={{
        ...style,
        outline: "none",
        borderRadius: 3,
        // A hairline that only shows on hover/focus, so the paper still reads
        // as a document rather than a form.
        transition: "background 0.12s, box-shadow 0.12s",
        cursor: "text",
        minWidth: value ? undefined : 40,
        display: "inline-block",
      }}
      className="tb-canvas-editable"
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  );
}

export interface CanvasAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger" | "ai";
  disabled?: boolean;
}

/**
 * Hover wrapper for one addressable block on the paper (an entry, a bullet).
 * Reveals its actions in a floating strip pinned to the block's top-left.
 */
export function CanvasBlock({
  actions, children, dense = false,
}: {
  actions: CanvasAction[];
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={`tb-canvas-block${dense ? " tb-canvas-block--dense" : ""}`} style={{ position: "relative" }}>
      <div className="tb-canvas-actions az-pdf-ignore" contentEditable={false}>
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            title={a.label}
            aria-label={a.label}
            disabled={a.disabled}
            onMouseDown={(e) => e.preventDefault()}  // keep caret/selection
            onClick={a.onClick}
            className={`tb-canvas-action tb-canvas-action--${a.tone ?? "default"}`}
          >
            {a.icon}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

/** Injected once by the canvas. Plain CSS so the export never sees it. */
export const CANVAS_STYLESHEET = `
.tb-canvas-editable:hover { background: rgba(37,99,235,0.07); }
.tb-canvas-editable:focus { background: #fff; box-shadow: 0 0 0 2px ${ACCENT}55; }
.tb-canvas-editable:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
}
.tb-canvas-block { border-radius: 4px; }
.tb-canvas-block:hover { box-shadow: 0 0 0 1px rgba(37,99,235,0.28); background: rgba(37,99,235,0.03); }
.tb-canvas-actions {
  position: absolute;
  top: -13px; left: 6px;
  display: none;
  align-items: center;
  gap: 1px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(15,23,42,0.12);
  padding: 1px;
  z-index: 6;
}
.tb-canvas-block:hover > .tb-canvas-actions { display: flex; }
.tb-canvas-block--dense > .tb-canvas-actions { top: -11px; left: 2px; }
.tb-canvas-action {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border: none; background: none; border-radius: 4px;
  color: #64748b; cursor: pointer; padding: 0;
  font: inherit; line-height: 0;
}
.tb-canvas-action:hover { background: #f1f5f9; color: ${ACCENT}; }
.tb-canvas-action--danger:hover { background: #fef2f2; color: #dc2626; }
.tb-canvas-action--ai { color: #059669; }
.tb-canvas-action--ai:hover { background: #ecfdf5; color: #047857; }
.tb-canvas-action:disabled { opacity: 0.35; cursor: not-allowed; }
/* Belt and braces: if a menu ever escapes cleanForExport, it still cannot print. */
@media print { .tb-canvas-actions { display: none !important; } }
`;

/* Micro icons. Inline SVG, not @mui/icons-material: this subtree is cloned
   into the PDF, and Emotion's generated classes are not in the export
   stylesheet, so an MUI icon here would render on screen and vanish in the
   download. */
const ico = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const IcoPlus = () => <svg {...ico}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
export const IcoTrash = () => <svg {...ico}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
export const IcoUp = () => <svg {...ico}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>;
export const IcoDown = () => <svg {...ico}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>;
export const IcoSparkle = () => <svg {...ico}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>;
export const IcoDrag = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);
