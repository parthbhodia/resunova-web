import type { ReactNode } from "react";

/**
 * Lightweight inline formatting for bullet text: **bold** and _italic_ spans
 * live as literal markers in the plain-text bullet string (same string that's
 * saved, rescored, and sent to the LLM). Keeping it plain-text-at-rest means
 * no new data shape anywhere — only the render layer (here) and the
 * strip-before-you-leave-the-UI call sites need to know about it.
 */

export type InlineMdToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string };

// \textbf{...} first for parity with renderInline()'s legacy LaTeX handling.
const INLINE_MD_RE = /\\textbf\{([^}]*)\}|\*\*([^*]+)\*\*|_([^_]+)_/g;

export function parseInlineMarkdown(raw: string): InlineMdToken[] {
  const tokens: InlineMdToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_MD_RE.lastIndex = 0;
  while ((m = INLINE_MD_RE.exec(raw))) {
    if (m.index > last) tokens.push({ type: "text", text: raw.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ type: "bold", text: m[1] });
    else if (m[2] !== undefined) tokens.push({ type: "bold", text: m[2] });
    else if (m[3] !== undefined) tokens.push({ type: "italic", text: m[3] });
    last = INLINE_MD_RE.lastIndex;
  }
  if (last < raw.length) tokens.push({ type: "text", text: raw.slice(last) });
  return tokens;
}

/** Removes bold/italic markers — the form this text takes anywhere that
 *  isn't display: /api/analyze payloads, saved candidateProfile, DOCX/.tex. */
export function stripInlineMarkdown(raw: string): string {
  return parseInlineMarkdown(raw).map((t) => t.text).join("");
}

/** Renders bold/italic markers as real <strong>/<em>. Plain text in, plain
 *  text out for anything with no markers — safe to call unconditionally. */
export function renderInlineMarkdown(raw: string): ReactNode[] {
  return parseInlineMarkdown(raw).map((t, i) => {
    if (t.type === "bold") return <strong key={i}>{t.text}</strong>;
    if (t.type === "italic") return <em key={i}>{t.text}</em>;
    return <span key={i}>{t.text}</span>;
  });
}

export type InlineFormat = "bold" | "italic" | "clear";

/** Wraps (or strips) markers around the [start,end) character range of
 *  `full`. Offsets are plain-text offsets (markers stripped from the
 *  selection first, so re-applying a format to an already-formatted
 *  selection replaces rather than nests). */
export function applyInlineFormat(full: string, start: number, end: number, format: InlineFormat): string {
  if (start >= end || start < 0 || end > full.length) return full;
  const before = full.slice(0, start);
  const selected = stripInlineMarkdown(full.slice(start, end));
  const after = full.slice(end);
  if (!selected) return full;
  const wrapped = format === "clear" ? selected : format === "bold" ? `**${selected}**` : `_${selected}_`;
  return before + wrapped + after;
}
