/**
 * The one way to call the Resunova API.
 *
 * Every request to the backend goes through `apiFetch`. It resolves the base
 * URL and attaches `Authorization: Bearer <token>` whenever a Supabase session
 * exists — and omits it when one does not, because anonymous use is deliberate
 * here: a visitor gets one free scan before being asked to sign in, and gating
 * the UI on a session would take that away.
 *
 * The reason this is a wrapper rather than a convention: roughly twenty
 * endpoints shipped with no auth header at all, because each call site decided
 * for itself and a new one starts from a blank `fetch`. Routing through one
 * function makes "send the token" the default a new endpoint inherits instead
 * of a step someone has to remember. `lib/__tests__/apiClientUsage.test.ts`
 * fails the build if a raw `fetch(apiUrl(...))` reappears.
 */

import { apiUrl } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";

/* ── Auth ─────────────────────────────────────────────────────── */

/**
 * The current access token, or null when signed out.
 *
 * Never throws. A missing Supabase config (marketing-only builds set no env)
 * or a failed session read both resolve to null, which the caller treats as
 * "anonymous" — degrading to the signed-out path rather than breaking the
 * request outright.
 */
export async function accessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** `{ Authorization }` when signed in, `{}` when not. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await accessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── The call ─────────────────────────────────────────────────── */

/**
 * `fetch` against the API with the session token attached.
 *
 * `path` is a leading-slash API path ("/api/analyze"); an absolute URL is
 * passed through untouched. Everything else behaves exactly like `fetch`, so
 * streaming responses, FormData bodies and AbortSignals all work as before —
 * the only difference is the header.
 *
 * A caller that sets its own `Authorization` keeps it. Content-Type is
 * deliberately NOT defaulted: a FormData body needs the browser to pick the
 * multipart boundary, and setting it here would break every upload.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = /^https?:\/\//i.test(path) ? path : apiUrl(path);
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) {
    const token = await accessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}

/* ── Refusals ─────────────────────────────────────────────────── */

/** What the user has to do to get past a refusal. */
export type ApiRemedy = "sign_in" | "upgrade";

/**
 * A 401/429 refusal, normalized.
 *
 * The backend sends `remedy` so the UI can branch on intent rather than on
 * prose. Matching messages was how a copy edit could silently send someone to
 * an upgrade dialog when all they needed was to sign in.
 */
export interface ApiRefusal {
  message: string;
  code: string | null;
  remedy: ApiRemedy;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  resetAt: string | null;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read a refusal out of a failed response body, or null if it is not one.
 *
 * `remedy` is used when present. When it is absent the status decides — 401
 * means sign in, 429 means the quota ran out — with one carve-out: an
 * anonymous visitor who used their free scan has not hit a paid ceiling, they
 * just do not have an account yet, so that case resolves to `sign_in`. Without
 * the fallback this would only work against a backend that already sends
 * `remedy`, and the web half ships first.
 */
export function refusalFrom(status: number, body: unknown): ApiRefusal | null {
  if (status !== 401 && status !== 429) return null;
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const explicit = b.remedy === "sign_in" || b.remedy === "upgrade" ? (b.remedy as ApiRemedy) : null;
  const anonymous = b.reason === "anonymous_daily_ip_limit" || b.code === "sign_in_required";
  const remedy: ApiRemedy = explicit ?? (status === 401 || anonymous ? "sign_in" : "upgrade");

  return {
    message: typeof b.error === "string" && b.error.trim()
      ? b.error
      : remedy === "sign_in"
        ? "Sign in to continue."
        : "You've used your scans for today.",
    code: typeof b.code === "string" ? b.code : null,
    remedy,
    limit: num(b.limit),
    used: num(b.used),
    remaining: num(b.remaining),
    resetAt: typeof b.resetAt === "string" ? b.resetAt : null,
  };
}

/* ── Scan limits ──────────────────────────────────────────────── */

/**
 * `GET /api/scan-limit-status`.
 *
 * `unlimited` covers both paid and institutional access; `plan` says which,
 * for surfaces that show a distinct badge. A Pro subscriber used to fall
 * through to `{enforced:false, unlimited:false}` and get shown a "Free" badge
 * next to an Upgrade button, so treat a missing `plan` as unknown rather than
 * as free.
 */
export interface ScanLimitStatus {
  enforced: boolean;
  unlimited: boolean;
  plan: string | null;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  resetAt: string | null;
  /** Sum of résumé scans over the last 7 UTC days (dashboard / Plan & usage). */
  usedLast7Days: number | null;
  /** Per-day buckets for a mini sparkline — oldest → newest. */
  dailyUsage: Array<{ date: string; count: number }> | null;
}

export function scanLimitFrom(body: unknown): ScanLimitStatus {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const dailyRaw = Array.isArray(b.dailyUsage) ? b.dailyUsage : null;
  const dailyUsage = dailyRaw
    ? dailyRaw
        .map((row) => {
          const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
          const date = typeof r.date === "string" ? r.date : "";
          const count = typeof r.count === "number" && Number.isFinite(r.count) ? r.count : 0;
          return date ? { date, count: Math.max(0, Math.floor(count)) } : null;
        })
        .filter((x): x is { date: string; count: number } => !!x)
    : null;
  return {
    enforced: !!b.enforced,
    unlimited: !!b.unlimited,
    plan: typeof b.plan === "string" && b.plan.trim() ? b.plan : null,
    limit: num(b.limit),
    used: num(b.used),
    remaining: num(b.remaining),
    resetAt: typeof b.resetAt === "string" ? b.resetAt : null,
    usedLast7Days: num(b.usedLast7Days),
    dailyUsage,
  };
}

/** Badge copy for a plan. Metered Pro still shows "Pro"; Free metered returns null. */
export function planLabel(status: ScanLimitStatus): string | null {
  if (status.plan === "pro") return "Pro";
  if (status.plan === "institution") return "University";
  if (status.plan === "admin") return "Admin";
  if (status.unlimited) return "Unlimited";
  return null;
}
