"use client";

/**
 * UpgradeDialog — the single "you hit a free-tier limit → here's Pro" surface for
 * the whole app, mirroring SignInDialog's provider/context/hook pattern so any
 * component can pop it from its existing 429 branch with one call:
 *
 *     const { openUpgrade } = useUpgradeDialog();
 *     // in a fetch's `resp.status === 429` branch:
 *     openUpgrade(json);   // json = { code, feature, limit, used, resetAt }
 *
 * Mount <UpgradeDialogProvider> once (in AppShell) so the sidebar, top bar, and
 * every view rendered as AppShell children share one modal.
 *
 * HONESTY NOTE: the Free-vs-Pro numbers below are the REAL server-side caps
 * (FREE_SCAN_DAILY_LIMIT=3, INTERVIEW_PREP_DAILY_LIMIT=2 in the API's
 * services/scan_limits.py). Everything else — job feed, tracker, referrals — has
 * no daily cap today, so it's shown as "Included", not a fake number.
 * The CTA opens Stripe Checkout via POST /api/billing/checkout; when checkout
 * isn't live (flag off / signed out / request failure) it falls back to the
 * /pricing page instead of dead-ending.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/lib/billingApi";

/** Real free-tier daily caps (keep in sync with API services/scan_limits.py). */
export const FREE_SCAN_DAILY_LIMIT = 3;
export const FREE_INTERVIEW_DAILY_LIMIT = 2;

/** Fallback when Stripe Checkout is unavailable (flag off, signed out, error). */
const UPGRADE_FALLBACK_HREF = "/pricing";

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const CrownIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 7l4.5 3L12 4l4.5 6L21 7l-1.6 11H4.6L3 7Z" />
  </svg>
);

/** Map a 429 `code`/`feature` to human copy for the contextual banner. */
function featureLabel(opts: UpgradeDialogOptions): string {
  const f = (opts.feature || "").toLowerCase();
  const code = (opts.code || "").toLowerCase();
  if (code.includes("interview") || f.includes("interview")) return "interview-prep scans";
  return "resume scans";
}

