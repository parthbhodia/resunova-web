/**
 * Builds the "welcome back" greeting shown as a toast right after a user signs
 * in, telling them how many free résumé scans they have left today.
 *
 * The remaining count comes from the backend quota endpoint
 * (/api/scan-limit-status); everything here is presentation only.
 */

import { apiUrl } from "@/lib/utils";
import { FREE_DAILY_SCAN_LIMIT } from "@/lib/scanLimits";

export type ScanGreetingTone = "success" | "info" | "warning";
export type ScanGreeting = { message: string; tone: ScanGreetingTone };

type ScanLimitStatus = {
  enforced?: boolean;
  unlimited?: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
};

/** Turn a scan-limit-status payload into a friendly, per-user greeting. */
export function buildScanGreeting(status: ScanLimitStatus | null): ScanGreeting {
  if (status?.unlimited) {
    return {
      message: "Welcome back — you have unlimited résumé scans today.",
      tone: "success",
    };
  }

  if (status?.enforced && typeof status.remaining === "number") {
    const limit =
      typeof status.limit === "number" && status.limit > 0
        ? status.limit
        : FREE_DAILY_SCAN_LIMIT;
    const remaining = Math.max(0, status.remaining);
    if (remaining === 0) {
      return {
        message: `You've used all ${limit} free scans for today — they reset at midnight UTC.`,
        tone: "warning",
      };
    }
    return {
      message: `Welcome back! You have ${remaining} of ${limit} free résumé scan${
        limit === 1 ? "" : "s"
      } left today.`,
      tone: "success",
    };
  }

  // Backend didn't enforce / couldn't be reached — fall back to the advertised allowance.
  return {
    message: `Welcome back! You get ${FREE_DAILY_SCAN_LIMIT} free résumé scans every day.`,
    tone: "info",
  };
}

/** Fetch the signed-in user's quota and format it into a greeting (never throws). */
export async function fetchScanGreeting(
  accessToken?: string | null,
): Promise<ScanGreeting> {
  try {
    const headers: Record<string, string> = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};
    const resp = await fetch(apiUrl("/api/scan-limit-status"), { headers });
    if (!resp.ok) return buildScanGreeting(null);
    const data = (await resp.json()) as ScanLimitStatus;
    return buildScanGreeting(data);
  } catch {
    return buildScanGreeting(null);
  }
}
