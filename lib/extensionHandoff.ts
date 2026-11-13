/**
 * A job posting handed from the Chrome extension to Tailor.
 *
 * The extension opens `/tailor-2/?intent=job#rn-job=<base64url JSON>`. The
 * posting rides in the URL FRAGMENT on purpose: a fragment is never sent to a
 * server, so the posting text reaches this page without passing through a
 * request log, a CDN or an analytics beacon. It is read once, written to the
 * same sessionStorage keys the Library and Boost handoffs already use (so the
 * builder's existing `intent=job` prefill consumes it with no new path), and
 * removed from the address bar straight away, so a reload, a bookmark or a
 * shared link does not carry a posting the sender never meant to share.
 *
 * The payload comes from a web page the person happened to be on, so it is
 * untrusted: every field is checked for shape, stripped of control characters
 * and capped before it is stored, and a payload that does not parse is dropped
 * whole rather than repaired.
 */
import { TAILOR_PREFILL_COMPANY, TAILOR_PREFILL_JD, TAILOR_PREFILL_ROLE } from "@/lib/tailorPrefill";

/** The fragment parameter the extension writes. */
export const EXTENSION_JOB_PARAM = "rn-job";

/** Same ceiling the match API puts on a posting (`MAX_JD_CHARS`). */
export const MAX_HANDOFF_JD_CHARS = 12_000;
export const MAX_HANDOFF_LABEL_CHARS = 200;
/** A 12k-character posting is at most ~64KB once base64url-encoded. */
const MAX_FRAGMENT_CHARS = 90_000;

export type JobHandoff = { jd: string; company: string; role: string };

// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

function cleanBlock(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim().slice(0, max);
}

function cleanLabel(value: unknown): string {
  return cleanBlock(value, MAX_HANDOFF_LABEL_CHARS).replace(/\s+/g, " ");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** The fragment text (without the leading `#`) for a posting. Used by tests and
 *  kept beside the decoder so the two cannot drift. */
export function encodeJobHandoff(job: Partial<JobHandoff>): string {
  const json = JSON.stringify({ jd: job.jd ?? "", company: job.company ?? "", role: job.role ?? "" });
  return `${EXTENSION_JOB_PARAM}=${toBase64Url(new TextEncoder().encode(json))}`;
}

/** The posting in a URL fragment, or null when there is none or it is not usable. */
export function decodeJobHandoff(hash: string): JobHandoff | null {
  const fragment = (hash || "").replace(/^#/, "");
  if (!fragment || fragment.length > MAX_FRAGMENT_CHARS) return null;
  let encoded: string | null = null;
  for (const part of fragment.split("&")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === EXTENSION_JOB_PARAM) {
      encoded = part.slice(eq + 1);
      break;
    }
  }
  if (encoded === null) return null;
  const bytes = fromBase64Url(encoded);
  if (!bytes) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const raw = parsed as Record<string, unknown>;
  const jd = cleanBlock(raw.jd, MAX_HANDOFF_JD_CHARS);
  if (!jd) return null;
  return { jd, company: cleanLabel(raw.company), role: cleanLabel(raw.role) };
}

/**
 * Take a posting from the current URL fragment, if one is there, into the
 * Tailor prefill keys, and remove the fragment either way. Returns true when a
 * posting was stored.
 *
 * Stale company/role from an earlier handoff are removed when this posting has
 * none, so a new job is never filed under the previous one's name.
 */
export function consumeExtensionJobHandoff(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  if (!hash || !hash.includes(`${EXTENSION_JOB_PARAM}=`)) return false;

  const job = decodeJobHandoff(hash);
  // Dropped even when unusable: a fragment that carries a posting we refused
  // should not sit in the address bar either.
  try {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  } catch {
    /* an old browser with no replaceState still got its data below */
  }
  if (!job) return false;

  try {
    sessionStorage.setItem(TAILOR_PREFILL_JD, job.jd);
    if (job.company) sessionStorage.setItem(TAILOR_PREFILL_COMPANY, job.company);
    else sessionStorage.removeItem(TAILOR_PREFILL_COMPANY);
    if (job.role) sessionStorage.setItem(TAILOR_PREFILL_ROLE, job.role);
    else sessionStorage.removeItem(TAILOR_PREFILL_ROLE);
  } catch {
    return false;
  }
  return true;
}
