import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/components/AuthGate";

describe("AuthGate public marketing routes", () => {
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

  it("keeps account-owned routes and referral requests gated", () => {
    expect(isPublicPath("/my-resumes")).toBe(false);
    expect(isPublicPath("/refer")).toBe(false);
    expect(isPublicPath("/refer/")).toBe(false);
  });

  it("keeps the account hub gated: it has no signed-out state", () => {
    // ProfilePage reads the signed-in user's plan, usage, referral alerts and
    // Career Memory. With /profile in PUBLIC_ROUTES it rendered that whole
    // dashboard to anonymous visitors, header and Sign out button included.
    expect(isPublicPath("/profile")).toBe(false);
    expect(isPublicPath("/profile/")).toBe(false);
  });
});

it("the template gallery is public, like the builder it leads into", () => {
  // A signup-free funnel entry behind a sign-in wall would be the nav item
  // navigating to a login page — worse than the buried drawer it replaces.
  expect(isPublicPath("/templates")).toBe(true);
  expect(isPublicPath("/templates/")).toBe(true);
});
