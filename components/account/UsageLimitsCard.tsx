"use client";

/**
 * Usage & limits — what this account may do today, grouped by what we actually
 * enforce.
 *
 * ⚠️ ONE LOCATOR, ONE LABEL. The reference marked an at-limit row four ways:
 * a coloured left bar, a row tint, a chip and a red meter. Four copies of one
 * signal is how a warning stops being read (the tailor rail lost three of its
 * severity stripes for the same reason). An at-limit row here keeps the tint
 * and the words — "All used" — and nothing else.
 *
 * ⚠️ COLOUR IS NEVER THE ONLY CARRIER. The at-limit state says so in text, so
 * it survives greyscale and colour-blind vision.
 *
 * ⚠️ THE UPGRADE CTA USES `--accent`, NOT GREEN. Green reads as a state we
 * have reached; this is an action. And it renders only on a metered plan, so a
 * Pro / university / admin account never sees a dead CTA.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useUpgradeDialog } from "@/components/UpgradeDialog";
import {
  buildUsagePanel,
  meterFromStatus,
  type MeterReading,
  type UsageMeter,
  type UsageRow,
} from "@/lib/usagePanel";

function Pill({ tone, children }: { tone: "at" | "inf" | "pro" | "unknown"; children: React.ReactNode }) {
  const palette = {
    at: { bg: "var(--red-bg)", fg: "var(--red-ink)" },
    inf: { bg: "var(--green-bg)", fg: "var(--green-ink)" },
    pro: { bg: "var(--accent-bg)", fg: "var(--accent-ink)" },
    unknown: { bg: "var(--surface2)", fg: "var(--muted)" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: palette.bg,
        color: palette.fg,
        borderRadius: "var(--radius-pill)",
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Meter({ meter, name }: { meter: UsageMeter; name: string }) {
  if (meter.kind === "unlimited") return <Pill tone="inf"><span aria-hidden>∞</span> Unlimited</Pill>;
  if (meter.kind === "included") return <Pill tone="inf">Included</Pill>;
  if (meter.kind === "pro_only") return <Pill tone="pro">Pro</Pill>;
  if (meter.kind === "loading") {
    // A neutral placeholder, never the outage chip: we have not asked yet.
    return (
      <span
        aria-hidden
        style={{ display: "inline-block", width: 64, height: 22, borderRadius: 999, background: "var(--surface2)" }}
      />
    );
  }
  if (meter.kind === "requires_sign_in") {
    // ⚠️ NOT the outage chip. We asked and were told there is no account —
    // a complete answer. Reachable on this page through an expired token,
    // which `apiFetch` still sends.
    return <Pill tone="unknown">Sign in to see</Pill>;
  }
  if (meter.kind === "unknown") {
    // Not "unlimited". We asked and could not find out, and saying so is the
    // whole reason this state exists separately.
    return <Pill tone="unknown">Couldn&apos;t check</Pill>;
  }

  /**
   * Discrete pips only while they fit. At 16px plus a 3px gap, twelve of them
   * are 225px in a right-aligned column — fine at 1440 and an overflow risk at
   * 390. Free caps are 3 and 2, Pro is 30, so nothing real lands in between;
   * the bar covers whatever does.
   */
  const segments = meter.limit <= 6 ? meter.limit : 0;
  return (
    <div style={{ textAlign: "right" }}>
      {meter.atLimit ? <Pill tone="at">All used</Pill> : null}
      <div
        style={{
          marginTop: meter.atLimit ? 7 : 0,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: -0.4,
          color: meter.atLimit ? "var(--red-ink)" : "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {meter.used}
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}> / {meter.limit}</span>
      </div>
      {segments > 0 ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={meter.limit}
          aria-valuenow={meter.used}
          aria-label={`${name}: ${meter.used} of ${meter.limit} used today`}
          style={{ display: "flex", gap: 3, justifyContent: "flex-end", marginTop: 7 }}
        >
          {Array.from({ length: segments }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 16,
                height: 5,
                borderRadius: 99,
                background:
                  i < meter.used
                    ? meter.atLimit
                      ? "var(--red-ink)"
                      : "var(--accent)"
                    : "var(--surface3)",
              }}
            />
          ))}
        </div>
      ) : (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={meter.limit}
          aria-valuenow={meter.used}
          aria-label={`${name}: ${meter.used} of ${meter.limit} used today`}
          style={{ width: 92, height: 5, borderRadius: 99, background: "var(--surface3)", marginTop: 7, overflow: "hidden" }}
        >
          <span
            style={{
              display: "block",
              width: `${meter.fillPct}%`,
              height: "100%",
              background: meter.atLimit ? "var(--red-ink)" : "var(--accent)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function Row({ row, onUpgrade }: { row: UsageRow; onUpgrade: (() => void) | null }) {
  const atLimit = row.meter.kind === "metered" && row.meter.atLimit;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "15px 2px",
        borderTop: "1px solid var(--border)",
        background: atLimit ? "var(--red-bg)" : undefined,
        borderRadius: atLimit ? "var(--radius)" : undefined,
        paddingLeft: atLimit ? 12 : 2,
        paddingRight: atLimit ? 12 : 2,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{row.name}</div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--muted)" }}>{row.desc}</p>
        {row.remedy && onUpgrade ? (
          <button
            type="button"
            onClick={onUpgrade}
            style={{
              marginTop: 7,
              padding: 0,
              background: "none",
              border: "none",
              color: "var(--accent-ink)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {row.remedy} →
          </button>
        ) : null}
      </div>
      <div style={{ flexShrink: 0 }}>
        <Meter meter={row.meter} name={row.name} />
      </div>
    </div>
  );
}

export default function UsageLimitsCard() {
  const [scans, setScans] = useState<MeterReading | null>(null);
  const [prep, setPrep] = useState<MeterReading | null>(null);
  const { openUpgrade } = useUpgradeDialog();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Settled independently: one endpoint being down must not turn the other
      // row into "couldn't check" as well. `Promise.all` here is how the
      // library view once lost every table to one failing query.
      // ⚠️ `ok` rides along. A 401 body carries no `enforced`, and reading it
      // as a payload rendered "∞ Unlimited" on every row — a confident false
      // claim, strictly worse than an absence.
      const read = async (path: string) => {
        const resp = await apiFetch(path);
        const body = await resp.json().catch(() => null);
        return meterFromStatus(body, resp.ok);
      };
      const [a, b] = await Promise.allSettled([
        read("/api/scan-limit-status"),
        read("/api/interview-prep/limit-status"),
      ]);
      if (cancelled) return;
      setScans(a.status === "fulfilled" ? a.value : { kind: "unknown" });
      setPrep(b.status === "fulfilled" ? b.value : { kind: "unknown" });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = scans == null || prep == null;
  const panel = buildUsagePanel(scans ?? { kind: "loading" }, prep ?? { kind: "loading" });

  return (
    <section
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-card)",
        padding: "20px 22px 18px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.35, color: "var(--text)", margin: 0 }}>
            Usage &amp; limits
          </h2>
          <p style={{ margin: "5px 0 0", fontSize: 12, lineHeight: 1.55, color: "var(--muted)" }}>
            {loading ? (
              "Checking your account…"
            ) : (
              <>
                You&apos;re on the <strong style={{ color: "var(--text)" }}>{panel.planName}</strong> plan.
                {panel.resetNote ? ` ${panel.resetNote}` : ""}
              </>
            )}
          </p>
        </div>
        {!loading && panel.showUpgrade ? (
          <button
            type="button"
            onClick={() => openUpgrade({})}
            style={{
              flexShrink: 0,
              padding: "9px 15px",
              borderRadius: "var(--radius)",
              border: "none",
              background: "var(--accent)",
              color: "var(--on-fill)",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Upgrade to Pro
          </button>
        ) : null}
      </div>

      {panel.groups.map((group) => (
        <div key={group.label} style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.09,
              textTransform: "uppercase",
              color: "var(--dim)",
              marginBottom: 2,
            }}
          >
            {group.label}
            {group.caption ? (
              <span style={{ color: "var(--dim)", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>
                {" · "}
                {group.caption}
              </span>
            ) : null}
          </div>
          {group.rows.map((row) => (
            <Row key={row.key} row={row} onUpgrade={panel.showUpgrade ? () => openUpgrade({}) : null} />
          ))}
        </div>
      ))}

      {/* Read, not estimated — and it names where from, because a number with
          no provenance is the thing this repo keeps having to un-ship. */}
      <p style={{ margin: "18px 0 0", paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 11, lineHeight: 1.6, color: "var(--dim)" }}>
        Every count here is read from your account, not estimated. Scans come from the scan-limit endpoint and
        interview prep from its own.
      </p>
    </section>
  );
}
