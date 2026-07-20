"use client";

/**
 * AppShell — persistent left sidebar (desktop / tablet) + mobile bottom tab bar.
 * Design reference: docs/PRODUCT_DESIGN.md (Linear × Notion × career coach).
 */

import { useEffect, useState, useCallback, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { UmbcProvider } from "@/contexts/UmbcContext";
import { signOutAndReturnHome } from "@/lib/authSignOut";
import { POST_LOGIN_DEST_KEY } from "@/lib/anonScan";
import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/utils";
import { isUmbcUser } from "@/lib/userDomainDetection";
import ResumeSidebar from "./ResumeSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { RN_BUILDER_LAYOUT_ONLY_KEY } from "@/lib/resumeTemplateStudioPrefs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./app-shell/AppSidebar";
import { AppBottomNav } from "./app-shell/AppBottomNav";
import { BugReportDialog } from "./app-shell/BugReportDialog";
import { AppShellSidebarBridge } from "./app-shell/AppShellSidebarBridge";
import { FreeScanWelcomeBanner } from "./FreeScanWelcomeBanner";
import { SignInDialogProvider, useSignInDialog } from "./SignInDialog";
import { UpgradeDialogProvider } from "./UpgradeDialog";
import FirstRunWizard from "./FirstRunWizard";
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
  type AppView,
} from "./app-shell/nav-config";

export type { AppView } from "./app-shell/nav-config";

type Theme = "dark" | "light";

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("rn-theme") as Theme | null) || "light";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("rn-theme", next);
      applyTheme(next);
      return next;
    });
  }, []);

  return [theme, toggle];
}

function readBuilderLayoutOnlyFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(RN_BUILDER_LAYOUT_ONLY_KEY) === "1";
  } catch {
    return false;
  }
}

export function useAppView(): AppView {
  const params = useSearchParams();
  // Signed-in users land on the Home hub by default; the anonymous free-scan
  // funnel always arrives with an explicit ?view=analyze (see AuthGate), so
  // defaulting the bare "/" to home never affects signed-out visitors.
  const raw = (params?.get("view") || "home").toLowerCase();
  const valid: AppView[] = [
    "home",
    "builder",
    "library",
    "analyze",
    "profile",
    "jobs",
    "cover-letter",
    "advisor",
    "account",
  ];
  return valid.includes(raw as AppView) ? (raw as AppView) : "home";
}

