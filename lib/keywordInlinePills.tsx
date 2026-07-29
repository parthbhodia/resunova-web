import { Fragment, type ReactNode } from "react";

/**
 * Inline Jobscan-style keyword pills inside résumé lines.
 *
 * Wraps whole-word (or multi-word phrase) matches from the found-keyword list.
 * Longest terms win first so "TensorRT-LLM" beats a stray "LLM" fragment.
 */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a matcher that finds the next keyword occurrence at/after `from`. */
function nextMatch(
  text: string,
  terms: string[],
  from: number,
): { start: number; end: number; term: string } | null {
  let best: { start: number; end: number; term: string } | null = null;
  const slice = text.slice(from);
  for (const term of terms) {
    if (!term.trim()) continue;
    // Word-ish boundaries: allow match at start/end, or next to non-alnum.
    const re = new RegExp(
      `(^|[^A-Za-z0-9+#])(${escapeRe(term)})(?=[^A-Za-z0-9+#]|$)`,
      "i",
    );
    const m = re.exec(slice);
    if (!m || m.index == null) continue;
    const inner = m[2];
    const start = from + m.index + m[1].length;
    const end = start + inner.length;
    if (!best || start < best.start || (start === best.start && end - start > best.end - best.start)) {
      best = { start, end, term: inner };
    }
  }
  return best;
}

/**
 * Sort terms longest-first so multi-word / compound skills claim their span
 * before a shorter nested token can.
 */
export function prepareKeywordTerms(terms: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms) {
    const t = String(raw ?? "").trim();
    if (!t || t.length < 2) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  out.sort((a, b) => b.length - a.length);
  return out;
}

export function renderWithKeywordPills(
  text: string,
  terms: readonly string[],
  fallback: (chunk: string) => ReactNode,
): ReactNode {
  const prepared = prepareKeywordTerms(terms);
  if (!text || prepared.length === 0) return fallback(text);

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  while (cursor < text.length) {
    const hit = nextMatch(text, prepared, cursor);
    if (!hit) {
      parts.push(<Fragment key={`kw-t-${key++}`}>{fallback(text.slice(cursor))}</Fragment>);
      break;
    }
    if (hit.start > cursor) {
      parts.push(<Fragment key={`kw-t-${key++}`}>{fallback(text.slice(cursor, hit.start))}</Fragment>);
    }
    parts.push(
      <mark key={`kw-p-${key++}`} className="az-kw-pill">
        {text.slice(hit.start, hit.end)}
      </mark>,
    );
    cursor = hit.end;
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
