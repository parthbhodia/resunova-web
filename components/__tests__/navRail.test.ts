import { describe, expect, it } from "vitest";
import { activeRailKey } from "@/components/app-shell/nav-config";

const idle = {
  active: "home" as const,
  onTemplateBuilderPage: false,
  onInterviewPrepPage: false,
  onCareerProfilePage: false,
  builderActive: false,
  navBuilderSubflow: "tailor" as const,
};

describe("activeRailKey", () => {
  it("lights the view you are on", () => {
    expect(activeRailKey({ ...idle, active: "analyze" })).toBe("analyze");
    expect(activeRailKey({ ...idle, active: "library" })).toBe("resumes");
    expect(activeRailKey({ ...idle, active: "jobs" })).toBe("jobs");
  });

  it("a routed page wins over the default home view underneath it", () => {
    expect(activeRailKey({ ...idle, onTemplateBuilderPage: true, builderActive: true })).toBe(
      "templates",
    );
    expect(activeRailKey({ ...idle, onInterviewPrepPage: true })).toBe("prep");
  });

  it("tailor and the template subflow do not light together", () => {
    expect(activeRailKey({ ...idle, builderActive: true, navBuilderSubflow: "tailor" })).toBe(
      "tailor",
    );
    expect(activeRailKey({ ...idle, builderActive: true, navBuilderSubflow: "template" })).toBe(
      "templates",
    );
  });

  it("folded destinations light nothing on the rail", () => {
    expect(activeRailKey({ ...idle, active: "cover-letter" })).toBeNull();
    expect(activeRailKey({ ...idle, active: "advisor" })).toBeNull();
    expect(activeRailKey({ ...idle, active: "account" })).toBeNull();
    expect(activeRailKey({ ...idle, onCareerProfilePage: true })).toBeNull();
  });
});
