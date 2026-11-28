"use client";

import type { ReactNode } from "react";
import { trackApply } from "@/lib/analytics";

/**
 * The public job page's "Apply on company site" link.
 *
 * The page itself is a server component, so the one thing it could not do was
 * notice a click. This is that, and nothing more: the link is unchanged (same
 * address, same `nofollow noopener`, no sign-in wall) and the click is reported
 * to analytics as `apply_click` from `job_page`. This page is where search
 * sends people, signed out, so before this there was no record of an apply
 * click here at all.
 */
export default function ApplyOutLink({
  job,
  href,
  className,
  children,
}: {
  job: { id: string; company: string };
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      rel="nofollow noopener"
      className={className}
      onClick={() => trackApply("apply_click", "job_page", job)}
    >
      {children}
    </a>
  );
}
