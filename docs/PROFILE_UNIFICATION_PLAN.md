# Profile Unification Plan

Status: **Phases 1–3 done** — the plan is complete (follow-up to the Career Profile dashboard, PR #128).

> **Live verification (2026-07-15):** served the static export and drove the
> flows in a real browser. Confirmed: `?view=profile` redirects to `/profile`
> (Phase 3); the dashboard edits Tailor defaults (roles/locations/tone/EEO cards
> + Job Preferences modal all render the seeded `user_profiles` data, Phase 1);
> and the main nav has no top-level "Profile" item. No page errors.

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

### Phase 1 — surface Tailor defaults inside the dashboard (additive, low-risk) — ✅ DONE
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
- **Landed as:** dashboard now loads `fetchUserProfile()` / `loadProfile()` into
  a second `tailorDefaults` state with its own debounced autosave to
  `saveProfile()` + `upsertUserProfile()`; the "Job Preferences", "Tailoring
  Defaults", and "Application Details (EEO)" cards edit `roles`/`locations`,
  `tone`/`sectionOrder`, and the 6 EEO answers respectively. Verified live:
  cards render from seeded `user_profiles`, all three modals edit, and a Save
  round-trips to `rn_profile_v1` **without clobbering** the untouched fields.
  Placeholder `preferences`/`tailoring` fields dropped from
  `ExtractedProfileState`.

### Phase 2 — make the extracted profile useful (net-new value) — ✅ DONE (seeding)
- Let the dashboard's extracted contact block (name / email / phone / linkedin /
  portfolio / headline) seed `user_profiles` contact fields when those are empty
  (prefer-empty merge, same rule as `mergeProfilePreferEmpty`), so a résumé upload
  fills the Tailor contact defaults too.
- **Landed as:** `handleAcceptAll` (résumé-accept path) now runs
  `mergeProfilePreferEmpty(tailorDefaults, tailorContactHintsFromExtracted(data))`
  and writes the result via the Phase-1 `tailorDefaults` autosave. The new pure
  helper `tailorContactHintsFromExtracted` maps only the unambiguous contact
  fields — deliberately **not** `role`→`roles` or `location`→`locations` (current
  ≠ target). Verified live via a mocked `/api/upload-resume` → upload → "Accept
  All": empty `displayName`/`phone`/`linkedin`/`headline` filled from the résumé,
  a pre-set `email` and `roles` **preserved**, `locations` left untouched. 5 unit
  tests in `components/__tests__/tailorContactSeed.test.ts`.
- **Still open (optional):** a "Use this résumé as my Tailor baseline" action that
  pushes the extracted structured doc into the Tailor/Template-Builder prefill
  path. Deferred — it touches the Tailor prefill flow and is better bundled with
  Phase 3.

### Phase 3 — retire the old Profile form — ✅ DONE
- Point the Account-dropdown "Profile" item and every `?view=profile` /
  `/?view=profile` link (AccountSettingsPage cross-link, ResumeBuilder,
  AppSidebar) at `/profile`.
- Delete `components/ProfilePage.tsx` (old) and redirect its `?view=profile`
  route to `/profile`.
- Keep `ProfileFormState` + `user_profiles` as the persistence layer — only the
  **editor UI** is consolidated; the data model and every reader stay put.
- **Landed as:** deleted the old `components/ProfilePage.tsx`; `HomePageClient`'s
  `view === "profile"` branch now `router.replace("/profile")` (a redirect effect
  cloned from the existing `flow=template` → `/template-builder/` one) so old
  bookmarks still work; the top-level "Profile" sidebar `NavItem` is removed and
  the Account dropdown collapses to a single "Profile" → `/profile`;
  `AccountSettingsPage` + `ResumeBuilder` links repointed to `/profile`.
- **Field-drop decision (confirmed with product):** the old form was the only
  manual editor for `tagline` / `school` / `degree` / `graduation` / `gpa`.
  Consumer audit: `tagline`/`degree`/`graduation`/`gpa` have **no runtime
  reader**; `school` is read only by `InsiderPanel` (referral alumni-school
  default) and still auto-fills from résumé-upload hint-merges. So dropping their
  manual editing loses nothing live. Everything live consumers actually read
  (contact, `roles`, `locations`, `tone`, `sectionOrder`, EEO) is covered by the
  dashboard after Phases 1–2.
- **Verified:** `tsc --noEmit` clean, 226 vitest green, `next build` clean with
  `/profile` + all prior routes present. In-browser redirect not live-exercised
  this session (sandbox killed the dev server at every turn boundary); the
  redirect is a line-for-line clone of the proven `flow=template` redirect, and
  an earlier live pass this session already confirmed `/profile` renders.
- **Deferred (optional, from Phase 2):** a "Use this résumé as my Tailor
  baseline" action pushing the extracted structured doc into the Tailor /
  Template-Builder prefill path — not built; would be a Phase 4.

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
