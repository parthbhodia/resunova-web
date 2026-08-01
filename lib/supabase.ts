import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { TBResumeData } from "@/components/TemplateBuilder/types";
import type { ResumeRecord, Criterion, RatingsData } from "./types";
import { type ProfileFormState, EMPTY_PROFILE } from "./profileStorage";
import { type ExtractedProfileState, INITIAL_EXTRACTED_PROFILE } from "./resumeExtractorService";
import { dispatchResumeLibraryChanged } from "./resumeLibraryEvents";
import { coerceTemplateBuilderData } from "./coerceTemplateBuilderData";
import { apiFetch } from "@/lib/apiClient";

/* ── Analyze-history types ───────────────────────────────────── */
// result is typed as Record<string,unknown> here because the DB stores raw
// JSON — callers (AnalyzeResume.tsx) cast to their own full AnalysisResult.
export interface AnalyzeRecord {
  id:        string;
  label:     string;
  score:     number;
  createdAt: string;
  sourcePdfUrl?: string | null;
  sourceFilename?: string | null;
  /** Version lineage (git-like). A fresh analysis is v1 rooted at its own id;
   *  each saved edit is an immutable child version chained via parentId. */
  parentId?: string | null;
  version?:  number;
  rootId?:   string | null;
  /** Score provenance: 'llm' = verified re-score, 'estimate' = deterministic
   *  save-edits estimate, null = original analysis. */
  scoreSource?: string | null;
  /** Variant identity (content axis, orthogonal to version lineage above).
   *  Both null = legacy/no-variant row — treated as the implicit default
   *  variant by lib/analyzeVersions.ts. Written once at insert, never
   *  mutated (resume_analyses has no UPDATE RLS policy). */
  variantGroup?: string | null;
  variantName?:  string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result:    any;
}

export type LibraryItem =
  | {
      kind: "tailored";
      key: string;
      id: string;
      title: string;
      subtitle: string;
      score: number | null;
      createdAt: string;
      isDefault: boolean;
      record: ResumeRecord;
    }
  | {
      kind: "analyzed";
      key: string;
      id: string;
      title: string;
      subtitle: string;
      score: number | null;
      createdAt: string;
      isDefault: false;
      analysis: AnalyzeRecord;
    }
  | {
      kind: "builder";
      key: string;
      id: string;
      title: string;
      subtitle: string;
      score: null;
      createdAt: string;
      isDefault: false;
      builder: BuilderResumeRecord;
    }
  | {
      kind: "cover_letter";
      key: string;
      id: string;
      title: string;
      subtitle: string;
      score: null;
      createdAt: string;
      isDefault: boolean;
      coverLetter: CoverLetterRecord;
    };

export interface BuilderResumeRecord {
  id: string;
  label: string;
  data: TBResumeData;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetterRecord {
  id: string;
  label: string;
  data: any; // CLData
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Lazy singleton — avoids crashing at build time when env vars aren't set
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");
  _client = createClient(url, key);
  return _client;
}

/* ── Resume CRUD ─────────────────────────────────────────── */

export async function fetchResumes(): Promise<ResumeRecord[]> {
  const db = getSupabaseClient();

  // Always scope to the signed-in user — prevents data leakage and ensures
  // the query satisfies Supabase RLS policies (which require a matching user_id).
  const { data: { session } } = await db.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];          // not authenticated → empty list, not all rows

