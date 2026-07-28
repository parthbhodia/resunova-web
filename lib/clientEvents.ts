/**
 * client_events — minimal product-event sink for the edit-at-score funnel
 * (migration 040). Fire-and-forget by design: a lost telemetry row must never
 * block or break a product interaction, so every write path here swallows
 * errors. RLS is owner-scoped with user_id defaulting to auth.uid(); signed-out
 * events therefore CANNOT insert — pre-auth edit intent is stashed in
 * localStorage and flushed after sign-in (flushPrewallEvents), mirroring the
 * anon-scan stash pattern.
 */
import { getSupabaseClient } from "./supabase";

export type ClientEventName =
  | "report_view"
  | "edit_click"
  | "version_save"
  | "delta_view"
  | "edit_bounce"
  | "link_failed"
  | "version_write_failed";

const PREWALL_KEY = "rn_prewall_events_v1";

/** Insert one event for the signed-in user. Never throws; returns delivery. */
export async function logClientEvent(
  event: ClientEventName,
  props: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return false;
    const { error } = await db.from("client_events").insert({ event, props });
    return !error;
  } catch {
    return false;
  }
}

export interface PrewallEvent {
  event: ClientEventName;
  props: Record<string, unknown>;
  ts: string;
}

/**
 * Record intent that happened BEFORE the auth wall (e.g. a signed-out
 * edit_click). Stored locally; delivered by flushPrewallEvents after sign-in
 * with props.prewall=true so the funnel can count the anon cohort.
 */
export function stashPrewallEvent(
  event: ClientEventName,
  props: Record<string, unknown> = {},
): void {
  try {
    const raw = localStorage.getItem(PREWALL_KEY);
    const list: PrewallEvent[] = raw ? (JSON.parse(raw) as PrewallEvent[]) : [];
    list.push({ event, props, ts: new Date().toISOString() });
    localStorage.setItem(PREWALL_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    /* storage unavailable — drop */
  }
}

/**
 * Deliver stashed pre-auth events (one-shot). Call once a session exists.
 * Returns the flushed events so callers can resume the stashed intent
 * (e.g. re-enter edit mode after an edit_click that hit the wall).
 */
export async function flushPrewallEvents(): Promise<PrewallEvent[]> {
  let list: PrewallEvent[] = [];
  try {
    const raw = localStorage.getItem(PREWALL_KEY);
    if (!raw) return [];
    list = JSON.parse(raw) as PrewallEvent[];
    localStorage.removeItem(PREWALL_KEY);
  } catch {
    return [];
  }
  for (const e of list) {
    await logClientEvent(e.event, { ...e.props, prewall: true, stashed_at: e.ts });
  }
  return list;
}
