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

it("the template gallery is public, like the builder it leads into", () => {
  // A signup-free funnel entry behind a sign-in wall would be the nav item
  // navigating to a login page — worse than the buried drawer it replaces.
  expect(isPublicPath("/templates")).toBe(true);
  expect(isPublicPath("/templates/")).toBe(true);
});