  const { data, error } = await db
    .from("resumes")
    .select("*, criteria(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ResumeRecord[];
  // Prefer default résumé first without relying on DB column sort (older DBs may lack `is_default`).
  rows.sort((a, b) => {
    const d = Number(!!b.is_default) - Number(!!a.is_default);
    if (d !== 0) return d;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
  return rows;
}

function formatSupabaseWriteError(err: { message?: string; details?: string; hint?: string }): string {
  const parts = [err.message, err.details, err.hint].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return parts.join(" — ") || "Database request failed.";
}

/**
 * Retry `resumes` write without `job_description` when PostgREST/Postgres rejects that field
 * (add column: `web/db/migrations/002_resumes_job_description.sql`).
 */
function shouldRetryResumeWriteWithoutJobDescription(err: unknown): boolean {
  const raw =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  const msg = raw.toLowerCase();
  if (!msg.includes("job_description")) return false;
  if (msg.includes("permission denied") || msg.includes("violates row-level security") || msg.includes(" rls ")) {
    return false;
  }
  return true;
}

/** Coerce match score for `resumes.score` (int column). */
function coerceResumeScore(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(100, Math.max(0, n)));
}

/** Coerce verdict / any model field to plain text for `resumes.verdict`. */
function coerceVerdictText(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  try {
    return String(v).trim() || null;
  } catch {
    return null;
  }
}

export async function upsertResume(
  folder: string,
  company: string,
  role: string,
  model: string,
  texPath: string,
  pdfUrl: string | null,
  ratings: RatingsData | null,
  jobDescription?: string | null,
  structured?: {
    resumeDoc?: Record<string, unknown> | null;
    appliedPatch?: Record<string, unknown> | null;
    renderer?: "legacy" | "structured";
    schemaVersion?: number;
  },
  opts?: { bumpCreatedAt?: boolean },
): Promise<string> {
  const db = getSupabaseClient();

  // Include the signed-in user's id so RLS policies apply (insert with null user_id is rejected).
  const { data: { session } } = await db.auth.getSession();
  const user_id = session?.user?.id ?? null;
  if (!user_id) {
    throw new Error(
      "Not signed in — sign in with Google first, then generate again so we can save this résumé to your Library.",
    );
  }

  const row = {
    folder: folder.trim(),
    company: (company ?? "").trim() || "—",
    role: (role ?? "").trim() || "—",
    model_used: (model ?? "").trim() || null,
    tex_path: (texPath ?? "").trim() || null,
    pdf_url: pdfUrl && String(pdfUrl).trim() ? String(pdfUrl).trim() : null,
    score: coerceResumeScore(ratings?.match_score),
    verdict: coerceVerdictText(ratings?.verdict),
    job_description: jobDescription?.trim() || null,
    resume_doc: structured?.resumeDoc ?? null,
    applied_patch: structured?.appliedPatch ?? null,
    renderer: structured?.renderer ?? "legacy",
    schema_version: structured?.schemaVersion ?? 1,
    user_id,
  };

  /**
   * Prefer explicit select → update / insert over `.upsert(..., onConflict: "user_id,folder")`.
   * Some PostgREST / constraint setups return 400 on composite upsert even when a matching unique index exists.
   */
  const { data: existing, error: selErr } = await db
    .from("resumes")
    .select("id")
    .eq("user_id", user_id)
    .eq("folder", row.folder)
    .maybeSingle();

  if (selErr) {
    throw new Error(`Library save failed: ${formatSupabaseWriteError(selErr)}`);
  }

  const persistResumeRow = async (payload: Record<string, unknown>): Promise<string> => {
    if (existing?.id) {
      const updatePayload = opts?.bumpCreatedAt
        ? { ...payload, created_at: new Date().toISOString() }
        : payload;
      const { data: upd, error: upErr } = await db
        .from("resumes")
        .update(updatePayload)
        .eq("id", existing.id as string)
        .select("id")
        .single();
      if (upErr) throw upErr;
      return upd!.id as string;
    }
    const { data: ins, error: inErr } = await db
      .from("resumes")
      .insert(payload)
      .select("id")
      .single();
    if (inErr) throw inErr;
    return ins!.id as string;
  };

  let resumeId: string;
  try {
    resumeId = await persistResumeRow(row);
  } catch (first: unknown) {
    if (shouldRetryResumeWriteWithoutJobDescription(first)) {
      const { job_description: _jd, ...withoutJobDescription } = row;
      try {
        resumeId = await persistResumeRow(withoutJobDescription);
      } catch (second: unknown) {
        throw new Error(`Library save failed: ${formatSupabaseWriteError(second as { message?: string })}`);
      }
    } else {
      throw new Error(`Library save failed: ${formatSupabaseWriteError(first as { message?: string })}`);
    }
  }

  const { error: delCritAll } = await db.from("criteria").delete().eq("resume_id", resumeId);
  if (delCritAll) {
    throw new Error(`Library save failed (criteria): ${formatSupabaseWriteError(delCritAll)}`);
  }
  if (ratings?.criteria?.length) {
    const rows = ratings.criteria.map((c: Criterion) => ({
      resume_id: resumeId,
      name: c.name,
      weight: c.weight,
      score: typeof c.score === "number" && Number.isFinite(c.score) ? Math.round(c.score) : null,
      notes: typeof c.notes === "string" ? c.notes : coerceVerdictText(c.notes),
    }));
    const { error: insCrit } = await db.from("criteria").insert(rows);
    if (insCrit) {
      throw new Error(`Library save failed (criteria): ${formatSupabaseWriteError(insCrit)}`);
    }
  }

  if (ratings) {
    const signals = [
      ...(ratings.whats_working ?? []).map((t: string) => ({ resume_id: resumeId, kind: "working", text: t })),
      ...(ratings.gaps ?? []).map((t: string) => ({ resume_id: resumeId, kind: "gap", text: t })),
    ];
    if (signals.length) {
      await db.from("resume_signals").delete().eq("resume_id", resumeId);
      const { error: sigErr } = await db.from("resume_signals").insert(signals);
      if (sigErr) {
        throw new Error(`Library save failed (signals): ${formatSupabaseWriteError(sigErr)}`);
      }
    }
  }

  dispatchResumeLibraryChanged();
  return resumeId;
}

/** Normalize user-facing slug input to stored form (lowercase, hyphenated, a-z0-9 only). */
export function normalizeResumePublicSlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s;
}

export async function fetchResumeShareMetaByFolder(
  folder: string,
): Promise<{ public_slug: string | null; is_default: boolean } | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;
  const { data, error } = await db
    .from("resumes")
    .select("public_slug, is_default")
    .eq("user_id", session.user.id)
    .eq("folder", folder)
    .maybeSingle();
  if (error || !data) return null;
  return {
    public_slug: (data.public_slug as string | null) ?? null,
    is_default: !!(data as { is_default?: boolean }).is_default,
  };
}