function resetLabel(resetAt?: string | null): string | null {
  if (!resetAt) return null;
  const t = Date.parse(resetAt);
  if (Number.isNaN(t)) return null;
  const diffMs = t - Date.now();
  if (diffMs <= 0) return "shortly";
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.round((diffMs % 3_600_000) / 60_000);
  if (hours >= 1) return `in ${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  return `in ${Math.max(1, mins)}m`;
}

export type UpgradeDialogOptions = {
  /** Feature that hit its cap, e.g. "resume scans" / "interview prep". */
  feature?: string;
  /** The 429 payload `code` (daily_scan_limit_reached / interview_prep_limit_reached). */
  code?: string;
  /** Daily cap and usage from the 429 payload, when available. */
  limit?: number;
  used?: number;
  /** ISO reset timestamp from the 429 payload (next UTC midnight). */
  resetAt?: string | null;
};

type UpgradeDialogContextValue = {
  openUpgrade: (opts?: UpgradeDialogOptions) => void;
};

const UpgradeDialogContext = createContext<UpgradeDialogContextValue | null>(null);

/** Safe fallback (no-op) if a component renders outside the provider. */
export function useUpgradeDialog(): UpgradeDialogContextValue {
  const ctx = useContext(UpgradeDialogContext);
  return ctx ?? { openUpgrade: () => {} };
}

type PlanRow = { label: string; free: string; pro: string; freeMuted?: boolean };

const PLAN_ROWS: PlanRow[] = [
  { label: "Resume & ATS scans", free: `${FREE_SCAN_DAILY_LIMIT} / day`, pro: "Unlimited" },
  { label: "Job match & tailoring", free: `${FREE_SCAN_DAILY_LIMIT} / day`, pro: "Unlimited" },
  { label: "Interview-prep scans", free: `${FREE_INTERVIEW_DAILY_LIMIT} / day`, pro: "Unlimited" },
  { label: "AI rewrites & clean PDF export", free: "Included", pro: "Unlimited", freeMuted: true },
  { label: "Job feed, tracker & referrals", free: "Included", pro: "Included", freeMuted: true },
];

const PRO_UNLOCKS = [
  "Unlimited résumé & ATS checks + AI fixes",
  "Unlimited job-match scoring & tailored résumés",
  "Unlimited interview-prep scans",
  "Unlimited clean PDF downloads",
];

export function UpgradeDialogProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<UpgradeDialogOptions>({});

  const openUpgrade = useCallback((next?: UpgradeDialogOptions) => {
    setOpts(next ?? {});
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  const hitLimit = typeof opts.limit === "number" || Boolean(opts.code);
  const resetIn = resetLabel(opts.resetAt);

  const [checkingOut, setCheckingOut] = useState(false);

  const goUpgrade = useCallback(async () => {
    if (checkingOut) return;
    setCheckingOut(true);
    try {
      const result = await createCheckoutSession("pro_monthly");
      if ("url" in result) {
        // Full-page redirect to Stripe-hosted Checkout.
        window.location.assign(result.url);
        return;
      }
      setOpen(false);
      router.push(UPGRADE_FALLBACK_HREF);
    } finally {
      setCheckingOut(false);
    }
  }, [checkingOut, router]);

  return (
    <UpgradeDialogContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(52rem,94vw)] gap-0 overflow-hidden p-0 sm:max-w-[min(52rem,94vw)]">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left rail — the value story */}
            <div
              className="flex flex-col gap-4 p-6 md:p-7"
              style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {hitLimit ? "Daily free limit reached" : "You're on the Free plan"}
              </p>

              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold leading-none text-[var(--text)]">
                  {opts.limit ?? FREE_SCAN_DAILY_LIMIT}
                </span>
                <span className="text-2xl text-[var(--muted)]">→</span>
                <span className="text-4xl font-bold leading-none text-accent">∞</span>
              </div>

              <DialogTitle className="text-[19px] font-semibold leading-snug text-[var(--text)]">
                Unlock the <span className="text-accent">full job-hunt toolkit</span>
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-[var(--muted)]">
                Pro is the whole engine: unlimited ATS checks &amp; AI fixes, tailored
                résumés for every job, and unlimited clean PDF downloads.
              </DialogDescription>

              <ul className="mt-1 flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                {PRO_UNLOCKS.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[13px] text-[var(--text)]">
                    <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-accent">
                      {CheckIcon}
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right rail — the comparison + CTA */}
            <div className="flex flex-col gap-4 p-6 md:p-7">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-accent">
                  {CrownIcon}
                </span>
                <span className="text-[17px] font-semibold text-[var(--text)]">
                  Resunova <span className="text-accent">Pro</span>
                </span>
              </div>

              {hitLimit ? (
                <p className="rounded-lg border border-[var(--amber-bg)] bg-[var(--amber-bg)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--amber-ink)]">
                  You&apos;ve used all {opts.limit ?? FREE_SCAN_DAILY_LIMIT} free{" "}
                  {featureLabel(opts)} today
                  {resetIn ? ` — resets ${resetIn}` : ""}. Upgrade for unlimited access.
                </p>
              ) : null}

              {/* Comparison table */}
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <span>What you get</span>
                  <span className="text-center">Free</span>
                  <span className="rounded-md bg-accent px-2 py-0.5 text-center text-accent-foreground">Pro</span>
                </div>
                {PLAN_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-[var(--border)] px-4 py-2.5 text-[13px] last:border-b-0"
                  >
                    <span className="text-[var(--text)]">{row.label}</span>
                    <span className={row.freeMuted ? "text-center text-[var(--muted)]" : "text-center text-[var(--text)]"}>
                      {row.free}
                    </span>
                    <span className="flex items-center justify-center gap-1 whitespace-nowrap font-medium text-[var(--green-ink)]">
                      <span className="text-[var(--green-ink)]">{CheckIcon}</span>
                      {row.pro}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-1">
                <Button size="lg" className="w-full gap-2" onClick={goUpgrade} disabled={checkingOut}>
                  {CrownIcon}
                  {checkingOut ? "Opening checkout…" : "Upgrade to Pro"}
                </Button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </UpgradeDialogContext.Provider>
  );
}
