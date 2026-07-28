/**
 * Map API / network failures to short, actionable UI copy.
 */

export type ApiErrorKind =
  | "offline"
  | "host_missing"
  | "misconfigured"
  | "server_busy"
  | "server_error"
  | "auth"
  | "capacity"
  | "invalid_resume"
  | "generic";

export interface ApiErrorDisplay {
  kind: ApiErrorKind;
  title: string;
  message: string;
  steps: string[];
  healthUrl?: string;
  statusUrl?: string;
}

/**
 * Backend résumé content-gate reject codes (see resume_gui/extract/resume_gate.py).
 * These are NOT server failures — they mean the upload isn't a résumé we can
 * analyze, so the UI shows a calm, instructive banner rather than a red error.
 */
export const RESUME_GATE_CODES: ReadonlySet<string> = new Set([
  "empty_resume",
  "resume_too_short",
  "not_a_resume",
  "insufficient_resume_content",
]);

// Sentinel so a gate error can ride the existing `error: string` channel and be
// decoded back into structured display data — keyed on our own machine code,
// never on the (translatable) human message.
const RESUME_GATE_PREFIX = "resume_gate";

/** Encode a backend gate rejection into a string for the `error` state. */
export function encodeResumeGateError(
  code: string,
  message: string,
  missing?: string[],
): string {
  return RESUME_GATE_PREFIX + JSON.stringify({ code, message, missing: missing ?? [] });
}

/** True if a string carries an encoded gate payload (vs. a flattened message). */
export function isEncodedResumeGateError(s: string): boolean {
  return typeof s === "string" && s.startsWith(RESUME_GATE_PREFIX + "{");
}

/**
 * Single source of truth for turning a backend response into a gate error.
 * Returns an encoded error string (render via ApiErrorBanner for the calm
 * banner) when the response is a content-gate rejection, else null so the
 * caller falls through to its normal error handling.
 */
export function resumeGateErrorFromResponse(
  status: number,
  json: { code?: unknown; error?: unknown; missing?: unknown } | null | undefined,
): string | null {
  if (status !== 422 || !json) return null;
  const code = typeof json.code === "string" ? json.code : "";
  if (!RESUME_GATE_CODES.has(code)) return null;
  const message = typeof json.error === "string" ? json.error : "";
  const missing = Array.isArray(json.missing)
    ? json.missing.filter((m): m is string => typeof m === "string")
    : [];
  return encodeResumeGateError(code, message, missing);
}

function resolveResumeContentError(
  code: string,
  message: string,
  missing: string[],
): ApiErrorDisplay {
  const titleByCode: Record<string, string> = {
    empty_resume: "We couldn't read your résumé",
    resume_too_short: "That looks too short to be a résumé",
    not_a_resume: "That doesn't look like a résumé",
    insufficient_resume_content: "Your résumé needs a bit more detail",
  };
  const steps: string[] = [];
  if (missing.length > 0) steps.push(`Add: ${missing.join(", ")}.`);
  steps.push(
    "Export your résumé as a PDF with selectable text (not a scan/photo) or a Word .docx, then upload again.",
  );
  return {
    kind: "invalid_resume",
    title: titleByCode[code] ?? "We couldn't read enough of your résumé",
    message: message || "Please upload a complete résumé as a PDF or Word .docx.",
    steps,
  };
}

export function apiBackendBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? String(process.env.NEXT_PUBLIC_API_URL).trim()
      : "";
  return (fromEnv || "http://localhost:8765").replace(/\/$/, "");
}

function isHostedApiBase(base: string): boolean {
  return /railway\.app|render\.com|fly\.dev|herokuapp\.com/i.test(base);
}

function isRailwayBase(base: string): boolean {
  return /railway\.app/i.test(base);
}

function healthCheckUrl(base: string): string {
  return `${base}/api/health`;
}

function isNetworkFailure(lower: string): boolean {
  return (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("echec du chargement") ||
    lower.includes("err_connection_refused") ||
    lower.includes("connection refused") ||
    lower.includes("err_timed_out") ||
    lower.includes("timed out")
  );
}

function isRailwayAppMissing(lower: string, hint: string): boolean {
  return (
    /application not found/i.test(lower) ||
    /application not found/i.test(hint) ||
    (lower.includes('"code":404') && lower.includes("application not found"))
  );
}