/** Update public slug and/or default flag for a library row (RLS: own rows only). */
export async function updateResumeShareSettings(
  folder: string,
  opts: { publicSlug: string | null; isDefault: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Sign in to save a public link." };

  const normalized = opts.publicSlug?.trim()
    ? normalizeResumePublicSlug(opts.publicSlug)
    : "";
  if (normalized && (normalized.length < 3 || normalized.length > 50)) {
    return { ok: false, error: "Slug must be 3–50 characters." };
  }
  if (normalized && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return { ok: false, error: "Use lowercase letters, numbers, and single hyphens only." };
  }

  if (opts.isDefault) {
    const { error: e1 } = await db.from("resumes").update({ is_default: false }).eq("user_id", uid);
    if (e1) return { ok: false, error: e1.message };
  }

  const { data: updated, error: e2 } = await db
    .from("resumes")
    .update({
      is_default: opts.isDefault,
      public_slug: normalized || null,
    })
    .eq("user_id", uid)
    .eq("folder", folder)
    .select("id");

  if (e2) {
    const msg = e2.message.toLowerCase();
    if (e2.code === "23505" || msg.includes("unique") || msg.includes("duplicate")) {
      return { ok: false, error: "That link is already taken. Try another slug." };
    }
    return { ok: false, error: e2.message };
  }
  if (!updated?.length) {
    return {
      ok: false,
      error: "Résumé is not in your library yet — wait a few seconds after the PDF finishes, then try again.",
    };
  }
  return { ok: true };
}

/* ── Analyze history CRUD ────────────────────────────────────── */

/** Fetch a user's analysis history (metadata only, no result blob), newest first. */
export async function fetchAnalyses(limit = 10): Promise<AnalyzeRecord[]> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await db
    .from("resume_analyses")
    .select("id, label, score, created_at, source_pdf_url, source_filename, parent_id, version, root_id, score_source, variant_group, variant_name")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id:        row.id as string,
    label:     row.label as string,
    score:     row.score as number,
    createdAt: row.created_at as string,
    sourcePdfUrl: (row.source_pdf_url as string | null) ?? null,
    sourceFilename: (row.source_filename as string | null) ?? null,
    parentId:  (row.parent_id as string | null) ?? null,
    version:   (row.version as number | null) ?? 1,
    rootId:    (row.root_id as string | null) ?? (row.id as string),
    scoreSource: (row.score_source as string | null) ?? null,
    variantGroup: (row.variant_group as string | null) ?? null,
    variantName:  (row.variant_name as string | null) ?? null,
    result:    null,
  }));
}

