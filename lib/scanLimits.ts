/**
 * Free-tier daily résumé-scan allowance.
 *
 * IMPORTANT: the AUTHORITATIVE limit is enforced by the résumé API backend
 * (the Starlette service behind NEXT_PUBLIC_API_URL — see /api/scan-limit-status
 * and /api/analyze-upload). This constant only drives copy and client-side
 * fallbacks for when the backend response doesn't include an explicit `limit`.
 *
 * When you change this, also bump the free-tier daily cap on the backend so the
 * number users are actually granted matches what the UI advertises.
 */
export const FREE_DAILY_SCAN_LIMIT = 10;
