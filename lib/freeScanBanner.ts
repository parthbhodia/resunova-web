/**
 * The free-scan welcome stays closed after the X, and after it closes itself.
 * This browser remembers it immediately. The account record is the same
 * dismiss list as other notices, so a later sign-in on this browser still
 * hides it after that list loads.
 */
import { persistDismissedNotice, readDismissedNoticeIds, rememberDismissedNotice } from "@/lib/productNotices";

export const FREE_SCAN_BANNER_KEY = "rn-free-scan-banner-dismissed";
export const FREE_SCAN_NOTICE_ID = "free-scan-welcome";
/** Long enough to read one sentence, short enough that it does not sit on the work. */
export const FREE_SCAN_BANNER_MS = 8_000;

let shownAt = 0;

/** Remaining time on the auto-dismiss clock. The shell remounts this note on every view, so the clock lives here. */
export function freeScanBannerRemaining(now = Date.now()): number {
  if (!shownAt) shownAt = now;
  return Math.max(0, FREE_SCAN_BANNER_MS - (now - shownAt));
}

export function resetFreeScanBannerClock(): void {
  shownAt = 0;
}

export function freeScanBannerStorageKey(userId: string): string {
  return `${FREE_SCAN_BANNER_KEY}:${userId}`;
}

export function isFreeScanBannerDismissed(userId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(FREE_SCAN_BANNER_KEY) === "1") return true;
    if (userId && window.localStorage.getItem(freeScanBannerStorageKey(userId)) === "1") return true;
  } catch {
    return readDismissedNoticeIds().includes(FREE_SCAN_NOTICE_ID);
  }
  return readDismissedNoticeIds().includes(FREE_SCAN_NOTICE_ID);
}

export function dismissFreeScanBanner(userId?: string | null): void {
  try {
    window.localStorage.setItem(FREE_SCAN_BANNER_KEY, "1");
    if (userId) window.localStorage.setItem(freeScanBannerStorageKey(userId), "1");
  } catch {
    /* private mode still records the notice id below */
  }
  rememberDismissedNotice(FREE_SCAN_NOTICE_ID);
  resetFreeScanBannerClock();
  void persistDismissedNotice(FREE_SCAN_NOTICE_ID);
}