/** Fetch the full result for a single analysis row (lazy-loaded on click). */
export async function fetchAnalysisById(id: string): Promise<AnalyzeRecord | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await db
    .from("resume_analyses")
    .select("id, label, score, result, created_at, source_pdf_url, source_filename, parent_id, version, root_id, score_source, variant_group, variant_name")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !data) return null;

  return {
    id:        data.id as string,
    label:     data.label as string,
    score:     data.score as number,
    createdAt: data.created_at as string,
    sourcePdfUrl: (data.source_pdf_url as string | null) ?? null,
    sourceFilename: (data.source_filename as string | null) ?? null,
    parentId:  (data.parent_id as string | null) ?? null,
    version:   (data.version as number | null) ?? 1,
    rootId:    (data.root_id as string | null) ?? (data.id as string),
    scoreSource: (data.score_source as string | null) ?? null,
    variantGroup: (data.variant_group as string | null) ?? null,
    variantName:  (data.variant_name as string | null) ?? null,
    result:    data.result,
  };
}

/** Insert a new analysis row. Returns the new row id. */
export async function insertAnalysis(
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
  opts?: {
    id?: string;
    sourcePdfUrl?: string | null;
    sourceFilename?: string | null;
    /** Variant identity — omit for today's default behavior (implicit
     *  variant, no grouping). Set both together when creating a named
     *  variant (e.g. via Duplicate); never set alone. */
    variantGroup?: string | null;
    variantName?: string | null;
  },
): Promise<string | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const row: Record<string, unknown> = {
    user_id: session.user.id,
    user_email: session.user.email ?? null,
    label,
    score: result.overallScore,
    result,
  };
  if (opts?.id) row.id = opts.id;
  if (opts?.sourcePdfUrl) row.source_pdf_url = opts.sourcePdfUrl;
  if (opts?.sourceFilename) row.source_filename = opts.sourceFilename;
  if (opts?.variantGroup) row.variant_group = opts.variantGroup;
  if (opts?.variantName) row.variant_name = opts.variantName;

  const { data, error } = await db
    .from("resume_analyses")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

/**
 * Insert a new immutable VERSION of an existing analysis (append-only lineage).
 * Chains parent_id → the row being edited, version = parent.version + 1, and
 * inherits the root_id so every version of one résumé groups together.
 * Returns the created record (with lineage fields) so the caller can advance the
 * in-memory history head without a refetch. Never mutates the parent row.
 */
