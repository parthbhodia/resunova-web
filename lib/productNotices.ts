/**
 * In-app notices: a one-time What's new card, and a toast when someone asks
 * a signed-up referrer for a referral. Email prefs are a separate channel.
 */
import type { CompanyReferralRequest } from "@/lib/companyReferrers";
import { getSupabaseClient } from "@/lib/supabase";

export const DISMISSED_NOTICES_KEY = "rn_dismissed_notices_v1";
export const LAST_SEEN_REFERRAL_KEY = "rn_last_seen_referral_at_v1";
export const LAST_SEEN_SENT_REFERRAL_KEY = "rn_last_seen_sent_referral_at_v1";
export const TOASTED_REFERRAL_KEY = "rn_toasted_referral_ids_v1";
export const TOASTED_SENT_REFERRAL_KEY = "rn_toasted_sent_referral_ids_v1";
export const REFERRAL_INBOX_POLL_MS = 60_000;

/**
 * Bell rows for referrals are transient: they clear when the inbox is opened,
 * not by being dismissed. ⚠️ NotificationBell keys its "persist a dismissal"
 * branch off this prefix — it used to compare against two fixed ids, which a
 * per-row id would silently fall through, writing every referral into the
 * user's `dismissed_notices` jsonb forever.
 */
export const REFERRAL_ITEM_PREFIX = "referral:";
const REFERRAL_HREF = "/profile?tab=referrals";

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

function finiteCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/**
 * The bell's list, one row per thing that happened.
 *
 * ⚠️ WHY THIS TAKES ROWS AND NOT COUNTS. It used to take `inboxUnread` and
 * `outcomeUnread` numbers, which made it a counter formatter: the only sentence
 * it could write was "A request you sent was updated (reviewing, referred, or
 * declined)". That enumerates the possibilities instead of naming the one that
 * happened, so BEING REFERRED AND BEING DECLINED RENDERED AS THE IDENTICAL
 * STRING — the best and the worst news in the product, indistinguishable, in a
 * list whose whole job is to tell them apart. The rows were in the caller all
 * along and were thrown away before this was called.
 *
 * A list is a list: one entry per referral, each naming the step it reached.
 */
export function notificationFeed(input: {
  notice: ProductNotice | null;
  /** Unread asks on the user's own referrer desk. */
  inboxRows?: readonly CompanyReferralRequest[];
  /** The desk's company, for "asked you for a referral at X". */
  inboxCompany?: string;
  /** Watermark, so an ask that is really a nudge can say so. */
  inboxLastSeenAt?: string | null;
  /** Unseen status changes on requests the user SENT. */
  outcomeRows?: readonly ReferralOutcome[];
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

  const inboxRows = input.inboxRows ?? [];
  for (const row of inboxRows) {
    const copy = inboxNotificationCopy(row, input.inboxCompany ?? "", isFreshReferralNudge(row, input.inboxLastSeenAt ?? null));
    items.push({ id: `${REFERRAL_ITEM_PREFIX}inbox:${row.id}`, href: REFERRAL_HREF, ...copy });
  }

  const outcomeRows = input.outcomeRows ?? [];
  for (const row of outcomeRows) {
    items.push({
      id: `${REFERRAL_ITEM_PREFIX}outcome:${row.id}:${row.status}`,
      href: REFERRAL_HREF,
      ...outcomeNotificationCopy(row),
    });
  }

  return {
    count: (input.notice ? 1 : 0) + inboxRows.length + outcomeRows.length,
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

/** Who/what/where for one outcome row, with every part allowed to be missing. */
function outcomeParts(row: ReferralOutcome) {
  const who = row.referrerName.trim() || "Your referrer";
  const role = row.role.trim() || "the role";
  const company = row.referrerCompany.trim();
  // `company_referrers.company` is `text not null default ''`, so an untitled
  // desk would otherwise render a dangling " at ".
  const place = company ? ` at ${company}` : "";
  return { who, role, company, place };
}

/**
 * ONE bell row, naming the step this referral actually reached.
 *
 * ⚠️ The title carries the STEP and the body carries the detail, because the
 * title is what someone scans in a list. "Referral update" over three rows tells
 * you only that something happened three times.
 */
export function outcomeNotificationCopy(row: ReferralOutcome): { title: string; body: string } {
  const { who, role, place } = outcomeParts(row);
  if (row.status === "referred") {
    return { title: "You were referred", body: `${who} marked you as referred for ${role}${place}.` };
  }
  if (row.status === "declined") {
    return { title: "Referral declined", body: `${who} declined your referral request for ${role}${place}.` };
  }
  return { title: "Now being reviewed", body: `${who} is reviewing your referral request for ${role}${place}.` };
}

/** ONE bell row for an ask landing on the user's own desk. */
export function inboxNotificationCopy(
  row: CompanyReferralRequest,
  company: string,
  isNudge: boolean,
): { title: string; body: string } {
  const name = row.candidateName?.trim() || "Someone";
  const role = row.role?.trim();
  const about = role ? ` for ${role}` : "";
  const place = company.trim() ? ` at ${company.trim()}` : "";
  // A nudge is a second ask about something already sitting in the inbox, and
  // saying so is the difference between "act now" and "this is new".
  if (isNudge) {
    return { title: "Referral nudge", body: `${name} nudged you${about}${place}.` };
  }
  return { title: "New referral request", body: `${name} asked you for a referral${about}${place}.` };
}

/** Group outcomes by the step they reached, strongest news first. */
function stepSummary(rows: readonly ReferralOutcome[]): string {
  const order: Array<[string, string]> = [
    ["referred", "Referred"],
    ["declined", "Declined"],
    ["reviewing", "Reviewing"],
  ];
  const clauses: string[] = [];
  for (const [status, verb] of order) {
    const matching = rows.filter((row) => row.status === status);
    if (matching.length === 0) continue;
    // Prefer the company as the discriminator — someone with several open asks
    // has them at several companies — and fall back to the role.
    const labels = Array.from(new Set(matching.map((row) => {
      const { company, role } = outcomeParts(row);
      return company || role;
    })));
    const shown = labels.slice(0, 3);
    const rest = labels.length - shown.length;
    const list = shown.length === 1
      ? shown[0]
      : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
    clauses.push(`${verb} at ${list}${rest > 0 ? ` and ${rest} more` : ""}`);
  }
  return clauses.join(". ") + ".";
}

export function outcomeToastCopy(rows: readonly ReferralOutcome[]): { title: string; description: string } {
  if (rows.length !== 1) {
    // ⚠️ NOT "N of your referral requests were updated". That sentence is the
    // same for three referrals and three declines.
    return { title: "Referral updates", description: stepSummary(rows) };
  }
  const copy = outcomeNotificationCopy(rows[0]);
  // One producer for the bell row and the toast, so they cannot drift.
  return { title: copy.title, description: copy.body };
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
