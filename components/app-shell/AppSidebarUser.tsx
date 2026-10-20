"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
 *
 * The menu used to be one undifferentiated list of eleven rows spanning
 * navigation, settings and legal copy, with the copyright year pushing Sign out
 * up from the bottom. The rows are unchanged; what was missing was the shape.
 * Captioned groups now say what each row is for, the theme toggle reads as a
 * switch rather than a checkmark on an action, and the copyright line is gone.
 * This is the in-place pass; the settings hub is the next step, which is why
 * navigation and account actions still share one surface.
 */
const ITEM = "min-h-8 gap-2.5 px-2 py-1.5";
const ICON = "text-[var(--dim)]";
const LABEL =
  "px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]";

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
  // One switch, two homes: it belongs under Account when there is an account,
  // and a guest still gets it because this menu is their only theme control.
  const themeRow = (
    <DropdownMenuCheckboxItem
      checked={theme === "dark"}
      onCheckedChange={onToggleTheme}
      closeOnClick
      className={cn(
        ITEM,
        "[&_[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden",
      )}
    >
      <span className={ICON} aria-hidden>
        {theme === "dark" ? NAV_ICONS.moon : NAV_ICONS.sun}
      </span>
      <span className="flex-1">Dark mode</span>
      <span
        aria-hidden
        className={cn(
          "relative inline-block h-4 w-8 shrink-0 rounded-full",
          theme === "dark"
            ? "bg-[var(--accent)]"
            : "bg-[var(--surface3)] ring-1 ring-inset ring-[var(--dim)]",
        )}
        style={{
          transition:
            "background-color var(--md-duration-medium) var(--md-easing-standard)",
        }}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full",
            theme === "dark"
              ? "left-[calc(100%-0.875rem)] bg-[var(--on-fill)]"
              : "left-0.5 bg-[var(--muted)]",
          )}
          style={{
            transition: "left var(--md-duration-medium) var(--md-easing-standard)",
          }}
        />
      </span>
    </DropdownMenuCheckboxItem>
  );

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
        className="z-[100] w-auto min-w-60"
      >
        {anonMode ? (
          <DropdownMenuItem closeOnClick onClick={() => onSignIn?.()} className={ITEM}>
            <span className={ICON} aria-hidden>
              {NAV_ICONS.lock}
            </span>
            Sign in
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className={LABEL}>Your work</DropdownMenuLabel>
              <DropdownMenuItem closeOnClick onClick={onMyResumes} className={ITEM}>
                <span className={ICON} aria-hidden>
                  {NAV_ICONS.library}
                </span>
                My Résumés
              </DropdownMenuItem>
              <DropdownMenuItem closeOnClick onClick={onCoverLetter} className={ITEM}>
                <span className={ICON} aria-hidden>
                  {NAV_ICONS["cover-letter"]}
                </span>
                Cover letter
              </DropdownMenuItem>
              <DropdownMenuItem closeOnClick onClick={onHistory} className={ITEM}>
                <span className={ICON} aria-hidden>
                  {NAV_ICONS.history}
                </span>
                History
              </DropdownMenuItem>
              {advisorAllowed ? (
                <DropdownMenuItem closeOnClick onClick={onAdvisor} className={ITEM}>
                  <span className={ICON} aria-hidden>
                    {NAV_ICONS.advisor}
                  </span>
                  Advisor
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>

            <DropdownMenuGroup>
              <DropdownMenuLabel className={LABEL}>Account</DropdownMenuLabel>
              <DropdownMenuItem closeOnClick onClick={onProfile} className={ITEM}>
                <span className={ICON} aria-hidden>
                  {NAV_ICONS.profile}
                </span>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem closeOnClick onClick={onAccount} className={ITEM}>
                <span className={ICON} aria-hidden>
                  {NAV_ICONS.account}
                </span>
                Account settings
              </DropdownMenuItem>
              {themeRow}
            </DropdownMenuGroup>
          </>
        )}

        {anonMode ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className={LABEL}>Preferences</DropdownMenuLabel>
              {themeRow}
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className={LABEL}>About</DropdownMenuLabel>
          <DropdownMenuItem closeOnClick className={ITEM} render={<Link href="/contact" prefetch={false} />}>
            <span className={ICON} aria-hidden>
              {NAV_ICONS.contact}
            </span>
            Contact
          </DropdownMenuItem>
          <DropdownMenuItem closeOnClick className={ITEM} render={<Link href="/terms" prefetch={false} />}>
            <span className={ICON} aria-hidden>
              {NAV_ICONS.terms}
            </span>
            Terms
          </DropdownMenuItem>
          <DropdownMenuItem closeOnClick className={ITEM} render={<Link href="/privacy" prefetch={false} />}>
            <span className={ICON} aria-hidden>
              {NAV_ICONS.privacy}
            </span>
            Privacy
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {!anonMode ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              closeOnClick
              className={ITEM}
              onClick={() => {
                void onSignOut();
              }}
            >
              <span aria-hidden>{NAV_ICONS.signOut}</span>
              Sign out
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
