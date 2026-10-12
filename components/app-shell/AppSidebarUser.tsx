"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FS, FW } from "@/lib/typography";
import { NAV_ICONS } from "./nav-icons";

type Props = {
  initial: string;
  anonMode: boolean;
  advisorAllowed: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onSignIn?: () => void;
  onProfile: () => void;
  onMyResumes: () => void;
  onCoverLetter: () => void;
  onHistory: () => void;
  onAdvisor: () => void;
  onAccount: () => void;
  onSignOut: () => void;
};

/**
 * Account menu for the rail.
 *
 * Cover letter, History, theme, Contact and Advisor used to be their own
 * sidebar rows. They fold in here so the rail can stay one column. Terms and
 * Privacy come with them: the rail has no room for a legal footer, and those
 * links are not optional.
 */
export function AppSidebarUser({
  initial,
  anonMode,
  advisorAllowed,
  theme,
  onToggleTheme,
  onSignIn,
  onProfile,
  onMyResumes,
  onCoverLetter,
  onHistory,
  onAdvisor,
  onAccount,
  onSignOut,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={anonMode ? "Account menu" : "Account"}
        className="md-state-layer flex min-h-[44px] w-full flex-col items-center justify-center gap-0.5 rounded-xl border-0 bg-transparent p-1 text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <Avatar className="size-8 bg-[var(--accent)] after:border-none">
          <AvatarFallback
            className="bg-[var(--accent)] font-semibold text-[var(--on-fill)]"
            style={{ fontSize: FS.caption, fontWeight: FW.bold }}
          >
            {anonMode ? (
              <span className="[&_svg]:size-4" aria-hidden>
                {NAV_ICONS.lock}
              </span>
            ) : (
              initial
            )}
          </AvatarFallback>
        </Avatar>
        {anonMode ? (
          <span style={{ fontSize: FS.caption, fontWeight: FW.semibold, lineHeight: 1.2 }}>
            Sign in
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={8}
        className="z-[100] w-auto min-w-52"
      >
        {anonMode ? (
          <DropdownMenuItem closeOnClick onClick={() => onSignIn?.()}>
            Sign in
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem closeOnClick onClick={onMyResumes}>
          My Résumés
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick onClick={onCoverLetter}>
          Cover letter
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick onClick={onHistory}>
          History
        </DropdownMenuItem>
        {advisorAllowed && !anonMode ? (
          <DropdownMenuItem closeOnClick onClick={onAdvisor}>
            Advisor
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem closeOnClick onClick={onProfile}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick onClick={onAccount}>
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick onClick={onToggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem closeOnClick render={<Link href="/contact" prefetch={false} />}>
          Contact
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick render={<Link href="/terms" prefetch={false} />}>
          Terms
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick render={<Link href="/privacy" prefetch={false} />}>
          Privacy
        </DropdownMenuItem>
        {!anonMode ? (
          <>
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
          </>
        ) : null}
        <DropdownMenuSeparator />
        <p className="px-1.5 py-1 text-[var(--dim)]" style={{ fontSize: FS.caption }}>
          © 2026 Resunova
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
