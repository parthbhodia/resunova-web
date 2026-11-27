/**
 * Announcements an admin writes in the dashboard, shown in the notification
 * bell and as the one-time toast. The rows live in Supabase (migration 072) and
 * are read here under RLS, which returns only rows that are live right now.
 *
 * ⚠️ TWO RULES THIS FILE EXISTS TO HOLD.
 *
 * 1. A FAILED READ MEANS "NO ANNOUNCEMENTS", NEVER AN ERROR. The bell and the
 *    referral toasts share one effect with this read; if the table is missing
 *    (migration not applied yet), the network stalls, or a row is malformed,
 *    everything else in the bell must behave exactly as it did before. The read
 *    is also time-boxed for that reason.
 *
 * 2. THE LINK IS AN IN-APP PATH OR THE ROW IS DROPPED. The notice's `href` goes
 *    to router.push(), which will navigate to an absolute URL, so a row whose
 *    link leaves the site would send every reader away. The database CHECK and
 *    resunova-api reject it too; this is the third, independent copy of the
 *    rule. Change all three together (api: services/announcements.py).
 */
import type { ProductNotice } from "@/lib/productNotices";
import { getSupabaseClient } from "@/lib/supabase";

/** What a dismissed announcement is stored as in user_profiles.dismissed_notices. */
export const ANNOUNCEMENT_ID_PREFIX = "announcement:";

export const ANNOUNCEMENT_LIMITS = { title: 80, body: 400, cta: 24, href: 200 } as const;

/** How long the bell waits for the read before carrying on without it. */
export const ANNOUNCEMENT_READ_TIMEOUT_MS = 4000;

const DEFAULT_CTA = "Open";

/** True only for a path on this site: '/', '/?view=jobs', '/profile?tab=referrals'. */
export function isInAppPath(href: unknown): href is string {
  if (typeof href !== "string") return false;
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  if (href.length > ANNOUNCEMENT_LIMITS.href || href.includes("\\")) return false;
  return !/[\s\u0000-\u001f\u007f]/.test(href);
}

function line(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 && text.length <= max ? text : null;
}

type AnnouncementRow = Partial<Record<"id" | "title" | "body" | "href" | "cta", unknown>>;

/** One database row as a notice, or null when it is not safe and complete. */
export function announcementToNotice(row: AnnouncementRow): ProductNotice | null {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const title = line(row.title, ANNOUNCEMENT_LIMITS.title);
  const body = line(row.body, ANNOUNCEMENT_LIMITS.body);
  const cta = line(row.cta, ANNOUNCEMENT_LIMITS.cta) ?? DEFAULT_CTA;
  if (!id || !title || !body || !isInAppPath(row.href)) return null;
  return { id: `${ANNOUNCEMENT_ID_PREFIX}${id}`, title, body, href: row.href, cta };
}

/** Live announcements, newest first. Any failure or timeout is an empty list. */
export async function fetchLiveAnnouncements(): Promise<ProductNotice[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const db = getSupabaseClient();
    const read = db
      .from("announcements")
      .select("id,title,body,href,cta")
      .order("starts_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => (error || !Array.isArray(data) ? [] : data as AnnouncementRow[]));
    const timeout = new Promise<AnnouncementRow[]>((resolve) => {
      timer = setTimeout(() => resolve([]), ANNOUNCEMENT_READ_TIMEOUT_MS);
    });
    const rows = await Promise.race([read, timeout]);
    return rows.map((row) => announcementToNotice(row)).filter((n): n is ProductNotice => n !== null);
  } catch {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}
