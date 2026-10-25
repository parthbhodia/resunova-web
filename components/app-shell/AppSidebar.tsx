"use client";

/**
 * Desktop nav rail.
 *
 * One width, labels visible at rest, one destination lit. The old sidebar
 * could expand or collapse, and navigation itself collapsed it, which is why
 * the rail always came back shrunk. There is no second state to get stuck in.
 *
 * Order is the product funnel: work on the document (Home, Analyze, Tailor,
 * Templates, Resumes), then use it (Jobs, Refer, Prep), then Feedback. Profile
 * is a utility row rather than account-menu-only: the referral desk and scan
 * usage both live there, and the avatar was the only route. Cover letter,
 * History, theme, Contact and Advisor live in the account menu. Nothing is
 * removed. The mobile bottom bar is a separate component and is not this rail.
 *
 * Stays on the shadcn sidebar primitive. New chrome elsewhere goes to MUI, and
 * the shell is still on the "to migrate" side of that table. Converting
 * SidebarProvider here would put an Emotion runtime on every page.
 */

import React from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/BrandLogo";
import { useUpgradeDialog } from "@/components/UpgradeDialog";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { isPublicAppView } from "@/lib/anonScan";
import { isPublicPath } from "@/components/AuthGate";
import { FS, FW, LH } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { AppSidebarUser } from "./AppSidebarUser";
import { BugReportDialog } from "./BugReportDialog";
import { NAV_ICONS } from "./nav-icons";
import { RailQuota } from "./ScansRemainingPill";
import { accountHasQuota, useScansRemaining } from "./useScansRemaining";
import {
  RAIL_ACCOUNT,
  RAIL_APPLY,
  RAIL_ARIA,
  RAIL_DOCUMENT,
  RAIL_ICONS,
  RAIL_LABELS,
  activeRailKey,
  type AppView,
  type RailKey,
} from "./nav-config";

export type AppSidebarProps = {
  active: AppView;
  onTemplateBuilderPage: boolean;
  onInterviewPrepPage: boolean;
  onCareerProfilePage?: boolean;
  builderActive: boolean;
  navBuilderSubflow: "tailor" | "template";
  advisorAllowed: boolean;
  isUmbc: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  userInitial: string;
  onHistoryOpenChange: (open: boolean) => void;
  onSwitchView: (view: AppView) => void;
  onGoBuilderFlow: (flow: "tailor" | "template") => void;
  onSignOut: () => void;
  /** Signed-out visitor: locked destinations open the shared sign-in modal. */
  anonMode?: boolean;
  onSignIn?: () => void;
};

const ITEM_MOTION =
  "transition-[background-color,color,box-shadow] duration-[var(--md-duration-medium)] ease-[var(--md-easing-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function RailButton({
  railKey,
  active,
  locked,
  onClick,
}: {
  railKey: RailKey;
  active: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const spoken = locked ? `${RAIL_ARIA[railKey]}, sign in to use` : RAIL_ARIA[railKey];
  return (
    <button
      type="button"
      data-rail={railKey}
      data-active={active ? "" : undefined}
      aria-current={active ? "page" : undefined}
      aria-label={spoken}
      onClick={onClick}
      className={cn(
        "flex w-full min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border-0 bg-transparent px-1 py-1.5 font-inherit",
        ITEM_MOTION,
        active
          ? "bg-[var(--text)] text-[var(--bg)] shadow-[var(--md-elevation-2)]"
          : "md-state-layer text-[var(--muted)]",
      )}
    >
      <span className="[&_svg]:size-5" aria-hidden>
        {RAIL_ICONS[railKey]}
      </span>
      <span style={{ fontSize: FS.caption, fontWeight: FW.semibold, lineHeight: LH.tight }}>
        {RAIL_LABELS[railKey]}
      </span>
    </button>
  );
}

function RailRule() {
  return <div aria-hidden className="mx-auto my-1.5 h-px w-8 bg-[var(--border)]" />;
}