export async function createAnalysisVersion(
  parent: {
    id: string;
    version?: number;
    rootId?: string | null;
    label: string;
    /** Inherited onto the child row — a rescore stays inside the résumé it
     *  edited, never drifts into a different variant. */
    variantGroup?: string | null;
    variantName?: string | null;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
  opts?: { label?: string },
): Promise<AnalyzeRecord | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const rootId  = parent.rootId ?? parent.id;
  const label   = opts?.label ?? parent.label;

  // Next ordinal across the WHOLE root group (not parent.version + 1), so saving
  // from a RESTORED older version still yields a strictly increasing head rather
  // than a colliding version number.
  let version = (parent.version ?? 1) + 1;
  try {
    const { data: top } = await db
      .from("resume_analyses")
      .select("version")
      .eq("user_id", session.user.id)
      .eq("root_id", rootId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const topVersion = (top as { version?: number } | null)?.version;
    if (typeof topVersion === "number") version = topVersion + 1;
  } catch { /* fall back to parent.version + 1 */ }

  const { data, error } = await db
    .from("resume_analyses")
    .insert({
      user_id:    session.user.id,
      user_email: session.user.email ?? null,
      label,
      score:      result.overallScore,
      result,
      parent_id:  parent.id,
      version,
      root_id:    rootId,
      score_source: "estimate",
      variant_group: parent.variantGroup ?? null,
      variant_name:  parent.variantName ?? null,
    })
    .select("id, created_at")
    .single();

  if (error) throw error;

  return {
    id:        data.id as string,
    label,
    score:     result.overallScore as number,
    createdAt: data.created_at as string,
    sourcePdfUrl: null,
    sourceFilename: null,
    parentId:  parent.id,
    version,
    rootId,
    scoreSource: "estimate",
    variantGroup: parent.variantGroup ?? null,
    variantName:  parent.variantName ?? null,
    result,
  };
}

/** Delete a single analysis row by id. */
export async function deleteAnalysis(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from("resume_analyses")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/* ── Template Builder cloud saves ────────────────────────────── */

export async function fetchBuilderResumes(limit = 50): Promise<BuilderResumeRecord[]> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await db
    .from("template_builder_resumes")
    .select("id, label, data, created_at, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const out: BuilderResumeRecord[] = [];
  for (const row of data ?? []) {
    const coerced = coerceTemplateBuilderData(row.data);
    if (!coerced) continue;
    out.push({
      id: row.id as string,
      label: (row.label as string) || "Untitled résumé",
      data: coerced,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    });
  }
  return out;
}

export async function fetchBuilderResumeById(id: string): Promise<BuilderResumeRecord | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await db
    .from("template_builder_resumes")
    .select("id, label, data, created_at, updated_at")
    .eq("user_id", session.user.id)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const coerced = coerceTemplateBuilderData(data.data);
  if (!coerced) return null;

  return {
    id: data.id as string,
    label: (data.label as string) || "Untitled résumé",
    data: coerced,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/** Insert or update a Template Builder draft. Returns row id. */
export async function upsertBuilderResume(
  label: string,
  data: TBResumeData,
  id?: string | null,
): Promise<string | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    user_id: session.user.id,
    label: label.trim() || "Untitled résumé",
    data: data as unknown as Record<string, unknown>,
    updated_at: now,
  };
  if (id) row.id = id;

  const { data: saved, error } = await db
    .from("template_builder_resumes")
    .upsert(row, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw error;
  dispatchResumeLibraryChanged();
  return saved.id as string;
}

export async function deleteBuilderResume(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from("template_builder_resumes")
    .delete()
    .eq("id", id);
  if (error) throw error;
  dispatchResumeLibraryChanged();
}

/* ── Cover Letter Builder cloud saves ────────────────────────────── */

export async function fetchCoverLetters(limit = 50): Promise<CoverLetterRecord[]> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await db
    .from("cover_letters")
    .select("id, label, data, is_default, created_at, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    label: (row.label as string) || "Untitled Cover Letter",
    data: row.data,
    isDefault: !!row.is_default,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function fetchCoverLetterById(id: string): Promise<CoverLetterRecord | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await db
    .from("cover_letters")
    .select("id, label, data, is_default, created_at, updated_at")
    .eq("user_id", session.user.id)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id as string,
    label: (data.label as string) || "Untitled Cover Letter",
    data: data.data,
    isDefault: !!data.is_default,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function upsertCoverLetter(
  label: string,
  data: any, // CLData
  id?: string | null,
): Promise<string | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return null;

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    user_id: session.user.id,
    label: label.trim() || "Untitled Cover Letter",
    data,
    updated_at: now,
  };
  if (id) row.id = id;

  const { data: saved, error } = await db
    .from("cover_letters")
    .upsert(row, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw error;
  dispatchResumeLibraryChanged();
  return saved.id as string;
}

export async function deleteCoverLetter(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user?.id) return;

  const { error } = await db
    .from("cover_letters")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);
  if (error) throw error;
  dispatchResumeLibraryChanged();
}

/** Unified Library feed: generated/tailored artifacts plus saved Analyze runs. */
export async function fetchLibraryItems(): Promise<LibraryItem[]> {
  const [resumes, analyses, builders] = await Promise.all([
    fetchResumes(),
    fetchAnalyses(50),
    fetchBuilderResumes(50),
  ]);

  const tailored: LibraryItem[] = resumes.map((record) => ({
    kind: "tailored",
    key: `tailored:${record.folder}`,
    id: record.id,
    title: record.company || "Tailored résumé",
    subtitle: record.role || "Generated for a job",
    score: record.score,
    createdAt: record.created_at,
    isDefault: !!record.is_default,
    record,
  }));

  const analyzed: LibraryItem[] = analyses.map((analysis) => ({
    kind: "analyzed",
    key: `analyzed:${analysis.id}`,
    id: analysis.id,
    title: analysis.label || "Analyzed résumé",
    subtitle: "Resume analysis",
    score: analysis.score,
    createdAt: analysis.createdAt,
    isDefault: false,
    analysis,
  }));

  const builderItems: LibraryItem[] = builders.map((builder) => ({
    kind: "builder",
    key: `builder:${builder.id}`,
    id: builder.id,
    title: builder.label,
    subtitle: "Template Builder",
    score: null,
    createdAt: builder.updatedAt,
    isDefault: false,
    builder,
  }));

  const cls = await fetchCoverLetters(50);
  const clItems: LibraryItem[] = cls.map((cl) => ({
    kind: "cover_letter",
    key: `cover_letter:${cl.id}`,
    id: cl.id,
    title: cl.label,
    subtitle: "Cover Letter",
    score: null,
    createdAt: cl.updatedAt,
    isDefault: cl.isDefault,
    coverLetter: cl,
  }));

  return [...tailored, ...analyzed, ...builderItems, ...clItems].sort((a, b) => {
    const d = Number(b.isDefault) - Number(a.isDefault);
    if (d !== 0) return d;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

/* ── User profile (Tailor defaults + EEO) ─────────────────────────────────── */

function coerceUserProfilePayload(raw: unknown): ProfileFormState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PROFILE };
  return { ...EMPTY_PROFILE, ...(raw as Partial<ProfileFormState>) };
}

/** Load signed-in user’s profile row from `user_profiles`. Returns null if missing, logged out, or on error. */
export async function fetchUserProfile(): Promise<ProfileFormState | null> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return null;

    const { data, error } = await db
      .from("user_profiles")
      .select("profile")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.warn("[user_profiles] fetch:", error.message);
      return null;
    }
    if (!data?.profile) return null;
    return coerceUserProfilePayload(data.profile);
  } catch (e) {
    console.warn("[user_profiles] fetch:", e);
    return null;
  }
}

