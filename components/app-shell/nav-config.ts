import type { ReactNode } from "react";
import { BUILDER_SUBFLOW_ICONS, NAV_ICONS } from "./nav-icons";

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

export const BUILDER_SUBFLOWS = [
  { key: "tailor" as const, label: "Tailor to a job", icon: BUILDER_SUBFLOW_ICONS.tailor },
  { key: "template" as const, label: "Template Builder", icon: BUILDER_SUBFLOW_ICONS.template },
];

// Mobile bottom bar: 4 primary tabs + the "More" button = 5 slots (the platform
// max). Profile is intentionally NOT here — it's reachable from the top-bar
// account avatar and the More sheet, which frees a slot and removes redundancy.
export const MOBILE_TAB_VIEWS: AppView[] = [
  "home",
  "analyze",
  "jobs",
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

/** Wrapper + menu button: original muted icons, accent when active. */
export const NAV_MENU_BTN_CLASS =
  "!gap-2.5 !px-3 !py-2.5 text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] [&_.app-nav-icon_svg]:!size-5";

export const NAV_ACTIVE_CLASS =
  "data-active:!border-accent/35 data-active:!bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] data-active:!text-accent data-active:shadow-[inset_3px_0_0_0_var(--accent)] data-active:hover:!bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface))] data-active:hover:!text-accent data-active:[&_.app-nav-icon]:opacity-100 data-active:[&_.app-nav-icon]:text-accent";

export const SIDEBAR_COLLAPSED_KEY = "rn-app-sidebar-collapsed";

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}
