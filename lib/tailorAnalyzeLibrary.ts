/**
 * Persist tailor "match" runs (analyze-first, no PDF) to Supabase `resumes`
 * so TailorRecentJobs can list and restore them.
 */
import type { RatingsData } from "@/lib/types";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { slugToken } from "@/lib/resumeFileName";
import { upsertResume } from "@/lib/supabase";

/**
 * FNV-1a over the whitespace-folded JD — a stable, dependency-free token so
 * the same pasted JD lands on the same folder across runs.
 */
function jdToken(jobDescription: string): string {
  const s = jobDescription.replace(/\s+/g, " ").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Stable library folder per target company+role (one row; bump created_at on
 * re-run).
 *
 * When company or role is missing, the slug degenerates to its fallback
 * token — and a degenerate slug is SHARED: every company-less run of every
 * job collapsed onto literally one folder (`tailor_match_co_role`), so each
 * save overwrote a different job's match. Field-found on 2026-08-13, where it
 * also collided with ANOTHER user's row across the then-global unique on
 * `folder`. A JD-derived token now keeps distinct jobs distinct; the same JD
 * re-run still updates in place. Fully-named runs are byte-unchanged.
 */
export function tailorMatchFolder(company: string, role: string, jobDescription?: string): string {
  const c = slugToken(company, "co");
  const r = slugToken(role, "role");
  const base = `tailor_match_${c}_${r}`;
  const degenerate = c === "co" || r === "role";
  const jd = (jobDescription ?? "").trim();
  if (degenerate && jd) return `${base.slice(0, 91)}_${jdToken(jd)}`;
  return base.slice(0, 100);
}

export async function saveTailorMatchToLibrary(opts: {
  folder: string;
  company: string;
  role: string;
  model: string;
  ratings: RatingsData;
  jobDescription: string;
  candidateProfile?: string | null;
  structuredResume?: StructuredResume | null;
}): Promise<string | null> {
  const profile = opts.candidateProfile?.trim();
  const resumeDoc: Record<string, unknown> = {};
  if (profile) resumeDoc.profile = profile;
  if (opts.structuredResume) resumeDoc.structured = opts.structuredResume;
  // The row's readable label, not its identity (the folder is that). When the
  // user pasted a JD without filling the role field, the grade already read
  // the posting's title — "— · —" in the library is us discarding a fact we
  // hold. Labels may use it; the FOLDER never does, because the LLM's
  // wording can drift between runs and the folder must not.
  const roleLabel = (opts.role ?? "").trim();
  const jdTitle =
    typeof opts.ratings?.job_title?.jd_title === "string"
      ? opts.ratings.job_title.jd_title.trim()
      : "";
  const displayRole = roleLabel && roleLabel !== "—" ? roleLabel : jdTitle || roleLabel;
  return upsertResume(
    opts.folder,
    opts.company,
    displayRole,
    opts.model,
    "",
    null,
    opts.ratings,
    opts.jobDescription,
    {
      renderer: "structured",
      schemaVersion: 1,
      resumeDoc: Object.keys(resumeDoc).length ? resumeDoc : null,
    },
    { bumpCreatedAt: true },
  );
}
