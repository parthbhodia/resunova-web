# Jobs Page Layout — Agent Handoff

_Last updated: 2026-06-17 · Branch: `claude/mobile-job-page-layout-2uby40` (merged to `main` + `staging`)_

## Goal

Fix the Jobs page (`/?view=jobs`) layout, referencing LinkedIn / Jobright:
1. **Mobile** — the desktop layout never collapsed, so a fixed-width sidebar crushed the feed.
2. **Desktop** — replace full-page job navigation with a LinkedIn-style **split view** (list + detail pane).

## Status: ✅ Shipped

- PR **#5** merged into `main` (prod) and branch pushed to `staging`.
- Both GitHub Pages deploys (`deploy.yml` on `main`, `deploy-staging-pages.yml` on `staging`) triggered and were building at handoff time.
- Verified locally: `npx tsc --noEmit` clean · `npm run build` compiles · `npx vitest run` 22/22 pass.
- **Not visually verified in-browser**: the Jobs feed requires a signed-in session + live backend (`/api/jobs/feed`), so no real screenshot of the split view was captured in the sandbox. **Next agent: eyeball it on a signed-in `staging` session, especially the desktop split.**

## Files changed

| File | Change |
|---|---|
| `hooks/use-mobile.ts` | Added `useIsDesktop()` (`min-width: 1024px`) alongside existing `useIsMobile()` (`<768px`). |
| `components/HomePageClient.tsx` | New `JobsView` component routes the `view=jobs` branch between feed shell / mobile full-page detail / desktop split. |
| `components/JobsFeed.tsx` | New props `selectedJobId?` + `variant?: "full" \| "list"`; mobile stacking; collapsible sidebar; list-rail (split) mode. |
| `components/JobDetail.tsx` | New `embedded?` prop for rendering inside the split pane (no page max-width / back-breadcrumb; compact ✕ Close). |

## Architecture / behavior

The page uses **inline styles everywhere** (no Tailwind classes, no CSS media queries), so responsiveness is done with the JS hooks `useIsMobile()` / `useIsDesktop()` (both `matchMedia`-based).

### Routing (`HomePageClient.tsx` → `JobsView`)
```
no job selected            → <JobsTabShell/>            (Recommended / My Applications tabs; unchanged)
job selected, < 1024px     → <JobDetail jobId/>          (full-page; original mobile pattern, no regression)
job selected, >= 1024px    → split:  <JobsFeed selectedJobId variant="list"/>  |  <JobDetail jobId embedded/>
```
- Split container: `maxWidth 1500`, flex row. Left rail `flex: 0 0 420px`. Right pane `flex: 1 1 0`, `position: sticky; top: 0; maxHeight: calc(100dvh - 88px); overflowY: auto` — list scrolls under a pinned, independently-scrolling detail (the LinkedIn feel).
- The whole jobs view scrolls inside `ScrollPane` (a flex child of `AppShell` main).

### `JobsFeed.tsx`
- `variant="full"` (default): standalone feed. Mobile fixes applied here:
  - Outer container stacks to a column on mobile (`useIsMobile`), trimmed padding + `88px` bottom padding to clear the mobile bottom tab bar.
  - `JobsSidebar` (saved filters / "Sharpen your matches") is full-width below the feed on mobile, and **collapsed behind a "Saved filters & tools ▾" toggle** (state `expanded`, default closed on mobile; desktop renders the full sticky 264px rail).
  - Each job card's action buttons (Optimize / Prep / View & apply) reflow into a full-width wrapping row on mobile.
- `variant="list"` (split rail): single column, **no own sidebar**, **per-card action buttons hidden** (the detail pane owns them), selected card highlighted (`outline: 2px solid var(--accent)` + `--accent-bg`). Header slimmed: big "Jobs for you" h1/subtitle dropped → compact "`N jobs`" + Refresh; search full-width; redundant "N of M" count removed.
- Card click always `router.push('/?view=jobs&job=<id>')` → updates URL; on desktop this re-renders the split (no unmount), on mobile it shows the full-page detail.

### `JobDetail.tsx`
- `embedded` prop: drops outer `maxWidth/margin/padding`, hides the "‹ Back to Jobs" breadcrumb, shows a compact "✕ Close" (→ `/?view=jobs`). Internal two-column layout (JD + sticky match panel) unchanged.

## Key decisions / gotchas

- **Split breakpoint is 1024px, not 768px** — list + detail needs the width; tablets keep full-page detail.
- **Filter dropdowns in the list rail intentionally still wrap (not horizontal-scroll).** The `FilterMenu` triggers open `position: absolute` popovers; an `overflow-x: auto` row would clip them. Removing the tall header was the real height win.
- **No new import coupling**: split is composed in `HomePageClient` (already imports both `JobsFeed` + `JobDetail`). `JobsFeed` does NOT import `JobDetail`, avoiding a `JobsFeed → JobDetail → BoostPanel` cycle. Keep it that way.
- **Module-level `feedCache` (5-min TTL)** in `JobsFeed` means switching between full feed and split rail re-mounts `JobsFeed` but serves from cache (no spinner).
- **Hydration**: `useIsDesktop()`/`useIsMobile()` return `false` on first render, then correct after mount — brief flash possible when deep-linking straight to a job URL on desktop (full-page detail → split). Matches existing `AppShell` pattern; acceptable.
- **Pre-existing lint** in `JobsFeed.tsx` (lines ~207, ~620, ~747: `set-state-in-effect`, `no-unused-expressions`) is NOT from this work — leave or fix separately.

## Deploy mapping (for future pushes)

- `main` → **production** (`deploy.yml`, push trigger). **Branch-protected — direct push 403s; merge a PR.**
- `staging` → **staging** (`deploy-staging-pages.yml`, push trigger). Direct push allowed.
- `staging.yml` runs on `pull_request` to `staging` only.

## Suggested next steps

1. Visually QA the desktop split + mobile feed on a signed-in `staging` session.
2. Tune split column widths / rail filter density if it feels cramped at 1024–1280px.
3. Consider auto-scrolling the selected card into view in the rail, and keyboard (↑/↓) navigation between jobs — both LinkedIn-like niceties not yet implemented.
4. Optionally fold the pre-existing `set-state-in-effect` lint warnings into a cleanup pass.
