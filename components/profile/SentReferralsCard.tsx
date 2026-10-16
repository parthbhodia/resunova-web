"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  REFERRAL_REQUEST_STATUS_LABELS,
  REFERRAL_REQUEST_STATUS_TONES,
  fetchMySentReferralRequests,
  nudgeButtonLabel,
  nudgeErrorMessage,
  nudgeReferralRequest,
  type SentReferralRequest,
} from "@/lib/companyReferrers";
import { ReferrerName } from "@/components/refer/ReferrerName";
import { onSentReferralRefresh, persistLastSeenSentReferral } from "@/lib/productNotices";

const cardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-card)",
};

const tones: Record<string, CSSProperties> = {
  neutral: { background: "var(--surface2)", color: "var(--muted)" },
  green: { background: "var(--green-bg)", color: "var(--green-ink)" },
  amber: { background: "var(--amber-bg)", color: "var(--amber-ink)" },
  blue: { background: "var(--accent-bg)", color: "var(--accent-ink)" },
  red: { background: "var(--red-bg)", color: "var(--red-ink)" },
};

export function SentReferralsCard() {
  const [rows, setRows] = useState<SentReferralRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nudgingId, setNudgingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next = await fetchMySentReferralRequests();
      if (cancelled) return;
      if (!next) {
        setError("Could not load your requests.");
        setLoading(false);
        return;
      }
      setRows(next);
      setLoading(false);
    };
    void load();
    void persistLastSeenSentReferral();
    const stop = onSentReferralRefresh(() => {
      void load();
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  const onNudge = async (row: SentReferralRequest) => {
    setNudgingId(row.id);
    setError(null);
    const result = await nudgeReferralRequest(row.id);
    setNudgingId(null);
    if (!result.ok) {
      setError(result.error ?? nudgeErrorMessage(null));
      return;
    }
    setRows((prev) => prev.map((item) => (
      item.id === row.id
        ? { ...item, nudgeCount: (item.nudgeCount ?? 0) + 1, lastNudgedAt: new Date().toISOString() }
        : item
    )));
  };

  return (
    <div style={cardStyle}>
      <div style={{ padding: "22px 22px 8px" }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Your requests</div>
        <div style={{ marginTop: 4, fontSize: 14, color: "var(--muted)" }}>
          Referrals you asked for, and where each one stands.
        </div>
      </div>
      <div style={{ padding: 22, display: "grid", gap: 12 }}>
        {loading ? <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Loading your requests…</p> : null}
        {!loading && rows.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            You have not asked anyone for a referral yet.{" "}
            <Link href="/refer" style={{ color: "var(--accent-ink)", fontWeight: 700, textDecoration: "none" }}>Find an employee</Link>
          </p>
        ) : null}
        {rows.map((row) => {
          const label = nudgeButtonLabel(row);
          const who = row.referrerName || "Employee";
          return (
            <div key={row.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 16, background: "var(--surface2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>
                    <ReferrerName name={who} count={row.referrerReferredCount} />
                  </div>
                  <div style={{ marginTop: 3, fontSize: 13, color: "var(--muted)" }}>
                    {row.role}{row.referrerCompany ? ` at ${row.referrerCompany}` : ""}
                  </div>
                </div>
                <span style={{ display: "inline-flex", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800, ...tones[REFERRAL_REQUEST_STATUS_TONES[row.status]] }}>
                  {REFERRAL_REQUEST_STATUS_LABELS[row.status]}
                </span>
              </div>
              {label ? (
                <button
                  type="button"
                  disabled={label !== "Nudge" || nudgingId === row.id}
                  onClick={() => void onNudge(row)}
                  style={{
                    marginTop: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: label === "Nudge" ? "var(--accent-ink)" : "var(--dim)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: label === "Nudge" ? "pointer" : "default",
                  }}
                >
                  {nudgingId === row.id ? "Nudging..." : label}
                </button>
              ) : null}
            </div>
          );
        })}
        {error ? <p role="alert" style={{ margin: 0, color: "var(--red-ink)", fontSize: 13 }}>{error}</p> : null}
      </div>
    </div>
  );
}
