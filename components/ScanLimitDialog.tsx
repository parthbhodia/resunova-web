"use client";

/**
 * ScanLimitDialog — shown when a free user hits a daily cap.
 *
 * There is NO paid/Pro tier yet (no Stripe), so this deliberately does NOT pitch
 * an upgrade. It simply tells the user they've hit today's free limit and offers
 * to route them to /contact to request a higher limit from us directly.
 *
 * Provider/hook pattern mirrors SignInDialog. Mount <ScanLimitDialogProvider>
 * once (in AppShell); any component calls useScanLimitDialog().openScanLimit(json)
 * from its 429 branch.
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

/** Real free-tier daily caps (keep in sync with API services/scan_limits.py). */
export const FREE_SCAN_DAILY_LIMIT = 3;
export const FREE_INTERVIEW_DAILY_LIMIT = 2;

/** Where "Request more scans" points — a plain contact request, no checkout. */
const CONTACT_HREF = "/contact?reason=scan-limit";

function featureLabel(opts: ScanLimitDialogOptions): string {
  const f = (opts.feature || "").toLowerCase();
  const code = (opts.code || "").toLowerCase();
  if (code.includes("interview") || f.includes("interview")) return "interview-prep scans";
  return "résumé scans";
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

export type ScanLimitDialogOptions = {
  feature?: string;
  code?: string;
  limit?: number;
  used?: number;
  resetAt?: string | null;
};

type ScanLimitDialogContextValue = {
  openScanLimit: (opts?: ScanLimitDialogOptions) => void;
};

const ScanLimitDialogContext = createContext<ScanLimitDialogContextValue | null>(null);

/** Safe fallback (no-op) if a component renders outside the provider. */
export function useScanLimitDialog(): ScanLimitDialogContextValue {
  const ctx = useContext(ScanLimitDialogContext);
  return ctx ?? { openScanLimit: () => {} };
}

const ClockIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function ScanLimitDialogProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ScanLimitDialogOptions>({});

  const openScanLimit = useCallback((next?: ScanLimitDialogOptions) => {
    setOpts(next ?? {});
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openScanLimit }), [openScanLimit]);

  const limit = typeof opts.limit === "number" ? opts.limit : FREE_SCAN_DAILY_LIMIT;
  const resetIn = resetLabel(opts.resetAt);

  const requestMore = useCallback(() => {
    setOpen(false);
    router.push(CONTACT_HREF);
  }, [router]);

  return (
    <ScanLimitDialogContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-3 px-2 pt-1 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--accent-bg)] text-accent">
              {ClockIcon}
            </span>
            <DialogTitle className="text-[19px] font-semibold text-[var(--text)]">
              Daily scan limit reached
            </DialogTitle>
            <DialogDescription className="max-w-xs text-[13.5px] leading-relaxed text-[var(--muted)]">
              You&apos;ve used all {limit} of your free {featureLabel(opts)} for today
              {resetIn ? ` — they reset ${resetIn}` : ""}. Need more right now? Send us a
              quick note and we&apos;ll raise your limit.
            </DialogDescription>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <Button size="lg" className="w-full" onClick={requestMore}>
              Request more scans
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              Maybe later
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </ScanLimitDialogContext.Provider>
  );
}
