"use client";

/**
 * "Scans left today", for every nav surface.
 *
 * Three exports, one shared reading (see `useScansRemaining`):
 *   - `ScansRemainingPill`  — desktop sidebar, expanded + icon-rail variants
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

import { useScansRemaining, type ScansRemainingState } from "./useScansRemaining";

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

/* ── sidebar ──────────────────────────────────────────────────── */

export function ScansRemainingPill({ collapsed }: { collapsed: boolean }) {
  const { state, retry } = useScansRemaining();

  if (state.kind === "error") {
    return collapsed ? (
      <button
        type="button"
        onClick={retry}
        title={ERROR_TITLE}
        aria-label={ERROR_TITLE}
        style={{
          margin: "8px auto 2px",
          width: 30,
          height: 30,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
          cursor: "pointer",
          color: "var(--muted)",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
        }}
      >
        !
      </button>
    ) : (
      <div
        title={ERROR_TITLE}
        style={{
          margin: "2px 10px 8px",
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 12px",
          borderRadius: 999,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: "var(--muted)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: -0.2,
        }}
      >
        <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>⚠</span>
        <span>Scans unavailable</span>
        <button
          type="button"
          onClick={retry}
          style={{
            marginLeft: "auto",
            border: "none",
            background: "transparent",
            padding: 0,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--accent)",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.kind !== "metered") return null;

  const { remaining, limit } = state;
  const out = remaining <= 0;

  if (collapsed) {
    return (
      <div
        title={meterTitle(remaining, limit)}
        aria-label={`${remaining} of ${limit} scans left today`}
        style={{
          margin: "8px auto 2px",
          width: 30,
          height: 30,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
          color: "#fff",
          background: meterGradient(out),
          boxShadow: meterGlow(out),
        }}
      >
        {remaining}
      </div>
    );
  }

  return (
    <div
      title={meterTitle(remaining, limit)}
      style={{
        margin: "2px 10px 8px",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 12px",
        borderRadius: 999,
        background: meterGradient(out),
        color: "#fff",
        boxShadow: meterGlow(out),
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: -0.2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        className="rn-scan-shine"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.38) 50%, transparent 68%)",
          transform: "translateX(-120%)",
        }}
      />
      <span aria-hidden style={{ position: "relative", fontSize: 13, lineHeight: 1 }}>
        ⚡
      </span>
      <span style={{ position: "relative" }}>{meterLabel(remaining, limit)}</span>
      <style>{SHINE_CSS}</style>
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

  if (state.kind !== "metered") return null;

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

  if (state.kind !== "metered") return null;

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
  if (state.kind === "metered") {
    return state.remaining <= 0
      ? "More · no scans left today"
      : `More · ${state.remaining} of ${state.limit} scans left today`;
  }
  return "More";
}
