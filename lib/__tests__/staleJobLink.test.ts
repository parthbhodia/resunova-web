/**
 * `jobIdFromPath` decides whether the 404 page is looking at a retired public
 * job link. Wrongly saying yes makes the page ask the API about something that
 * is not a posting; wrongly saying no leaves a stale Google result on the
 * generic dead end. Both directions are pinned.
 */
import { describe, expect, it } from "vitest";
import { JOBS_PORTAL_HREF, inAppJobHref, jobIdFromPath } from "@/lib/staleJobLink";

const UUID = "3f2b1c9e-8a47-4d1e-9c55-0a1b2c3d4e5f";

describe("jobIdFromPath", () => {
  it("reads the id with or without the trailing slash", () => {
    expect(jobIdFromPath(`/jobs/${UUID}/`)).toBe(UUID);
    expect(jobIdFromPath(`/jobs/${UUID}`)).toBe(UUID);
  });

  it("decodes a percent-encoded id (jobHref encodes it)", () => {
    expect(jobIdFromPath("/jobs/%61bc-123/")).toBe("abc-123");
  });

  it("is null for every other path", () => {
    expect(jobIdFromPath("/")).toBeNull();
    expect(jobIdFromPath("/jobs/")).toBeNull();
    expect(jobIdFromPath("/jobs")).toBeNull();
    expect(jobIdFromPath("/blog/some-post/")).toBeNull();
    expect(jobIdFromPath(`/jobsx/${UUID}/`)).toBeNull();
    expect(jobIdFromPath(`/other/jobs/${UUID}/`)).toBeNull();
  });

  it("does not treat a nested path as a posting", () => {
    expect(jobIdFromPath(`/jobs/${UUID}/apply/`)).toBeNull();
  });

  it("never treats a real /jobs/ route as a posting id", () => {
    expect(jobIdFromPath("/jobs/sponsors/")).toBeNull();
    expect(jobIdFromPath("/jobs/sponsors")).toBeNull();
    expect(jobIdFromPath("/jobs/Sponsors/")).toBeNull();
  });

  it("rejects anything that is not id-shaped", () => {
    expect(jobIdFromPath("/jobs/%3Cscript%3E/")).toBeNull();
    expect(jobIdFromPath("/jobs/a%2Fb/")).toBeNull();
    expect(jobIdFromPath("/jobs/%E0%A4%A/")).toBeNull(); // malformed encoding
    expect(jobIdFromPath(`/jobs/${"a".repeat(129)}/`)).toBeNull();
    expect(jobIdFromPath(`/jobs/${"a".repeat(128)}/`)).toBe("a".repeat(128));
  });
});

describe("inAppJobHref", () => {
  it("points at the in-app Jobs view with the posting selected", () => {
    expect(inAppJobHref(UUID)).toBe(`/?view=jobs&job=${UUID}`);
  });

  it("encodes the id", () => {
    expect(inAppJobHref("a b&c")).toBe("/?view=jobs&job=a%20b%26c");
  });
});

describe("JOBS_PORTAL_HREF", () => {
  it("is the in-app job search, which guests may open", () => {
    expect(JOBS_PORTAL_HREF).toBe("/?view=jobs");
  });
});
