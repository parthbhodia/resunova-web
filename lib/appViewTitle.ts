/**
 * Page titles for the in-app views that live at `/?view=…`.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * app/page.tsx sets one title — "Free AI Resume Builder: Get Past the ATS" —
 * and the entire signed-in app is rendered at `/?view=analyze|jobs|library|…`
 * by RouterView. GA4 keys its Pages-and-screens report on page title + path,
 * so the marketing homepage and every in-app screen collapsed into a single
 * row. 53 views of "/" could be a bounce or a power user doing nine things,
 * and the report could not tell you which.
 *
 * ⚠️ WHY THIS LIVES IN ITS OWN REACT-FREE MODULE: app/layout.tsx interpolates
 * this map into the inline gtag bootstrap, so it must be importable from a
 * server component without dragging in nav-icons' JSX. It is nonetheless NOT
 * a second list of views — appViewTitle.test.ts pins it against VIEW_LABELS in
 * BOTH directions, so a tenth view cannot ship without a title and a title
 * cannot point at a view that was deleted.
 */

/** Suffix, kept separate so the test can compare against VIEW_LABELS directly. */
export const TITLE_SUFFIX = " · Resunova";

/**
 * View key → the label that precedes the suffix. Deliberately the same words
 * the rail uses: a report row and the nav item it came from should be the same
 * name, or reading the funnel means translating between two vocabularies.
 */
export const APP_VIEW_TITLE_LABELS: Record<string, string> = {
  home: "Home",
  builder: "Resume Builder",
  library: "My Resumes",
  analyze: "Analyze",
  profile: "Profile",
  jobs: "Jobs",
  "cover-letter": "Cover letter",
  advisor: "Advisor",
  account: "Account settings",
};

/** The map the browser tab and GA4 both see. */
export const APP_VIEW_TITLES: Record<string, string> = Object.fromEntries(
  Object.entries(APP_VIEW_TITLE_LABELS).map(([k, v]) => [k, v + TITLE_SUFFIX]),
);

/**
 * Title for a `?view=` value, or null when there is none — an unknown view,
 * or no `view` param at all.
 *
 * ⚠️ Returning null for a MISSING param is deliberate and is the difference
 * between fixing the merge and making it worse: bare `/` is the marketing
 * landing page for a signed-out visitor and the app home for a signed-in one,
 * and nothing available at script time can tell those apart. Retitling it
 * would mislabel the single most-visited marketing page in the property. The
 * `app_view` event is what distinguishes the signed-in case, because by then
 * React knows which one it is rendering.
 */
export function appViewTitleFromSearch(search: string): string | null {
  try {
    const v = (new URLSearchParams(search).get("view") || "").toLowerCase();
    if (!v) return null;
    return APP_VIEW_TITLES[v] ?? null;
  } catch {
    return null;
  }
}