function offlineDisplay(base: string): ApiErrorDisplay {
  const hosted = isHostedApiBase(base);
  const railway = isRailwayBase(base);
  const health = healthCheckUrl(base);
  return {
    kind: "offline",
    title: "Can't reach the résumé server",
    message: hosted
      ? "The browser could not connect to your hosted API. Console errors often say “CORS” or “Failed to fetch” even when the real issue is the API being down, restarting, or on the wrong URL."
      : "The browser could not connect to the résumé API on your machine.",
    steps: hosted
      ? [
          ...(railway ? ["Check Railway status: https://status.railway.app (edge outages look like failed fetches)."] : []),
          `Open ${health} — a healthy API returns {"ok":true,"service":"resume_gui"}.`,
          "In your host dashboard, confirm the service is running and the public domain matches NEXT_PUBLIC_API_URL.",
          "After the API is healthy, hard-refresh this page (deployed sites need a Pages rebuild if the API URL changed).",
        ]
      : [
          "Start the API: from the project root run `python resume_gui/app.py` (port 8765).",
          "Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8765` in `web/.env.local`, restart `npm run dev`, then hard-refresh.",
          "In DevTools → Network, failed calls should hit port 8765 and return JSON.",
        ],
    healthUrl: health,
    statusUrl: railway ? "https://status.railway.app" : undefined,
  };
}

function hostMissingDisplay(base: string): ApiErrorDisplay {
  const railway = isRailwayBase(base);
  const health = healthCheckUrl(base);
  return {
    kind: "host_missing",
    title: "API address has no deployed app",
    message: `The host at ${base} responded, but no application is running there (Railway: “Application not found”). The frontend URL is likely outdated.`,
    steps: [
      "Open your host project, redeploy the `resume_gui` service, and copy the current public domain.",
      "Set GitHub secret `RAILWAY_API_URL` to that URL and re-run the GitHub Pages deploy (or update `web/.env.local` for local dev).",
      `Confirm ${health} returns {"ok":true}.`,
    ],
    healthUrl: health,
    statusUrl: railway ? "https://status.railway.app" : undefined,
  };
}

function misconfiguredDisplay(base: string): ApiErrorDisplay {
  return {
    kind: "misconfigured",
    title: "Wrong server for API calls",
    message:
      "The response was a normal web page (HTML), not the Python résumé API. NEXT_PUBLIC_API_URL is probably pointing at the marketing site or a missing env var in the static build.",
    steps: [
      `Set NEXT_PUBLIC_API_URL to your Starlette host (e.g. ${base.includes("localhost") ? base : "https://your-api.up.railway.app"}).`,
      "Local: `web/.env.local`, then restart `npm run dev`. Production: GitHub Actions secret `RAILWAY_API_URL`, then rebuild Pages.",
      "Hard-refresh after redeploying.",
    ],
    healthUrl: healthCheckUrl(base),
  };
}

function serverBusyDisplay(): ApiErrorDisplay {
  return {
    kind: "server_busy",
    title: "Server temporarily unavailable",
    message: "The résumé API is restarting or overloaded. This usually clears within a minute.",
    steps: ["Wait a moment and try again.", "If it persists, check your host deploy logs."],
  };
}

/** HTTP status + body snippet → structured UI model. */
export function resolveApiErrorFromHttp(status: number, bodySnippet: string): ApiErrorDisplay {
  const base = apiBackendBaseUrl();
  const hint = bodySnippet.replace(/\s+/g, " ").trim().slice(0, 240);
  const lower = hint.toLowerCase();

  if (isRailwayAppMissing(lower, hint)) {
    return hostMissingDisplay(base);
  }

  if (status === 404) {
    const looksHtml =
      /^</.test(hint.trim()) ||
      /<!doctype/i.test(hint) ||
      (hint.length > 20 && /<html/i.test(hint));
    if (looksHtml) {
      return misconfiguredDisplay(base);
    }
    return {
      kind: "misconfigured",
      title: "API route not found",
      message: `GET/POST to ${base}/api/… returned 404. The backend may be stopped or the path is wrong.`,
      steps: [
        "Start the API: `python resume_gui/app.py` (local) or redeploy on your host.",
        `Check ${healthCheckUrl(base)} returns {"ok":true}.`,
      ],
      healthUrl: healthCheckUrl(base),
    };
  }

  if (status === 502 || status === 503 || status === 504) {
    const d = serverBusyDisplay();
    if (isHostedApiBase(base)) {
      d.healthUrl = healthCheckUrl(base);
      if (isRailwayBase(base)) d.statusUrl = "https://status.railway.app";
    }
    return d;
  }

  if (status >= 500) {
    return {
      kind: "server_error",
      title: "Server error",
      message: hint && hint.length < 200 ? hint : "The résumé server reported an error. Please try again in a moment.",
      steps: ["Retry in a minute.", "If it keeps failing, check deploy logs on your host."],
    };
  }

  if (hint && !hint.startsWith("<") && hint.length < 200) {
    return {
      kind: "generic",
      title: "Request failed",
      message: `The résumé server could not complete this request (HTTP ${status}). ${hint}`,
      steps: [],
    };
  }

  return {
    kind: "generic",
    title: "Request failed",
    message: `The résumé server could not complete this request (HTTP ${status}). Please try again.`,
    steps: [],
  };
}

