/**
 * The real daily caps, in one place.
 *
 * These were declared inside `UpgradeDialog.tsx` — a client component that
 * imports Stripe's checkout client. Any module that only wants to say "three
 * scans a day" in a sentence had to drag that whole chain in, so the numbers
 * live here and `UpgradeDialog` re-exports them for its existing importers.
 *
 * ⚠️ Keep in sync with the API's `services/entitlements.py` POLICY_V1. A
 * hardcoded "3 scans a day" in copy becomes a lie in front of a paying user the
 * day the policy moves, which is why every surface interpolates from here
 * rather than typing the digit (see the /pricing entry in CLAUDE.md).
 */

/** Free-tier daily caps. */
export const FREE_SCAN_DAILY_LIMIT = 3;
export const FREE_INTERVIEW_DAILY_LIMIT = 2;
/** Pro daily caps. */
export const PRO_SCAN_DAILY_LIMIT = 30;
export const PRO_INTERVIEW_DAILY_LIMIT = 30;
