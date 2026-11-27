import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminPipelineResponse } from "@/lib/adminPipeline";

const apiFetch = vi.fn();
vi.mock("@/lib/apiClient", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import PipelineCharts from "@/components/admin/PipelineCharts";

const fixture = (): AdminPipelineResponse => ({
  generated_at: "2026-11-27T22:00:00Z",
  days: 7,
  daily: [
    { d: "2026-11-25", batches: 370, empty_batches: 0, full_scans: 4, extracted: 29254, failures: 346, upserted: 228050, deactivated: 23805, short_calls: 28219, long_calls: 1481 },
    { d: "2026-11-26", batches: 1141, empty_batches: 780, full_scans: 3, extracted: 27286, failures: 531, upserted: 166489, deactivated: 7508, short_calls: 26036, long_calls: 1674 },
  ],
  hourly: [
    { h: "2026-11-27T03:00", batches: 400, empty_batches: 400, extracted: 0, failures: 0 },
    { h: "2026-11-27T11:00", batches: 18, empty_batches: 0, extracted: 960, failures: 0 },
  ],
  backlog: { window_total: 67485, extracted: 58766, waiting: 8440, stuck: 1, no_text: 268,
    by_age: [{ k: "today", n: 487 }, { k: "1-3 days", n: 1618 }, { k: "3-7 days", n: 3139 }, { k: "7-10 days", n: 3196 }] },
  latency: { n: 35530, extract_p50_h: 4, extract_p90_h: 57.9, embed_p50_h: 1.4, embed_p90_h: 64.8 },
  stuck: [{ id: "3589f8d9-22f8-4989-bfd3-36d4a4431eda", title: "Manager In Training", company: "Acme", posted_at: "2026-11-27T01:27:04Z", failures: 3, jd_len: 75 }],
  full_scans: [{ started_at: "2026-11-27T18:22:27Z", duration_ms: 5927768, fetched: 220571, upserted: 47042, deactivated: 1760, errors: 20 }],
});

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

describe("PipelineCharts", () => {
  beforeEach(() => apiFetch.mockReset());

  it("renders the history, backlog, stuck postings and full scans", async () => {
    apiFetch.mockImplementation(() => ok(fixture()));
    render(<PipelineCharts days={7} />);
    expect(await screen.findByText("Postings extracted per day")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/pipeline?days=7");
    expect(screen.getByText("Manager In Training")).toBeInTheDocument();
    expect(screen.getAllByText("4.0 h").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: /per hour/ })).toBeInTheDocument();
    expect(screen.getByText("1 h 39 min")).toBeInTheDocument();
  });

  it("shows the day table on request", async () => {
    apiFetch.mockImplementation(() => ok(fixture()));
    render(<PipelineCharts days={7} />);
    await userEvent.click(await screen.findByRole("button", { name: "Show as table" }));
    expect(screen.getByText("29,254")).toBeInTheDocument();
    expect(screen.getByText("1.2%")).toBeInTheDocument();
  });

  it("retries a stuck posting and reloads", async () => {
    apiFetch.mockImplementation((path?: string) => String(path).endsWith("/retry") ? ok({ reset: 1 }) : ok(fixture()));
    render(<PipelineCharts days={30} />);
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 back in the queue"));
    const retryCall = apiFetch.mock.calls.find(c => String(c[0]).endsWith("/retry"));
    expect(JSON.parse(retryCall![1].body)).toEqual({ ids: ["3589f8d9-22f8-4989-bfd3-36d4a4431eda"] });
  });

  it("says why when the endpoint fails", async () => {
    apiFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "pipeline analytics unavailable" }) }));
    render(<PipelineCharts days={90} />);
    expect(await screen.findByText(/Pipeline charts unavailable: pipeline analytics unavailable/)).toBeInTheDocument();
  });
});
