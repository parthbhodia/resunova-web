/**
 * Boost → Résumé Version. When a user accepts Boost suggestions for a job, the
 * boosted résumé is auto-saved as a version (Phase 1 of the Boost×Versions plan).
 *
 * Boost works on flat text + suggestion cards keyed to structured originals, so
 * to produce a *structured* version we bake the ACCEPTED rewrites into the user's
 * latest scanned résumé via the same tested helper the Analyze rescore uses
 * (`patchAppliedEditsIntoResume`, matches by normalized original bullet text).
 * The version stores the posting's JD context and the match score labeled as a
 * match (`last_score_source='match'`) — never as a general quality grade.
 */
import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { patchAppliedEditsIntoResume } from "./analyzeRescore";
import { fetchAnalyses } from "./supabase";
import {
  createVersion,
  updateVersion,
  saveAsChildVersion,
  listVersions,
} from "./resumeVersions";

export interface BoostAcceptedPair {
  original: string;
  suggested: string;
}

export interface ResumeBase {
  structured: StructuredResume | null;
  extractedText: string;
}

/** Bake accepted Boost rewrites into a base résumé → boosted structured + text. */
export function boostedResumeFromAccepted(base: ResumeBase, pairs: BoostAcceptedPair[]): ResumeBase {
  const clean = pairs.filter((p) => p.original?.trim() && p.suggested?.trim());
  const analysisBullets = clean.map((p) => ({ originalBullet: p.original }));
  const lineOverrides: Record<number, string> = {};
  clean.forEach((p, i) => { lineOverrides[i] = p.suggested; });
  const patch = patchAppliedEditsIntoResume({
    extractedText: base.extractedText,
    structuredResume: base.structured,
    analysisBullets,
    lineOverrides,
  });
  return { structured: patch.patchedStructured, extractedText: patch.patchedText };
}

/** The user's latest scanned résumé (structured + text) — the doc Boost tailored from. */
export async function fetchLatestResumeBase(): Promise<ResumeBase | null> {
  const recs = await fetchAnalyses(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = recs[0]?.result as any;
  if (!r || typeof r !== "object") return null;
  const extractedText = typeof r.extractedText === "string" ? r.extractedText : "";
  const structured = (r.structuredResume as StructuredResume | null) ?? null;
  if (!extractedText && !structured) return null;
  return { structured, extractedText };
}

function versionName(structured: StructuredResume | null): string {
  const n = structured?.full_name?.trim();
  return n ? `${n}'s résumé` : "Tailored résumé";
}

/** An existing tailored version already targeting this company+title, if any. */
export async function findExistingBoostVersion(company: string, title: string): Promise<string | null> {
  const c = company.trim().toLowerCase();
  const t = title.trim().toLowerCase();
  if (!c && !t) return null;
  try {
    const versions = await listVersions();
    const hit = versions.find(
      (v) => v.origin === "tailor"
        && (v.jdCompany ?? "").trim().toLowerCase() === c
        && (v.jdTitle ?? "").trim().toLowerCase() === t,
    );
    return hit?.id ?? null;
  } catch {
    return null;
  }
}

/** The version a Boost was launched FROM (phase 2), so its result chains as a child. */
export interface BoostSourceVersion {
  id: string;
  rootId: string;
  version: number;
  name: string;
}

export interface AutoSaveBoostArgs {
  /** Version id already created for this Boost session (update it in place). */
  existingVersionId: string | null;
  base: ResumeBase;
  pairs: BoostAcceptedPair[];
  company: string;
  title: string;
  /** The accepted-set match score — stored labeled as a match, not a quality grade. */
  matchScore: number | null;
  /** When Boost was launched from a version, chain the result as its CHILD (phase 2). */
  sourceVersion?: BoostSourceVersion | null;
}

/**
 * Create (or update in place) the version for this boosted résumé. Returns the
 * version id so the caller can keep updating the same row as the accepted set
 * changes. Returns null when there's nothing to save (no structured, or the
 * user isn't signed in — createVersion returns null without a session).
 */
export async function autoSaveBoostVersion(args: AutoSaveBoostArgs): Promise<string | null> {
  const boosted = boostedResumeFromAccepted(args.base, args.pairs);
  if (!boosted.structured) return null; // a version needs structured data
  const jdCompany = args.company.trim() || null;
  const jdTitle = args.title.trim() || null;

  // Reuse the session's version, else an earlier boost of the SAME job, else create.
  const targetId = args.existingVersionId ?? (await findExistingBoostVersion(args.company, args.title));

  if (targetId) {
    await updateVersion(targetId, {
      structured: boosted.structured,
      extractedText: boosted.extractedText,
      jdCompany,
      jdTitle,
      lastScore: args.matchScore,
      lastScoreSource: "match",
    });
    return targetId;
  }

  // Phase 2: launched from a version → chain the result as a CHILD of its lineage.
  if (args.sourceVersion) {
    const child = await saveAsChildVersion(
      { id: args.sourceVersion.id, rootId: args.sourceVersion.rootId, version: args.sourceVersion.version, name: args.sourceVersion.name },
      {
        name: args.sourceVersion.name,
        structured: boosted.structured,
        extractedText: boosted.extractedText,
        origin: "tailor",
        jd: { company: jdCompany, title: jdTitle, text: null },
        lastScore: args.matchScore,
        lastScoreSource: "match",
      },
    );
    return child?.id ?? null;
  }

  const made = await createVersion({
    name: versionName(boosted.structured),
    structured: boosted.structured,
    extractedText: boosted.extractedText,
    origin: "tailor",
    lastScore: args.matchScore,
    lastScoreSource: "match",
  });
  if (!made) return null;
  // createVersion (new root) doesn't take JD context — set it on the fresh row.
  if (jdCompany || jdTitle) {
    try {
      await updateVersion(made.id, { jdCompany, jdTitle });
    } catch { /* best-effort JD tag */ }
  }
  return made.id;
}
