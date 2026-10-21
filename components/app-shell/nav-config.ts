import type { ReactNode } from "react";
import { JOBS_ENABLED } from "@/lib/featureFlags";
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

/**
 * Document title for an app view.
 *
 * App views are not routes: they are `/` plus `?view=<name>`, so they all
 * inherit `app/page.tsx`'s metadata title and every one of them reported as
 * "Free AI Resume Builder: Get Past the ATS" in GA. Naming the surface here
 * keeps the browser tab honest and lets the homepage row stop absorbing all
 * product usage.
 */
export function appViewTitle(view: AppView, baseTitle: string): string {
  return view === "home" ? baseTitle : `${VIEW_LABELS[view]} · Resunova`;
}

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

/**
 * Desktop rail width. Labels stay visible, so this is wider than an icon-only
 * strip and far narrower than the old expanded sidebar. 6rem holds "Templates"
 * at the caption step without truncating.
 */
export const RAIL_WIDTH = "6rem";

/**
 * One destination lights at a time. Route pages win over `?view=`, because a
 * gallery or the prep page still has the shell's default view underneath it
 * and that used to light Home beside the page you were actually on.
 */
export type RailKey =
  | "home"
  | "analyze"
  | "tailor"
  | "templates"
  | "resumes"
  | "jobs"
  | "refer"
  | "prep"
  | "profile";

export const RAIL_LABELS: Record<RailKey, string> = {
  home: "Home",
  analyze: "Analyze",
  tailor: "Tailor",
  templates: "Templates",
  resumes: "Resumes",
  jobs: "Jobs",
  refer: "Refer",
  prep: "Prep",
  profile: "Profile",
};

/** Spoken name when the visible label is shortened to fit the rail. */
export const RAIL_ARIA: Record<RailKey, string> = {
  home: "Home",
  analyze: "Analyze",
  tailor: "Tailor",
  templates: "Templates",
  resumes: "My Resumes",
  jobs: "Jobs",
  refer: "Referrals",
  prep: "Interview Prep",
  profile: "Profile and usage",
};

export const RAIL_ICONS: Record<RailKey, ReactNode> = {
  home: NAV_ICONS.home,
  analyze: NAV_ICONS.analyze,
  tailor: NAV_ICONS.tailor,
  templates: NAV_ICONS.templates,
  resumes: NAV_ICONS.library,
  jobs: NAV_ICONS.jobs,
  refer: NAV_ICONS.referrals,
  prep: NAV_ICONS.interviewPrep,
  profile: NAV_ICONS.profile,
};

/** Work on the document, in funnel order. */
export const RAIL_DOCUMENT: RailKey[] = ["home", "analyze", "tailor", "templates", "resumes"];

/** Use the document. Jobs drops out entirely while the feed is off. */
export const RAIL_APPLY: RailKey[] = [
  ...(JOBS_ENABLED ? (["jobs"] as RailKey[]) : []),
  "refer",
  "prep",
];

/**
 * Account destinations that are not part of the document funnel. Profile sits
 * here rather than in the account menu alone: the referral desk and the scan
 * usage both live on /profile, and burying the only route to them behind the
 * avatar made the section hard to find.
 */
export const RAIL_ACCOUNT: RailKey[] = ["profile"];

export function activeRailKey(input: {
  active: AppView;
  onTemplateBuilderPage: boolean;
  onInterviewPrepPage: boolean;
  onCareerProfilePage: boolean;
  builderActive: boolean;
  navBuilderSubflow: "tailor" | "template";
}): RailKey | null {
  if (input.onInterviewPrepPage) return "prep";
  if (input.onCareerProfilePage) return "profile";
  if (input.onTemplateBuilderPage) return "templates";
  if (input.builderActive && input.navBuilderSubflow === "template") return "templates";
  if (input.builderActive) return "tailor";
  switch (input.active) {
    case "home":
      return "home";
    case "analyze":
      return "analyze";
    case "library":
      return "resumes";
    case "jobs":
      return "jobs";
    case "profile":
      return "profile";
    default:
      return null;
  }
}
