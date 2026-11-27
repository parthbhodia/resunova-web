"use client";

/**
 * The Chrome extension's usage, for the admin dashboard.
 *
 * Two populations, kept apart on purpose (see lib/adminExtensionUsage.ts):
 * "Forms filled" is recorded for every connected account, "Usage counts" only
 * for people who pressed Accept. They sit in separate cards with separate
 * account counts, and no figure here divides one by the other.
 *
 * ⚠️ When this was built, every row of extension usage in the database came
 * from one staff account, and staff are excluded by default, so the honest
 * first view is zero. The empty state says so and points at the switch rather
 * than drawing a panel of zeros that reads as "nobody has tried it".
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { AdminBarRows, AdminChartCard, AdminKpiCard } from "@/components/admin/charts";
import { rateLabel } from "@/lib/adminFunnel";
import {
  dayBars,
  isEmptyUsage,
  sumDays,
  type ExtensionUsageResponse,
  type ReferralUsage,
  type UsageCountRow,
  type UsageDay,
  type UsagePart,
} from "@/lib/adminExtensionUsage";

// Survives the RouterView unmount that drops every ?view= page.
const _cache = new Map<string, ExtensionUsageResponse>();
let _lastDays = 30;
let _lastStaff = false;

const fmt = (n: number) => new Intl.NumberFormat().format(n);
const keyFor = (days: number, staff: boolean) => `${days}:${staff ? 1 : 0}`;

/** A rate, or the reason there is none. A suppressed rate is never shown as 0%. */
function rateOr(pct: number | null, min: number, unit: string): string {
  return rateLabel(pct) ?? `rate shows from ${fmt(min)} ${unit}`;
}

