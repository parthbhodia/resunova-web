/**
 * Referral rewards: one ledger, two programs.
 *
 * The employee desk (docs/COMPANY_REFERRER_HLD.md) pays an employee who refers
 * a candidate. The invite program pays a user who brings a friend in. Both pay
 * in Pro days, so they share a ledger rather than each growing its own counter.
 *
 * Nothing here grants anything. This module holds the numbers, the copy, and the
 * reads. The grant is the backend's: `referral_reward_ledger` is written by a
 * database trigger and drained by resunova-api, because `billing_subscriptions`
 * has no client policy and a subscription period cannot be extended from the
 * browser. See docs/REFERRAL_REWARDS_HLD.md for the contract.
 */
import { apiFetch } from "@/lib/apiClient";
import { getSupabaseClient } from "@/lib/supabase";
import {
  REFERRAL_OUTCOMES,
  type LoadResult,
  type ReferralOutcome,
} from "@/lib/companyReferrers";

/** What earned the reward. A row is one award for one event. */
export type RewardKind = "referred" | "interview" | "invite_signup" | "invite_activated";

/** Which program paid. Both draw on the same ledger. */
export type RewardSource = "desk_referral" | "invite";

/**
 * `pending` means the trigger recorded the award and the backend has not
 * extended the subscription yet. The UI shows those days as "on the way"
 * rather than hiding them, because a reward that silently does not appear
 * reads as a bug and costs more trust than a day of delay does.
 */
export type RewardStatus = "pending" | "granted" | "revoked";

export type RewardEntry = {
  id: string;
  kind: RewardKind;
  source: RewardSource;
  days: number;
  status: RewardStatus;
  /** Candidate name for desk rewards. Null for invite rows. */
  subject: string | null;
  createdAt: string;
  grantedAt: string | null;
};

/**
 * Pro days per event.
 *
 * Paid on outcomes, never on the ask. A reward for "someone asked me" buys
 * drive-by asks and rewards the desk for volume it did not create.
 */
export const REFERRAL_REWARD_DAYS: Record<RewardKind, number> = {
  referred: 3,
  interview: 10,
  invite_signup: 0,
  invite_activated: 7,
};

/** The invite curve. Kept next to the desk numbers so the two stay comparable. */
export const INVITE_REWARD_DAYS = {
  /** The friend acts immediately, so signing up is worth something to them. */
  friendOnSignup: 7,
  /** The referrer is paid when the friend proves they used the product. */
  referrerOnActivation: 7,
  /** Subscription is the strongest signal, so it pays most. */
  referrerOnSubscribe: 14,
} as const;

/**
 * Ceiling on days a single referrer can earn from invites in a year.
 *
 * Without it, someone with a large audience converts a one-off favor into a
 * permanent entitlement. Ninety days is about three months of Pro: large enough
 * to feel worth sharing, bounded enough that the cost has a ceiling.
 */
export const INVITE_ANNUAL_DAY_CAP = 90;

/** What the friend gets at each step of the invite curve. */
export type InviteStage = "signed_up" | "activated" | "subscribed";

export type InviteReward = {
  referrerDays: number;
  friendDays: number;
  friendDiscountPct: number;
};

export const INVITE_REWARDS: Record<InviteStage, InviteReward> = {
  signed_up: { referrerDays: 0, friendDays: INVITE_REWARD_DAYS.friendOnSignup, friendDiscountPct: 0 },
  activated: { referrerDays: INVITE_REWARD_DAYS.referrerOnActivation, friendDays: 0, friendDiscountPct: 0 },
  // The old card's 20%, kept on the first three months only. A standing
  // discount trains people to wait for one.
  subscribed: { referrerDays: INVITE_REWARD_DAYS.referrerOnSubscribe, friendDays: 0, friendDiscountPct: 20 },
};

/**
 * What a candidate can report back after being referred.
 *
 * Declared in companyReferrers because it is a column on the request row, and
 * that module must not import from this one. Re-exported so reward copy has a
 * single import site.
 */
export { REFERRAL_OUTCOMES, type ReferralOutcome };

export const REFERRAL_OUTCOME_LABELS: Record<ReferralOutcome, string> = {
  interview: "I got an interview",
  offer: "I got an offer",
  placed: "I got the job",
  closed: "It did not work out",
};

/**
 * The reward kind an outcome earns. Placement pays nothing extra: it maps to the
 * interview kind because the offer must have happened, and a self-reported hire
 * is not verifiable enough to pay a second time. An interview and a closed
 * outcome set the same kind, so a later close cannot revoke the days.
 */
