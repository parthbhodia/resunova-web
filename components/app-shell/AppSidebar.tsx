"use client";

import { JOBS_ENABLED } from "@/lib/featureFlags";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_ICONS } from "./nav-icons";
import { LogoFull, LogoMark } from "@/components/BrandLogo";
import { ScansRemainingPill } from "./ScansRemainingPill";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { isPublicAppView } from "@/lib/anonScan";
import { RN_BUILDER_LAYOUT_ONLY_KEY } from "@/lib/resumeTemplateStudioPrefs";
import { AppSidebarUser } from "./AppSidebarUser";
import { BugReportDialog } from "./BugReportDialog";
import {
  BUILDER_SUBFLOWS,
  NAV_ACTIVE_CLASS,
  NAV_MENU_BTN_CLASS,
  VIEW_BADGES,
  VIEW_DESCRIPTIONS,
  VIEW_ICONS,
  VIEW_LABELS,
  type AppView,
} from "./nav-config";

/** Icon chip for the three hero nav items; accent-tinted when its row is active. */
const HERO_BTN_CLASS = "!h-auto w-full !items-start !gap-2.5 !px-2.5 !py-2";

function NavIconChip({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors [&_svg]:size-[17px]",
        isActive
          ? "bg-[color-mix(in_srgb,var(--accent)_22%,var(--surface))] text-accent"
          : "bg-[var(--surface3)] text-[var(--muted)]",
      )}
    >
      {children}
    </span>
  );
}

export type AppSidebarProps = {
  active: AppView;
  onTemplateBuilderPage: boolean;
  onTemplatesPage: boolean;
  onInterviewPrepPage: boolean;
  onCareerProfilePage?: boolean;
  builderActive: boolean;
  builderOpen: boolean;
  onBuilderOpenChange: (open: boolean) => void;
  navBuilderSubflow: "tailor" | "template";
  advisorAllowed: boolean;
  isUmbc: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  userInitial: string;
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  onSwitchView: (view: AppView) => void;
  onGoBuilderFlow: (flow: "tailor" | "template") => void;
  onSignOut: () => void;
  /** Signed-out free-scan visitor: locked views route to sign-in. */
  anonMode?: boolean;
  onSignIn?: () => void;
};

