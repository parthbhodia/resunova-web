import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveTailorMatchToLibrary, tailorMatchFolder } from "@/lib/tailorAnalyzeLibrary";
import type { RatingsData } from "@/lib/types";

/**
 * The prod failure of 2026-08-13, as tests.
 *
 * A run with empty company/role slugged to the shared degenerate folder
 * `tailor_match_co_role` — the SAME folder for every company-less run of
 * every job, for every user. One user's row then blocked another user's
 * saves for a month across the (then-global) unique on `folder`, and within
 * one account each new JD silently overwrote the previous match.
 */

vi.mock("@/lib/supabase", () => ({
  upsertResume: vi.fn().mockResolvedValue("row-1"),
}));

import { upsertResume } from "@/lib/supabase";

const JD_A = "Staff Fullstack Developer\nOwn distributed backend services in Go.";
const JD_B = "Data Engineer\nBuild dbt transformations on Snowflake.";

describe("tailorMatchFolder", () => {
  it("stays stable per company+role, byte-unchanged from the shipped scheme", () => {
    // Fully-named runs must keep their folder across re-runs AND across this
    // change, or every existing library row becomes a zombie.
    expect(tailorMatchFolder("Google", "Software Engineer", JD_A))
      .toBe("tailor_match_Google_SoftwareEngineer");
    expect(tailorMatchFolder("Google", "Software Engineer", JD_B))
      .toBe(tailorMatchFolder("Google", "Software Engineer", JD_A));
  });

  it("keeps two company-less jobs in two folders", () => {
    // The shipped behaviour collapsed both onto `tailor_match_co_role`.
    const a = tailorMatchFolder("—", "—", JD_A);
    const b = tailorMatchFolder("—", "—", JD_B);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^tailor_match_co_role_[0-9a-f]{8}$/);
  });

  it("re-running the same JD lands on the same folder", () => {
    // Stability is the whole point of the folder: re-runs update in place.
    expect(tailorMatchFolder("—", "—", JD_A)).toBe(tailorMatchFolder("—", "—", JD_A));
    // Whitespace reflow of the same pasted JD is the same JD.
    expect(tailorMatchFolder("—", "—", "  Staff   Fullstack Developer\n\nOwn distributed backend services in Go. "))
      .toBe(tailorMatchFolder("—", "—", JD_A));
  });

  it("discriminates when EITHER side is missing, not only both", () => {
    // "Google" + empty role would otherwise fold two different Google JDs
    // onto one row — the same overwrite, one notch less degenerate.
    const a = tailorMatchFolder("Google", "—", JD_A);
    const b = tailorMatchFolder("Google", "—", JD_B);
    expect(a).not.toBe(b);
  });

  it("degenerate with no JD keeps the legacy folder rather than inventing one", () => {
    expect(tailorMatchFolder("—", "—", "")).toBe("tailor_match_co_role");
    expect(tailorMatchFolder("—", "—")).toBe("tailor_match_co_role");
  });
});

describe("saveTailorMatchToLibrary labels", () => {
  beforeEach(() => {
    vi.mocked(upsertResume).mockClear();
  });

  const ratings = {
    match_score: 42,
    verdict: "",
    job_title: { matched: false, jd_title: "Staff Fullstack Developer", resume_title: "Senior Fullstack Developer", score: 67 },
  } as unknown as RatingsData;

  const base = {
    folder: "tailor_match_co_role_deadbeef",
    company: "—",
    model: "m",
    ratings,
    jobDescription: JD_A,
  };

  it("labels a role-less run with the posting title the grade already read", async () => {
    // "— · —" in the library is us discarding a fact we hold. The label may
    // use the LLM's title; the FOLDER never does (wording drifts run to run).
    await saveTailorMatchToLibrary({ ...base, role: "—" });
    expect(vi.mocked(upsertResume).mock.calls[0][2]).toBe("Staff Fullstack Developer");
  });

  it("never overrides a role the user actually typed", async () => {
    await saveTailorMatchToLibrary({ ...base, role: "Backend Engineer" });
    expect(vi.mocked(upsertResume).mock.calls[0][2]).toBe("Backend Engineer");
  });
});
