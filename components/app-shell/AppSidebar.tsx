"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_ICONS } from "./nav-icons";
import { LogoFull, LogoMark } from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { RN_BUILDER_LAYOUT_ONLY_KEY } from "@/lib/resumeTemplateStudioPrefs";
import { AppSidebarUser } from "./AppSidebarUser";
import { BugReportDialog } from "./BugReportDialog";
import {
  BUILDER_SUBFLOWS,
  NAV_ACTIVE_CLASS,
  NAV_MENU_BTN_CLASS,
  VIEW_BADGES,
  VIEW_ICONS,
  VIEW_LABELS,
  type AppView,
} from "./nav-config";

export type AppSidebarProps = {
  active: AppView;
  onTemplateBuilderPage: boolean;
  onInterviewPrepPage: boolean;
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
  /** Pass a feature label to show a contextual prompt; omit for direct sign-in. */
  onSignIn?: (feature?: string) => void;
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
        tooltip={locked ? `${VIEW_LABELS[view]} — sign in free to use` : VIEW_LABELS[view]}
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

export function AppSidebar({
  active,
  onTemplateBuilderPage,
  onInterviewPrepPage,
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
  /** Locked views send anonymous visitors to sign-in instead of the view. */
  const gated = (view: AppView) => () => {
    if (anonMode) onSignIn?.(VIEW_LABELS[view]);
    else onSwitchView(view);
  };
  const handleBuilderClick = () => {
    if (state === "collapsed") {
      setOpen(true);
      onBuilderOpenChange(true);
      return;
    }
    onBuilderOpenChange(!builderOpen);
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-0">
        <div className={cn(
          "flex w-full items-center gap-2",
          state === "collapsed" ? "justify-center" : "flex-row justify-between",
        )}>
          {state === "collapsed" ? (
            /* In icon rail: logo click expands sidebar — no separate trigger square */
            <button
              type="button"
              className="flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-inherit"
              onClick={() => setOpen(true)}
              title="Expand navigation"
              aria-label="Expand navigation"
            >
              <LogoMark size={30} variant={isUmbc ? "umbc" : "resunova"} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center justify-start border-0 bg-transparent p-0 font-inherit"
                onClick={() => onSwitchView("analyze")}
                aria-label="Resunova — go to Analyze"
              >
                <LogoFull markSize={26} textColor="var(--text)" variant={isUmbc ? "umbc" : "resunova"} />
              </button>
              <SidebarTrigger className="size-10 shrink-0 border border-border bg-[var(--surface2)]" />
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              <NavItem
                view="analyze"
                isActive={!onTemplateBuilderPage && !onInterviewPrepPage && active === "analyze"}
                onClick={() => onSwitchView("analyze")}
                showLabels={showLabels}
              />

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={builderActive && !onInterviewPrepPage}
                  tooltip={VIEW_LABELS.builder}
                  className={cn(NAV_MENU_BTN_CLASS, NAV_ACTIVE_CLASS, "w-full")}
                  onClick={handleBuilderClick}
                >
                  <span className="app-nav-icon" aria-hidden>
                    {VIEW_ICONS.builder}
                  </span>
                  {showLabels ? <span className="app-nav-label">{VIEW_LABELS.builder}</span> : null}
                  {showLabels ? (
                    <ChevronDown
                      className={cn(
                        "ml-auto size-4 opacity-60 transition-transform",
                        builderOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  ) : null}
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
                                  onSignIn?.("Resume Builder");
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

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={onInterviewPrepPage}
                  tooltip="Interview Prep"
                  className={cn(NAV_MENU_BTN_CLASS, NAV_ACTIVE_CLASS)}
                  render={<Link href="/interview-prep" prefetch={false} />}
                >
                  <span className="app-nav-icon" aria-hidden>
                    {NAV_ICONS.interviewPrep}
                  </span>
                  {showLabels ? <span className="app-nav-label">Interview Prep</span> : null}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <NavItem
                view="library"
                isActive={!onTemplateBuilderPage && !onInterviewPrepPage && active === "library"}
                onClick={gated("library")}
                showLabels={showLabels}
                locked={anonMode}
              />
              <NavItem
                view="cover-letter"
                isActive={!onTemplateBuilderPage && !onInterviewPrepPage && active === "cover-letter"}
                onClick={gated("cover-letter")}
                showLabels={showLabels}
                locked={anonMode}
              />
              <NavItem
                view="jobs"
                isActive={!onTemplateBuilderPage && !onInterviewPrepPage && active === "jobs"}
                onClick={gated("jobs")}
                showLabels={showLabels}
                locked={anonMode}
              />
              <NavItem
                view="profile"
                isActive={!onTemplateBuilderPage && !onInterviewPrepPage && active === "profile"}
                onClick={gated("profile")}
                showLabels={showLabels}
                locked={anonMode}
              />
              {advisorAllowed ? (
                <NavItem
                  view="advisor"
                  isActive={!onTemplateBuilderPage && !onInterviewPrepPage && active === "advisor"}
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
              tooltip="Contact"
              className={NAV_MENU_BTN_CLASS}
              render={<Link href="/contact" prefetch={false} />}
            >
              <span className="app-nav-icon" aria-hidden>
                {NAV_ICONS.contact}
              </span>
              {showLabels ? <span className="app-nav-label">Contact</span> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Report a bug"
              className={NAV_MENU_BTN_CLASS}
              onClick={() => setBugReportOpen(true)}
            >
              <span className="app-nav-icon" aria-hidden>
                {NAV_ICONS.bug}
              </span>
              {showLabels ? <span className="app-nav-label">Report a bug</span> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            {anonMode ? (
              <SidebarMenuButton
                tooltip="Sign in free — save reports, unlock all features"
                className={cn(NAV_MENU_BTN_CLASS, "!text-accent font-semibold")}
                onClick={() => onSignIn?.()}
              >
                <span className="app-nav-icon" aria-hidden>
                  {NAV_ICONS.lock}
                </span>
                {showLabels ? <span className="app-nav-label">Sign in — free</span> : null}
              </SidebarMenuButton>
            ) : (
              <AppSidebarUser
                initial={userInitial}
                onProfile={() => onSwitchView("profile")}
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
