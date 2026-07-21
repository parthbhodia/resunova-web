import { beforeEach, describe, expect, it } from "vitest";
import { stashVersionForBoost, readStashedBoostVersion, clearStashedBoostVersion } from "@/lib/versionBoostPrefill";
import type { ResumeVersion } from "@/lib/resumeVersions";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const struct: StructuredResume = {
  full_name: "Ada Lovelace", headline: "Eng", location: "London", email: "a@x.com",
  phone: "", linkedin: "", github: "", summary: "Builds engines.",
  skills: [], experience: [{ company: "Analytical", role: "Lead", dates: "1843", location: "London", bullets: ["Wrote the first algorithm"] }],
  education: [], projects: [], extra_sections: [],
};

const version = (over: Partial<ResumeVersion> = {}): ResumeVersion => ({
  id: "v1", name: "Ada's résumé", rootId: "r1", parentId: null, version: 2,
  structured: struct, extractedText: null, origin: "tailor", sourcePdfUrl: null,
  jdText: null, jdCompany: "Stripe", jdTitle: "PM", lastScore: 80, lastScoreSource: "match",
  isDefault: false, createdAt: "2026-07-20T00:00:00Z", updatedAt: "2026-07-20T00:00:00Z", ...over,
});

describe("versionBoostPrefill", () => {
  beforeEach(() => sessionStorage.clear());

  it("stashes and reads back the version (id/root/version/structured/text)", () => {
    expect(stashVersionForBoost(version())).toBe(true);
    const got = readStashedBoostVersion();
    expect(got?.id).toBe("v1");
    expect(got?.rootId).toBe("r1");
    expect(got?.version).toBe(2);
    expect(got?.structured?.full_name).toBe("Ada Lovelace");
    expect(got?.extractedText).toContain("first algorithm"); // flattened from structured
  });

  it("clears the stash (consume once)", () => {
    stashVersionForBoost(version());
    clearStashedBoostVersion();
    expect(readStashedBoostVersion()).toBeNull();
  });

  it("refuses to stash a version with no résumé content", () => {
    const empty: StructuredResume = {
      full_name: "", headline: "", location: "", email: "", phone: "", linkedin: "", github: "",
      summary: "", skills: [], experience: [], education: [], projects: [], extra_sections: [],
    };
    expect(stashVersionForBoost(version({ structured: empty, extractedText: null }))).toBe(false);
  });

  it("returns null for a malformed stash", () => {
    sessionStorage.setItem("rn_boost_version_v1", "{not json");
    expect(readStashedBoostVersion()).toBeNull();
  });
});
