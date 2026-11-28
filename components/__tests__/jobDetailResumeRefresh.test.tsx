/**
 * The job pane follows the résumé it is scored against.
 *
 * Field report: after "Update résumé" the feed re-ranked but the job pane kept
 * the old match score, and Optimize kept working from the old résumé. The
 * server was right all along; the pane loaded once per posting and never again.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobDetail as JobDetailData } from "@/lib/jobsApi";

const fetchJobDetail = vi.hoisted(() => vi.fn());
const boost = vi.hoisted(() => ({ mounts: 0, lastProps: null as null | { open: boolean; onClose: () => void } }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/components/SignInDialog", () => ({ useSignInDialog: () => ({ openSignIn: vi.fn() }) }));
vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn(async () => new Response("{}", { status: 200 })) }));
vi.mock("@/lib/supabase", () => ({
  fetchJobPrepStatuses: vi.fn(async () => ({})),
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));
vi.mock("@/lib/jobsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/jobsApi")>()),
  fetchJobDetail: (id: string, opts?: { force?: boolean }) => fetchJobDetail(id, opts),
  peekJobDetail: () => null,
  trackJobEvent: vi.fn(),
}));
// Optimize is its own component; here it only matters when it is (re)mounted.
vi.mock("@/components/BoostPanel", () => {
  function BoostPanelStub(props: { open: boolean; onClose: () => void }) {
    boost.lastProps = props;
    useEffect(() => {
      boost.mounts += 1;
    }, []);
    return null;
  }
  return { default: BoostPanelStub };
});

import JobDetail from "@/components/JobDetail";
import { notifyResumeChanged } from "@/lib/resumeChange";

const ID = "3f2b1c9e-8a47-4d1e-9c55-0a1b2c3d4e5f";
function job(over: Partial<JobDetailData>): JobDetailData {
  return {
    id: ID, title: "Backend Engineer", company: "Stripe", companySlug: "stripe", companyDomain: "stripe.com",
    source: "greenhouse", url: "https://stripe.com/jobs/1", location: "New York, NY",
    salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null, salarySource: null,
    workModel: "hybrid", seniority: "senior", visaSponsorship: null, h1bSponsor: null, h1bCertifiedCount: null,
    h1bMedianWage: null, applicantCount: null, postedAt: "2026-11-20T00:00:00Z", isActive: true,
    jdText: "Build payment systems.", resumeAnalysisId: "scan-old", resumeSections: [], resumeText: "",
    structuredResume: null, matched: [], missing: [], injectableKeywords: [], matchScore: 30,
    matchedCount: 3, totalRequirements: 10,
    ...over,
  };
}

beforeEach(() => {
  fetchJobDetail.mockReset();
  boost.mounts = 0;
  boost.lastProps = null;
});
afterEach(cleanup);

async function openPane() {
  fetchJobDetail.mockResolvedValueOnce(job({}));
  render(<JobDetail jobId={ID} />);
  await screen.findByText(/matches 3 of 10 extracted/);
}

describe("job pane after the résumé changes", () => {
  it("refetches, skipping the cache, and shows the new résumé's match", async () => {
    await openPane();
    fetchJobDetail.mockResolvedValueOnce(job({ resumeAnalysisId: "scan-new", matchedCount: 7 }));
    await act(async () => notifyResumeChanged());
    await screen.findByText(/matches 7 of 10 extracted/);
    expect(fetchJobDetail).toHaveBeenLastCalledWith(ID, { force: true });
  });

  it("refetches in place: the pane never drops back to its loading skeleton", async () => {
    await openPane();
    let resolve!: (j: JobDetailData) => void;
    fetchJobDetail.mockReturnValueOnce(new Promise<JobDetailData>((r) => { resolve = r; }));
    act(() => notifyResumeChanged());
    // While the refetch is in flight the old content stays up.
    expect(screen.getByText(/matches 3 of 10 extracted/)).toBeTruthy();
    await act(async () => resolve(job({ resumeAnalysisId: "scan-new", matchedCount: 7 })));
    await screen.findByText(/matches 7 of 10 extracted/);
  });

  it("starts Optimize over against the new résumé once it is closed", async () => {
    await openPane();
    expect(boost.mounts).toBe(1);
    fetchJobDetail.mockResolvedValueOnce(job({ resumeAnalysisId: "scan-new", matchedCount: 7 }));
    await act(async () => notifyResumeChanged());
    await screen.findByText(/matches 7 of 10 extracted/);
    expect(boost.mounts).toBe(2);
  });

  it("never pulls an open Optimize panel away; it resets when closed", async () => {
    await openPane();
    fireEvent.click(screen.getByRole("button", { name: /Optimize my résumé/ }));
    expect(boost.lastProps?.open).toBe(true);
    fetchJobDetail.mockResolvedValueOnce(job({ resumeAnalysisId: "scan-new", matchedCount: 7 }));
    await act(async () => notifyResumeChanged());
    await screen.findByText(/matches 7 of 10 extracted/);
    expect(boost.mounts).toBe(1);
    act(() => boost.lastProps!.onClose());
    expect(boost.mounts).toBe(2);
  });

  it("does nothing before any change", async () => {
    await openPane();
    expect(fetchJobDetail).toHaveBeenCalledTimes(1);
    expect(fetchJobDetail).toHaveBeenLastCalledWith(ID, { force: false });
  });
});
