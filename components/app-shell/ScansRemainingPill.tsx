"use client";

/**
 * "Scans left today", for every nav surface.
 *
 * Three exports, one shared reading (see `useScansRemaining`):
 *   - `ScansRemainingPill`  — the desktop rail
 *   - `ScansRemainingRow`   — the mobile More sheet
 *   - `ScansTabBadge`       — the count on the mobile More tab, so the signal
 *                             is visible without opening the sheet
 *
 * Only a METERED plan renders a count. Unlimited plans (admin / Pro /
 * university) render nothing on purpose — there is no number to track and "∞"
 * is not worth the pixels; Account settings names the plan instead.
 *
 * An outage is NOT silent. When the quota cannot be read, every surface shows
 * an unavailable chip with a retry rather than the blank space an unlimited
 * account produces, because those two used to be indistinguishable.
 */

import { cn } from "@/lib/utils";
import { navShowsCount, useScansRemaining, type ScansRemainingState } from "./useScansRemaining";

/* ── shared bits ──────────────────────────────────────────────── */

const SHINE_CSS = `
  .rn-scan-shine { animation: rnScanShine 3.4s ease-in-out infinite; }
  @keyframes rnScanShine {
    0% { transform: translateX(-120%); }
    55%, 100% { transform: translateX(230%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .rn-scan-shine { animation: none; display: none; }
  }
`;

function meterGradient(out: boolean): string {
  return out
    ? "linear-gradient(135deg, #fb923c 0%, #ef4444 100%)"
    : "linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)";
}

function meterGlow(out: boolean): string {
  return out ? "0 4px 16px -5px rgba(239,68,68,0.6)" : "0 4px 16px -5px var(--accent)";
}

function meterLabel(remaining: number, limit: number): string {
  return remaining <= 0 ? "No scans left today" : `${remaining} of ${limit} scans left`;
}

function meterTitle(remaining: number, limit: number): string {
  return `${remaining} of ${limit} résumé scans remaining today · resets at midnight UTC`;
}

/** Copy for the state where we could not read the quota at all. */
const ERROR_TITLE = "Couldn't check your scan quota. Tap to try again.";

/**
 * The same reading, as two short lines for the 84px rail.
 *
 * `meterLabel` cannot fit: "No scans left today" needs ~105px at 11px, so the
 * rail has to say it differently rather than truncate it. Exported, because
 * the alternative is the wording living once here and again in a test.
 *
 * Zero does NOT render "0 of 3". A numeral pair at zero reads as a quantity
 * you still have; the exhausted state has to say it is exhausted.
 */
export function railQuotaLines(remaining: number, limit: number): [string, string] {
  return remaining <= 0 ? ["No scans", "left today"] : [`${remaining} of ${limit}`, "scans left"];
}

/* ── the desktop rail ─────────────────────────────────────────── */

/**
 * The quota, shaped like the rail control it sits in.
 *
 * ⚠️ TINT + INK, NOT WHITE ON A GRADIENT, and that is a measured fix rather
 * than a preference. The disc this replaces painted `#fff` on
 * `meterGradient`, whose warm end renders white text at **2.9:1 in light and
 * 2.39:1 in dark** — sampled from sRGB pixels inside the rendered disc, since
 * a gradient has no `backgroundColor` for a DOM contrast walk to read, which
 * is exactly how it stayed invisible. 12px bold is not large text, so AA
 * wants 4.5:1 and both themes failed it. The `--amber-ink`/`--amber-bg` pair
 * is tuned to be readable as text on its own tint, so this passes by
 * construction in both themes rather than by a value someone picked.
 *
 * It also has to READ. Among seven labelled vertical pills a lone gradient
 * disc showing "2" is the only unlabelled round object on the rail, and
 * directly above "Upgrade" it scans as decoration. Two lines of words say
 * what the number is.
 *
 * The old `collapsed` prop is gone with the collapsed rail: the expanded
 * variant it switched to had no caller left but the test, and a prop with one
 * live value is a lie about having a choice.
 */
