"use client";

/**
 * The one thing the dimension chips carried that nothing else does.
 *
 * The chips filtered the queue by rater category (Qualifications /
 * Responsibilities / Keywords) while the queue bands already group the SAME
 * rows by what the gap costs you — two taxonomies of one list, side by side,
 * and after the band headers started reporting true counts the chips' glance
 * value went with them. They were removed.
 *
 * Title is the exception: it is informational, never becomes a queue row, and
 * therefore had nowhere else to live. One line, stated plainly, with the
 * posting's title against the résumé's so the number can be checked rather
 * than taken on faith.
 */

import React from "react";
import type { RatingsData } from "@/lib/types";
import { isDetailedRatings } from "@/lib/types";
import { FS, FW } from "@/lib/typography";

export function TailorTitleNote({ ratings }: { ratings: RatingsData }) {
  if (!isDetailedRatings(ratings)) return null;
  const jt = ratings.job_title;
  if (!jt) return null;
  const jd = (jt.jd_title ?? "").trim();
  const mine = (jt.resume_title ?? "").trim();
  if (!jd && !mine) return null;

  return (
    <div
      data-testid="title-note"
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        flexWrap: "wrap",
        padding: "2px 2px 0",
        fontSize: FS.small,
        color: "var(--muted)",
      }}
    >
      {/* Not "Your title matches": that verb beside a low percentage read as
          a contradiction ("it does say Senior fullstack developer?"). The
          line states what is being compared, and the number names its unit so
          it can be checked against the two titles printed beside it. */}
      <span style={{ fontWeight: FW.semibold, color: "var(--text)" }}>
        Your title vs the posting&rsquo;s
      </span>
      {mine && jd ? (
        <span>
          {mine} vs {jd}
        </span>
      ) : null}
      {/* Deliberately NOT tinted by severity. A title is not a gap you can be
          asked to close by rewriting a bullet, so colouring it like one would
          put a task next to something nobody should act on. */}
      <span style={{ fontWeight: FW.semibold, color: "var(--text)" }}>
        {Math.round(jt.score)}% overlap
      </span>
    </div>
  );
}
