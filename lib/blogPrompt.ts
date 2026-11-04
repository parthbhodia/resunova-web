/**
 * Rules for the prompt that slides in while someone is reading a blog post.
 *
 * Everything that DECIDES lives here as plain functions; the component only
 * wires them to the DOM. That split is what makes the decisions testable
 * without a browser clock or a scroll position, and it is why every number a
 * future edit might want to tune has one name and one home.
 *
 * WHAT THE RULES COME FROM. Measured 2026-10-17: 361 tracked views across 11
 * posts, 31% of them on one post, zero confirmed subscribers, and roughly two
 * blog sessions a day. That volume cannot A/B test a trigger, so the rules are
 * the conservative end of what the sources agree on: appear late, appear once,
 * never stand between the reader and the page.
 */

export type PromptVariant = "email" | "posting_check";

/** The reader is partway through the article, not skimming past it. */
export const DEPTH_THRESHOLD = 0.5;

/**
 * Seconds of VISIBLE time. Depth alone is a fast scroll; time alone is a tab
 * left open. The prompt needs both, so each false positive is filtered by the
 * other.
 */
export const DWELL_MS = 45_000;

/** A close button is a "not now", not a "never". */
export const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

export const MEMORY_KEY = "rn_blog_prompt_v1";
export const SESSION_KEY = "rn_blog_prompt_shown_v1";

/**
 * Posts whose reader is about to ACT on their own résumé. Email is a detour for
 * them; the product is the next thing they need.
 */
const RESUME_POSTS: ReadonlySet<string> = new Set([
  "tailor-resume-to-job-description",
  "ai-resume-rewrite-failure-modes",
  "claude-resume-prompts",
  "optimizing-resumes-for-ats",
  "how-ats-really-works",
]);

/**
 * A trust page. Anyone on it is deciding whether to believe the other posts,
 * and a prompt there reads as a sales page.
 */
const QUIET_POSTS: ReadonlySet<string> = new Set(["methodology"]);

/**
 * What to offer this reader, or null for nothing.
 *
 * `signedIn === null` means "not known yet" and returns null on purpose: the
 * résumé offer's footnote promises a sign-in step, which is false for someone
 * who already has an account, so offering it before the session resolves would
 * show a signed-in reader a claim that is wrong about them.
 */
export function promptVariantFor(slug: string, signedIn: boolean | null): PromptVariant | null {
  if (signedIn === null) return null;
  if (QUIET_POSTS.has(slug)) return null;
  if (RESUME_POSTS.has(slug)) return signedIn ? "email" : "posting_check";
  return "email";
}

/**
 * Fraction of the article that has scrolled up past the bottom of the viewport,
 * 0..1. `rect` is the article's bounding box in viewport coordinates.
 */
export function articleDepth(rect: { top: number; height: number }, viewportHeight: number): number {
  if (!(rect.height > 0) || !(viewportHeight > 0)) return 0;
  const depth = (viewportHeight - rect.top) / rect.height;
  if (!Number.isFinite(depth)) return 0;
  return Math.min(1, Math.max(0, depth));
}

export type PromptMemory = {
  /** Epoch ms until which a close button's "not now" still applies. */
  snoozedUntil?: number;
  /** "Don't show again", a signup, or a click through. Permanent. */
  never?: boolean;
};

type ReadableStorage = Pick<Storage, "getItem"> | null | undefined;
type WritableStorage = Pick<Storage, "getItem" | "setItem"> | null | undefined;

export function readMemory(storage: ReadableStorage): PromptMemory {
  try {
    const raw = storage?.getItem(MEMORY_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const { never, snoozedUntil } = parsed as Record<string, unknown>;
    return {
      never: never === true ? true : undefined,
      snoozedUntil: typeof snoozedUntil === "number" && Number.isFinite(snoozedUntil) ? snoozedUntil : undefined,
    };
  } catch {
    return {};
  }
}

function writeMemory(storage: WritableStorage, patch: PromptMemory) {
  try {
    storage?.setItem(MEMORY_KEY, JSON.stringify({ ...readMemory(storage), ...patch }));
  } catch {
    /* private mode, quota, blocked storage: the prompt just forgets */
  }
}

export function rememberSnooze(storage: WritableStorage, now: number) {
  writeMemory(storage, { snoozedUntil: now + SNOOZE_MS });
}

export function rememberNever(storage: WritableStorage) {
  writeMemory(storage, { never: true });
}

export function isSuppressed(memory: PromptMemory, now: number): boolean {
  if (memory.never) return true;
  return typeof memory.snoozedUntil === "number" && memory.snoozedUntil > now;
}

export function shownThisSession(session: ReadableStorage): boolean {
  try {
    return session?.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markShownThisSession(session: WritableStorage) {
  try {
    session?.setItem(SESSION_KEY, "1");
  } catch {
    /* see writeMemory */
  }
}

export function isEligible(input: {
  variant: PromptVariant | null;
  depth: number;
  dwellMs: number;
  suppressed: boolean;
  shownThisSession: boolean;
}): boolean {
  if (!input.variant) return false;
  if (input.suppressed || input.shownThisSession) return false;
  return input.depth >= DEPTH_THRESHOLD && input.dwellMs >= DWELL_MS;
}

/**
 * Words on the card. Strings, not interpolated numbers: the only figures near
 * this card are in the article itself, which already cites its source, and the
 * card makes no claim of its own that a number would have to back.
 */
export const PROMPT_COPY: Record<
  PromptVariant,
  { title: string; why: string; cta: string; note: string; rest: string }
> = {
  email: {
    title: "Get the next analysis by email",
    why: "One email, only when we publish the next look at what job postings actually say.",
    cta: "Send me the next one",
    note: "We email once to confirm.",
    rest: "Get it",
  },
  posting_check: {
    title: "Check this against a real posting",
    why: "Paste a job description and see which requirements your résumé already shows. Free account, no credit card.",
    cta: "Check my résumé",
    note: "You'll sign in on the next screen.",
    rest: "Check it",
  },
};
