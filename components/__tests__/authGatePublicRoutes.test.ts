import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/components/AuthGate";

describe("AuthGate public job and SEO routes", () => {
  it.each([
    "/jobs",
    "/jobs/",
    "/jobs/job-123",
    "/resume-examples/",
    "/resume-examples/software-engineer/",
    "/pricing",
    "/pricing/",
  ])("allows %s without initializing auth", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it("keeps account-owned routes gated", () => {
    expect(isPublicPath("/my-resumes")).toBe(false);
  });
});