/** Turn any thrown/string error into structured display data. */
export function resolveApiError(raw: string): ApiErrorDisplay {
  const s = (raw ?? "").trim();
  const base = apiBackendBaseUrl();

  if (!s) {
    return {
      kind: "generic",
      title: "Something went wrong",
      message: "Please try again.",
      steps: [],
    };
  }

  if (s.startsWith(RESUME_GATE_PREFIX + "{")) {
    try {
      const parsed = JSON.parse(s.slice(RESUME_GATE_PREFIX.length)) as {
        code?: string;
        message?: string;
        missing?: string[];
      };
      return resolveResumeContentError(
        parsed.code ?? "",
        parsed.message ?? "",
        Array.isArray(parsed.missing) ? parsed.missing : [],
      );
    } catch {
      /* malformed — fall through to generic handling */
    }
  }

  const lower = s.toLowerCase();
  const hint = s.slice(0, 240);

  if (isNetworkFailure(lower)) {
    return offlineDisplay(base);
  }

  if (isRailwayAppMissing(lower, hint)) {
    return hostMissingDisplay(base);
  }

  if (
    lower.startsWith("server returned 404") ||
    (lower.includes("404") && lower.includes("not found") && lower.includes("server"))
  ) {
    return resolveApiErrorFromHttp(404, hint);
  }

  if (
    lower.includes("next_public_api_url is probably pointing") ||
    lower.includes("body looks like a normal web page")
  ) {
    return misconfiguredDisplay(base);
  }

  if (
    lower.includes("cannot reach the résumé api") ||
    lower.includes("cannot reach the resume api")
  ) {
    return offlineDisplay(base);
  }

  const capacity =
    /\b503\b/.test(lower) ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("spikes in demand") ||
    lower.includes("try again later") ||
    lower.includes("overloaded") ||
    lower.includes("deadline exceeded") ||
    lower.includes("resource_exhausted") ||
    lower.includes("resource exhausted") ||
    /\b429\b/.test(lower) ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("quota");

  if (capacity) {
    return {
      kind: "capacity",
      title: "AI service is busy",
      message: "The model provider is temporarily at capacity. Please wait a minute and try again.",
      steps: [],
    };
  }

  if (
    lower.includes("api key") ||
    lower.includes("invalid api key") ||
    lower.includes("permission denied") ||
    lower.includes("unauthenticated") ||
    lower.includes("401")
  ) {
    return {
      kind: "auth",
      title: "API access problem",
      message: "There is a problem with API credentials on the server. Check host environment variables.",
      steps: [],
    };
  }

  if (s.length > 360 && (s.includes("'error'") || s.includes('"error"') || s.includes("'code'"))) {
    return {
      kind: "generic",
      title: "AI service error",
      message: "The AI service returned an error. Please try again in a moment.",
      steps: [],
    };
  }

  if (s.length > 320) {
    return {
      kind: "generic",
      title: "Something went wrong",
      message: `${s.slice(0, 280)}…`,
      steps: [],
    };
  }

  return {
    kind: "generic",
    title: "Something went wrong",
    message: s,
    steps: [],
  };
}

export function formatApiErrorMessage(d: ApiErrorDisplay): string {
  if (d.kind === "generic" && d.title === "Something went wrong" && d.steps.length === 0) {
    return d.message;
  }
  return d.steps.length > 0 ? `${d.title} — ${d.message}` : `${d.title}. ${d.message}`;
}

export function apiErrorFromUnknown(e: unknown): string {
  return toUserFriendlyErrorMessage(e instanceof Error ? e.message : String(e));
}

/**
 * Plain string for Error() throws and legacy state (title + message).
 */
export function toUserFriendlyErrorMessage(raw: string): string {
  return formatApiErrorMessage(resolveApiError(raw));
}

/**
 * When the response is not JSON (often HTML “Not Found”), map status to helpful copy.
 */
export function messageForNonJsonApiFailure(status: number, bodySnippet: string): string {
  return formatApiErrorMessage(resolveApiErrorFromHttp(status, bodySnippet));
}