export function AppSidebar({
  active,
  onTemplateBuilderPage,
  onInterviewPrepPage,
  onCareerProfilePage = false,
  builderActive,
  navBuilderSubflow,
  advisorAllowed,
  isUmbc,
  theme,
  onToggleTheme,
  userInitial,
  onHistoryOpenChange,
  onSwitchView,
  onGoBuilderFlow,
  onSignOut,
  anonMode = false,
  onSignIn,
}: AppSidebarProps) {
  const router = useRouter();
  const { openUpgrade } = useUpgradeDialog();
  const { state: scans } = useScansRemaining();
  const [bugReportOpen, setBugReportOpen] = React.useState(false);

  const lit = activeRailKey({
    active,
    onTemplateBuilderPage,
    onInterviewPrepPage,
    onCareerProfilePage,
    builderActive,
    navBuilderSubflow,
  });

  const viewLocked = (view: AppView) => anonMode && !isPublicAppView(view);
  const pathLocked = (path: string) => anonMode && !isPublicPath(path);

  const goView = (view: AppView) => {
    if (viewLocked(view)) onSignIn?.();
    else onSwitchView(view);
  };

  const goPath = (path: string, locked: boolean) => {
    if (locked) onSignIn?.();
    else {
      router.push(path);
      onHistoryOpenChange(false);
    }
  };

  const onRail = (key: RailKey) => {
    switch (key) {
      case "home":
        goView("home");
        break;
      case "analyze":
        goView("analyze");
        break;
      case "tailor":
        if (pathLocked("/tailor-2")) onSignIn?.();
        else onGoBuilderFlow("tailor");
        break;
      case "templates":
        goPath("/templates/", false);
        break;
      case "resumes":
        goView("library");
        break;
      case "jobs":
        goView("jobs");
        break;
      case "refer":
        // Public marketing route (like Templates). No sign-in gate on the click.
        goPath("/refer/", false);
        break;
      case "prep":
        goPath("/interview-prep", pathLocked("/interview-prep"));
        break;
      case "profile":
        goPath("/profile", pathLocked("/profile"));
        break;
    }
  };

  const applyLocked = (key: RailKey) => {
    if (key === "jobs") return viewLocked("jobs");
    if (key === "refer") return false;
    return pathLocked("/interview-prep");
  };

  const showUpgrade = accountHasQuota(scans);

  return (
    <Sidebar collapsible="none" className="!h-dvh shrink-0 border-r border-sidebar-border">
      <SidebarHeader className="items-center p-2 pb-1">
        <button
          type="button"
          className={cn(
            "md-state-layer flex size-[44px] items-center justify-center rounded-xl border-0 bg-transparent p-0",
            ITEM_MOTION,
          )}
          onClick={() => onSwitchView("home")}
          aria-label="Resunova, go to Home"
        >
          <LogoMark size={32} variant={isUmbc ? "umbc" : "resunova"} />
        </button>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-y-auto px-1.5">
        <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-0.5">
            {RAIL_DOCUMENT.map((key) => (
              <RailButton
                key={key}
                railKey={key}
                active={lit === key}
                locked={
                  key === "tailor"
                    ? pathLocked("/tailor-2")
                    : key === "templates"
                      ? false
                      : key === "home"
                        ? viewLocked("home")
                        : key === "analyze"
                          ? viewLocked("analyze")
                          : viewLocked("library")
                }
                onClick={() => onRail(key)}
              />
            ))}
          </div>

          <RailRule />

          <div className="flex flex-col gap-0.5">
            {RAIL_APPLY.map((key) => (
              <RailButton
                key={key}
                railKey={key}
                active={lit === key}
                locked={applyLocked(key)}
                onClick={() => onRail(key)}
              />
            ))}
          </div>

          <RailRule />

          <div className="flex flex-col gap-0.5">
            {RAIL_ACCOUNT.map((key) => (
              <RailButton
                key={key}
                railKey={key}
                active={lit === key}
                locked={pathLocked("/profile")}
                onClick={() => onRail(key)}
              />
            ))}
          </div>

          <div className="min-h-2 flex-1" />

          <button
            type="button"
            data-rail="feedback"
            className={cn(
              "md-state-layer flex w-full min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border-0 bg-transparent px-1 py-1.5 font-inherit text-[var(--muted)]",
              ITEM_MOTION,
            )}
            onClick={() => setBugReportOpen(true)}
          >
            <span className="[&_svg]:size-5" aria-hidden>
              {NAV_ICONS.bug}
            </span>
            <span style={{ fontSize: FS.caption, fontWeight: FW.semibold, lineHeight: LH.tight }}>
              Feedback
            </span>
          </button>
        </nav>
      </SidebarContent>

      <SidebarFooter className="items-center gap-1.5 border-t-0 p-2 pt-0">
        <RailRule />
        <RailQuota />
        {showUpgrade ? (
          <button
            type="button"
            onClick={() => openUpgrade()}
            className={cn(
              "md-state-layer flex w-full min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border-0 px-1 py-1.5 font-inherit",
              ITEM_MOTION,
            )}
            style={{ background: "var(--green-bg)", color: "var(--green-ink)" }}
          >
            <span className="[&_svg]:size-5" aria-hidden>
              {NAV_ICONS.upgrade}
            </span>
            <span style={{ fontSize: FS.caption, fontWeight: FW.bold, lineHeight: LH.tight }}>
              Upgrade
            </span>
          </button>
        ) : null}
        <AppSidebarUser
          initial={userInitial}
          anonMode={anonMode}
          advisorAllowed={advisorAllowed}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onSignIn={onSignIn}
          onProfile={() => router.push("/profile")}
          onMyResumes={() => goView("library")}
          onCoverLetter={() => goView("cover-letter")}
          onHistory={() => {
            if (anonMode) onSignIn?.();
            else onHistoryOpenChange(true);
          }}
          onAdvisor={() => goView("advisor")}
          onAccount={() => goView("account")}
          onSignOut={onSignOut}
        />
      </SidebarFooter>
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </Sidebar>
  );
}
