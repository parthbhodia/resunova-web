"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { NAV_ICONS } from "./nav-icons";

/**
 * The account menu, which is now also where the secondary nav lives.
 *
 * WHY THESE ITEMS ARE HERE
 * ------------------------
 * The rail carries the funnel — the surfaces someone is here to use. Cover
 * letter, History, Advisor, the theme toggle and Contact are all real
 * destinations but none of them is a step in that funnel, and giving each one
 * a rail item is how the old nav reached nineteen entries, where the thing a
 * visitor actually came for (templates) sat two clicks deep inside a drawer.
 *
 * ⚠️ NOTHING IS DELETED. Every surface the old sidebar reached is still one
 * click from here. A "simplification" that quietly drops a destination is not
 * a simplification, it is a regression with a tidier screenshot, and Advisor
 * in particular is reachable from nowhere else in the shell.
 */

type Props = {
  initial: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  /** Advisors and admins only. A menu row nobody can use is worse than none. */
  advisorAllowed: boolean;
  onProfile: () => void;
  onMyResumes: () => void;
  onCoverLetter: () => void;
  onAdvisor: () => void;
  onHistory: () => void;
  onAccount: () => void;
  onSignOut: () => void;
};

export function AppSidebarUser({
  initial,
  theme,
  onToggleTheme,
  advisorAllowed,
  onProfile,
  onMyResumes,
  onCoverLetter,
  onAdvisor,
  onHistory,
  onAccount,
  onSignOut,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            className="!h-auto !w-(--rail-item) !flex-col !items-center !justify-center !gap-[3px] !rounded-xl !px-1 !py-2 !text-[11px] !font-semibold !leading-none text-[var(--muted)] hover:!bg-[var(--surface2)] hover:!text-[var(--text)] data-popup-open:!bg-[var(--surface2)] data-popup-open:!text-[var(--text)]"
          />
        }
      >
        <Avatar className="size-7 bg-primary after:border-none">
          <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
        {/* The visible word is the accessible name, same rule as every rail
            item: an avatar alone announces its initial, which is a letter, not
            a destination. */}
        <span>Account</span>
      </DropdownMenuTrigger>
      {/* Opens to the RIGHT of the rail. `side="top"` was correct when this sat
          at the foot of a 232px-wide sidebar; against a 80px rail it would hang
          a 176px menu off both edges. */}
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={8}
        className="z-[100] w-auto min-w-44"
      >
        <DropdownMenuItem onClick={onMyResumes}>
          {NAV_ICONS.library}
          My Résumés
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCoverLetter}>
          {NAV_ICONS["cover-letter"]}
          Cover letter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onHistory}>
          {NAV_ICONS.history}
          History
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onProfile}>
          {NAV_ICONS.profile}
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAccount}>
          {NAV_ICONS.account}
          Account settings
        </DropdownMenuItem>
        {advisorAllowed ? (
          <DropdownMenuItem onClick={onAdvisor}>
            {NAV_ICONS.advisor}
            Advisor
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        {/* `closeOnClick={false}`: the switch is the point, and closing the menu
            to show the result makes you reopen it to change your mind. */}
        <DropdownMenuItem closeOnClick={false} onClick={onToggleTheme}>
          {theme === "dark" ? NAV_ICONS.themeDark : NAV_ICONS.themeLight}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href="/contact/" />}
        >
          {NAV_ICONS.contact}
          Contact
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          closeOnClick
          onClick={() => {
            void onSignOut();
          }}
        >
          {NAV_ICONS.signOut}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
