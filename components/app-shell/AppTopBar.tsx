"use client";

/**
 * AppTopBar — the single, consistent auth zone for the in-app shell.
 *
 * Mirrors EnhanceCV / Kickresume / Jobright: one persistent top-right slot that
 * shows "Log in" + "Sign up — free" when signed out, and collapses to an account
 * avatar menu when signed in. All sign-in entry points funnel through the shared
 * <SignInDialog> (see useSignInDialog), so "Sign in" stops being reinvented on
 * every page.
 *
 * Slim global chrome (h-14) that sits above each view's own content. On mobile it
 * also carries the logo (the desktop sidebar is hidden there) and gives signed-in
 * users an account menu they previously only reached through the "More" sheet.
 */

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoFull } from "@/components/BrandLogo";
import { useSignInDialog } from "@/components/SignInDialog";
import type { AppView } from "./nav-config";

type Props = {
  anonMode: boolean;
  isUmbc: boolean;
  userInitial: string;
  userEmail?: string | null;
  onSwitchView: (view: AppView) => void;
  onSignOut: () => void;
};

export function AppTopBar({
  anonMode,
  isUmbc,
  userInitial,
  userEmail,
  onSwitchView,
  onSignOut,
}: Props) {
  const { openSignIn } = useSignInDialog();

  return (
    <header className="app-top-bar flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-[var(--glass-bg,var(--surface))] px-3 backdrop-blur-[12px] backdrop-saturate-150 md:px-5">
      {/* Left: logo on mobile (the sidebar carries it on desktop). */}
      <div className="flex min-w-0 items-center md:hidden">
        <LogoFull markSize={24} textColor="var(--text)" variant={isUmbc ? "umbc" : "resunova"} />
      </div>
      <div className="hidden md:block" />

      {/* Right: the one auth zone. */}
      <div className="flex shrink-0 items-center gap-2">
        {anonMode ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="hidden font-medium sm:inline-flex"
              onClick={() => openSignIn({ title: "Welcome back", reason: "Sign in to pick up where you left off." })}
            >
              Log in
            </Button>
            <Button
              size="sm"
              className="font-semibold"
              onClick={() => openSignIn()}
            >
              Sign up — free
            </Button>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  className="flex items-center gap-2 rounded-full border border-transparent p-0.5 outline-none transition-colors hover:bg-[var(--surface2)] focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-[var(--surface2)]"
                />
              }
            >
              <Avatar className="size-8 bg-primary">
                <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="z-[100] w-56">
              {userEmail ? (
                <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{userEmail}</div>
              ) : null}
              {userEmail ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={() => onSwitchView("profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSwitchView("account")}>Account settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                closeOnClick
                onClick={() => {
                  void onSignOut();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