function NavItem({
  view,
  isActive,
  onClick,
  showLabels,
  locked,
}: {
  view: AppView;
  isActive: boolean;
  onClick?: () => void;
  showLabels: boolean;
  /** Render a "Sign in" badge; onClick is expected to start sign-in. */
  locked?: boolean;
}) {
  // Locked views show a lock icon (instead of a "Sign in" text badge); other
  // views may carry a short text badge (e.g. "NEW").
  const textBadge = locked ? null : VIEW_BADGES[view];
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={locked ? `${VIEW_LABELS[view]}: sign in free to use` : VIEW_LABELS[view]}
        className={cn(NAV_MENU_BTN_CLASS, NAV_ACTIVE_CLASS)}
        onClick={onClick}
      >
        <span className="app-nav-icon" aria-hidden>
          {VIEW_ICONS[view]}
        </span>
        {showLabels ? <span className="app-nav-label">{VIEW_LABELS[view]}</span> : null}
        {showLabels && locked ? (
          <Badge
            variant="secondary"
            aria-label="Sign in to use"
            className="ml-auto flex items-center justify-center px-1.5 py-0 bg-[var(--accent-bg)] text-accent [&>svg]:size-3"
          >
            {NAV_ICONS.lock}
          </Badge>
        ) : showLabels && textBadge ? (
          <Badge
            variant="secondary"
            className="ml-auto px-1.5 py-0 text-[9px] font-bold tracking-wide uppercase"
          >
            {textBadge}
          </Badge>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** Home/Analyze/Builder: icon chip + title + one-line description. Collapses to a plain NavItem in the icon rail, matching every other row. */
function HeroNavItem({
  view,
  isActive,
  onClick,
  showLabels,
  locked,
}: {
  view: AppView;
  isActive: boolean;
  onClick?: () => void;
  showLabels: boolean;
  locked?: boolean;
}) {
  if (!showLabels) {
    return <NavItem view={view} isActive={isActive} onClick={onClick} showLabels={showLabels} locked={locked} />;
  }
  const textBadge = locked ? null : VIEW_BADGES[view];
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        className={cn(HERO_BTN_CLASS, NAV_ACTIVE_CLASS)}
        onClick={onClick}
      >
        <NavIconChip isActive={isActive}>{VIEW_ICONS[view]}</NavIconChip>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm leading-tight font-semibold">
            <span className={cn(isActive && "text-accent")}>{VIEW_LABELS[view]}</span>
            {locked ? (
              <Badge
                variant="secondary"
                aria-label="Sign in to use"
                className="ml-auto flex items-center justify-center px-1.5 py-0 bg-[var(--accent-bg)] text-accent [&>svg]:size-3"
              >
                {NAV_ICONS.lock}
              </Badge>
            ) : textBadge ? (
              <Badge
                variant="secondary"
                className="ml-auto px-1.5 py-0 text-[9px] font-bold tracking-wide uppercase"
              >
                {textBadge}
              </Badge>
            ) : null}
          </span>
          <span className="text-xs leading-snug text-muted-foreground">{VIEW_DESCRIPTIONS[view]}</span>
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  active,
  onTemplateBuilderPage,
  onTemplatesPage,
  onInterviewPrepPage,
  onCareerProfilePage = false,
  builderActive,
  builderOpen,
  onBuilderOpenChange,
  navBuilderSubflow,
  advisorAllowed,
  isUmbc,
  theme,
  onToggleTheme,
  userInitial,
  historyOpen,
  onHistoryOpenChange,
  onSwitchView,
  onGoBuilderFlow,
  onSignOut,
  anonMode = false,
  onSignIn,
}: AppSidebarProps) {
  const router = useRouter();
  const { state, setOpen } = useSidebar();
  const showLabels = state === "expanded";
  const [bugReportOpen, setBugReportOpen] = React.useState(false);
  /**
   * Views a signed-out visitor may not use send them to sign-in instead.
   * Membership comes from the shared PUBLIC_APP_VIEWS so a click and a pasted
   * URL always agree — they used to be separate lists and disagreed on `jobs`.
   */
  const isLocked = (view: AppView) => anonMode && !isPublicAppView(view);
  const gated = (view: AppView) => () => {
    if (isLocked(view)) onSignIn?.();
    else onSwitchView(view);
  };
  const handleBuilderClick = () => {
    if (state === "collapsed") {
      // One click = the primary destination, like every other rail icon.
      // This used to expand the sidebar and open the drawer instead, which
      // reads as a dead click (field: "it is not clicking the tailor icon
      // properly") — the icon promises Tailor, so it goes to Tailor. The
      // drawer's second entry (Template Builder) is reachable after
      // expanding via the rail's own trigger.
      if (anonMode) {
        onSignIn?.();
        return;
      }
      onGoBuilderFlow("tailor");
      return;
    }
    onBuilderOpenChange(!builderOpen);
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-0">
        <div className={cn(
          "flex w-full items-center gap-2",
          state === "collapsed" ? "flex-col justify-center" : "flex-row justify-between",
        )}>
          {state === "collapsed" ? (
            /* In the icon rail the trigger stays VISIBLE. The first version
               made the logo the only expand control, and a logo does not
               read as a control — the field report was "the hamburger icon
               disappears", i.e. the user was stuck collapsed. Logo-click
               still expands as a bonus; the trigger is the findable way. */
            <>
              <button
                type="button"
                className="flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-inherit"
                onClick={() => setOpen(true)}
                title="Expand navigation"
                aria-label="Expand navigation"
              >
                <LogoMark size={30} variant={isUmbc ? "umbc" : "resunova"} />
              </button>
              <SidebarTrigger className="size-8 shrink-0 border border-border bg-[var(--surface2)]" />
            </>
          ) : (
            <>
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center justify-start border-0 bg-transparent p-0 font-inherit"
                onClick={() => onSwitchView("home")}
                aria-label="Resunova, go to Home"
              >
                <LogoFull markSize={26} textColor="var(--text)" variant={isUmbc ? "umbc" : "resunova"} />
              </button>
              <SidebarTrigger className="size-10 shrink-0 border border-border bg-[var(--surface2)]" />
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScansRemainingPill collapsed={state === "collapsed"} />
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
              <HeroNavItem
                view="home"
                isActive={!onTemplateBuilderPage && !onTemplatesPage && !onInterviewPrepPage && !onCareerProfilePage && active === "home"}
                onClick={gated("home")}
                showLabels={showLabels}
                locked={anonMode}
              />
              <HeroNavItem
                view="analyze"
                isActive={!onTemplateBuilderPage && !onTemplatesPage && !onInterviewPrepPage && !onCareerProfilePage && active === "analyze"}
                onClick={() => onSwitchView("analyze")}
                showLabels={showLabels}
              />

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={builderActive && !onInterviewPrepPage}
                  tooltip={VIEW_LABELS.builder}
                  // Collapsed, the icon is aria-hidden and the tooltip only
                  // appears on hover — without this the button has NO
                  // accessible name in the rail.
                  aria-label={VIEW_LABELS.builder}
                  className={cn(showLabels ? HERO_BTN_CLASS : NAV_MENU_BTN_CLASS, NAV_ACTIVE_CLASS)}
                  onClick={handleBuilderClick}
                >
                  {showLabels ? (
                    <>
                      <NavIconChip isActive={builderActive && !onInterviewPrepPage}>
                        {VIEW_ICONS.builder}
                      </NavIconChip>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 text-sm leading-tight font-semibold">
                          <span className={cn(builderActive && !onInterviewPrepPage && "text-accent")}>
                            {VIEW_LABELS.builder}
                          </span>
                          <ChevronDown
                            className={cn(
                              "ml-auto size-4 shrink-0 opacity-60 transition-transform",
                              builderOpen && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </span>
                        <span className="text-xs leading-snug text-muted-foreground">
                          {VIEW_DESCRIPTIONS.builder}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="app-nav-icon" aria-hidden>
                      {VIEW_ICONS.builder}
                    </span>
                  )}
                </SidebarMenuButton>
                {showLabels ? (
                <Collapsible open={builderOpen} onOpenChange={onBuilderOpenChange}>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {BUILDER_SUBFLOWS.map(({ key, label, icon }) => {
                        const subActive = builderActive && navBuilderSubflow === key;
                        return (
                          <SidebarMenuSubItem key={key}>
                            <SidebarMenuSubButton
                              isActive={subActive}
                              className={cn(NAV_MENU_BTN_CLASS, NAV_ACTIVE_CLASS, "[&_svg]:!size-auto")}
                              render={<button type="button" />}
                              onClick={() => {
                                if (key === "template") {
                                  // Template Builder is public — no sign-in gate.
                                  router.push("/template-builder/");
                                  onHistoryOpenChange(false);
                                  onBuilderOpenChange(false);
                                  return;
                                }
                                if (anonMode) {
                                  onSignIn?.();
                                  return;
                                }
                                onGoBuilderFlow(key);
                              }}
                            >
                              <span className="app-nav-icon" aria-hidden>
                                {icon}
                              </span>
                              <span className="app-nav-label">{label}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
                ) : null}
              </SidebarMenuItem>
              {/* Templates is top-level on purpose: it lived only inside the
                  drawer above, two clicks deep and invisible at rest, and
                  users reported they could not find the templates at all.
                  Public like the builder itself, so no sign-in gate. */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={onTemplatesPage}
                  tooltip="Templates"
                  aria-label="Templates"
                  className={cn(NAV_MENU_BTN_CLASS, NAV_ACTIVE_CLASS)}
                  onClick={() => {
                    router.push("/templates/");
                    onHistoryOpenChange(false);
                  }}
                >
                  <span className="app-nav-icon" aria-hidden>
                    {NAV_ICONS.templates}
                  </span>
                  {showLabels ? <span className="app-nav-label">Templates</span> : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0 pt-1">
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              <NavItem
                view="library"
                isActive={!onTemplateBuilderPage && !onTemplatesPage && !onInterviewPrepPage && !onCareerProfilePage && active === "library"}
                onClick={gated("library")}
                showLabels={showLabels}
                locked={isLocked("library")}
              />
              <NavItem
                view="cover-letter"
                isActive={!onTemplateBuilderPage && !onTemplatesPage && !onInterviewPrepPage && !onCareerProfilePage && active === "cover-letter"}
                onClick={gated("cover-letter")}
                showLabels={showLabels}
                locked={isLocked("cover-letter")}
              />
              {JOBS_ENABLED && (
                <NavItem
                  view="jobs"
                  isActive={!onTemplateBuilderPage && !onTemplatesPage && !onInterviewPrepPage && !onCareerProfilePage && active === "jobs"}
                  onClick={gated("jobs")}
                  showLabels={showLabels}
                  locked={isLocked("jobs")}
                />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0 pt-1">
          <SidebarGroupLabel>Coaching</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={onInterviewPrepPage}
                  tooltip="Interview Prep"
                  className={cn(NAV_MENU_BTN_CLASS, NAV_ACTIVE_CLASS)}
                  onClick={() => { if (anonMode) onSignIn?.(); else router.push("/interview-prep"); }}
                >
                  <span className="app-nav-icon" aria-hidden>
                    {NAV_ICONS.interviewPrep}
                  </span>
                  {showLabels ? <span className="app-nav-label">Interview Prep</span> : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {advisorAllowed ? (
                <NavItem
                  view="advisor"
                  isActive={!onTemplateBuilderPage && !onTemplatesPage && !onInterviewPrepPage && !onCareerProfilePage && active === "advisor"}
                  onClick={() => onSwitchView("advisor")}
                  showLabels={showLabels}
                />
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={historyOpen}
              tooltip="History"
              className={cn(NAV_MENU_BTN_CLASS, NAV_ACTIVE_CLASS)}
              onClick={() => onHistoryOpenChange(!historyOpen)}
            >
              <span className="app-nav-icon" aria-hidden>
                {NAV_ICONS.history}
              </span>
              {showLabels ? <span className="app-nav-label">History</span> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
              className={NAV_MENU_BTN_CLASS}
              onClick={onToggleTheme}
            >
              <span className="app-nav-icon" aria-hidden>
                {theme === "dark" ? NAV_ICONS.themeDark : NAV_ICONS.themeLight}
              </span>
              {showLabels ? <span className="app-nav-label">Theme</span> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Feedback"
              className={NAV_MENU_BTN_CLASS}
              onClick={() => setBugReportOpen(true)}
            >
              <span className="app-nav-icon" aria-hidden>
                {NAV_ICONS.bug}
              </span>
              {showLabels ? <span className="app-nav-label">Feedback</span> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            {anonMode ? (
              <SidebarMenuButton
                tooltip="Sign in free to save reports and unlock all features"
                className={cn(NAV_MENU_BTN_CLASS, "!text-accent font-semibold")}
                onClick={() => onSignIn?.()}
              >
                <span className="app-nav-icon" aria-hidden>
                  {NAV_ICONS.lock}
                </span>
                {showLabels ? <span className="app-nav-label">Sign in, free</span> : null}
              </SidebarMenuButton>
            ) : (
              <AppSidebarUser
                initial={userInitial}
                onProfile={() => router.push("/profile")}
                onMyResumes={() => onSwitchView("library")}
                onAccount={() => onSwitchView("account")}
                onSignOut={onSignOut}
              />
            )}
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="mx-0 group-data-[collapsible=icon]:hidden" />
        <nav className="flex flex-wrap gap-2.5 px-2 text-[11px] group-data-[collapsible=icon]:hidden">
          <Link
            href="/terms"
            prefetch={false}
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            prefetch={false}
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/contact"
            prefetch={false}
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Contact
          </Link>
        </nav>
        <p className="px-2 pb-1 text-[10px] tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
          © 2026 Resunova
        </p>
      </SidebarFooter>
      <SidebarRail />
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </Sidebar>
  );
}
