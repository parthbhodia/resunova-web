"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useSignInDialog } from "@/components/SignInDialog";
import JobApplyLink from "@/components/jobs/JobApplyLink";
import type { ApplyJob } from "@/components/jobs/ApplyPrompt";
import type { SignInAskKey } from "@/components/auth/signInAsk";
import { useReaderSignedIn } from "@/hooks/useReaderSignedIn";
import { stashAnalyzeJd } from "@/lib/anonScan";

/**
 * The interactive parts of the public job page (`/jobs/<id>`). The page itself
 * is a server component, cached for an hour, so it cannot know who is looking;
 * these read the session in the browser.
 */

/** Apply, with the résumé-check popup for a signed-out visitor. */
export function PublicApplyLink({
  job,
  className,
  style,
  children,
}: {
  job: ApplyJob;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const signedIn = useReaderSignedIn();
  return (
    <JobApplyLink job={job} place="job_page" signedIn={signedIn} className={className} style={style}>
      {children}
    </JobApplyLink>
  );
}

/**
 * Check a résumé against this job. A real link to the Analyze view, so it works
 * with scripts off; with scripts on it also carries the posting's text across
 * (session storage survives the navigation), so the scan is matched against
 * this job.
 */
export function ResumeCheckLink({
  jd,
  className,
  style,
  children,
}: {
  jd: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Link href="/?view=analyze" className={className} style={style} onClick={() => stashAnalyzeJd(jd)}>
      {children}
    </Link>
  );
}

/**
 * An action that needs an account. Signed out (or not known yet), it opens the
 * sign-in dialog with copy for this action; signed in, it is a link to where
 * the action lives in the app.
 */
export function AccountAction({
  ask,
  signedInHref,
  className,
  style,
  children,
}: {
  ask: SignInAskKey;
  signedInHref: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const signedIn = useReaderSignedIn();
  const { openSignIn } = useSignInDialog();
  if (signedIn === true) {
    return (
      <Link href={signedInHref} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} style={style} onClick={() => openSignIn({ ask })}>
      {children}
    </button>
  );
}