export const OUTCOME_REWARD_KINDS: Record<ReferralOutcome, RewardKind | null> = {
  interview: "interview",
  offer: "interview",
  placed: "interview",
  closed: null,
};

const REWARD_KIND_LABELS: Record<RewardKind, string> = {
  referred: "Candidate marked as referred",
  interview: "Candidate reported an interview",
  invite_signup: "Friend signed up",
  invite_activated: "Friend started using Resunova",
};

/**
 * Toast copy for a reward the referrer has not seen yet.
 *
 * Leads with the candidate when there is one, because "Alex Kim reported an
 * interview" is the sentence a referrer wants to read and "10 Pro days" is not
 * what makes them open the app.
 */
export function rewardToastCopy(
  entry: Pick<RewardEntry, "kind" | "status" | "days" | "subject">,
): { title: string; description: string } {
  const days = rewardDaysLabel(entry.days);
  const subject = (entry.subject ?? "").trim().slice(0, 60);
  if (entry.kind === "interview") {
    return {
      title: subject ? `${subject} reported an interview` : "A referral landed",
      description: `${days} added to your Pro.`,
    };
  }
  if (entry.kind === "referred") {
    return {
      title: "Candidate marked as referred",
      description: `${days} added to your Pro.`,
    };
  }
  return {
    title: "Referral reward",
    description: entry.status === "pending"
      ? `${days} on the way to your Pro account.`
      : `${days} added to your Pro.`,
  };
}

const REWARD_STATUS_LABELS: Record<RewardStatus, string> = {
  pending: "On the way",
  granted: "Added",
  revoked: "Removed",
};

export function isRewardKind(value: unknown): value is RewardKind {
  return typeof value === "string" && value in REFERRAL_REWARD_DAYS;
}

export function isRewardStatus(value: unknown): value is RewardStatus {
  return value === "pending" || value === "granted" || value === "revoked";
}

export function isReferralOutcome(value: unknown): value is ReferralOutcome {
  return typeof value === "string" && (REFERRAL_OUTCOMES as readonly string[]).includes(value);
}

export function rewardLabel(kind: RewardKind): string {
  return REWARD_KIND_LABELS[kind];
}

export function rewardStatusLabel(status: RewardStatus): string {
  return REWARD_STATUS_LABELS[status];
}

/** "3 Pro days", "1 Pro day". Never a bare number next to an ambiguous noun. */
export function rewardDaysLabel(days: number): string {
  const safe = Number.isFinite(days) ? Math.max(0, Math.round(days)) : 0;
  return `${safe} Pro ${safe === 1 ? "day" : "days"}`;
}

/**
 * One line per award, candidate named when there is one.
 *
 * The subject is user-supplied text, so it is clipped rather than trusted to be
 * short; a 2,000-character name must not break the card layout.
 */
export function rewardSummary(entry: Pick<RewardEntry, "kind" | "subject">): string {
  const base = rewardLabel(entry.kind);
  const subject = (entry.subject ?? "").trim().slice(0, 60);
  return subject ? `${base}: ${subject}` : base;
}

export function pendingRewardDays(entries: readonly RewardEntry[]): number {
  return entries
    .filter((entry) => entry.status === "pending")
    .reduce((total, entry) => total + Math.max(0, entry.days), 0);
}

export function grantedRewardDays(entries: readonly RewardEntry[]): number {
  return entries
    .filter((entry) => entry.status === "granted")
    .reduce((total, entry) => total + Math.max(0, entry.days), 0);
}

/** Days earned this calendar year, for the invite cap check. */
export function earnedDaysThisYear(entries: readonly RewardEntry[], now = new Date()): number {
  const year = now.getUTCFullYear();
  return entries
    .filter((entry) => {
      if (entry.source !== "invite") return false;
      const date = new Date(entry.createdAt);
      return date.getUTCFullYear() === year;
    })
    .reduce((total, entry) => total + Math.max(0, entry.days), 0);
}

/** Days still available to earn this year. Never negative. */
export function inviteDaysRemaining(entries: readonly RewardEntry[], now = new Date()): number {
  return Math.max(0, INVITE_ANNUAL_DAY_CAP - earnedDaysThisYear(entries, now));
}

export const REFERRAL_REWARDS_FAILED = "Could not load your rewards. Try again.";

