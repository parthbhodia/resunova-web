import { beforeEach, describe, expect, it } from "vitest";
import { stashVersionForTailor } from "@/lib/versionTailorPrefill";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const struct: StructuredResume = {
  full_name: "Grace Hopper", headline: "Engineer", location: "Arlington", email: "grace@x.com",
  phone: "", linkedin: "", github: "", summary: "Compiles things.",
  skills: [], experience: [{ company: "Navy", role: "Programmer", dates: "1949", location: "US", bullets: ["Built the first compiler"] }],
  education: [], projects: [], extra_sections: [],
};

const version = (over: Record<string, unknown> = {}) => ({
  structured: struct as StructuredResume | null,
  extractedText: null as string | null,
  jdText: null as string | null,
  jdCompany: null as string | null,
  jdTitle: null as string | null,
  ...over,
});

describe("stashVersionForTailor", () => {
  beforeEach(() => sessionStorage.clear());

  it("stashes résumé text + structured and returns true", () => {
    const ok = stashVersionForTailor(version());
    expect(ok).toBe(true);
    expect(sessionStorage.getItem("rn_builder_profile_prefill")).toContain("Grace Hopper");
    expect(sessionStorage.getItem("rn_builder_structured_prefill")).toContain("first compiler");
  });

  it("prefers extractedText when present and long enough", () => {
    stashVersionForTailor(version({ extractedText: "A".repeat(60) }));
    expect(sessionStorage.getItem("rn_builder_profile_prefill")).toBe("A".repeat(60));
  });

  it("carries JD target keys when the version is tailored", () => {
    stashVersionForTailor(version({ jdText: "We need X", jdCompany: "Stripe", jdTitle: "Senior PM" }));
    expect(sessionStorage.getItem("rn_builder_jd_prefill")).toBe("We need X");
    expect(sessionStorage.getItem("rn_builder_company_prefill")).toBe("Stripe");
    expect(sessionStorage.getItem("rn_builder_role_prefill")).toBe("Senior PM");
  });

  it("returns false (stashes nothing) when there's no résumé content", () => {
    const empty: StructuredResume = { ...struct, full_name: "", headline: "", location: "", email: "", summary: "", skills: [], experience: [], education: [], projects: [], extra_sections: [] };
    const ok = stashVersionForTailor(version({ structured: empty }));
    expect(ok).toBe(false);
    expect(sessionStorage.getItem("rn_builder_profile_prefill")).toBeNull();
  });
});
