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
import {
  OUTCOME_REWARD_KINDS,
  REFERRAL_OUTCOME_LABELS,
  REFERRAL_REWARD_DAYS,
  referralOutcomeError,
  reportReferralOutcome,
  rewardDaysLabel,
  type ReferralOutcome,
} from "@/lib/referralRewards";
import { FeedbackToastCard, type FeedbackToastVariant } from "@/components/FeedbackToastCard";
import { ReferrerName } from "@/components/refer/ReferrerName";
import { onSentReferralRefresh, persistLastSeenSentReferral } from "@/lib/productNotices";

const cardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
};

const tones: Record<string, CSSProperties> = {
  neutral: { background: "#f3f4f6", color: "#6b7280" },
  green: { background: "#dcfce7", color: "#15803d" },
  amber: { background: "#fef3c7", color: "#b45309" },
  blue: { background: "#dbeafe", color: "#2563eb" },
  red: { background: "#fee2e2", color: "#dc2626" },
};

/**
 * The candidate's own list. It is also the only place an outcome can be
 * reported: the RPC accepts the candidate, not the referrer, because the
 * referrer is the party the reward pays. The referrer's card is read-only.
 *
 * Outcomes move forwards only (interview -> offer -> placed, or closed), so the
 * buttons shown depend on what has already been reported. `placed` is
 * informational for now: it tells the referrer the referral worked, and the 10
 * days were already earned at the interview/offer.
 */
function nextOutcomes(outcome: ReferralOutcome | null): ReferralOutcome[] {
  if (outcome === "interview") return ["offer", "placed", "closed"];
  if (outcome === "offer") return ["placed", "closed"];
  if (outcome === "placed" || outcome === "closed") return [];
  return ["interview", "offer", "placed", "closed"];
}

export function SentReferralsCard() {
  const [rows, setRows] = useState<SentReferralRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; description: string; variant: FeedbackToastVariant } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

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

  const onReport = async (row: SentReferralRequest, outcome: ReferralOutcome) => {
    setReportingId(row.id);
    setToast(null);
    const result = await reportReferralOutcome(row.id, outcome);
    setReportingId(null);
    if (!result.ok) {
      setToast({
        title: "Could not save that",
        description: result.error ?? referralOutcomeError(null),
        variant: "error",
      });
      return;
    }
    setRows((prev) => prev.map((item) => (
      item.id === row.id
        ? { ...item, candidateOutcome: outcome, candidateOutcomeAt: new Date().toISOString() }
        : item
    )));
    const rewardKind = OUTCOME_REWARD_KINDS[outcome];
    const days = rewardKind ? REFERRAL_REWARD_DAYS[rewardKind] : 0;
    // The trigger only pays on the first outcome. Updating an interview to an
    // offer, or an offer to a hire, must not claim a second 10 days.
    const earnsNow = row.candidateOutcome == null && rewardKind != null;
    const beneficiary = row.referrerName || "Your referrer";
    setToast(
      earnsNow
        ? {
            title: "Thanks for closing the loop",
            description: `${beneficiary} gets ${rewardDaysLabel(days)} on their Pro account.`,
            variant: "success",
          }
        : outcome === "closed"
          ? {
              title: "Noted",
              description: "Thanks for telling them. No reward for a referral that did not work out.",
              variant: "info",
            }
          : {
              title: "Thanks for the update",
              description: "The outcome is saved. Your referrer can see it.",
              variant: "info",
            },
    );
  };

  return (
    <div style={cardStyle}>
      <div style={{ padding: "22px 22px 8px" }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Your requests</div>
        <div style={{ marginTop: 4, fontSize: 14, color: "#6b7280" }}>
          Referrals you asked for, and where each one stands.
        </div>
      </div>
      <div style={{ padding: 22, display: "grid", gap: 12 }}>
        {loading ? <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>Loading your requests...</p> : null}
        {!loading && rows.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            You have not asked anyone for a referral yet.{" "}
            <Link href="/refer" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>Find an employee</Link>
          </p>
        ) : null}
        {rows.map((row) => {
          const label = nudgeButtonLabel(row);
          const who = row.referrerName || "them";
          const options = nextOutcomes(row.candidateOutcome);
          return (
            <div key={row.id} style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, padding: 16, background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>
                    <ReferrerName name={who} count={row.referrerReferredCount} />
                  </div>
                  <div style={{ marginTop: 3, fontSize: 13, color: "#6b7280" }}>
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
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "#fff",
                    color: label === "Nudge" ? "#2563eb" : "#9ca3af",
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

              {row.status === "referred" && row.candidateUserId ? (
                <div style={{ marginTop: 14, borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>How did it go?</div>
                  {row.candidateOutcome ? (
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>
                      You told us:{" "}
                      <strong style={{ color: row.candidateOutcome === "closed" ? "#6b7280" : "#15803d" }}>
                        {REFERRAL_OUTCOME_LABELS[row.candidateOutcome]}
                      </strong>
                    </p>
                  ) : null}
                  {options.length > 0 ? (
                    <>
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                        {row.candidateOutcome
                          ? "If it turned into a job, update it here. It tells them the referral worked."
                          : `Tell ${who} what happened. If you got an interview, they earn ${rewardDaysLabel(REFERRAL_REWARD_DAYS.interview)}.`}
                      </p>
                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        {options.map((outcome) => (
                          <button
                            key={outcome}
                            type="button"
                            disabled={reportingId === row.id}
                            onClick={() => void onReport(row, outcome)}
                            style={{
                              border: outcome === "closed" ? "1px solid rgba(15,23,42,0.10)" : "none",
                              background: outcome === "closed" ? "#fff" : "#2563eb",
                              color: outcome === "closed" ? "#6b7280" : "#fff",
                              borderRadius: 10,
                              padding: "8px 12px",
                              fontWeight: 800,
                              fontSize: 13,
                              cursor: reportingId === row.id ? "default" : "pointer",
                              opacity: reportingId === row.id ? 0.6 : 1,
                            }}
                          >
                            {REFERRAL_OUTCOME_LABELS[outcome]}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {error ? <p role="alert" style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>{error}</p> : null}
      </div>
      {toast ? (
        <FeedbackToastCard
          variant={toast.variant}
          role={toast.variant === "error" ? "alert" : "status"}
          title={toast.title}
          description={toast.description}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
