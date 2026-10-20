"use client";

/**
 * The referrer's view of what they have earned referring people.
 *
 * Two things are load-bearing here and both are about not overpromising.
 *
 * Pending days are shown as pending rather than hidden or rounded up to
 * "granted". The award is recorded by a database trigger and the subscription
 * is extended by the backend, so for a few seconds the two disagree; showing
 * the row as "On the way" is honest and it means a reward that arrives late
 * does not read as a broken feature.
 *
 * The interview reward is the headline number because it is the one a
 * referrer has to do something for: marking a request referred pays 3 days and
 * is nearly free, so it says so directly rather than hiding it in the history.
 */
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  fetchMyReferralRewards,
  grantedRewardDays,
  pendingRewardDays,
  rewardDaysLabel,
  rewardStatusLabel,
  rewardSummary,
  REFERRAL_OUTCOME_LABELS,
  REFERRAL_REWARD_DAYS,
  type RewardEntry,
} from "@/lib/referralRewards";
import type { CompanyReferralRequest } from "@/lib/companyReferrers";
import { markRewardIdsSeen, rewardNotificationId } from "@/lib/productNotices";

const cardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
};

type LoadState =
  | { status: "loading" }
  /** 404 from the backend, or genuinely nothing earned. Both mean: stay quiet. */
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: RewardEntry[] };

/** This card is where rewards are read, so rendering them clears the bell. */
function acknowledgeRewards(entries: RewardEntry[]) {
  markRewardIdsSeen(
    entries.filter((entry) => entry.status !== "revoked").map(rewardNotificationId),
  );
}

export function ReferralRewardsCard({
  requests = [],
}: {
  /** The referrer's asks, used read-only to show what candidates reported back. */
  requests?: CompanyReferralRequest[];
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    const result = await fetchMyReferralRewards();
    if (result.ok) {
      acknowledgeRewards(result.data);
      setState(result.data.length === 0 ? { status: "empty" } : { status: "ready", entries: result.data });
    } else {
      setState({ status: "error", message: result.error });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchMyReferralRewards();
      if (cancelled) return;
      if (result.ok) {
        acknowledgeRewards(result.data);
        setState(result.data.length === 0 ? { status: "empty" } : { status: "ready", entries: result.data });
      } else {
        setState({ status: "error", message: result.error });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") {
    return (
      <Card>
        <Body>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Rewards</div>
          <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14 }}>Loading your rewards...</p>
        </Body>
      </Card>
    );
  }

  const reported = requests.filter((row) => row.candidateOutcome != null);

  // Silent until there is something to say. An empty card on every fresh desk
  // teaches referrers to scroll past it. A reported outcome is worth showing
  // even when the ledger has not caught up.
  if (state.status === "empty" && reported.length === 0) return null;

  if (state.status === "error") {
    return (
      <Card>
        <Body>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Rewards</div>
          <p role="alert" style={{ margin: "8px 0 0", color: "#dc2626", fontSize: 14 }}>{state.message}</p>
          <RetryButton onClick={() => void load()} />
        </Body>
      </Card>
    );
  }

  const entries = state.status === "ready" ? state.entries : [];
  const granted = grantedRewardDays(entries);
  const pending = pendingRewardDays(entries);

  return (
    <Card>
      <Body>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Rewards</div>
        <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14, lineHeight: 1.55 }}>
          Marking a candidate referred earns {rewardDaysLabel(REFERRAL_REWARD_DAYS.referred)}.
          If they report an interview, that becomes {rewardDaysLabel(REFERRAL_REWARD_DAYS.interview)}.
          Candidates report from their own requests; a hire is shown here once they tell us.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <Stat label="Added to your Pro" value={granted} />
          <Stat label="On the way" value={pending} tone="#b45309" />
        </div>

        {reported.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>What candidates told us</div>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {reported.map((row) => (
                <div key={row.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", fontSize: 13 }}>
                  <span style={{ color: "#374151", minWidth: 0 }}>
                    {row.candidateName || "A candidate"}
                    {row.role ? <span style={{ color: "#9ca3af" }}> · {row.role}</span> : null}
                  </span>
                  <span style={{ color: row.candidateOutcome === "closed" ? "#6b7280" : "#15803d", fontWeight: 800, whiteSpace: "nowrap" }}>
                    {REFERRAL_OUTCOME_LABELS[row.candidateOutcome!]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {entries.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>History</div>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {entries.slice(0, 8).map((entry) => (
              <div key={entry.id || `${entry.kind}-${entry.createdAt}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", fontSize: 13 }}>
                  <span style={{ color: "#374151", minWidth: 0 }}>{rewardSummary(entry)}</span>
                  <span style={{ color: entry.status === "granted" ? "#15803d" : "#b45309", fontWeight: 800, whiteSpace: "nowrap" }}>
                    {entry.status === "revoked" ? rewardStatusLabel(entry.status) : rewardDaysLabel(entry.days)}
                  </span>
                </div>
              ))}
            </div>
            {entries.length > 8 ? (
              <p style={{ margin: "10px 0 0", color: "#9ca3af", fontSize: 12 }}>Showing the 8 most recent.</p>
            ) : null}
          </div>
        ) : null}
      </Body>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ ...cardStyle, position: "relative" }}>{children}</div>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 22 }}>{children}</div>;
}

function Stat({ label, value, tone = "#15803d" }: { label: string; value: number; tone?: string }) {
  return (
    <div style={{ flex: "1 1 140px", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, padding: 14, background: "#f8fafc" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 13, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: 12,
        border: "1px solid rgba(15,23,42,0.10)",
        background: "#fff",
        color: "#2563eb",
        borderRadius: 12,
        padding: "8px 14px",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      Retry
    </button>
  );
}

