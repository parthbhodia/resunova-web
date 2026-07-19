/**
 * resume_versions — the unified, EDITABLE résumé object (Phase 1 of the
 * résumé-versions plan). Client-direct CRUD via Supabase RLS, mirroring the
 * pattern already used for resume_analyses + template_builder_resumes.
 *
 * A "version" is a named résumé snapshot with git-like lineage (root_id groups
 * every version of one résumé; parent_id chains a version to the one it was
 * edited from; version is the ordinal). Unlike resume_analyses this table is
 * EDITABLE (has UPDATE RLS) — editing a version is a real UPDATE, so a user can
 * tweak a résumé for a new JD without re-scanning. See migration 037 +
 * docs/RESUME_VERSIONS_PLAN.md.
 */

import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { getSupabaseClient } from "./supabase";
import { apiUrl } from "./utils";
import { dispatchResumeLibraryChanged } from "./resumeLibraryEvents";

export type VersionOrigin = "upload" | "duplicate" | "profile" | "tailor" | "manual";

export interface ResumeVersion {
  id: string;
  name: string;
  rootId: string;
  parentId: string | null;
  version: number;
  structured: StructuredResume | null;
  extractedText: string | null;
  origin: VersionOrigin;
  sourcePdfUrl: string | null;
  jdText: string | null;
  jdCompany: string | null;
  jdTitle: string | null;
  lastScore: number | null;
  lastScoreSource: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeVersionGroup {
  root: string;
  /** Head-first: highest version, then most-recent createdAt as a tiebreak. */
  versions: ResumeVersion[];
}

/* ── pure helpers (unit-tested) ─────────────────────────────────── */

/** Next ordinal for a root group: max(existing) + 1, or 1 when empty. */
export function nextOrdinal(existingVersions: number[]): number {
  let top = 0;
  for (const v of existingVersions) if (typeof v === "number" && v > top) top = v;
  return top + 1;
}

/**
 * Group flat version rows into lineages keyed by root_id. Mirrors
 * groupAnalysesByRoot: groups ordered by most-recent head activity; within a
 * group the head (highest version, newest createdAt tiebreak) is first.
 */
export function groupVersionsByRoot(versions: ResumeVersion[]): ResumeVersionGroup[] {
  const byRoot = new Map<string, ResumeVersion[]>();
  for (const v of versions) {
    const root = v.rootId || v.id;
    const list = byRoot.get(root);
    if (list) list.push(v);
    else byRoot.set(root, [v]);
  }

  const groups: ResumeVersionGroup[] = Array.from(byRoot.entries()).map(([root, list]) => {
    const sorted = [...list].sort(
      (a, b) =>
        b.version - a.version ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { root, versions: sorted };
  });

  groups.sort(
    (a, b) =>
      new Date(b.versions[0].updatedAt).getTime() -
      new Date(a.versions[0].updatedAt).getTime(),
  );
  return groups;
}

/**
 * Flatten a structured résumé to plain text — the `resume_text` payload for a
 * general re-score. Deterministic + unit-tested; mirrors the section order the
 * synthesizer uses (header → summary → experience → projects → education → skills).
 */
export function structuredToPlainText(s: StructuredResume | null): string {
  if (!s) return "";
  const lines: string[] = [];
  if (s.full_name) lines.push(s.full_name);
  if (s.headline) lines.push(s.headline);
  const contact = [s.email, s.phone, s.location, s.linkedin, s.github].filter(Boolean);
  if (contact.length) lines.push(contact.join(" · "));
  if (s.summary) lines.push("", "SUMMARY", s.summary);
  if (s.experience?.length) {
    lines.push("", "EXPERIENCE");
    for (const e of s.experience) {
      lines.push([e.role, e.company, e.location, e.dates].filter(Boolean).join(" · "));
      for (const b of e.bullets ?? []) if (b) lines.push(`• ${b}`);
    }
  }
  if (s.projects?.length) {
    lines.push("", "PROJECTS");
    for (const p of s.projects) {
      lines.push([p.name, p.tech].filter(Boolean).join(" · "));
      for (const b of p.bullets ?? []) if (b) lines.push(`• ${b}`);
    }
  }
  if (s.education?.length) {
    lines.push("", "EDUCATION");
    for (const ed of s.education) {
      lines.push([ed.institution, ed.degree, ed.dates].filter(Boolean).join(" · "));
      for (const b of ed.bullets ?? []) if (b) lines.push(`• ${b}`);
    }
  }
  if (s.skills?.length) {
    lines.push("", "SKILLS");
    for (const sk of s.skills) lines.push(`${sk.category}: ${(sk.items ?? []).join(", ")}`);
  }
  return lines.join("\n").trim();
}

export interface ScoreVersionResult {
  score: number | null;
  /** Persisted resume_analyses id — deep-link to Analyze's full report via ?analysis=. */
  analysisId?: string | null;
  limited?: boolean;
  needsAuth?: boolean;
  error?: string;
}

/**
 * Score a version IN PLACE — runs the general comprehensive analysis on the
 * version's content (no JD) via /api/analyze-rescore, then caches the resulting
 * overallScore onto the version (last_score / last_score_source='llm'). Reuses
 * the current edited `structured` so unsaved edits are scored. Counts against the
 * daily scan limit (scoring IS a scan). Does NOT touch the Analyze surface.
 */
export async function scoreVersionInPlace(version: {
  id: string;
  name: string;
  structured: StructuredResume | null;
  extractedText: string | null;
}): Promise<ScoreVersionResult> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.access_token) return { score: null, needsAuth: true };

