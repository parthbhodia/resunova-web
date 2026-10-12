"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/BrandLogo";
import { useUpgradeDialog } from "@/components/UpgradeDialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isPublicPath } from "@/components/AuthGate";
import { isPublicAppView } from "@/lib/anonScan";
import { cn } from "@/lib/utils";
import { AppSidebarUser } from "./AppSidebarUser";
import { BugReportDialog } from "./BugReportDialog";
import { NAV_ICONS } from "./nav-icons";
import { ScansRemainingPill } from "./ScansRemainingPill";
import { navShowsCount, useScansRemaining } from "./useScansRemaining";
import {
  RAIL_GROUPS,
  RAIL_ITEM_WIDTH,
  railActiveKey,
  type AppView,
  type RailItem,
  type RailKey,
} from "./nav-config";

/**
 * The desktop nav: one always-on rail, labels visible at rest.
 *
 * There is no expanded state and no Resume Builder drawer. See the note on
 * `RAIL_GROUPS` for why both were removed; the short version is that the
 * drawer is what made Templates unfindable, and the collapse is what made the
 * nav "always shrinked".
 *
 * Mobile is untouched — `AppBottomNav` owns it, and this component is only
 * mounted above the mobile breakpoint.
 */

/**
 * A rail control: a vertical pill, 20px icon over an 11px label.
 *
 * The width reads `--rail-item`, set once on the rail root below, rather than
 * being written as a literal here and again on the two footer buttons. Three
 * copies of one measurement is how a label starts truncating in exactly one
 * place.
 */
const RAIL_ITEM_CLASS =
  "!h-auto !w-(--rail-item) !flex-col !items-center !justify-center !gap-[3px] !rounded-xl " +
  "!px-1 !py-2 !text-[11px] !font-semibold !leading-none " +
  "text-[var(--muted)] hover:!bg-[var(--surface2)] hover:!text-[var(--text)] " +
  "transition-colors duration-[var(--md-duration-short)] ease-[var(--md-easing-standard)] " +
  "[&_svg]:!size-5";

/**
 * Active is a FILLED pill whose ink is `--on-fill`.
 *
 * ⚠️ `--on-fill` rather than a hardcoded `#fff`, and this is exactly the case
 * the token exists for: the fill is `--text`, which is near-BLACK in light and
 * near-WHITE in dark, so one literal foreground is readable in exactly one
 * theme. Measured on the shipped palette: #ffffff on #0f172a is 17.4:1 and
 * #0d1117 on #e6edf3 is 16.8:1, which is what `--on-fill` resolves to in each.
 * `tailorQueueMotion.test.ts` fails the build on the hardcoded pairing.
 */
const RAIL_ACTIVE_CLASS =
  "data-active:!bg-[var(--text)] data-active:!text-[var(--on-fill)] " +
  "data-active:shadow-[var(--md-elevation-2)] " +
  "data-active:hover:!bg-[var(--text)] data-active:hover:!text-[var(--on-fill)]";

/** The hairline between funnel groups. */
function RailDivider() {
  return <div aria-hidden className="my-2 h-px w-8 shrink-0 bg-[var(--border)]" />;
}

export type AppSidebarProps = {
  active: AppView;
  onTemplateBuilderPage: boolean;
  onTemplatesPage: boolean;
  onInterviewPrepPage: boolean;
  onCareerProfilePage?: boolean;
  builderActive: boolean;
  navBuilderSubflow: "tailor" | "template";
  advisorAllowed: boolean;
  isUmbc: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  userInitial: string;
  onHistoryOpen: () => void;
  onSwitchView: (view: AppView) => void;
  onGoBuilderFlow: (flow: "tailor" | "template") => void;
  onSignOut: () => void;
  /** Signed-out free-scan visitor: gated items route to sign-in. */
  anonMode?: boolean;
  onSignIn?: () => void;
};