/** Upsert full profile JSON for the signed-in user. No-op when logged out. */
export async function upsertUserProfile(profile: ProfileFormState): Promise<void> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await db.from("user_profiles").upsert(
      {
        user_id: session.user.id,
        profile: profile as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) console.warn("[user_profiles] upsert:", error.message);
  } catch (e) {
    console.warn("[user_profiles] upsert:", e);
  }
}

/* ── Career profile (résumé-extracted dashboard) persistence ────────────────
 * Deliberately a SEPARATE table (`user_extracted_profiles`, migration 036)
 * from `user_profiles` above — both are keyed on `user_id`, and an upsert
 * replaces the whole `profile` jsonb column, so sharing a table would mean
 * saving Tailor defaults and saving the career-profile dashboard clobber
 * each other. Null on any failure; callers fall back to the localStorage copy
 * (`loadExtractedProfile` in `profileStorage.ts`). */

/** Load the signed-in user's career-profile dashboard data. Null when signed out or on error. */
export async function fetchExtractedProfile(): Promise<ExtractedProfileState | null> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return null;

    const { data, error } = await db
      .from("user_extracted_profiles")
      .select("profile")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.warn("[user_extracted_profiles] fetch:", error.message);
      return null;
    }
    if (!data?.profile) return null;
    return { ...INITIAL_EXTRACTED_PROFILE, ...(data.profile as Partial<ExtractedProfileState>) };
  } catch (e) {
    console.warn("[user_extracted_profiles] fetch:", e);
    return null;
  }
}

/** Upsert the career-profile dashboard data for the signed-in user. No-op when logged out. */
export async function upsertExtractedProfile(profile: ExtractedProfileState): Promise<void> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await db.from("user_extracted_profiles").upsert(
      {
        user_id: session.user.id,
        profile: profile as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) console.warn("[user_extracted_profiles] upsert:", error.message);
  } catch (e) {
    console.warn("[user_extracted_profiles] upsert:", e);
  }
}

/* ── Interview Prep persistence ──────────────────────────────────────────── */

export interface PrepQuestion {
  question: string;
  reason: string | null;
  source: string;
  star_framework?: {
    situation: string;
    task: string;
    action: string;
    result: string;
    reflection: string;
  } | null;
  best_story?: {
    title: string;
    reason: string;
  } | null;
}

export interface PrepSessionRecord {
  id: string;
  company: string | null;
  role: string;
  category: string;
  difficulty: string;
  interviewType: string;
  jobDescription: string | null;
  sources: string[];
  focusAreas: string[];
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  questions: {
    resume_questions:     PrepQuestion[];
    jd_questions:         PrepQuestion[];
    behavioral_questions: PrepQuestion[];
    company_questions:    PrepQuestion[];
  };
}

/**
 * Fetch the authenticated user's most recent interview prep session + questions
 * from the backend (GET /api/interview-prep/latest).
 *
 * Returns null when unauthenticated, when no session exists, or on error.
 */
