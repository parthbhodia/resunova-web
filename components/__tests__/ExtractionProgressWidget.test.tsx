import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ExtractionProgressWidget from "@/components/ExtractionProgressWidget";
import type { AdminAnalyticsJobsBlock } from "@/lib/types";

function jobsFixture(over: Partial<AdminAnalyticsJobsBlock["postings"]> = {}): AdminAnalyticsJobsBlock {
  return {
    postings: {
      total: 400000,
      active: 400000,
      extracted: 52858,
      pending_extraction: 188189,
      extract_window_days: 14,
      old_pending_skipped: 12000,
      by_source: [],
      by_company: [],
      ...over,
    },
    scan_runs: {
      total_runs: 40,
      jobs_added: 1000,
      deactivated: 10,
      extracted: 900,
      extraction_failures: 12,
      daily: [
        { date: "2026-10-12", runs: 10, jobs_added: 100, extracted: 200 },
        { date: "2026-10-13", runs: 10, jobs_added: 100, extracted: 350 },
        { date: "2026-10-14", runs: 10, jobs_added: 100, extracted: 350 },
      ],
      recent: [],
    },
    engagement: {
      apply_clicks: 0,
      saves: 0,
      hides: 0,
      unique_appliers: 0,
      daily_applies: [],
      top_companies: [],
      top_postings: [],
      by_user: [],
    },
  };
}

describe("ExtractionProgressWidget", () => {
  it("shows percent, extracted, and pending", () => {
    render(<ExtractionProgressWidget jobs={jobsFixture()} windowDays={30} />);
    expect(screen.getByTestId("extraction-progress-widget")).toBeInTheDocument();
    expect(screen.getByText(/21\.9%/)).toBeInTheDocument();
    expect(screen.getByText(/52,858 extracted/)).toBeInTheDocument();
    expect(screen.getByText(/188,189 pending/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "21.9");
    expect(screen.getByText(/12,000 older pending/)).toBeInTheDocument();
  });

  it("shows live extractor count from claim leases", () => {
    render(
      <ExtractionProgressWidget
        jobs={jobsFixture({ active_extractors: 2, claimed_inflight: 8 })}
        windowDays={30}
      />,
    );
    expect(screen.getByText("2 active")).toBeInTheDocument();
    expect(screen.getByText(/8 rows claimed/)).toBeInTheDocument();
  });

  it("lists Mac and Windows worker identity", () => {
    render(
      <ExtractionProgressWidget
        jobs={jobsFixture({
          active_extractors: 2,
          claimed_inflight: 20,
          workers: [
            {
              worker_key: "MacBook.local:111",
              hostname: "MacBook.local",
              platform: "Darwin",
              gpu: "Apple Silicon · Metal",
              model: "qwen2.5:14b-instruct",
              batch: 10,
              status: "running",
            },
            {
              worker_key: "DESKTOP-GPU:222",
              hostname: "DESKTOP-GPU",
              platform: "Windows",
              gpu: "NVIDIA GeForce RTX 4090, 24564 MiB",
              model: "qwen2.5:14b-instruct",
              batch: 80,
              status: "running",
            },
          ],
        })}
        windowDays={30}
      />,
    );
    expect(screen.getByTestId("extraction-workers-list")).toBeInTheDocument();
    expect(screen.getByText(/MacBook\.local · Darwin · Apple Silicon/)).toBeInTheDocument();
    expect(screen.getByText(/DESKTOP-GPU · Windows · NVIDIA GeForce RTX 4090/)).toBeInTheDocument();
  });
});