/**
 * `GET /api/referral/rewards`.
 *
 * A 404 means the backend has not shipped the route yet, which is the expected
 * state until it does. That resolves to an empty list rather than an error so
 * the rewards card hides itself instead of showing a failure to a user who has
 * earned nothing yet. Every other failure is a real failure.
 */
export async function fetchMyReferralRewards(): Promise<LoadResult<RewardEntry[]>> {
  try {
    const resp = await apiFetch("/api/referral/rewards");
    if (resp.status === 404) return { ok: true, data: [] };
    if (!resp.ok) return { ok: false, error: REFERRAL_REWARDS_FAILED };
    const body = (await resp.json()) as { entries?: unknown };
    const rows = Array.isArray(body?.entries) ? body.entries : [];
    const entries = rows
      .map(parseRewardEntry)
      .filter((entry): entry is RewardEntry => entry !== null);
    return { ok: true, data: entries };
  } catch {
    return { ok: false, error: REFERRAL_REWARDS_FAILED };
  }
}

/**
 * Tolerant row parser. The backend owns this shape, so an unexpected value is
 * dropped rather than rendered as "undefined Pro days".
 */
export function parseRewardEntry(raw: unknown): RewardEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!isRewardKind(row.kind)) return null;
  const days = typeof row.days === "number" ? row.days : Number(row.days);
  if (!Number.isFinite(days) || days <= 0) return null;
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : "";
  if (!createdAt || !Number.isFinite(Date.parse(createdAt))) return null;
  return {
    id: typeof row.id === "string" ? row.id : "",
    kind: row.kind,
    source: row.source === "invite" ? "invite" : "desk_referral",
    days: Math.round(days),
    status: isRewardStatus(row.status) ? row.status : "pending",
    subject: typeof row.subject === "string" ? row.subject : null,
    createdAt,
    grantedAt: typeof row.grantedAt === "string" ? row.grantedAt : null,
  };
}

export const REFERRAL_OUTCOME_FAILED = "Could not save that. Try again.";

export function referralOutcomeError(error: { message?: string } | null | undefined): string {
  const message = (error?.message ?? "").toLowerCase();
  if (message.includes("not your request")) return "That request is not yours to update.";
  // Matches the RPC text in migrations 059/061. The status guard is the one a
  // candidate will actually hit, so it has to land on a real message.
  if (message.includes("once you are referred")) {
    return "You can only report an outcome once you are marked referred.";
  }
  if (message.includes("already reported")) return "You already reported an outcome for this request.";
  if (message.includes("already final")) return "This referral is already marked as final.";
  if (message.includes("move backwards")) return "An outcome cannot move backwards.";
  return REFERRAL_OUTCOME_FAILED;
}

/**
 * `report_referral_outcome(request_id, outcome)`.
 *
 * A SECURITY DEFINER RPC, not a direct update: the candidate has no UPDATE
 * policy on `company_referral_requests`, and the referrer does, which is
 * exactly the wrong way round when the referrer is the one who would be paying
 * the 10-day reward.
 */
export async function reportReferralOutcome(
  requestId: string,
  outcome: ReferralOutcome,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { error } = await getSupabaseClient().rpc("report_referral_outcome", {
      request_id: requestId,
      outcome,
    });
    if (error) {
      console.warn("[referral-rewards] report outcome:", error.message);
      return { ok: false, error: referralOutcomeError(error) };
    }
    return { ok: true, error: null };
  } catch (err) {
    console.warn("[referral-rewards] report outcome:", err);
    return { ok: false, error: referralOutcomeError(null) };
  }
}

/* ── Invite codes ─────────────────────────────────────────────── */

const INVITE_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Invite codes are shown in the UI and typed by hand, so the alphabet drops
 * the characters people confuse when reading a code aloud: i, l, o, 0 and 1.
 */
export function sanitizeInviteCode(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
}

/** Deterministic per user, so a repeat call does not invalidate shared links. */
export function makeInviteCode(userId: string, salt = "resunova"): string {
  const seed = `${salt}:${userId}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let out = "";
  let state = hash >>> 0;
  for (let i = 0; i < 8; i += 1) {
    state = Math.imul(state ^ (state >>> 13), 1274126177) >>> 0;
    out += INVITE_CODE_ALPHABET[state % INVITE_CODE_ALPHABET.length];
  }
  return out;
}

export function invitePath(code: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/invite/${sanitizeInviteCode(code)}`;
}