export function AppSidebar({
  active,
  onTemplateBuilderPage,
  onTemplatesPage,
  onInterviewPrepPage,
  onCareerProfilePage = false,
  builderActive,
  navBuilderSubflow,
  advisorAllowed,
  isUmbc,
  theme,
  onToggleTheme,
  userInitial,
  onHistoryOpen,
  onSwitchView,
  onGoBuilderFlow,
  onSignOut,
  anonMode = false,
  onSignIn,
}: AppSidebarProps) {
  const router = useRouter();
  const { openUpgrade } = useUpgradeDialog();
  const { state: scansState } = useScansRemaining();
  const [bugReportOpen, setBugReportOpen] = React.useState(false);

  const activeKey = railActiveKey({
    active,
    builderActive,
    navBuilderSubflow,
    onTemplatesPage,
    onTemplateBuilderPage,
    onInterviewPrepPage,
    onCareerProfilePage,
  });

  /**
   * A guest click goes to sign-in instead of the destination.
   *
   * Derived from the destination, both halves: a `?view=` against the shared
   * `PUBLIC_APP_VIEWS`, a route against `AuthGate`'s own `isPublicPath`. So a
   * nav click and a pasted URL cannot disagree, which they did on `jobs` when
   * these were two hand-kept lists, and which the shipped sidebar risked twice
   * more with `if (anonMode) onSignIn()` written inline on the builder and
   * interview-prep clicks.
   *
   * An item with neither is treated as gated: a destination nobody declared
   * is one nobody checked.
   */
  const isLocked = (item: RailItem) =>
    anonMode &&
    (item.view ? !isPublicAppView(item.view) : !isPublicPath(item.route ?? ""));

  const destinations: Record<RailKey, () => void> = {
    home: () => onSwitchView("home"),
    analyze: () => onSwitchView("analyze"),
    tailor: () => onGoBuilderFlow("tailor"),
    templates: () => router.push("/templates/"),
    library: () => onSwitchView("library"),
    jobs: () => onSwitchView("jobs"),
    prep: () => router.push("/interview-prep"),
  };

  const go = (item: RailItem) => () => {
    if (isLocked(item)) onSignIn?.();
    else destinations[item.key]();
  };

  /**
   * Upgrade renders only where upgrading means something.
   *
   * Same predicate as the count above it, deliberately: an admin or Pro
   * account seeing "Upgrade" is a dead CTA, and a guest is being asked to
   * sign in, not to pay. ⚠️ This is a DEVIATION from the comp, which draws
   * Upgrade on the dark rail beside no quota pill — that panel exists to show
   * the no-count state, not to rule that a Pro user should be sold to.
   */
  const showUpgrade = navShowsCount(scansState);

  return (
    <Sidebar
      collapsible="none"
      /* h-dvh, not the base `h-full`: the wrapper has min-height only, so a
         percentage height resolves to auto and the rail's background and
         right border stopped at its content — measured 512px of chrome in a
         900px viewport, two thirds of the way down an empty page. */
      className="h-dvh shrink-0 border-r border-sidebar-border"
      style={{ "--rail-item": RAIL_ITEM_WIDTH } as React.CSSProperties}
      aria-label="Main"
    >
      <SidebarHeader className="items-center pt-3 pb-1">
        <button
          type="button"
          className="flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-inherit"
          onClick={go(RAIL_GROUPS[0][0])}
          aria-label="Resunova, go to Home"
        >
          <LogoMark size={34} variant={isUmbc ? "umbc" : "resunova"} />
        </button>
      </SidebarHeader>

      <SidebarContent className="items-center gap-0 overflow-x-hidden">
        {RAIL_GROUPS.map((group, groupIndex) => (
          <React.Fragment key={group.map((i) => i.key).join("-")}>
            {groupIndex > 0 ? <RailDivider /> : null}
            <SidebarGroup className="w-full p-0">
              <SidebarGroupContent>
                <SidebarMenu className="items-center gap-0.5">
                  {group.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={activeKey === item.key}
                        className={cn(RAIL_ITEM_CLASS, RAIL_ACTIVE_CLASS)}
                        onClick={go(item)}
                      >
                        <span aria-hidden>{item.icon}</span>
                        {/* The visible label IS the accessible name. No
                            aria-label and no hover-only tooltip: an icon-only
                            rail item has no name at all for a screen reader,
                            which is the same "nobody sees it" bug #264 fixed
                            by hand on four items. Labels at rest make it
                            structural. */}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </React.Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter className="items-center gap-0 border-t-0 pb-3">
        <SidebarMenu className="items-center gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              className={RAIL_ITEM_CLASS}
              onClick={() => setBugReportOpen(true)}
            >
              <span aria-hidden>{NAV_ICONS.bug}</span>
              <span>Feedback</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <RailDivider />

        {/* The count and the fix for it sit together. */}
        <ScansRemainingPill />

        {showUpgrade ? (
          <button
            type="button"
            onClick={() => openUpgrade()}
            className={cn(
              "mt-1 flex w-(--rail-item) cursor-pointer flex-col items-center justify-center gap-[3px]",
              "rounded-xl border-0 px-1 py-2 text-[11px] leading-none font-bold",
              "bg-[var(--green-bg)] text-[var(--green-ink)]",
              "transition-opacity duration-[var(--md-duration-short)] ease-[var(--md-easing-standard)] hover:opacity-85",
              "[&_svg]:size-[18px]",
            )}
          >
            <span aria-hidden>{NAV_ICONS.upgrade}</span>
            <span>Upgrade</span>
          </button>
        ) : null}

        <div className="mt-2">
          {anonMode ? (
            <button
              type="button"
              onClick={() => onSignIn?.()}
              className={cn(
                "flex w-(--rail-item) cursor-pointer flex-col items-center justify-center gap-[3px]",
                "rounded-xl border-0 px-1 py-2 text-[11px] leading-none font-semibold",
                "bg-[var(--accent-bg)] text-[var(--accent-ink)]",
                "transition-opacity duration-[var(--md-duration-short)] ease-[var(--md-easing-standard)] hover:opacity-85",
                "[&_svg]:size-[18px]",
              )}
            >
              <span aria-hidden>{NAV_ICONS.lock}</span>
              <span>Sign in</span>
            </button>
          ) : (
            <AppSidebarUser
              initial={userInitial}
              theme={theme}
              onToggleTheme={onToggleTheme}
              advisorAllowed={advisorAllowed}
              onProfile={() => router.push("/profile")}
              onMyResumes={() => onSwitchView("library")}
              onCoverLetter={() => onSwitchView("cover-letter")}
              onAdvisor={() => onSwitchView("advisor")}
              onHistory={onHistoryOpen}
              onAccount={() => onSwitchView("account")}
              onSignOut={onSignOut}
            />
          )}
        </div>
      </SidebarFooter>

      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </Sidebar>
  );
}
