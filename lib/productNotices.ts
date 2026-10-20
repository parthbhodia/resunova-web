/**
 * In-app notices: a one-time What's new card, and a toast when someone asks
 * a signed-up referrer for a referral. Email prefs are a separate channel.
 */
import type { CompanyReferralRequest } from "@/lib/companyReferrers";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchMyReferralRewards, rewardDaysLabel, rewardToastCopy, type RewardEntry } from "@/lib/referralRewards";

export const DISMISSED_NOTICES_KEY = "rn_dismissed_notices_v1";
export const LAST_SEEN_REFERRAL_KEY = "rn_last_seen_referral_at_v1";
export const LAST_SEEN_SENT_REFERRAL_KEY = "rn_last_seen_sent_referral_at_v1";
export const TOASTED_REFERRAL_KEY = "rn_toasted_referral_ids_v1";
export const TOASTED_SENT_REFERRAL_KEY = "rn_toasted_sent_referral_ids_v1";
export const TOASTED_REWARD_KEY = "rn_toasted_reward_ids_v1";
export const REFERRAL_INBOX_POLL_MS = 60_000;

export type ProductNotice = {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

export const PRODUCT_NOTICES: ProductNotice[] = [
  {
    id: "company-referrals-2026-10",
    title: "Refer candidates at your company",
    body: "Sign up on your profile, share a private link, and review people who ask you for a referral.",
    href: "/profile?tab=referrals",
    cta: "Try it",
  },
];

export type NoticeState = {
  dismissedIds: string[];
  lastSeenReferralAt: string | null;
};

export type ReferralAlertSnapshot = {
  unread: number;
  company: string;
};

export type ReferralToastDecision = {
  toast: { title: string; description: string } | null;
  newlyToasted: string[];
  markSeen: boolean;
};

const EMPTY_ALERT: ReferralAlertSnapshot = { unread: 0, company: "" };
let alertSnapshot: ReferralAlertSnapshot = EMPTY_ALERT;
const alertListeners = new Set<(snapshot: ReferralAlertSnapshot) => void>();
let inboxOpen = false;
const inboxRefreshers = new Set<() => void>();
const sentRefreshers = new Set<() => void>();

export function pendingProductNotice(dismissedIds: readonly string[]): ProductNotice | null {
  return PRODUCT_NOTICES.find((notice) => !dismissedIds.includes(notice.id)) ?? null;
}

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
};

export type NotificationFeed = {
  count: number;
  items: AppNotification[];
};

const EMPTY_FEED: NotificationFeed = { count: 0, items: [] };

function finiteCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/** Red-badge total: one per new feature, plus each unread ask, nudge, or outcome. */
export function notificationFeed(input: {
  notice: ProductNotice | null;
  inboxUnread: number;
  outcomeUnread: number;
  /** Live (non-revoked) ledger rows, for the rewards row on the bell. */
  rewardUnread?: number | undefined;
  rewardDays?: number | undefined;
}): NotificationFeed {
  const items: AppNotification[] = [];
  if (input.notice) {
    items.push({
      id: input.notice.id,
      title: input.notice.title,
      body: input.notice.body,
      href: input.notice.href,
    });
  }
  const inboxUnread = finiteCount(input.inboxUnread);
  if (inboxUnread > 0) {
    items.push({
      id: "referral-inbox",
      title: inboxUnread === 1 ? "New referral request" : `${inboxUnread} new referral requests`,
      body: "Someone asked you for a referral, or nudged you about one.",
      href: "/profile?tab=referrals",
    });
  }
  const outcomeUnread = finiteCount(input.outcomeUnread);
  if (outcomeUnread > 0) {
    items.push({
      id: "referral-outcomes",
      title: outcomeUnread === 1 ? "Referral update" : `${outcomeUnread} referral updates`,
      body: "A request you sent was updated (reviewing, referred, or declined).",
      href: "/profile?tab=referrals",
    });
  }
  const rewardUnread = finiteCount(input.rewardUnread);
  if (rewardUnread > 0) {
    const days = finiteCount(input.rewardDays);
    items.push({
      id: "referral-rewards",
      title: rewardUnread === 1 ? "Referral reward earned" : `${rewardUnread} referral rewards`,
      body: days > 0
        ? `${rewardDaysLabel(days)} from referrals so far.`
        : "You earned Pro days by referring candidates.",
      href: "/profile?tab=referrals",
    });
  }
  return {
    count: (input.notice ? 1 : 0) + inboxUnread + outcomeUnread + rewardUnread,
    items,
  };
}