  const text =
    version.extractedText && version.extractedText.trim().length >= 200
      ? version.extractedText
      : structuredToPlainText(version.structured);
  if (text.trim().length < 200) {
    return { score: null, error: "Résumé is too short to score — add more detail first." };
  }

  const resp = await fetch(apiUrl("/api/analyze-rescore"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      resume_text: text,
      structured_resume: version.structured ?? undefined,
      source_filename: version.name || "Résumé version",
      version_id: version.id,
    }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (resp.status === 429 && json?.code === "daily_scan_limit_reached") return { score: null, limited: true };
    return { score: null, error: json?.error || `Scoring failed (HTTP ${resp.status})` };
  }

  const score = typeof json?.overallScore === "number" ? json.overallScore : null;
  const analysisId = typeof json?.analysisId === "string" ? json.analysisId : null;
  if (score != null) {
    await updateVersion(version.id, { lastScore: score, lastScoreSource: "llm", extractedText: text });
  }
  return { score, analysisId };
}

/* ── row mapping ────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToVersion(row: any): ResumeVersion {
  return {
    id: row.id as string,
    name: (row.name as string) || "Untitled résumé",
    rootId: (row.root_id as string | null) ?? (row.id as string),
    parentId: (row.parent_id as string | null) ?? null,
    version: (row.version as number | null) ?? 1,
    structured: (row.structured as StructuredResume | null) ?? null,
    extractedText: (row.extracted_text as string | null) ?? null,
    origin: ((row.origin as string | null) ?? "upload") as VersionOrigin,
    sourcePdfUrl: (row.source_pdf_url as string | null) ?? null,
    jdText: (row.jd_text as string | null) ?? null,
    jdCompany: (row.jd_company as string | null) ?? null,
    jdTitle: (row.jd_title as string | null) ?? null,
    lastScore: (row.last_score as number | null) ?? null,
    lastScoreSource: (row.last_score_source as string | null) ?? null,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | null) ?? (row.created_at as string),
  };
}

const SELECT_COLS =
  "id, name, root_id, parent_id, version, structured, extracted_text, origin, " +
  "source_pdf_url, jd_text, jd_company, jd_title, last_score, last_score_source, " +
  "is_default, created_at, updated_at";

/* ── reads ──────────────────────────────────────────────────────── */

/** All of the signed-in user's versions, newest-updated first. */
export async function listVersions(limit = 200): Promise<ResumeVersion[]> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await db
    .from("resume_versions")
    .select(SELECT_COLS)
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(rowToVersion);
}

/** Versions grouped into lineages by root_id (head-first within each group). */
export async function listVersionGroups(limit = 200): Promise<ResumeVersionGroup[]> {
  return groupVersionsByRoot(await listVersions(limit));
}

export async function fetchVersionById(id: string): Promise<ResumeVersion | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await db
    .from("resume_versions")
    .select(SELECT_COLS)
    .eq("user_id", session.user.id)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToVersion(data) : null;
}

/** The next ordinal across a whole root group (never collides on a restore). */
async function nextRootOrdinal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  rootId: string,
  fallback: number,
): Promise<number> {
  try {
    const { data: top } = await db
      .from("resume_versions")
      .select("version")
      .eq("user_id", userId)
      .eq("root_id", rootId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const topVersion = (top as { version?: number } | null)?.version;
    if (typeof topVersion === "number") return topVersion + 1;
  } catch { /* fall back */ }
  return fallback;
}

/* ── writes ─────────────────────────────────────────────────────── */

export interface NewRootVersionInput {
  name: string;
  structured: StructuredResume;
  extractedText?: string | null;
  origin: Extract<VersionOrigin, "upload" | "profile" | "manual">;
  sourcePdfUrl?: string | null;
  lastScore?: number | null;
  lastScoreSource?: string | null;
}

/**
 * Create a brand-new base résumé (a new lineage root, v1). Used by the
 * Import-from-file and Start-from-Profile create paths — no scan required.
 */
export async function createVersion(input: NewRootVersionInput): Promise<ResumeVersion | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await db
    .from("resume_versions")
    .insert({
      user_id: session.user.id,
      name: input.name.trim() || "Untitled résumé",
      version: 1,
      // root_id populated by the resume_versions_set_root trigger
      structured: input.structured as unknown as Record<string, unknown>,
      extracted_text: input.extractedText ?? null,
      origin: input.origin,
      source_pdf_url: input.sourcePdfUrl ?? null,
      last_score: input.lastScore ?? null,
      last_score_source: input.lastScoreSource ?? null,
    })
    .select(SELECT_COLS)
    .single();

  if (error) throw error;
  dispatchResumeLibraryChanged();
  return rowToVersion(data);
}

