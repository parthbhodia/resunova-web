import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import ResumeBuilder from "@/components/ResumeBuilder";
import AppShellSkeleton from "@/components/app-shell/AppShellSkeleton";

export const metadata: Metadata = {
  title: "Tailor (new)",
  description: "Tailor your résumé to a job with the work-queue flow.",
  robots: { index: false },
};

/**
 * The Tailor redesign on its own route while it's validated: the SAME
 * ResumeBuilder engine (upload, analyze, preview, apply, rescore, autosave)
 * with the work-queue panel mounted atop the results workspace. The classic
 * flow at /?view=builder is untouched; once this route wins, the prop flips
 * to default and this becomes a redirect.
 */
export default function TailorV2Page() {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppShell>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ResumeBuilder queueUi />
        </div>
      </AppShell>
    </Suspense>
  );
}