let feedSnapshot: NotificationFeed = EMPTY_FEED;
const feedListeners = new Set<(feed: NotificationFeed) => void>();

export function publishNotificationFeed(next: NotificationFeed) {
  feedSnapshot = next;
  feedListeners.forEach((listener) => listener(feedSnapshot));
}

export function subscribeNotificationFeed(listener: (feed: NotificationFeed) => void): () => void {
  feedListeners.add(listener);
  listener(feedSnapshot);
  return () => {
    feedListeners.delete(listener);
  };
}

/* ── Referral rewards: bell + toast ────────────────────────────────────── */

/**
 * Keys off `kind:status` rather than id alone, so a reward that lands as
 * `pending` and then settles to `granted` is a second notification, not a
 * repeat of the first. It is the transition that carries the news: pending
 * means the trigger recorded the award, granted means the subscription was
 * actually extended.
 */
export function rewardNotificationId(entry: { id: string; kind: string; status: string }): string {
  return `${entry.id || entry.kind}:${entry.kind}:${entry.status}`;
}

/**
 * One bell row per user, not per award. A referrer who earned four rewards in
 * an hour gets "4 referral rewards" rather than four rows, because the bell is
 * a list of things to look at and four identical rows is a worse version of a
 * count.
 */
export function rewardFeed(
  entries: ReadonlyArray<{ id?: string; kind: string; status: string; days?: number | null }>,
  /** Rows the rewards card has already shown. Seen rows keep their days but leave the badge. */
  seenIds: readonly string[] = [],
): {
  count: number;
  days: number;
  unseen: boolean;
} {
  const live = entries.filter((entry) => entry.status !== "revoked");
  const days = live.reduce(
    (total, entry) => total + Math.max(0, Number(entry.days) || 0),
    0,
  );
  const seen = new Set(seenIds);
  const unseen = live.filter(
    (entry) =>
      !seen.has(
        rewardNotificationId({
          id: entry.id ?? "",
          kind: entry.kind,
          status: entry.status,
        }),
      ),
  );
  return { count: unseen.length, days, unseen: unseen.length > 0 };
}

let rewardToastSlot: { title: string; description: string } | null = null;
const rewardToastListeners = new Set<(toast: { title: string; description: string } | null) => void>();

export function publishRewardToast(toast: { title: string; description: string } | null) {
  rewardToastSlot = toast;
  rewardToastListeners.forEach((listener) => listener(rewardToastSlot));
}

export function subscribeRewardToast(
  listener: (toast: { title: string; description: string } | null) => void,
): () => void {
  rewardToastListeners.add(listener);
  listener(rewardToastSlot);
  return () => {
    rewardToastListeners.delete(listener);
  };
}

/**
 * Load the caller's rewards and toast the newest one they have not seen.
 *
 * Two rules, both about not crying wolf:
 *
 *   * the interview award outranks the referred one, because it is the event a
 *     referrer actually wants to know about and the other is near-automatic;
 *   * a reward that arrives while the rewards card is on screen is not toasted,
 *     because the user is already looking at it.
 */
export async function maybeToastNewReward(opts: {
  alreadySeen: readonly string[];
  visible: boolean;
}): Promise<{ entry: RewardEntry; toast: { title: string; description: string } } | null> {
  if (opts.visible) return null;
  const result = await fetchMyReferralRewards();
  if (!result.ok) return null;
  const entries = result.data;
  if (entries.length === 0) return null;

  const seen = new Set(opts.alreadySeen);
  const unseen = entries.filter((entry) => !seen.has(rewardNotificationId(entry)));
  if (unseen.length === 0) return null;

  const interview = unseen.find((entry) => entry.kind === "interview");
  const entry = interview ?? unseen[0];
  return { entry, toast: rewardToastCopy(entry) };
}