export async function fetchLatestPrepSession(): Promise<PrepSessionRecord | null> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.access_token) return null;

    const res = await apiFetch(`/api/interview-prep/latest`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!res.ok) return null;
    const body = await res.json() as { session: null } | {
      session: Record<string, unknown>;
      questions: Record<string, PrepQuestion[]>;
    };

    if (!body.session) return null;

    const s = body.session as Record<string, unknown>;
    const q = (body as { questions: Record<string, PrepQuestion[]> }).questions;

    return {
      id:             String(s.id ?? ""),
      company:        (s.company as string | null) ?? null,
      role:           String(s.role ?? ""),
      category:       String(s.category ?? "General"),
      difficulty:     String(s.difficulty ?? "medium"),
      interviewType:  String(s.interview_type ?? "mixed"),
      jobDescription: (s.job_description as string | null) ?? null,
      sources:        (s.sources as string[]) ?? [],
      focusAreas:     (s.focus_areas as string[]) ?? [],
      questionCount:  Number(s.question_count ?? 20),
      createdAt:      String(s.created_at ?? ""),
      updatedAt:      String(s.updated_at ?? ""),
      questions: {
        resume_questions:     (q.resume_questions ?? []).map((item) => ({
          question: item.question,
          reason: item.reason,
          source: item.source,
          star_framework: item.star_framework ?? null,
          best_story: item.best_story ?? null,
        })),
        jd_questions:         (q.jd_questions ?? []).map((item) => ({
          question: item.question,
          reason: item.reason,
          source: item.source,
          star_framework: item.star_framework ?? null,
          best_story: item.best_story ?? null,
        })),
        behavioral_questions: (q.behavioral_questions ?? []).map((item) => ({
          question: item.question,
          reason: item.reason,
          source: item.source,
          star_framework: item.star_framework ?? null,
          best_story: item.best_story ?? null,
        })),
        company_questions:    (q.company_questions ?? []).map((item) => ({
          question: item.question,
          reason: item.reason,
          source: item.source,
          star_framework: item.star_framework ?? null,
          best_story: item.best_story ?? null,
        })),
      },
    };
  } catch (e) {
    console.warn("[interview-prep] fetchLatestPrepSession:", e);
    return null;
  }
}

/** Lightweight prep-session row for the Prep History list (no questions blob). */
export interface PrepSessionSummary {
  id: string;
  company: string | null;
  role: string;
  category: string;
  difficulty: string;
  interviewType: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

function mapPrepQuestions(
  q: Record<string, PrepQuestion[]>,
): PrepSessionRecord["questions"] {
  const map = (list?: PrepQuestion[]) =>
    (list ?? []).map((item) => ({
      question: item.question,
      reason: item.reason,
      source: item.source,
      star_framework: item.star_framework ?? null,
      best_story: item.best_story ?? null,
    }));
  return {
    resume_questions:     map(q.resume_questions),
    jd_questions:         map(q.jd_questions),
    behavioral_questions: map(q.behavioral_questions),
    company_questions:    map(q.company_questions),
  };
}

function mapPrepSession(body: {
  session: Record<string, unknown>;
  questions: Record<string, PrepQuestion[]>;
}): PrepSessionRecord {
  const s = body.session;
  return {
    id:             String(s.id ?? ""),
    company:        (s.company as string | null) ?? null,
    role:           String(s.role ?? ""),
    category:       String(s.category ?? "General"),
    difficulty:     String(s.difficulty ?? "medium"),
    interviewType:  String(s.interview_type ?? "mixed"),
    jobDescription: (s.job_description as string | null) ?? null,
    sources:        (s.sources as string[]) ?? [],
    focusAreas:     (s.focus_areas as string[]) ?? [],
    questionCount:  Number(s.question_count ?? 20),
    createdAt:      String(s.created_at ?? ""),
    updatedAt:      String(s.updated_at ?? ""),
    questions:      mapPrepQuestions(body.questions),
  };
}

/** List the user's saved prep kits (metadata only), newest first. */
export async function fetchPrepSessions(): Promise<PrepSessionSummary[]> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.access_token) return [];

    const res = await apiFetch(`/api/interview-prep/sessions`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { sessions?: Array<Record<string, unknown>> };
    return (body.sessions ?? []).map((s) => ({
      id:             String(s.id ?? ""),
      company:        (s.company as string | null) ?? null,
      role:           String(s.role ?? ""),
      category:       String(s.category ?? "General"),
      difficulty:     String(s.difficulty ?? "medium"),
      interviewType:  String(s.interview_type ?? "mixed"),
      questionCount:  Number(s.question_count ?? 0),
      createdAt:      String(s.created_at ?? ""),
      updatedAt:      String(s.updated_at ?? ""),
    }));
  } catch (e) {
    console.warn("[interview-prep] fetchPrepSessions:", e);
    return [];
  }
}

