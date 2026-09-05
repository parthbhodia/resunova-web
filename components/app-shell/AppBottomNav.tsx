"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { isPublicAppView } from "@/lib/anonScan";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NAV_ICONS } from "./nav-icons";
import { ScansRemainingRow, ScansTabBadge, scansTabAriaLabel } from "./ScansRemainingPill";
import { useScansRemaining } from "./useScansRemaining";
import {
  MOBILE_TAB_VIEWS,
  MOBILE_TAB_LABELS,
  VIEW_ICONS,
  VIEW_LABELS,
  type AppView,
} from "./nav-config";

type Props = {
  active: AppView;
  builderActive: boolean;
  onSelect: (view: AppView) => void;
  onBuilder: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onHistoryOpen: () => void;
  onBugReport: () => void;
  onSignOut: () => void;
  userInitial: string;
  advisorAllowed?: boolean;
  /** Signed-out free-scan visitor: locked tabs route to sign-in. */
  anonMode?: boolean;
  onSignIn?: () => void;
};

export function AppBottomNav({
  active,
  builderActive,
  onSelect,
  onBuilder,
  theme,
  onToggleTheme,
  onHistoryOpen,
  onBugReport,
  onSignOut,
  userInitial,
  advisorAllowed = false,
  anonMode = false,
  onSignIn,
}: Props) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  // Shared with the desktop sidebar pill — one store, one request, one number.
  const { state: scans } = useScansRemaining();

  // Membership comes from the shared PUBLIC_APP_VIEWS so a tap and a pasted URL
  // always agree. This used to allow only "analyze", which meant Jobs and the
  // builder were reachable by URL but blocked from the nav.
  const isLocked = (v: AppView) => anonMode && !isPublicAppView(v);

  const handleTab = (v: AppView) => {
    if (isLocked(v)) {
      onSignIn?.();
      return;
    }
    if (v === "builder") onBuilder();
    else onSelect(v);
  };

  // A More-sheet destination that requires an account: anon visitors get the
  // shared sign-in modal instead.
  const gotoGated = (v: AppView) => {
    setMoreOpen(false);
    if (isLocked(v)) onSignIn?.();
    else onSelect(v);
  };

  return (
    <>
      <nav
        className="app-bottom-nav fixed inset-x-0 bottom-0 z-60 flex h-14 items-stretch justify-around border-t border-border bg-[var(--glass-bg)] pb-[env(safe-area-inset-bottom,0)] backdrop-blur-[16px] backdrop-saturate-[180%] md:hidden"
        aria-label="Primary"
      >
        {MOBILE_TAB_VIEWS.map((v) => {
          const isAct = v === "builder" ? builderActive : v === active;
          return (
            <button
              key={v}
              type="button"
              data-active={isAct}
              aria-current={isAct ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-none bg-transparent font-inherit text-[11px] font-medium text-[var(--dim)] transition-[color,transform] duration-200 active:scale-[0.96] [&_.app-nav-icon_svg]:size-[22px]",
                isAct && "text-accent [&_.app-nav-icon]:opacity-100",
              )}
              onClick={() => handleTab(v)}
            >
              <span className="app-nav-icon" aria-hidden>
                {VIEW_ICONS[v]}
              </span>
              <span className="max-w-full truncate">{MOBILE_TAB_LABELS[v] ?? VIEW_LABELS[v]}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          type="button"
          data-active={moreOpen}
          aria-label={scansTabAriaLabel(scans)}
          className={cn(
            "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-none bg-transparent font-inherit text-[11px] font-medium text-[var(--dim)] transition-[color,transform] duration-200 active:scale-[0.96] [&_.app-nav-icon_svg]:size-[22px]",
            moreOpen && "text-accent [&_.app-nav-icon]:opacity-100",
          )}
          onClick={() => setMoreOpen(true)}
        >
          <span className="app-nav-icon" aria-hidden>
            {NAV_ICONS.more}
          </span>
          <ScansTabBadge />
          <span>More</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        {/* Reserve the fixed bottom-nav height (h-14 = 3.5rem, which is z-60 and
            paints OVER this z-50 sheet) as bottom padding, so the footer row
            (Contact / Feedback / Sign out) clears the tab bar instead of
            hiding behind it. */}
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-0 pb-[calc(3.5rem+max(env(safe-area-inset-bottom,0px),0.5rem))]">
          <SheetTitle className="sr-only">More</SheetTitle>

          {/* Account / sign-in row */}
          {anonMode ? (
            <button
              type="button"
              className="mx-4 mt-1 mb-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl bg-[var(--accent-bg)] px-4 py-3 text-left"
              onClick={() => { setMoreOpen(false); onSignIn?.(); }}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-white">
                {NAV_ICONS.lock}
              </span>
              <span className="text-sm font-semibold text-accent">Sign in, free</span>
            </button>
          ) : (
            <button
              type="button"
              className="mx-4 mt-1 mb-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl px-2 py-1.5 text-left active:bg-[var(--surface2)]"
              onClick={() => gotoGated("account")}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-white">
                {userInitial}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-[var(--text)]">Account</span>
                <span className="text-xs text-[var(--muted)]">Profile & settings</span>
              </span>
            </button>
          )}

          {/* Scans left — the desktop sidebar pill's mobile home. Renders only
              on a metered plan (or when the quota can't be read). */}
          <ScansRemainingRow />

          {/* Destination tiles — icon-first grid (was a long text list) */}
          <div className="grid grid-cols-2 gap-2 px-4">
            <Tile icon={NAV_ICONS["cover-letter"]} label="Cover letter" onClick={() => gotoGated("cover-letter")} />
            <Tile
              icon={NAV_ICONS.templates}
              label="Templates"
              onClick={() => { setMoreOpen(false); router.push("/templates/"); }}
            />
            <Tile
              icon={NAV_ICONS.interviewPrep}
              label="Interview prep"
              onClick={() => { setMoreOpen(false); router.push("/interview-prep"); }}
            />
            <Tile icon={NAV_ICONS.profile} label="Profile" onClick={() => gotoGated("profile")} />
            <Tile
              icon={NAV_ICONS.history}
              label="History"
              onClick={() => { setMoreOpen(false); if (anonMode) onSignIn?.(); else onHistoryOpen(); }}
            />
            {!anonMode && advisorAllowed && (
              <Tile icon={NAV_ICONS.advisor} label="Analytics" onClick={() => gotoGated("advisor")} />
            )}
          </div>

          {/* Settings + utilities footer */}
          <div className="mt-3 border-t border-border pt-1">
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-3 text-left text-sm text-[var(--text)] active:bg-[var(--surface2)]"
              onClick={() => { onToggleTheme(); }}
            >
              <span className="flex items-center gap-3">
                <span className="text-[var(--muted)]">
                  {theme === "dark" ? NAV_ICONS.themeDark : NAV_ICONS.themeLight}
                </span>
                Dark mode
              </span>
              <span
                aria-hidden
                className={cn(
                  "relative inline-block h-5 w-9 rounded-full transition-colors",
                  theme === "dark" ? "bg-accent" : "bg-[var(--surface3,var(--surface2))]",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white transition-[left]",
                    theme === "dark" ? "left-[18px]" : "left-0.5",
                  )}
                />
              </span>
            </button>

            <div className="flex items-center gap-1 px-3 pb-1">
              <Link
                href="/contact"
                prefetch={false}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[13px] text-[var(--text)] no-underline active:bg-[var(--surface2)]"
                onClick={() => setMoreOpen(false)}
              >
                <span className="text-[var(--muted)]">{NAV_ICONS.contact}</span>
                Contact
              </Link>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[13px] text-[var(--text)] active:bg-[var(--surface2)]"
                onClick={() => { setMoreOpen(false); onBugReport(); }}
              >
                <span className="text-[var(--muted)]">{NAV_ICONS.bug}</span>
                Feedback
              </button>
              {!anonMode && (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[13px] text-red-500 active:bg-[var(--surface2)]"
                  onClick={() => { setMoreOpen(false); onSignOut(); }}
                >
                  <span>{NAV_ICONS.signOut}</span>
                  Sign out
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Tile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-transparent py-3.5 text-[12px] font-medium text-[var(--text)] active:bg-[var(--surface2)] [&_svg]:size-[22px]"
    >
      <span className="text-[var(--muted)]" aria-hidden>{icon}</span>
      {label}
    </button>
  );
}