function seenCutoff(lastSeenAt: string | null): number {
  const seenMs = lastSeenAt ? Date.parse(lastSeenAt) : Number.NEGATIVE_INFINITY;
  return Number.isFinite(seenMs) ? seenMs : Number.NEGATIVE_INFINITY;
}

export function isFreshReferralNudge(row: CompanyReferralRequest, lastSeenAt: string | null): boolean {
  if (row.status !== "requested" && row.status !== "reviewing") return false;
  const nudged = row.lastNudgedAt ? Date.parse(row.lastNudgedAt) : NaN;
  return Number.isFinite(nudged) && nudged > seenCutoff(lastSeenAt);
}

function isFreshAsk(row: CompanyReferralRequest, lastSeenAt: string | null): boolean {
  if (row.source !== "request" || row.status !== "requested") return false;
  const created = Date.parse(row.createdAt);
  return Number.isFinite(created) && created > seenCutoff(lastSeenAt);
}

/** New asks, plus nudges, that arrived after the referrer last opened the inbox. */
export function unreadReferralRequests(
  rows: readonly CompanyReferralRequest[] | null | undefined,
  lastSeenAt: string | null,
): CompanyReferralRequest[] {
  if (!rows) return [];
  return rows
    .filter((row) => isFreshAsk(row, lastSeenAt) || isFreshReferralNudge(row, lastSeenAt))
    .sort((a, b) => {
      const aMs = Math.max(Date.parse(a.createdAt) || 0, a.lastNudgedAt ? Date.parse(a.lastNudgedAt) || 0 : 0);
      const bMs = Math.max(Date.parse(b.createdAt) || 0, b.lastNudgedAt ? Date.parse(b.lastNudgedAt) || 0 : 0);
      return bMs - aMs;
    });
}

export function referralAlertCopy(
  rows: readonly CompanyReferralRequest[],
  company: string,
): { title: string; description: string } {
  const name = rows[0]?.candidateName?.trim() || "Someone";
  const place = company.trim() ? ` at ${company.trim()}` : "";
  if (rows.length <= 1) {
    return {
      title: "New referral request",
      description: `${name} asked you for a referral${place}.`,
    };
  }
  const others = rows.length - 1;
  return {
    title: "New referral requests",
    description: `${name} and ${others} ${others === 1 ? "other" : "others"} asked you for a referral${place}.`,
  };
}

export function nudgeAlertCopy(
  rows: readonly CompanyReferralRequest[],
): { title: string; description: string } {
  const name = rows[0]?.candidateName?.trim() || "Someone";
  const role = rows[0]?.role?.trim();
  const about = role ? ` about ${role}` : "";
  if (rows.length <= 1) {
    return {
      title: "Referral nudge",
      description: `${name} nudged you${about}.`,
    };
  }
  const others = rows.length - 1;
  return {
    title: "Referral nudges",
    description: `${name} and ${others} ${others === 1 ? "other" : "others"} nudged you.`,
  };
}

export type ReferralOutcome = {
  id: string;
  status: string;
  role: string;
  referrerName: string;
  referrerCompany: string;
  updatedAt?: string;
  createdAt: string;
};

const OUTCOME_STATUSES = new Set(["reviewing", "referred", "declined"]);

export function unseenReferralOutcomes<T extends ReferralOutcome>(
  rows: readonly T[],
  lastSeenAt: string | null,
): T[] {
  const cutoff = seenCutoff(lastSeenAt);
  return (rows ?? []).filter((row) => {
    if (!OUTCOME_STATUSES.has(row.status)) return false;
    const updated = Date.parse(row.updatedAt || row.createdAt);
    return Number.isFinite(updated) && updated > cutoff;
  });
}