/** Load one saved prep kit (session + questions) by id for review. */
export async function fetchPrepSessionById(id: string): Promise<PrepSessionRecord | null> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.access_token || !id) return null;

    const res = await apiFetch(`/api/interview-prep/session/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      session?: Record<string, unknown>;
      questions?: Record<string, PrepQuestion[]>;
    };
    if (!body.session) return null;
    return mapPrepSession({ session: body.session, questions: body.questions ?? {} });
  } catch (e) {
    console.warn("[interview-prep] fetchPrepSessionById:", e);
    return null;
  }
}

/**
 * Delete a prep session via DELETE /api/interview-prep/session/{id}.
 * Returns true on success, false on failure.
 */
export async function deletePrepSession(sessionId: string): Promise<boolean> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.access_token || !sessionId) return false;

    const res = await apiFetch(`/api/interview-prep/session/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      },
    );
    return res.ok;
  } catch (e) {
    console.warn("[interview-prep] deletePrepSession:", e);
    return false;
  }
}

/* ── Interview Story Bank ────────────────────────────────────────────────── */

export interface PrepStory {
  id: string;
  title: string;
  theme: string | null;
  sourceExperience: string | null;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  createdAt: string | null;
}

/**
 * Fetch the authenticated user's master story bank — the curated set of reusable
 * STAR+R stories that accumulates across every prep session
 * (GET /api/interview-prep/stories). Empty array when signed out or on error.
 */
export async function fetchStoryBank(sessionId?: string | null): Promise<PrepStory[]> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.access_token) return [];

    // Scope the bank to the current prep session (this résumé) so we never show
    // a previous résumé's stories.
    const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
    const res = await apiFetch(`/api/interview-prep/stories${qs}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!res.ok) return [];
    const body = await res.json() as { stories?: Array<Record<string, unknown>> };
    return (body.stories ?? []).map((s) => ({
      id:               String(s.id ?? ""),
      title:            String(s.title ?? ""),
      theme:            s.theme != null ? String(s.theme) : null,
      sourceExperience: s.source_experience != null ? String(s.source_experience) : null,
      situation:        String(s.situation ?? ""),
      task:             String(s.task ?? ""),
      action:           String(s.action ?? ""),
      result:           String(s.result ?? ""),
      reflection:       String(s.reflection ?? ""),
      createdAt:        s.created_at != null ? String(s.created_at) : null,
    }));
  } catch (e) {
    console.warn("[interview-prep] fetchStoryBank:", e);
    return [];
  }
}

/**
 * Delete one master story via DELETE /api/interview-prep/story/{id} (curation).
 * Returns true on success.
 */
export async function deleteStory(storyId: string): Promise<boolean> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.access_token || !storyId) return false;

    const res = await apiFetch(`/api/interview-prep/story/${encodeURIComponent(storyId)}`, {
        method: "DELETE",
      },
    );
    return res.ok;
  } catch (e) {
    console.warn("[interview-prep] deleteStory:", e);
    return false;
  }
}

export interface JobPrepStatus {
  sessionId: string;
  questionCount: number;
}

/**
 * For a set of Jobs-feed posting ids, return which the signed-in user already has
 * an interview-prep kit for (GET /api/interview-prep/job-statuses). Powers the
 * "Prep ready" state on job cards / detail. Empty map when signed out or on error.
 */
export async function fetchJobPrepStatuses(
  jobIds: string[],
): Promise<Record<string, JobPrepStatus>> {
  try {
    const ids = jobIds.filter(Boolean);
    if (!ids.length) return {};
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.access_token) return {};

    const res = await apiFetch(`/api/interview-prep/job-statuses?ids=${encodeURIComponent(ids.join(","))}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!res.ok) return {};
    const body = await res.json() as { statuses?: Record<string, { session_id?: string; question_count?: number }> };
    const out: Record<string, JobPrepStatus> = {};
    for (const [jobId, s] of Object.entries(body.statuses ?? {})) {
      out[jobId] = {
        sessionId: String(s.session_id ?? ""),
        questionCount: Number(s.question_count ?? 0),
      };
    }
    return out;
  } catch (e) {
    console.warn("[interview-prep] fetchJobPrepStatuses:", e);
    return {};
  }
}
