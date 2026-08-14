import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { TailorTitleNote } from "@/components/tailor/TailorTitleNote";
import type { RatingsData } from "@/lib/types";

const ratings = {
  overall_score: 40,
  match_score: 40,
  job_title: {
    matched: false,
    jd_title: "Senior Fullstack Engineer",
    resume_title: "Software Engineer",
    score: 62,
    detail: "",
  },
  qualifications: { score: 40, missing: [], covered: [] },
  responsibilities: { score: 40, missing: [], covered: [] },
  keywords: { found_count: 3, total_count: 24, direct_skills: { found: [], missing: [] }, contextual: { found: [], missing: [] } },
  whats_working: [],
  gaps: [],
  verdict: "",
} as unknown as RatingsData;

describe("the title note", () => {
  it("states both titles so the number can be checked", () => {
    render(<TailorTitleNote ratings={ratings} />);
    expect(screen.getByText("Software Engineer vs Senior Fullstack Engineer")).toBeInTheDocument();
    expect(screen.getByText("62% overlap")).toBeInTheDocument();
  });

  it("never claims a match beside a partial number", () => {
    // Field 2026-08-14: "Your title matches … 33%" read as a contradiction —
    // the verb asserts, the number hedges ("it does say Senior fullstack
    // developer?"). The line now states the comparison and the unit, in both
    // matched and unmatched states alike.
    const matched = {
      ...ratings,
      job_title: { ...(ratings as never as { job_title: object }).job_title, matched: true },
    } as unknown as RatingsData;
    render(<TailorTitleNote ratings={matched} />);
    expect(screen.getByText("Your title vs the posting’s")).toBeInTheDocument();
    expect(screen.queryByText(/title matches/i)).toBeNull();
  });
});

describe("the dimension chips are gone", () => {
  /**
   * Pinned because a removal is what a later edit quietly restores, and because
   * the reason is not obvious from the diff: the chips grouped the SAME rows by
   * rater category while the queue bands group them by what the gap costs you.
   * Two taxonomies of one list, on screen at once. Once the band headers began
   * reporting true counts (they were printing the post-slice count), the chips'
   * glance value went with them. Title was the only thing they uniquely carried
   * and it now has its own line.
   */
  it("no longer render inside the queue panel", () => {
    const panel = readFileSync("components/tailor/TailorQueuePanel.tsx", "utf8");
    expect(panel).not.toContain("TailorDimensionChips");
    expect(panel).toContain("TailorTitleNote");
  });

  it("left no dead row filter behind on the queue", () => {
    // `visibleIds` existed only to let a chip narrow the rows. A prop nothing
    // passes is a filter waiting to hide work again.
    const queue = readFileSync("components/tailor/TailorWorkQueue.tsx", "utf8");
    expect(queue).not.toContain("visibleIds");
  });
});