export function outcomeToastCopy(rows: readonly ReferralOutcome[]): { title: string; description: string } {
  if (rows.length !== 1) {
    return {
      title: "Referral updates",
      description: `${rows.length} of your referral requests were updated.`,
    };
  }
  const row = rows[0];
  const who = row.referrerName.trim() || "Your referrer";
  const role = row.role.trim() || "the role";
  const place = row.referrerCompany.trim() ? ` at ${row.referrerCompany.trim()}` : "";
  if (row.status === "reviewing") {
    return {
      title: "Referral update",
      description: `${who} is reviewing your referral request for ${role}${place}.`,
    };
  }
  if (row.status === "declined") {
    return {
      title: "Referral update",
      description: `${who} declined your referral request for ${role}${place}.`,
    };
  }
  return {
    title: "Referral update",
    description: `${who} marked you as referred for ${role}${place}.`,
  };
}

export function outcomeToastIds(rows: readonly ReferralOutcome[]): string[] {
  return rows.map((row) => `${row.id}:${row.status}`);
}

export function referralIdsToToast(
  unread: readonly { id: string }[],
  alreadyToasted: readonly string[],
): string[] {
  const seen = new Set(alreadyToasted);
  return unread.map((row) => row.id).filter((id) => id && !seen.has(id));
}

/** Inbox-open suppresses the toast and marks the desk seen. Otherwise toast each id once. */
export function referralToastForUnread(
  unread: readonly CompanyReferralRequest[],
  alreadyToasted: readonly string[],
  company: string,
  inboxIsOpen: boolean,
  lastSeenAt: string | null = null,
): ReferralToastDecision {
  if (inboxIsOpen) {
    return { toast: null, newlyToasted: [], markSeen: unread.length > 0 };
  }
  const newlyToasted = referralIdsToToast(unread, alreadyToasted);
  if (newlyToasted.length === 0) {
    return { toast: null, newlyToasted: [], markSeen: false };
  }
  const fresh = unread.filter((row) => newlyToasted.includes(row.id));
  const nudges = fresh.filter((row) => isFreshReferralNudge(row, lastSeenAt));
  const newest = fresh[0];
  const toast = newest && isFreshReferralNudge(newest, lastSeenAt) && nudges.length > 0
    ? nudgeAlertCopy(nudges)
    : referralAlertCopy(fresh.filter((row) => isFreshAsk(row, lastSeenAt)).length
      ? fresh.filter((row) => isFreshAsk(row, lastSeenAt))
      : fresh, company);
  return { toast, newlyToasted, markSeen: false };
}

export function outcomeToastForUnseen(
  unseen: readonly ReferralOutcome[],
  alreadyToasted: readonly string[],
  trackerOpen: boolean,
): ReferralToastDecision {
  if (trackerOpen) {
    return { toast: null, newlyToasted: [], markSeen: unseen.length > 0 };
  }
  const ids = outcomeToastIds(unseen);
  const newlyToasted = referralIdsToToast(ids.map((id) => ({ id })), alreadyToasted);
  if (newlyToasted.length === 0) {
    return { toast: null, newlyToasted: [], markSeen: false };
  }
  const fresh = unseen.filter((row) => newlyToasted.includes(`${row.id}:${row.status}`));
  return {
    toast: outcomeToastCopy(fresh),
    newlyToasted,
    markSeen: false,
  };
}

export function getReferralAlertSnapshot(): ReferralAlertSnapshot {
  return alertSnapshot;
}

export function publishReferralAlerts(next: ReferralAlertSnapshot) {
  alertSnapshot = next;
  alertListeners.forEach((listener) => listener(alertSnapshot));
}

export function subscribeReferralAlerts(listener: (snapshot: ReferralAlertSnapshot) => void): () => void {
  alertListeners.add(listener);
  listener(alertSnapshot);
  return () => {
    alertListeners.delete(listener);
  };
}

export function setReferralInboxOpen(open: boolean) {
  inboxOpen = open;
}

