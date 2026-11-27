"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
import { useScansRemaining, type ScansRemainingState } from "./useScansRemaining";
import { planName } from "@/lib/apiClient";

type Props = {
  initial: string;
  /** Shown in the header so the menu can say which account you are in. */
  userName?: string | null;
  userEmail?: string | null;
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
  onUpgrade?: () => void;
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
 * WHAT THE REBUILD FIXED — five faults, in order of what they cost
 * ----------------------------------------------------------------
 * 1. ⚠️ IT NEVER SAID WHOSE ACCOUNT IT WAS. No name, no email, no plan; the
 *    avatar showed one letter. Telling you which account you are signed into
 *    is the one job this menu has that nothing else in the shell does, and it
 *    matters here specifically — a student can hold a personal account and a
 *    university one, and the rest of the product behaves differently for each.
 * 2. No icons, while the rail directly above it is all icons. This was the
 *    only nav surface in the shell rendering bare text, and every glyph it
 *    needed already existed in `nav-icons.tsx`. Nothing new was drawn.
 * 3. Contact, Terms and Privacy took three full rows at the same weight as
 *    My Résumés — a quarter of the menu spent on links almost nobody opens.
 *    They are one footer line now.
 * 4. ⚠️ DARK MODE WAS AN ACTION DRESSED AS A DESTINATION. Every row around it
 *    navigates; that one flips a setting and stays put, and looked identical.
 *    It carries a switch, so its shape says what it does before you click.
 * 5. It sat on the page rather than above it (white panel, near-white page,
 *    soft shadow). Elevation 3 and the real border are most of "more visible".
 *
 * The "© 2026 Resunova" line is gone. It is chrome in a menu you opened to go
 * somewhere.
 */
export function AppSidebarUser({
  initial,
  userName,
  userEmail,
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
  onUpgrade,
  onSignOut,
}: Props) {
  const { state: scans, retry: retryScans } = useScansRemaining();

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
        className="z-[100] w-[252px] shadow-[var(--md-elevation-3)]"
      >
        <AccountHeader
          initial={initial}
          anonMode={anonMode}
          userName={userName}
          userEmail={userEmail}
          planChip={anonMode ? null : planChipFor(scans)}
        />

        {anonMode ? (
          <DropdownMenuItem closeOnClick onClick={() => onSignIn?.()}>
            <Glyph>{NAV_ICONS.lock}</Glyph>
            Sign in
          </DropdownMenuItem>
        ) : (
          <PlanStrip scans={scans} onUpgrade={onUpgrade} onRetry={retryScans} />
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem closeOnClick onClick={onMyResumes}>
          <Glyph>{NAV_ICONS.library}</Glyph>
          My Résumés
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick onClick={onCoverLetter}>
          <Glyph>{NAV_ICONS.coverLetter}</Glyph>
          Cover letter
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick onClick={onHistory}>
          <Glyph>{NAV_ICONS.history}</Glyph>
          History
        </DropdownMenuItem>
        {advisorAllowed && !anonMode ? (
          <DropdownMenuItem closeOnClick onClick={onAdvisor}>
            <Glyph>{NAV_ICONS.advisor}</Glyph>
            Advisor
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem closeOnClick onClick={onProfile}>
          <Glyph>{NAV_ICONS.profile}</Glyph>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick onClick={onAccount}>
          <Glyph>{NAV_ICONS.account}</Glyph>
          Account settings
        </DropdownMenuItem>
        {/*
          ⚠️ `closeOnClick={false}` is EXPLICIT and has to be: base-ui's Item
          closes the menu by default, so leaving it off does the opposite of
          what this row wants. (The first version omitted it on the reasoning
          that absent meant "stay open"; a test caught that.) Every other row
          here goes somewhere, so closing is the right end to it. This one
          changes the thing you are looking at, and shutting the menu hides
          the switch at the exact moment it moves. The switch is decoration
          driven by `theme`; the row is the control, so a click anywhere on it
          still toggles.
        */}
        <DropdownMenuItem
          closeOnClick={false}
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
        >
          <Glyph>{theme === "dark" ? NAV_ICONS.themeLight : NAV_ICONS.themeDark}</Glyph>
          <span className="flex-1">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          <ThemeSwitch on={theme === "dark"} />
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
              <Glyph>{NAV_ICONS.signOut}</Glyph>
              Sign out
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />
        {/*
          ⚠️ STILL THREE MENUITEMS, laid out on one line — NOT three plain
          links in a div. That was the first version and a test caught it:
          inside a menu, arrow-key navigation only visits items with the
          menuitem role, so plain anchors here are reachable by sighted mouse
          users and by nobody else. The row is a flex container; the items
          inside it are unchanged in kind, only in size.
        */}
        <div className="flex items-center gap-0.5 px-1 pb-0.5">
          <FootLink href="/contact">Contact</FootLink>
          <Dot />
          <FootLink href="/terms">Terms</FootLink>
          <Dot />
          <FootLink href="/privacy">Privacy</FootLink>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-[var(--dim)] opacity-50" style={{ fontSize: FS.caption }}>
      ·
    </span>
  );
}

function FootLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <DropdownMenuItem
      closeOnClick
      className="min-h-0 px-1.5 py-1 text-[var(--dim)]"
      style={{ fontSize: FS.caption }}
      render={<Link href={href} prefetch={false} />}
    >
      {children}
    </DropdownMenuItem>
  );
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <span className="flex-none text-[var(--muted)] [&_svg]:size-[18px]" aria-hidden>
      {children}
    </span>
  );
}

function AccountHeader({
  initial,
  anonMode,
  userName,
  userEmail,
  planChip,
}: {
  initial: string;
  anonMode: boolean;
  userName?: string | null;
  userEmail?: string | null;
  planChip: string | null;
}) {
  // ⚠️ Falls back to the email, then to nothing — never to an invented name.
  // A menu whose whole job is telling you which account you are in must not
  // guess at the answer.
  const name = (userName || "").trim() || (userEmail || "").trim();
  const second = name && userEmail && name !== userEmail ? userEmail : null;

  return (
    <div className="flex items-center gap-2.5 px-2 py-2.5">
      <Avatar className="size-[34px] flex-none bg-[var(--accent)] after:border-none">
        <AvatarFallback
          className="bg-[var(--accent)] font-semibold text-[var(--on-fill)]"
          style={{ fontSize: FS.body, fontWeight: FW.bold }}
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
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[var(--text)]"
          style={{ fontSize: FS.body, fontWeight: FW.semibold, lineHeight: 1.25 }}
        >
          {anonMode ? "Not signed in" : name || "Your account"}
        </div>
        <div
          className="truncate text-[var(--dim)]"
          style={{ fontSize: FS.caption, lineHeight: 1.3 }}
        >
          {anonMode ? "Nothing is saved yet" : second || "Signed in"}
        </div>
      </div>
      {planChip ? (
        <span
          className="flex-none rounded-full bg-[var(--amber-bg)] px-1.5 py-0.5 text-[var(--amber-ink)]"
          style={{ fontSize: FS.micro, fontWeight: FW.bold, letterSpacing: "0.02em" }}
        >
          {planChip}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The named plan, for an account that has one worth naming.
 *
 * ⚠️ Only an `unlimited` reading produces a chip, and only when the server
 * actually named the plan. A metered account gets nothing here, because the
 * strip below already names its plan in words, and a loading or failed
 * reading gets nothing because we do not know yet.
 *
 * ⚠️ THE `kind` CHECK IS LOAD-BEARING AT THE TYPE LEVEL, not just as a rule:
 * `plan` exists on `unlimited` and `metered` and on none of the other three
 * states, so dropping it is a tsc error rather than a test failure. A
 * mutation run shows this line as a survivor; it is not dead weight, the
 * compiler is simply the thing holding it.
 */
function planChipFor(scans: ScansRemainingState): string | null {
  if (scans.kind !== "unlimited") return null;
  return planName(scans.plan)?.toUpperCase() ?? null;
}

/**
 * Plan and what is left of today.
 *
 * ⚠️ ONE READING DRIVES BOTH THE METER AND THE UPGRADE BUTTON, so a paying
 * subscriber can never be shown a dead CTA beside a row that says Unlimited —
 * the failure this repo has already shipped once, when the quota card
 * hard-coded a "UMBC" badge for every unlimited account.
 *
 * ⚠️ AND IT CLAIMS NOTHING IT DOES NOT KNOW. `loading` renders nothing rather
 * than a zeroed meter that resolves a moment later; `error` says we could not
 * check instead of implying the allowance is spent; `requires_sign_in` cannot
 * reach here. The states are disjoint in `useScansRemaining` precisely so this
 * does not have to guess which one a blank means.
 */
function PlanStrip({
  scans,
  onUpgrade,
  onRetry,
}: {
  scans: ScansRemainingState;
  onUpgrade?: () => void;
  onRetry: () => void;
}) {
  if (scans.kind === "loading" || scans.kind === "idle" || scans.kind === "requires_sign_in") {
    return null;
  }

  if (scans.kind === "error") {
    return (
      <div
        className="mx-1 mb-1.5 mt-1 flex items-center justify-between gap-2 rounded-[10px] bg-[var(--surface2)] px-2.5 py-2 text-[var(--muted)]"
        style={{ fontSize: FS.caption }}
      >
        <span>Couldn&apos;t check your plan</span>
        <button
          type="button"
          onClick={(e) => {
            // The menu would otherwise close on the click and hide the result.
            e.preventDefault();
            e.stopPropagation();
            onRetry();
          }}
          className="rounded border-0 bg-transparent p-0 text-[var(--accent-ink)] underline"
          style={{ fontSize: FS.caption, fontWeight: FW.semibold }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (scans.kind === "unlimited") {
    // The chip in the header already names it. A meter would be a bar with no
    // end, and an Upgrade button would be an upsell to what they already have.
    return null;
  }

  const { remaining, limit } = scans;
  const used = Math.max(0, limit - remaining);
  // Clamped for the BAR only. If the server ever says 4 of 3, the words still
  // say 4 of 3 — hiding a broken contract is worse than drawing a full bar.
  const pct = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;

  return (
    <div className="mx-1 mb-1.5 mt-1 rounded-[10px] bg-[var(--surface2)] px-2.5 py-2.5">
      <div className="flex items-baseline justify-between gap-2.5">
        {/*
          ⚠️ NAMED FROM THE READING, never hard-coded. This said "Free plan"
          for every metered account until a mutation run asked what happens to
          a metered Pro one — `planLabel`'s own contract allows that, and
          AGENTS.md's rule is "never show a metered Free badge to a
          subscriber". A paying customer being told they are on Free is the
          same defect this repo already shipped once, when the quota card
          hard-coded "UMBC" for every unlimited account.
        */}
        <span className="text-[var(--text)]" style={{ fontSize: FS.small, fontWeight: FW.bold }}>
          {planName(scans.plan) ?? "Free"} plan
        </span>
        {/*
          ⚠️ --muted, not --dim. --dim is tuned to be read on --surface and
          this strip is --surface2; measured on the comp it lands at 4.26:1
          there, under AA. A check that reads the token name cannot see that.
        */}
        <span className="text-[var(--muted)]" style={{ fontSize: FS.caption }}>
          {remaining} of {limit} scans left
        </span>
      </div>
      <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      {onUpgrade ? (
        <button
          type="button"
          onClick={onUpgrade}
          className="md-state-layer mt-2 block w-full rounded-lg border-0 bg-[var(--accent)] px-2.5 py-2 text-center text-[var(--on-fill)]"
          style={{ fontSize: FS.small, fontWeight: FW.bold }}
        >
          Upgrade to Pro
        </button>
      ) : null}
    </div>
  );
}

function ThemeSwitch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative h-5 w-[34px] flex-none rounded-full transition-colors ${
        on ? "bg-[var(--accent)]" : "bg-[var(--border)]"
      }`}
      style={{ transitionDuration: "var(--md-duration-short)" }}
    >
      <span
        className="absolute top-0.5 size-4 rounded-full bg-[var(--surface)] shadow-sm transition-[left]"
        style={{ left: on ? 16 : 2, transitionDuration: "var(--md-duration-short)" }}
      />
    </span>
  );
}
