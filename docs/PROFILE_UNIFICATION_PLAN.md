# Profile Unification Plan

Status: **proposed** (follow-up to the Career Profile dashboard, PR #128).

## The problem

There are two "profile" surfaces that overlap and confuse users:

1. **Profile (Tailor defaults)** — `?view=profile` → `components/ProfilePage.tsx`.
   Edits `ProfileFormState` → Supabase **`user_profiles`** (migration `003`) +
   `localStorage rn_profile_v1`. Narrow (contact, target roles, target
   locations, one education block, tone, section order, EEO answers) but
   **load-bearing**: it is read all over the app.
2. **Career Profile (dashboard)** — `/profile` → `components/profile/ProfilePage.tsx`
   → `ProfileDashboard.tsx`. Edits `ExtractedProfileState` → Supabase
   **`user_extracted_profiles`** (migration `036`) + `localStorage
   rn_extracted_profile_v1`. Rich (full extracted experience / education /
   projects, skills, summary, a completion score, AI-coach recommendations) but
   currently a **dead end** — nothing downstream reads it, and its "Job
   Preferences" / "Tailoring Defaults" cards edit two placeholder free-text
   fields (`preferences` / `tailoring`) that go nowhere.

So the user sees two things called "Profile," edits data in both, and only one
of them actually affects tailoring / jobs / cover letters.

## Who reads `user_profiles` today (do NOT break these)

Confirmed consumers of `ProfileFormState` / `user_profiles`
(`loadProfile` / `fetchUserProfile` / `upsertUserProfile`):

| Consumer | Reads | Purpose |
|---|---|---|
| `components/ResumeBuilder.tsx` | `loadProfile` + `upsertUserProfile` | Tailor prefill (contact, roles, EEO) |
| `components/CoverLetterBuilder/index.tsx` + `store/coverLetterStore.ts` | `fetchUserProfile`, `profile.locations` | Cover-letter prefill |
| `components/JobsFeed.tsx` + `components/JobSearchActivationWidget.tsx` | `loadProfile`, `profile.roles` / `.locations` | Jobs feed role + location scope |
| `components/HomeDashboard.tsx` | `fetchUserProfile` | Home greeting / setup state |
| `components/FirstRunWizard.tsx` | `fetchUserProfile` + `upsertUserProfile` | First-run role capture |
| `components/InsiderPanel.tsx` | `loadProfile` | Referral outreach defaults |

`user_extracted_profiles` has **zero** readers.

## Design principle

**Don't move the data — surface both datasets in one UI, each writing to its own
existing table.** The collision bug that PR #128 fixed happened precisely because
one column tried to hold both. Keeping two tables but one dashboard means:

- Every existing consumer keeps reading `user_profiles` unchanged — **no
  ResumeBuilder / Jobs / CoverLetter / Home changes required** for the core of
  the work.
- The dashboard becomes the single place a user edits "who I am" (extracted) and
  "how I want things tailored" (defaults + EEO).

## Phases

### Phase 1 — surface Tailor defaults inside the dashboard (additive, low-risk)
- Replace the dashboard's dead **Job Preferences** and **Tailoring Defaults**
  free-text cards with real, structured editing of the `user_profiles` fields:
  target **roles**, target **locations**, **tone**, **section order**, and the
  **EEO** answers.
- `ProfilePage.tsx` (dashboard) additionally loads `fetchUserProfile()` /
  `loadProfile()` on mount and writes those fields back via
  `upsertUserProfile()` — a **second, independent** autosave target alongside
  `upsertExtractedProfile()`. Two tables, two writers, no shared column.
- Drop the placeholder `preferences` / `tailoring` fields from
  `ExtractedProfileState` (they were never persisted anywhere meaningful).
- The old `?view=profile` form stays live and untouched — both edit the same
  `user_profiles`, so they stay consistent.
- **Exit check:** editing roles/locations/EEO in the dashboard changes what
  Tailor / Jobs prefill, verified live; old Profile form still round-trips.

### Phase 2 — make the extracted profile useful (net-new value)
- Let the dashboard's extracted contact block (name / email / phone / linkedin /
  location) seed `user_profiles` contact fields when those are empty (prefer-empty
  merge, same rule as `mergeProfilePreferEmpty`), so a résumé upload fills the
  Tailor contact defaults too.
- Optional: offer "Use this résumé as my Tailor baseline" that pushes the
  extracted structured doc into the Tailor/Template-Builder prefill path.

### Phase 3 — retire the old Profile form
- Point the Account-dropdown "Profile" item and every `?view=profile` /
  `/?view=profile` link (AccountSettingsPage cross-link, ResumeBuilder,
  AppSidebar) at `/profile`.
- Move the EEO + tone + section-order editing fully into the dashboard, delete
  `components/ProfilePage.tsx` (old) and its `?view=profile` route.
- Keep `ProfileFormState` + `user_profiles` as the persistence layer — only the
  **editor UI** is consolidated; the data model and every reader stay put.
- **Exit check:** one "profile" concept in the UI, all existing consumers still
  green, `next build` + full vitest pass.

## Explicitly out of scope
- No schema migration of `user_profiles` → `user_extracted_profiles` or vice
  versa. Two tables stay; this is a UI consolidation, not a data migration.
- No backend (`resunova-api`) changes — all of this is web-side.

## Risks
- **Double-write races.** The dashboard writing `user_profiles` while the old
  form is also open in another tab could clobber. Mitigated by prefer-empty
  merges and by retiring the old form in Phase 3.
- **EEO is sensitive.** Keep the same optional / "prefer not to say" affordances
  the old form has; never surface EEO answers in the completion score or
  recommendations.