export function isReferralInboxOpen(): boolean {
  return inboxOpen;
}

export function onReferralInboxRefresh(listener: () => void): () => void {
  inboxRefreshers.add(listener);
  return () => {
    inboxRefreshers.delete(listener);
  };
}

export function requestReferralInboxRefresh() {
  inboxRefreshers.forEach((listener) => listener());
}

export function onSentReferralRefresh(listener: () => void): () => void {
  sentRefreshers.add(listener);
  return () => {
    sentRefreshers.delete(listener);
  };
}

export function requestSentReferralRefresh() {
  sentRefreshers.forEach((listener) => listener());
}

function readStringList(storage: Storage, key: string): string[] {
  try {
    const raw = storage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function readDismissedNoticeIds(): string[] {
  if (typeof window === "undefined") return [];
  return readStringList(window.localStorage, DISMISSED_NOTICES_KEY);
}

export function rememberDismissedNotice(id: string): string[] {
  const next = Array.from(new Set([...readDismissedNoticeIds(), id]));
  try {
    window.localStorage.setItem(DISMISSED_NOTICES_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

export function readLastSeenReferralAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_SEEN_REFERRAL_KEY);
  } catch {
    return null;
  }
}

export function rememberLastSeenReferralAt(iso: string) {
  try {
    window.localStorage.setItem(LAST_SEEN_REFERRAL_KEY, iso);
  } catch {
    /* private mode */
  }
}

export function readLastSeenSentReferralAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_SEEN_SENT_REFERRAL_KEY);
  } catch {
    return null;
  }
}

export function rememberLastSeenSentReferralAt(iso: string) {
  try {
    window.localStorage.setItem(LAST_SEEN_SENT_REFERRAL_KEY, iso);
  } catch {
    /* private mode */
  }
}

export function readToastedSentReferralIds(): string[] {
  if (typeof window === "undefined") return [];
  return readStringList(window.localStorage, TOASTED_SENT_REFERRAL_KEY);
}