export function ScansRemainingPill() {
  const { state, retry } = useScansRemaining();

  if (state.kind === "error") {
    return (
      <button
        type="button"
        onClick={retry}
        title={ERROR_TITLE}
        className="mt-1 flex w-(--rail-item) cursor-pointer flex-col items-center justify-center gap-px rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-1 py-1.5 text-center text-[var(--muted)]"
      >
        {/* Named, not the bare "!" disc this replaces: an outage is not a
            state the reader should have to hover to identify. Both words are
            visible, so the button's accessible name contains its own visible
            label (WCAG 2.5.3) instead of an aria-label that disagrees. */}
        <span className="text-[11px] leading-tight font-semibold">Scans unavailable</span>
        <span className="text-[11px] leading-tight font-bold text-[var(--accent-ink)]">Retry</span>
      </button>
    );
  }

  if (!navShowsCount(state)) return null;

  const { remaining, limit } = state;
  const out = remaining <= 0;
  const [top, bottom] = railQuotaLines(remaining, limit);

  return (
    <div
      title={meterTitle(remaining, limit)}
      // On a DIV with no role, `aria-label` is not reliably announced, so the
      // visible text carries the meaning and this only adds the day's scope.
      className={cn(
        "mt-1 flex w-(--rail-item) flex-col items-center justify-center gap-px rounded-xl px-1 py-1.5 text-center",
        // Escalates at zero. Red is not the resting colour: "2 of 3 left" is
        // a budget, not a problem, and a rail that is amber all day stops
        // meaning anything by the time it matters.
        out
          ? "bg-[var(--red-bg)] text-[var(--red-ink)]"
          : "bg-[var(--amber-bg)] text-[var(--amber-ink)]",
      )}
    >
      <span className="text-[11px] leading-tight font-bold tabular-nums">{top}</span>
      {/* 11px, not 10: the detector's functional-text floor applies to a
          nav label even on a 72px rail, and "being on the DESIGN.md ramp
          does not exempt a value here". Both lines fit — "scans left"
          measures ~52px against 64px of inner width. */}
      <span className="text-[11px] leading-tight font-semibold">{bottom}</span>
    </div>
  );
}

/* ── mobile ───────────────────────────────────────────────────── */

/**
 * The same reading, laid out for the More sheet.
 *
 * Full-width rather than a pill: it sits in a stack of rows, and a floating
 * pill in that context reads as a button.
 */
export function ScansRemainingRow() {
  const { state, retry } = useScansRemaining();

  if (state.kind === "error") {
    return (
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-border px-4 py-2.5">
        <span aria-hidden className="text-[13px] text-[var(--muted)]">⚠</span>
        <span className="text-[13px] font-medium text-[var(--muted)]">Scans unavailable</span>
        <button
          type="button"
          onClick={retry}
          className="ml-auto border-none bg-transparent p-0 text-[12px] font-bold text-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!navShowsCount(state)) return null;

  const { remaining, limit } = state;
  const out = remaining <= 0;

  return (
    <div
      className="mx-4 mb-3 flex items-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[13px] font-bold text-white"
      style={{ background: meterGradient(out), boxShadow: meterGlow(out) }}
    >
      <span aria-hidden className="text-[13px] leading-none">⚡</span>
      <span>{meterLabel(remaining, limit)}</span>
      <span className="ml-auto text-[11px] font-semibold opacity-80">Resets midnight UTC</span>
    </div>
  );
}

/**
 * The count on the More tab.
 *
 * Without this the mobile signal only exists behind a tap, which is not parity
 * with a sidebar pill that is always on screen. Deliberately shows on every
 * metered reading rather than only at zero: a threshold badge that appears out
 * of nowhere is harder to read than one that was always counting down.
 */
export function ScansTabBadge() {
  const { state } = useScansRemaining();

  if (state.kind === "error") {
    return (
      <span
        aria-hidden
        className="absolute -top-0.5 right-[calc(50%-22px)] flex min-w-[16px] items-center justify-center rounded-full border border-border bg-[var(--surface2)] px-1 text-[10px] font-extrabold leading-[15px] text-[var(--muted)]"
      >
        !
      </span>
    );
  }

  if (!navShowsCount(state)) return null;

  return (
    <span
      aria-hidden
      className="absolute -top-0.5 right-[calc(50%-22px)] flex min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold leading-[15px] text-white"
      style={{ background: meterGradient(state.remaining <= 0), boxShadow: meterGlow(state.remaining <= 0) }}
    >
      {state.remaining}
    </span>
  );
}

/** Screen-reader text for the More tab, so the badge is not visual-only. */
export function scansTabAriaLabel(state: ScansRemainingState): string {
  if (state.kind === "error") return "More · scan quota unavailable";
  if (navShowsCount(state)) {
    return state.remaining <= 0
      ? "More · no scans left today"
      : `More · ${state.remaining} of ${state.limit} scans left today`;
  }
  return "More";
}
