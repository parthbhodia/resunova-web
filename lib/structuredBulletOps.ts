/**
 * Bullet-level structural ops (reorder / add / delete) on the structured
 * résumé, driven from the live preview.
 *
 * Index model: the PREVIEW computes ops because only it knows the mapping
 * between rendered rows and raw structured arrays (empty-after-clean bullets
 * are filtered out; a project's tech-stack first bullet can be promoted onto
 * the header). Ops therefore carry RAW array indices plus a `pathRemap` of
 * clean-index bullet paths (`exp.0.bullets.2`) so parents can fix up their
 * path-keyed overlays (hiddenPaths, fieldOverrides) without knowing any of
 * that. Parents just call the two helpers below.
 */
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

export type StructuredBulletAction =
  | { type: "move"; fromRaw: number; toRaw: number }
  | { type: "delete"; raw: number }
  | { type: "add"; text: string };

export interface StructuredBulletOp {
  /** Entry path: `exp.0` | `proj.1` | `edu.2`. */
  entryPath: string;
  action: StructuredBulletAction;
  /** Old bullet path → new path (null = bullet removed). Only affected paths
   *  are listed; anything not present is unchanged. */
  pathRemap: Record<string, string | null>;
}

function bulletsArrayFor(s: StructuredResume, entryPath: string): string[] | null {
  const m = /^(exp|proj|edu)\.(\d+)$/.exec(entryPath);
  if (!m) return null;
  const idx = Number(m[2]);
  const entry =
    m[1] === "exp" ? s.experience?.[idx]
    : m[1] === "proj" ? s.projects?.[idx]
    : s.education?.[idx];
  if (!entry) return null;
  if (!Array.isArray(entry.bullets)) entry.bullets = [];
  return entry.bullets;
}

/** Returns a new StructuredResume with the op applied (deep copy; the input
 *  is never mutated). Null if the entry path doesn't resolve. */
export function applyBulletOpToStructured(
  structured: StructuredResume,
  op: StructuredBulletOp,
): StructuredResume | null {
  const next = JSON.parse(JSON.stringify(structured)) as StructuredResume;
  const bullets = bulletsArrayFor(next, op.entryPath);
  if (!bullets) return null;
  const a = op.action;
  if (a.type === "add") {
    bullets.push(a.text);
    return next;
  }
  if (a.type === "delete") {
    if (a.raw < 0 || a.raw >= bullets.length) return null;
    bullets.splice(a.raw, 1);
    return next;
  }
  // move — dnd-kit arrayMove semantics on the raw array.
  if (a.fromRaw < 0 || a.fromRaw >= bullets.length || a.toRaw < 0 || a.toRaw >= bullets.length) return null;
  const [item] = bullets.splice(a.fromRaw, 1);
  bullets.splice(a.toRaw, 0, item);
  return next;
}

/** Applies an op's pathRemap to a path-keyed overlay map (hiddenPaths,
 *  fieldOverrides, …). Unlisted keys pass through untouched; null-mapped
 *  keys are dropped. */
export function remapOverlayPaths<T>(
  map: Record<string, T>,
  pathRemap: Record<string, string | null>,
): Record<string, T> {
  const keys = Object.keys(pathRemap);
  if (!keys.length) return map;
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(map)) {
    if (!(k in pathRemap)) { out[k] = v; continue; }
    const nk = pathRemap[k];
    if (nk !== null) out[nk] = v;
  }
  return out;
}

/** Builds the clean-index pathRemap for a move within one entry's visible
 *  bullet list (`n` visible bullets, visible index `from` → `to`). */
export function moveCleanPathRemap(
  entryPath: string,
  n: number,
  from: number,
  to: number,
): Record<string, string | null> {
  const order = Array.from({ length: n }, (_, i) => i);
  const [x] = order.splice(from, 1);
  order.splice(to, 0, x);
  const remap: Record<string, string | null> = {};
  order.forEach((oldIdx, newIdx) => {
    if (oldIdx !== newIdx) remap[`${entryPath}.bullets.${oldIdx}`] = `${entryPath}.bullets.${newIdx}`;
  });
  return remap;
}

/** Builds the clean-index pathRemap for deleting visible bullet `index` out
 *  of `n` visible bullets: that path drops, later siblings shift down. */
export function deleteCleanPathRemap(
  entryPath: string,
  n: number,
  index: number,
): Record<string, string | null> {
  const remap: Record<string, string | null> = {};
  remap[`${entryPath}.bullets.${index}`] = null;
  for (let i = index + 1; i < n; i++) {
    remap[`${entryPath}.bullets.${i}`] = `${entryPath}.bullets.${i - 1}`;
  }
  return remap;
}
