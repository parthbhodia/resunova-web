# TODOS

## Eng-review M3-M5 before building M3

- **What:** Run /plan-eng-review scoped to milestones M3-M5 of the résumé-hub design doc (`~/.gstack/projects/resunova/parth-main-design-20260724-012719.md`) before any M3 code is written.
- **Why:** The 2026-07-24 eng review deliberately trimmed to M1+M2. M3-M5 were adversarially reviewed as prose only, never against the code — and M3 (hub renders versions, one-card-per-root grouping) is where the two-sources-of-truth risk lives.
- **Pros:** Catches grid-grouping, dedup-rule, and reconciliation issues at plan stage, where they cost minutes.
- **Cons:** One more review session (~30 min) between M2 and M3.
- **Context:** The M1+M2 review produced contracts M3-M5 must honor: the reconciliation rule (analyses head canonical for ranking; linked version mirrors last saved state; writers update both via the bridges), the `resume_versions.source_root_id` lookup (indexed), the `origin='manual'` success-metric filter (Boost auto-saves `origin='tailor'` rows), and `/versions-preview` retirement in M4. The outside-voice finding to re-verify in M3's review: "two sources of truth, no reconciliation owner" (its #7).
- **Depends on / blocked by:** M2 landed.