export function rememberToastedSentReferralIds(ids: readonly string[]) {
  const next = Array.from(new Set([...readToastedSentReferralIds(), ...ids]));
  try {
    window.localStorage.setItem(TOASTED_SENT_REFERRAL_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

const sentSeenListeners = new Set<() => void>();

export function subscribeSentReferralSeen(listener: () => void): () => void {
  sentSeenListeners.add(listener);
  return () => {
    sentSeenListeners.delete(listener);
  };
}

export function readToastedReferralIds(): string[] {
  if (typeof window === "undefined") return [];
  return readStringList(window.localStorage, TOASTED_REFERRAL_KEY);
}

export function rememberToastedReferralIds(ids: readonly string[]) {
  const next = Array.from(new Set([...readToastedReferralIds(), ...ids]));
  try {
    window.localStorage.setItem(TOASTED_REFERRAL_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

export function readToastedRewardIds(): string[] {
  if (typeof window === "undefined") return [];
  return readStringList(window.localStorage, TOASTED_REWARD_KEY);
}

/**
 * Bounded. Unlike the referral toast keys, this one grows on its own (every
 * reward ever seen) rather than being cleared when a surface is opened, so it
 * keeps only the most recent slice. A referrer with years of history would
 * otherwise carry an unbounded array in localStorage.
 */
const REWARD_SEEN_LIMIT = 200;

export function rememberToastedRewardIds(ids: readonly string[]) {
  const next = Array.from(new Set([...ids, ...readToastedRewardIds()])).slice(0, REWARD_SEEN_LIMIT);
  try {
    window.localStorage.setItem(TOASTED_REWARD_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

const rewardsSeenListeners = new Set<() => void>();

export function onRewardsSeen(listener: () => void): () => void {
  rewardsSeenListeners.add(listener);
  return () => {
    rewardsSeenListeners.delete(listener);
  };
}

/**
 * The rewards card rendered these rows, so they are no longer news.
 *
 * Without this the badge counted every live ledger row forever: only a toast
 * ever wrote to the seen set, and the toast is suppressed while the card is on
 * screen. Recording the ids also lets the shell recolour the bell immediately
 * instead of waiting for its next poll.
 */
export function markRewardIdsSeen(ids: readonly string[]) {
  if (ids.length === 0) return;
  rememberToastedRewardIds(ids);
  rewardsSeenListeners.forEach((listener) => listener());
}

function laterIso(a: string | null, b: string | null): string | null {
  const am = a ? Date.parse(a) : NaN;
  const bm = b ? Date.parse(b) : NaN;
  if (!Number.isFinite(am) && !Number.isFinite(bm)) return null;
  if (!Number.isFinite(bm)) return a;
  if (!Number.isFinite(am)) return b;
  return am >= bm ? a! : b!;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function loadNoticeState(): Promise<NoticeState> {
  const local: NoticeState = {
    dismissedIds: readDismissedNoticeIds(),
    lastSeenReferralAt: readLastSeenReferralAt(),
  };
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return local;
    const { data, error } = await db
      .from("user_profiles")
      .select("dismissed_notices, last_seen_referral_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error || !data) return local;
    const dismissedIds = Array.from(new Set([
      ...local.dismissedIds,
      ...asStringList(data.dismissed_notices),
    ]));
    const remoteSeen = typeof data.last_seen_referral_at === "string" ? data.last_seen_referral_at : null;
    const lastSeenReferralAt = laterIso(local.lastSeenReferralAt, remoteSeen);
    let lastSeenSent = readLastSeenSentReferralAt();
    try {
      const sent = await db
        .from("user_profiles")
        .select("last_seen_sent_referral_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const remoteSent = typeof sent.data?.last_seen_sent_referral_at === "string"
        ? sent.data.last_seen_sent_referral_at
        : null;
      lastSeenSent = laterIso(lastSeenSent, remoteSent);
      if (lastSeenSent) window.localStorage.setItem(LAST_SEEN_SENT_REFERRAL_KEY, lastSeenSent);
    } catch {
      /* column may not be applied yet */
    }
    try {
      window.localStorage.setItem(DISMISSED_NOTICES_KEY, JSON.stringify(dismissedIds));
      if (lastSeenReferralAt) window.localStorage.setItem(LAST_SEEN_REFERRAL_KEY, lastSeenReferralAt);
      window.dispatchEvent(new Event("rn:notices-updated"));
    } catch {
      /* keep the in-memory merge */
    }
    return { dismissedIds, lastSeenReferralAt };
  } catch {
    return local;
  }
}

async function writeNoticeColumns(patch: Record<string, unknown>) {
  try {
    const db = getSupabaseClient();
    const sessionResult = await db.auth.getSession();
    const userId = sessionResult?.data?.session?.user?.id;
    if (!userId) return;
    const { error } = await db.from("user_profiles").upsert(
      {
        user_id: userId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) console.warn("[product_notices] save:", error.message);
  } catch (err) {
    console.warn("[product_notices] save:", err);
  }
}

export async function persistDismissedNotice(id: string): Promise<void> {
  const dismissedIds = rememberDismissedNotice(id);
  await writeNoticeColumns({ dismissed_notices: dismissedIds });
}

export async function persistLastSeenReferral(iso = new Date().toISOString()): Promise<void> {
  rememberLastSeenReferralAt(iso);
  try {
    window.localStorage.removeItem(TOASTED_REFERRAL_KEY);
  } catch {
    /* private mode */
  }
  publishReferralAlerts({ unread: 0, company: alertSnapshot.company });
  await writeNoticeColumns({ last_seen_referral_at: iso });
}

export async function persistLastSeenSentReferral(iso = new Date().toISOString()): Promise<void> {
  rememberLastSeenSentReferralAt(iso);
  try {
    window.localStorage.removeItem(TOASTED_SENT_REFERRAL_KEY);
  } catch {
    /* private mode */
  }
  sentSeenListeners.forEach((listener) => listener());
  await writeNoticeColumns({ last_seen_sent_referral_at: iso });
}