export interface ChildVersionInput {
  name?: string;
  structured: StructuredResume;
  extractedText?: string | null;
  origin?: VersionOrigin;
  jd?: { text?: string | null; company?: string | null; title?: string | null } | null;
  lastScore?: number | null;
  lastScoreSource?: string | null;
}

/**
 * Insert a child version on the same root as `parent` (version = root max + 1).
 * Backs both "Duplicate" (origin='duplicate') and "Save as version"
 * (origin='manual'/'tailor'). Never mutates the parent row.
 */
export async function saveAsChildVersion(
  parent: { id: string; rootId?: string | null; version?: number; name: string },
  input: ChildVersionInput,
): Promise<ResumeVersion | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const rootId = parent.rootId ?? parent.id;
  const version = await nextRootOrdinal(db, session.user.id, rootId, (parent.version ?? 1) + 1);

  const { data, error } = await db
    .from("resume_versions")
    .insert({
      user_id: session.user.id,
      name: (input.name ?? parent.name).trim() || "Untitled résumé",
      parent_id: parent.id,
      root_id: rootId,
      version,
      structured: input.structured as unknown as Record<string, unknown>,
      extracted_text: input.extractedText ?? null,
      origin: input.origin ?? "manual",
      jd_text: input.jd?.text ?? null,
      jd_company: input.jd?.company ?? null,
      jd_title: input.jd?.title ?? null,
      last_score: input.lastScore ?? null,
      last_score_source: input.lastScoreSource ?? null,
    })
    .select(SELECT_COLS)
    .single();

  if (error) throw error;
  dispatchResumeLibraryChanged();
  return rowToVersion(data);
}

/** Duplicate an existing version into a fresh child on the same résumé. */
export async function duplicateVersion(
  source: ResumeVersion,
  opts?: { name?: string },
): Promise<ResumeVersion | null> {
  if (!source.structured) return null;
  return saveAsChildVersion(
    { id: source.id, rootId: source.rootId, version: source.version, name: source.name },
    {
      name: opts?.name ?? `${source.name} (copy)`,
      structured: source.structured,
      extractedText: source.extractedText,
      origin: "duplicate",
      // carry the JD context forward so a duplicated tailored version keeps its target
      jd: { text: source.jdText, company: source.jdCompany, title: source.jdTitle },
    },
  );
}

export interface VersionPatch {
  name?: string;
  structured?: StructuredResume;
  extractedText?: string | null;
  jdText?: string | null;
  jdCompany?: string | null;
  jdTitle?: string | null;
  lastScore?: number | null;
  lastScoreSource?: string | null;
}

/**
 * Edit a version IN PLACE (a real UPDATE — this is edit-without-rescan). Only
 * provided fields are written; updated_at is bumped by the DB trigger.
 */
export async function updateVersion(id: string, patch: VersionPatch): Promise<void> {
  const db = getSupabaseClient();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim() || "Untitled résumé";
  if (patch.structured !== undefined) row.structured = patch.structured as unknown as Record<string, unknown>;
  if (patch.extractedText !== undefined) row.extracted_text = patch.extractedText;
  if (patch.jdText !== undefined) row.jd_text = patch.jdText;
  if (patch.jdCompany !== undefined) row.jd_company = patch.jdCompany;
  if (patch.jdTitle !== undefined) row.jd_title = patch.jdTitle;
  if (patch.lastScore !== undefined) row.last_score = patch.lastScore;
  if (patch.lastScoreSource !== undefined) row.last_score_source = patch.lastScoreSource;
  if (Object.keys(row).length === 0) return;

  const { error } = await db.from("resume_versions").update(row).eq("id", id);
  if (error) throw error;
  dispatchResumeLibraryChanged();
}

/** Mark one version as the user's default (the ★). Clears any other default. */
export async function setDefaultVersion(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return;

  // clear existing defaults, then set this one (two writes; RLS scopes to owner)
  const { error: clearErr } = await db
    .from("resume_versions")
    .update({ is_default: false })
    .eq("user_id", session.user.id)
    .eq("is_default", true);
  if (clearErr) throw clearErr;

  const { error } = await db
    .from("resume_versions")
    .update({ is_default: true })
    .eq("id", id);
  if (error) throw error;
  dispatchResumeLibraryChanged();
}

export async function deleteVersion(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from("resume_versions").delete().eq("id", id);
  if (error) throw error;
  dispatchResumeLibraryChanged();
}
