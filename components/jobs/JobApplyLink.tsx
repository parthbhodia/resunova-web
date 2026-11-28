"use client";

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { trackApply, type ApplyPlace } from "@/lib/analytics";
import ApplyPrompt, { type ApplyJob } from "./ApplyPrompt";

/**
 * The Apply link on a job, in the app and on the public job page.
 *
 * It is a real link to the employer's page, so it works with scripts off and a
 * crawler sees where it goes. A visitor known to be signed out gets the popup
 * first (see `ApplyPrompt`), with "Continue to application" one click away. A
 * signed-in visitor, or one whose session is not known yet, goes straight
 * through: a person who is signed in must never be asked to sign up, and the
 * popup is an offer, so missing it costs nothing.
 */
export default function JobApplyLink({
  job,
  place,
  signedIn,
  className,
  style,
  children,
  onFollow,
}: {
  job: ApplyJob;
  place: ApplyPlace;
  signedIn: boolean | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Runs when the visitor actually leaves for the employer. */
  onFollow?: () => void;
}) {
  const [prompting, setPrompting] = useState(false);
  if (!job.url) return null;

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (signedIn === false) {
      e.preventDefault();
      trackApply("apply_prompt_shown", place, job);
      setPrompting(true);
      return;
    }
    trackApply("apply_click", place, job);
    onFollow?.();
  };

  return (
    <>
      <a href={job.url} target="_blank" rel="nofollow noopener noreferrer" className={className} style={style} onClick={onClick}>
        {children}
      </a>
      <ApplyPrompt open={prompting} onOpenChange={setPrompting} job={job} place={place} onFollow={onFollow} />
    </>
  );
}
