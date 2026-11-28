"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trackApply, type ApplyPlace } from "@/lib/analytics";
import { goToFreeScan, stashAnalyzeJd } from "@/lib/anonScan";
import { FREE_SCAN_DAILY_LIMIT } from "@/lib/planLimits";

export type ApplyJob = { id: string; company: string; url: string; jd: string };

/**
 * What a signed-out visitor sees when they press Apply: an offer to check
 * their résumé against this job first, and a plain way past it.
 *
 * Founder-directed (2026-11-27): Apply must never force a sign-in. This used to
 * open the sign-in dialog on the in-app job page, which left a guest no way to
 * reach the employer at all. Now "Continue to application" is one click, a real
 * link to the employer's page, and declining the offer costs nothing.
 *
 * Built on the same dialog as the sign-in modal, which the root layout already
 * loads, so the public job page pays nothing extra for it.
 */
export default function ApplyPrompt({
  open,
  onOpenChange,
  job,
  place,
  onFollow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ApplyJob;
  place: ApplyPlace;
  /** Runs when the visitor continues to the employer, after the click is reported. */
  onFollow?: () => void;
}) {
  const company = job.company || "this company";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Check your résumé against this job first</DialogTitle>
          <DialogDescription>
            See which of {company}&apos;s requirements your résumé already covers, and fix the gaps before
            you send it. Free with an account, {FREE_SCAN_DAILY_LIMIT} scans a day.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            // px, not rem: this app's root font size is 14px, so rem sizes
            // come out short of the 44px touch target.
            className="min-h-[44px] w-full"
            onClick={() => {
              trackApply("apply_prompt_accepted", place, job);
              stashAnalyzeJd(job.jd);
              goToFreeScan();
            }}
          >
            Upload your résumé
          </Button>
          <a
            href={job.url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            onClick={() => {
              trackApply("apply_click", place, job);
              onFollow?.();
              onOpenChange(false);
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-semibold text-[color:var(--accent-ink)] underline-offset-4 hover:underline"
          >
            Continue to application
          </a>
          <p className="text-center text-xs text-[color:var(--muted)]">Opens {company}&apos;s site in a new tab.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