function DayBars({ series, caption }: { series: UsageDay[]; caption: string }) {
  const total = sumDays(series);
  if (total === 0) {
    return <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Nothing in this window.</p>;
  }
  const bars = dayBars(series);
  const W = 600;
  const H = 70;
  const slot = W / bars.length;
  return (
    <div>
      <svg
        data-ext-days
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={caption}
      >
        <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--border)" />
        {bars.map((b, i) => (
          <rect
            key={b.day}
            data-ext-day={b.day}
            x={i * slot + slot * 0.15}
            width={slot * 0.7}
            y={H - b.ratio * (H - 4)}
            height={b.ratio * (H - 4)}
            rx={2}
            fill="var(--accent)"
          >
            <title>{`${b.day}: ${fmt(b.count)}`}</title>
          </rect>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
        <span>{series[0]?.day}</span>
        <span>{caption}</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  );
}

function Rows({ rows, empty }: { rows: UsageCountRow[]; empty: string }) {
  if (!rows.length || rows.every((r) => r.count === 0)) {
    return <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{empty}</p>;
  }
  const labels = new Map(rows.map((r) => [r.key, r.label]));
  return (
    <AdminBarRows
      data={rows.map((r) => [r.key, r.count] as [string, number])}
      label={(k) => labels.get(k) ?? k}
      labelWidth={150}
    />
  );
}

function PartLine({ label, part, min, unit, id }: { label: string; part: UsagePart; min: number; unit: string; id: string }) {
  return (
    <div data-ext-ref-part={id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
      <span>{label}</span>
      <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
        {fmt(part.count)} of {fmt(part.outOf)} · {rateOr(part.pct, min, unit)}
      </span>
    </div>
  );
}

/**
 * The LinkedIn referral card. What people did with it, how their copies looked,
 * and whether the card's guesses about the live page held. No opened-to-copied
 * rate: one open can be copied several times.
 */
function ReferralSection({ referral, min }: { referral: ReferralUsage; min: number }) {
  const c = referral.copied;
  const any = referral.actions.some((a) => a.count > 0);
  return (
    <div data-ext-referral style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 8 }}>
        Referral messages on LinkedIn · {fmt(referral.accounts)} accounts
      </div>
      {!any ? (
        <p data-ext-no-referral style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>No referral card activity in this window.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
          <div>
            <Rows rows={referral.actions} empty="No card actions." />
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
              Copy refused by the page: <span data-ext-ref-refused>{rateOr(referral.copyRefusedPct, min, "presses of Copy")}</span>
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>
              {fmt(c.count)} copies by {fmt(c.accounts)} accounts
            </div>
            <PartLine id="typed" label="Typed in by hand" part={c.handEdited} min={min} unit="copies" />
            <PartLine id="ai" label="Written with AI" part={c.fromAi} min={min} unit="copies" />
            <PartLine id="fields" label="A blank changed on the card" part={c.fieldsChanged} min={min} unit="copies" />
            <PartLine id="blanks" label="Copied with a blank still in it" part={c.withBlanks} min={min} unit="copies" />
            <PartLine id="name" label="Name found beside the box" part={c.recipientFound} min={min} unit="copies" />
            <PartLine id="skills" label="Skills found in the posting" part={c.skillsFound} min={min} unit="copies" />
            <PartLine id="full" label="Whole description read" part={c.fullText} min={min} unit="copies" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>Why the AI could not write it</div>
            <Rows rows={referral.aiFailures} empty="No AI failures." />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExtensionUsagePanel() {
  const [days, setDays] = useState(_lastDays);
  const [includeStaff, setIncludeStaff] = useState(_lastStaff);
  // Stamped with the settings they belong to, so what is on screen is derived
  // during render and "these numbers are for THIS window and mode" is true by
  // construction rather than by ordering (the FunnelPanel pattern).
  const [result, setResult] = useState<{ key: string; payload: ExtensionUsageResponse } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);

  const key = keyFor(days, includeStaff);
  const data: ExtensionUsageResponse | null =
    result?.key === key ? result.payload : (_cache.get(key) ?? null);
  const error = failure?.key === key ? failure.message : null;
  const loading = !data && !error;

  useEffect(() => {
    _lastDays = days;
    _lastStaff = includeStaff;
  }, [days, includeStaff]);

  useEffect(() => {
    let alive = true;
    const k = keyFor(days, includeStaff);
    (async () => {
      try {
        const qs = `days=${days}${includeStaff ? "&include_staff=1" : ""}`;
        const resp = await apiFetch(`/api/admin/extension-usage?${qs}`);
        const json = (await resp.json()) as ExtensionUsageResponse & { error?: string };
        if (!alive) return;
        if (!resp.ok || json.error) {
          // An RPC failure is a 500, never a 200 of zeros: a panel of zeros
          // reads as "nobody uses it", so a broken one must not look empty.
          setFailure({ key: k, message: json.error ?? `Extension usage unavailable (${resp.status})` });
        } else {
          _cache.set(k, json);
          setResult({ key: k, payload: json });
          setFailure(null);
        }
      } catch (e) {
        if (!alive) return;
        setFailure({ key: k, message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      alive = false;
    };
  }, [days, includeStaff]);

  const min = data?.minDenominator ?? 30;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: "68ch" }}>
          Two sources, kept apart on purpose. Forms filled is recorded for every connected account.
          Usage counts exist only for people who chose Accept, so they understate use.
          {data
            ? data.includeStaff
              ? " Advisor and admin accounts are included."
              : ` Advisor and admin accounts are excluded (${fmt(data.staffExcluded)}).`
            : ""}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>Window</span>
            <select
              data-ext-window
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 13, background: "var(--surface)", color: "var(--text)" }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
            <input
              data-ext-include-staff
              type="checkbox"
              checked={includeStaff}
              onChange={(e) => setIncludeStaff(e.target.checked)}
            />
            Include staff accounts
          </label>
        </div>
      </div>

      {loading && !data && (
        <div style={{ height: 200, borderRadius: 10, background: "var(--surface2)", opacity: 0.6 }} />
      )}
      {error && !data && (
        <div
          role="alert"
          style={{ background: "var(--red-bg, #fef2f2)", border: "1px solid var(--red-ink, #fecaca)", borderRadius: 8, padding: "11px 14px", color: "var(--red-ink, #b91c1c)", fontSize: 13 }}
        >
          {error}
        </div>
      )}

      {data && (
        <>
          {isEmptyUsage(data) && !data.includeStaff && data.staffExcluded > 0 && (
            <div
              role="note"
              data-ext-empty-staff
              style={{ background: "var(--amber-bg)", color: "var(--amber-ink)", borderRadius: 8, padding: "11px 14px", fontSize: 13, marginBottom: 16 }}
            >
              No extension activity from accounts outside the team yet. {fmt(data.staffExcluded)} advisor
              and admin accounts are left out. Turn on Include staff accounts to see their testing.
            </div>
          )}

          <section
            data-ext-accounts
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 16 }}
          >
            <AdminKpiCard title="Connected now" value={fmt(data.accounts.connectedNow)} sub="signed in, not revoked or expired" />
            <AdminKpiCard title="Ever connected" value={fmt(data.accounts.everConnected)} sub={`${fmt(data.accounts.sessionsTotal)} sessions in total`} />
            <AdminKpiCard title={`Active, last ${data.windowDays} days`} value={fmt(data.accounts.seenInWindow)} sub="made a request in the window" />
            <AdminKpiCard title="Chose Accept" value={fmt(data.accounts.choseAccept)} sub="sent at least one usage count" />
          </section>

          <AdminChartCard
            title="Forms filled"
            cap="Recorded for every connected account whenever a form is filled. A fill is saved, not applied: the extension cannot see a submit, so a row moves to applied only when the person confirms it."
          >
            <div
              data-ext-tracker
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 16 }}
            >
              <AdminKpiCard title="Recorded, all time" value={fmt(data.tracker.recordedTotal)} sub={`${fmt(data.tracker.accounts)} accounts`} />
              <AdminKpiCard title={`Last ${data.windowDays} days`} value={fmt(data.tracker.recordedInWindow)} sub="forms filled in the window" />
              <AdminKpiCard
                title="Applied or later"
                value={fmt(data.tracker.reachedApplied)}
                sub={<span data-ext-applied-rate>{rateOr(data.tracker.appliedPct, min, "forms")}</span>}
              />
            </div>
            <AdminBarRows
              data={data.tracker.byStatus.map((s) => [s.key, s.count] as [string, number])}
              label={(k) => data.tracker.byStatus.find((s) => s.key === k)?.label ?? k}
              labelWidth={190}
              dimKey={(k) => k === "archived"}
            />
            <div style={{ marginTop: 16 }}>
              <DayBars series={data.tracker.byDay} caption="forms filled per day" />
            </div>
          </AdminChartCard>

          <AdminChartCard
            title="Usage counts"
            cap="Only people who chose Accept on the welcome page. These are different people from the forms-filled numbers above, so the two are never divided by each other."
            style={{ marginTop: 16 }}
          >
            {data.events.total === 0 ? (
              <p data-ext-no-events style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                No usage counts in this window.
              </p>
            ) : (
              <>
                <div
                  data-ext-events
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 16 }}
                >
                  <AdminKpiCard title="Fills" value={fmt(data.events.fills.count)} sub={`${fmt(data.events.fills.accounts)} accounts`} />
                  <AdminKpiCard title="Fields filled" value={fmt(data.events.fills.filled)} sub={`${fmt(data.events.fills.skipped)} skipped`} />
                  <AdminKpiCard
                    title="Required fields left open"
                    value={`${fmt(data.events.fills.requiredOpen)} of ${fmt(data.events.fills.requiredTotal)}`}
                    sub={<span data-ext-open-rate>{rateOr(data.events.fills.requiredOpenPct, min, "fills")}</span>}
                  />
                  <AdminKpiCard
                    title="Fills undone"
                    value={fmt(data.events.fills.undone)}
                    sub={<span data-ext-undo-rate>{rateOr(data.events.fills.undoPct, min, "fills")}</span>}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 8 }}>Fills by site</div>
                    <Rows rows={data.events.bySite} empty="No fills yet." />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 8 }}>
                      Résumé attach · <span data-ext-attach-rate style={{ fontWeight: 500 }}>{rateOr(data.events.attachedPct, min, "attempts")}</span>
                    </div>
                    <Rows rows={data.events.attach} empty="No attach attempts." />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 8 }}>Job page card</div>
                    <Rows rows={data.events.panel} empty="No card actions." />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 8 }}>Problems reported</div>
                    <Rows rows={data.events.problems} empty="No problems reported." />
                  </div>
                </div>
                {data.events.referral && <ReferralSection referral={data.events.referral} min={min} />}
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 8 }}>
                    Every event, last {data.windowDays} days
                  </div>
                  <Rows rows={data.events.byName} empty="No events." />
                </div>
                <div style={{ marginTop: 18 }}>
                  <DayBars series={data.events.fillsByDay} caption="fills per day" />
                </div>
              </>
            )}
          </AdminChartCard>

          <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}>
            Percentages appear once there are at least {fmt(min)} to measure against. Counts always show.
            Events carry no address, field label or answer, and the site is only ever a vendor name.
          </p>
        </>
      )}
    </div>
  );
}