function AppShellBody({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openSignIn } = useSignInDialog();
  const active = useAppView();
  const onTemplateBuilderPage =
    (pathname ?? "").replace(/\/$/, "") === "/template-builder";
  const onInterviewPrepPage =
    (pathname ?? "").replace(/\/$/, "") === "/interview-prep";
  const onCareerProfilePage =
    (pathname ?? "").replace(/\/$/, "") === "/profile";
  const isMobile = useIsMobile();
  const flowRaw = (searchParams?.get("flow") || "tailor").toLowerCase();
  const builderFlow: "tailor" | "template" =
    flowRaw === "template" ? "template" : "tailor";
  const [layoutOnlyForNav, setLayoutOnlyForNav] = useState(readBuilderLayoutOnlyFlag);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isUmbc, setIsUmbc] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [advisorAllowed, setAdvisorAllowed] = useState(false);
  const [mobileBugReportOpen, setMobileBugReportOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(!readSidebarCollapsed());
  }, []);

  const handleSidebarOpenChange = useCallback((open: boolean) => {
    setSidebarOpen(open);
    writeSidebarCollapsed(!open);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const syncAdvisorAccess = async (accessToken?: string | null) => {
      if (!accessToken) {
        setAdvisorAllowed(false);
        return;
      }
      try {
        const resp = await fetch(apiUrl("/api/advisor-access"), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) {
          setAdvisorAllowed(false);
          return;
        }
        const json = (await resp.json()) as { allowed?: boolean };
        setAdvisorAllowed(json.allowed === true);
      } catch {
        setAdvisorAllowed(false);
      }
    };

    const syncInstitutionStudent = async (
      email?: string | null,
      accessToken?: string | null,
    ) => {
      if (!accessToken) return;
      if (!isUmbcUser(email)) return;
      try {
        await fetch(apiUrl("/api/sync-institution-student"), {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch {
        // Best-effort sync only; never block shell render/auth UX.
      }
    };

    // Warm the jobs feed (data + its JS chunk) as soon as a signed-in session is
    // known, so the Jobs tab opens instantly instead of fetching on first open.
    // Dynamic import keeps the heavy JobsFeed module out of the shell bundle.
    const warmJobsFeed = (accessToken?: string | null) => {
      if (!accessToken) return;
      void import("@/components/JobsFeed").then((m) => m.prefetchJobsFeed()).catch(() => {});
    };

    // After OAuth, send the user back to where they started sign-in (e.g.
    // ?view=jobs → the jobs onboarding wizard) instead of the default Analyze
    // view. One-shot (atomic read+remove so it never hijacks later "/" visits),
    // and only when we landed without an explicit view (Supabase dropped the
    // query back to the bare origin). See signInWithGoogle in lib/anonScan.
    const restorePostLoginDest = () => {
      if (typeof window === "undefined") return;
      let dest: string | null = null;
      try {
        dest = window.localStorage.getItem(POST_LOGIN_DEST_KEY);
        if (dest) window.localStorage.removeItem(POST_LOGIN_DEST_KEY);
      } catch {
        return;
      }
      if (!dest) return;
      try {
        const here = window.location.pathname + window.location.search;
        if (dest !== here) router.replace(dest);
      } catch {
        /* ignore */
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      setAuthChecked(true);
      setIsUmbc(isUmbcUser(currentUser?.email));
      void syncAdvisorAccess(data.session?.access_token);
      void syncInstitutionStudent(currentUser?.email, data.session?.access_token);
      warmJobsFeed(data.session?.access_token);
      if (currentUser) restorePostLoginDest();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_ev, s) => {
      const currentUser = s?.user ?? null;
      setUser(currentUser);
      setIsUmbc(isUmbcUser(currentUser?.email));
      void syncAdvisorAccess(s?.access_token);
      void syncInstitutionStudent(currentUser?.email, s?.access_token);
      if (_ev === "SIGNED_IN") {
        warmJobsFeed(s?.access_token);
        restorePostLoginDest();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setBuilderOpen(active === "builder" || onTemplateBuilderPage);
  }, [active, onTemplateBuilderPage]);

  useEffect(() => {
    setLayoutOnlyForNav(readBuilderLayoutOnlyFlag());
  }, [searchParams?.toString(), active]);

  const switchView = (next: AppView) => {
    router.push(`/?view=${next}`);
    setHistoryOpen(false);
    setBuilderOpen(false);
  };

  const goBuilderFlow = (flow: "tailor" | "template") => {
    if (flow === "tailor") {
      try {
        sessionStorage.removeItem(RN_BUILDER_LAYOUT_ONLY_KEY);
      } catch {
        /* ignore */
      }
    }
    const intent = flow === "tailor" ? "&intent=job" : "";
    router.push(`/?view=builder&flow=${flow}${intent}`);
    setHistoryOpen(false);
    setBuilderOpen(false);
  };

  const onSignOut = () => {
    void signOutAndReturnHome();
  };

  // Anonymous free-scan visitor (AuthGate let them in via /?view=analyze):
  // locked nav items open the one shared sign-in modal instead of their views.
  const anonMode = authChecked && !user;
  const onSignIn = () => openSignIn();

  const initial = (user?.email || "?").charAt(0).toUpperCase();
  const builderActive = active === "builder" || onTemplateBuilderPage;
  const navBuilderSubflow: "tailor" | "template" = onTemplateBuilderPage
    ? "template"
    : builderActive && builderFlow === "tailor" && layoutOnlyForNav
      ? "template"
      : builderFlow;

  return (
    <UmbcProvider isUmbc={isUmbc}>
      <TooltipProvider delay={0}>
        <SidebarProvider
          open={sidebarOpen}
          onOpenChange={handleSidebarOpenChange}
          defaultOpen={!readSidebarCollapsed()}
          className="app-shell-root min-h-dvh max-h-dvh overflow-hidden bg-background"
          style={
            {
              "--sidebar-width": "14.5rem",
              "--sidebar-width-icon": "5.25rem",
            } as CSSProperties
          }
        >
          <AppShellSidebarBridge>
            {!isMobile && (
              <AppSidebar
                active={active}
                onTemplateBuilderPage={onTemplateBuilderPage}
                onInterviewPrepPage={onInterviewPrepPage}
                onCareerProfilePage={onCareerProfilePage}
                builderActive={builderActive}
                builderOpen={builderOpen}
                onBuilderOpenChange={setBuilderOpen}
                navBuilderSubflow={navBuilderSubflow}
                advisorAllowed={advisorAllowed}
                isUmbc={isUmbc}
                theme={theme}
                onToggleTheme={toggleTheme}
                userInitial={initial}
                historyOpen={historyOpen}
                onHistoryOpenChange={setHistoryOpen}
                onSwitchView={switchView}
                onGoBuilderFlow={goBuilderFlow}
                onSignOut={onSignOut}
                anonMode={anonMode}
                onSignIn={onSignIn}
              />
            )}

            <SidebarInset
              key={active}
              className="app-shell-main app-shell-view-pane min-h-0 flex-1 flex-col overflow-hidden pb-14 md:pb-0"
            >
              <FreeScanWelcomeBanner userId={user?.id ?? null} isUmbc={isUmbc} />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            </SidebarInset>

            <AppBottomNav
              active={active}
              builderActive={builderActive}
              onSelect={switchView}
              onBuilder={() => goBuilderFlow("tailor")}
              theme={theme}
              onToggleTheme={toggleTheme}
              onHistoryOpen={() => setHistoryOpen(true)}
              onBugReport={() => setMobileBugReportOpen(true)}
              onSignOut={onSignOut}
              userInitial={initial}
              advisorAllowed={advisorAllowed}
              anonMode={anonMode}
              onSignIn={onSignIn}
            />
            <BugReportDialog open={mobileBugReportOpen} onOpenChange={setMobileBugReportOpen} />
            <FirstRunWizard user={user} isUmbc={isUmbc} />

            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetContent
                side="right"
                showCloseButton={false}
                className="w-[min(300px,92vw)] gap-0 p-0 sm:max-w-[300px]"
              >
                <SheetTitle className="sr-only">Resume history</SheetTitle>
                <ResumeSidebar
                  activeFolder={null}
                  onSelect={(folder) => {
                    try {
                      sessionStorage.removeItem(RN_BUILDER_LAYOUT_ONLY_KEY);
                    } catch {
                      /* ignore */
                    }
                    router.push(
                      `/?view=builder&flow=tailor&base=${encodeURIComponent(folder)}&intent=job`,
                    );
                    setHistoryOpen(false);
                  }}
                />
              </SheetContent>
            </Sheet>
          </AppShellSidebarBridge>
        </SidebarProvider>
      </TooltipProvider>
    </UmbcProvider>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  // The provider wraps the whole shell so the sidebar, top bar, bottom nav, AND
  // every view rendered as children share one sign-in modal (useSignInDialog).
  return (
    <SignInDialogProvider>
      <UpgradeDialogProvider>
        <AppShellBody>{children}</AppShellBody>
      </UpgradeDialogProvider>
    </SignInDialogProvider>
  );
}
