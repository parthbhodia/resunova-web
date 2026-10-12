import type { ReactNode } from "react";
import { JOBS_ENABLED } from "@/lib/featureFlags";
import { TAILOR_ROUTE } from "@/lib/tailorRoute";
import { NAV_ICONS } from "./nav-icons";

export type AppView =
  | "home"
  | "builder"
  | "library"
  | "analyze"
  | "profile"
  | "jobs"
  | "cover-letter"
  | "advisor"
  | "account";

export const VIEW_LABELS: Record<AppView, string> = {
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

export const VIEW_ICONS: Record<AppView, ReactNode> = {
  home: NAV_ICONS.home,
  analyze: NAV_ICONS.analyze,
  builder: NAV_ICONS.builder,
  library: NAV_ICONS.library,
  profile: NAV_ICONS.profile,
  jobs: NAV_ICONS.jobs,
  "cover-letter": NAV_ICONS["cover-letter"],
  advisor: NAV_ICONS.advisor,
  account: NAV_ICONS.account,
};

export const VIEW_BADGES: Partial<Record<AppView, string>> = {};

/* ── the desktop rail ─────────────────────────────────────────── */

/**
 * The rail is the whole desktop nav — there is no expanded state and no
 * drawer. Both are gone on purpose:
 *
 *   - The drawer hid Template Builder two clicks deep and invisible at rest,
 *     which is why users reported they could not find the templates at all.
 *     Tailor and Templates are siblings here.
 *   - The collapsed/expanded duality is what produced "the navbar is always
 *     shrinked": `switchView` collapsed on every navigation, a workspace-route
 *     default collapsed four more paths, and the persisted flag then argued
 *     with both. A rail that is always one width cannot be in the wrong one.
 *
 * Labels are visible at rest rather than living in a hover tooltip, so every
 * item keeps an accessible name without the icon needing an `aria-label`
 * bolted on (the #264 fix, now structural).
 */
/**
 * The rail's width, and the width of one control inside it.
 *
 * MEASURED, not chosen. `SidebarMenuButton` carries
 * `[&>span:last-child]:truncate`, so a rail a few pixels too narrow does not
 * overflow visibly — it renders an ellipsis on the label, which reads as a
 * deliberately abbreviated word rather than as a layout bug. Measured in the
 * served build with the app's own face, the longest label ("Templates") is
 * 53.1px and the next longest ("Feedback") 50.8px, so 72px of item minus 8px
 * of horizontal padding leaves ~11px of headroom.
 *
 * ⚠️ PX, NOT REM, and that is not a style preference. `html` is `font-size:
 * 14px` in this app, so `rem` here is 14px while the whole type system — the
 * `--font-size-*` ladder and the `text-[11px]` these labels use — is written
 * in px. The first draft of these two constants was in rem and silently
 * rendered 12.5% narrower: a 63px item against a 53.1px label, 1.9px from
 * truncating, and nothing clipped so it measured clean. Mixing the two units
 * is how a layout passes a browser check by 2px.
 *
 * ⚠️ `--sidebar-width` is not only the rail's own width: `PrepDashboardView`
 * offsets a fixed bottom bar by `pl-[var(--sidebar-width,0px)]`. Under the old
 * collapsible nav that bar was wrong whenever the nav was collapsed (it padded
 * by the expanded 232px against an 84px nav); one fixed width makes it right by
 * construction.
 */
export const RAIL_WIDTH = "84px";
export const RAIL_ITEM_WIDTH = "72px";

export type RailKey = "home" | "analyze" | "tailor" | "templates" | "library" | "jobs" | "prep";

export type RailItem = {
  key: RailKey;
  /** Short enough to sit under a 20px icon in a 62px pill without wrapping. */
  label: string;
  icon: ReactNode;
  /**
   * Where this item goes: a `?view=` on the app shell, or a route.
   *
   * ⚠️ EXACTLY ONE OF THESE, AND GUEST GATING IS DERIVED FROM IT — never a
   * hand-written `gated: boolean` per item. A `?view=` is checked against the
   * shared `PUBLIC_APP_VIEWS`, a route against `AuthGate`'s own `isPublicPath`,
   * so a nav click and a pasted URL reach the same verdict by construction.
   * Separate hand-kept lists are how clicking `jobs` hit a sign-in wall that
   * pasting its URL did not, and the shipped sidebar carried two more of the
   * same: `if (anonMode) onSignIn()` written inline on the builder click and
   * again on interview prep, agreeing with the routes they pointed at only by
   * luck.
   *
   * `route` is the PATH the click lands on, which for Tailor is built by
   * `tailorHref()` from this same constant — the gate has to judge the page
   * the user actually arrives at, not the `?view=` the flow used to live on.
   */
  view?: AppView;
  route?: string;
};

/**
 * Grouped by the product's own funnel, with a hairline between groups:
 * work on the document · use it. The meta group (Feedback, plan, account)
 * is pinned to the foot by the rail itself, not listed here.
 */
export const RAIL_GROUPS: RailItem[][] = [
  [
    { key: "home", label: "Home", icon: NAV_ICONS.home, view: "home" },
    { key: "analyze", label: "Analyze", icon: NAV_ICONS.analyze, view: "analyze" },
    // ⚠️ The ROUTE, not `view: "builder"`. `PUBLIC_APP_VIEWS` still lists
    // `builder` as public — true of the classic surface at `/?view=builder`,
    // and NOT of `/tailor-2/`, where the redesign lives and where this click
    // actually lands. Gating on the view would walk a guest into AuthGate,
    // which renders the marketing landing page rather than an explanation.
    { key: "tailor", label: "Tailor", icon: NAV_ICONS.builder, route: TAILOR_ROUTE },
    // Public, like the builder it leads into: a signup-free funnel entry
    // behind a login wall would be worse than the drawer it replaces.
    { key: "templates", label: "Templates", icon: NAV_ICONS.templates, route: "/templates/" },
    { key: "library", label: "Résumés", icon: NAV_ICONS.library, view: "library" },
  ],
  [
    ...(JOBS_ENABLED
      ? [{ key: "jobs" as const, label: "Jobs", icon: NAV_ICONS.jobs, view: "jobs" as AppView }]
      : []),
    { key: "prep", label: "Prep", icon: NAV_ICONS.interviewPrep, route: "/interview-prep" },
  ],
];

export type RailActiveContext = {
  active: AppView;
  builderActive: boolean;
  navBuilderSubflow: "tailor" | "template";
  onTemplatesPage: boolean;
  onTemplateBuilderPage: boolean;
  onInterviewPrepPage: boolean;
  onCareerProfilePage: boolean;
};

/**
 * Which single rail item is lit, or none.
 *
 * ⚠️ THE RETURN TYPE IS THE INVARIANT. "Exactly one nav item lights" used to
 * be a chain of `!onTemplateBuilderPage && !onTemplatesPage && !onInterviewPrepPage
 * && !onCareerProfilePage && active === …` repeated on every item — the same
 * rule written eight times, which drifts the day a ninth routed page appears
 * and someone updates seven of them. One function returning at most one key
 * makes the property structural instead of a thing to remember.
 *
 * Routed pages are checked FIRST because they sit outside the `?view=` query:
 * while you are on /templates the shell's `active` still reads "home", which
 * is exactly the two-items-lit drift the old chain existed to suppress.
 */
export function railActiveKey(ctx: RailActiveContext): RailKey | null {
  // /templates (the gallery) and /template-builder are one destination family
  // — you reach the builder through the gallery — so they light one item.
  if (ctx.onTemplatesPage || ctx.onTemplateBuilderPage) return "templates";
  if (ctx.onInterviewPrepPage) return "prep";
  // Career Profile lives in the account menu, so nothing on the rail owns it.
  if (ctx.onCareerProfilePage) return null;
  if (ctx.builderActive) return ctx.navBuilderSubflow === "template" ? "templates" : "tailor";
  switch (ctx.active) {
    case "home":
      return "home";
    case "analyze":
      return "analyze";
    case "library":
      return "library";
    case "jobs":
      return JOBS_ENABLED ? "jobs" : null;
    // cover-letter · advisor · account · profile are reached from the account
    // menu and have no rail item to light.
    default:
      return null;
  }
}

/* ── mobile ───────────────────────────────────────────────────── */

// Mobile bottom bar: 4 primary tabs + the "More" button = 5 slots (the platform
// max). Profile is intentionally NOT here — it's reachable from the top-bar
// account avatar and the More sheet, which frees a slot and removes redundancy.
export const MOBILE_TAB_VIEWS: AppView[] = [
  "home",
  "analyze",
  // "jobs" — hidden while the extraction pipeline is off, see JOBS_ENABLED.
  ...(JOBS_ENABLED ? (["jobs"] as AppView[]) : []),
  "library",
];

// Short, one-word labels for the bottom bar so nothing truncates at phone width
// (e.g. "Resume Builder" → "Resume"). Falls back to VIEW_LABELS if unset.
export const MOBILE_TAB_LABELS: Partial<Record<AppView, string>> = {
  home: "Home",
  analyze: "Analyze",
  jobs: "Jobs",
  library: "Resumes",
};
