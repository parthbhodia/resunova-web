import { describe, expect, it } from "vitest";
import {
  collectAppliedTools,
  draftBulletFromGuidance,
  factsForRequest,
  groupToolsByCategory,
  guessSkillCategory,
  guidanceIsEmpty,
  guidanceNotes,
  hasSkillsSection,
  parseToolList,
  entryPathForNewBullet,
  roleOptions,
  toolAppearsIn,
  toolsNamedInText,
  toolsNotListed,
  type FixGuidance,
} from "@/lib/tailorFixInput";
import { removeBulletByText } from "@/lib/structuredBulletOps";
import { deriveResumeChanges } from "@/lib/tailorChangeLog";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const resume = (over: Partial<StructuredResume> = {}): StructuredResume => ({
  full_name: "", headline: "", location: "", email: "", phone: "", linkedin: "", github: "",
  summary: "", skills: [], education: [], projects: [], extra_sections: [],
  experience: [
    { company: "Acme", role: "Platform Engineer", dates: "", location: "", bullets: ["Ran on-call."] },
  ],
  ...over,
});

describe("parseToolList", () => {
  it("splits on commas, semicolons and newlines, dedupes case-insensitively", () => {
    expect(parseToolList("AWS, Terraform; docker\nTerraform, aws")).toEqual(["AWS", "Terraform", "docker"]);
  });
  it("strips bullet markers and blanks", () => {
    expect(parseToolList("- Kafka, , • Spark")).toEqual(["Kafka", "Spark"]);
  });
});

describe("guidance → request", () => {
  const g: FixGuidance = {
    facts: { where: "Acme", what: "migrated the deploy pipeline", outcome: "cut release time 40%" },
    tools: ["GitHub Actions", "Terraform"],
    steer: "one line, lead with the migration",
  };

  it("notes tell the writer the tools are the candidate's to vouch for, and quote the steer", () => {
    const notes = guidanceNotes(g);
    expect(notes).toMatch(/confirms they used GitHub Actions and Terraform/);
    expect(notes).toMatch(/you may name them/);
    expect(notes).toMatch(/Guidance from the candidate: one line, lead with the migration/);
  });

  it("notes are empty when nothing was handed over", () => {
    expect(guidanceNotes({ facts: null, tools: [], steer: "" })).toBe("");
    expect(guidanceIsEmpty({ facts: { where: "", what: "", outcome: "" }, tools: [], steer: "  " })).toBe(true);
    expect(guidanceIsEmpty({ facts: null, tools: ["Go"], steer: "" })).toBe(false);
  });

  it("the confirmed fact carries the tools inside the claim, and tools alone still count", () => {
    expect(factsForRequest(g)).toEqual({
      where: "Acme",
      what: "migrated the deploy pipeline (using GitHub Actions, Terraform)",
      outcome: "cut release time 40%",
    });
    expect(factsForRequest({ facts: null, tools: ["Go", "Retool"], steer: "x" })).toEqual({
      where: "",
      what: "Used Go and Retool",
      outcome: "",
    });
    expect(factsForRequest({ facts: null, tools: [], steer: "x" })).toBeNull();
  });

  it("does not repeat a tool the claim already names", () => {
    const f = factsForRequest({ ...g, facts: { ...g.facts!, what: "wrote Terraform modules" } });
    expect(f?.what).toBe("wrote Terraform modules (using GitHub Actions)");
  });
});

describe("draftBulletFromGuidance", () => {
  it("frames the user's words without adding a claim", () => {
    expect(draftBulletFromGuidance({
      facts: { where: "", what: "migrated the deploy pipeline.", outcome: "cut release time 40%" },
      tools: ["GitHub Actions"],
      steer: "",
    })).toBe("Migrated the deploy pipeline using GitHub Actions, cut release time 40%");
  });
  it("tools alone still make a line; nothing makes nothing", () => {
    expect(draftBulletFromGuidance({ facts: null, tools: ["Kafka", "Spark"], steer: "" })).toBe("Worked with Kafka and Spark");
    expect(draftBulletFromGuidance({ facts: null, tools: [], steer: "be brief" })).toBe("");
  });
});

describe("entryPathForNewBullet", () => {
  it("picks the role whose company matches, else the first role", () => {
    const r = resume({
      experience: [
        { company: "Acme", role: "Platform Engineer", dates: "", location: "", bullets: ["Ran on-call."] },
        { company: "Globex", role: "Developer", dates: "", location: "", bullets: [] },
      ],
    });
    expect(entryPathForNewBullet(r, "Globex")).toBe("exp.1");
    expect(entryPathForNewBullet(r, "Developer · Globex")).toBe("exp.1");
    expect(entryPathForNewBullet(r, "")).toBe("exp.0");
    expect(entryPathForNewBullet(null)).toBe("exp.0");
  });
});

describe("roleOptions", () => {
  it("lists roles then projects with structured paths", () => {
    const r = resume({ projects: [{ name: "Side thing", tech: "", bullets: [] }] });
    expect(roleOptions(r)).toEqual([
      { path: "exp.0", label: "Platform Engineer · Acme" },
      { path: "proj.0", label: "Side thing" },
    ]);
    expect(roleOptions(null)).toEqual([]);
  });
});

describe("tools → Skills", () => {
  const withSkills = resume({
    skills: [
      { category: "Languages", items: ["Python"] },
      { category: "Cloud & Infra", items: ["AWS"] },
      { category: "Tools", items: ["Git"] },
    ],
  });

  it("drops tools the section already lists", () => {
    expect(toolsNotListed(["aws", "Terraform", "terraform"], withSkills)).toEqual(["Terraform"]);
  });

  it("files a tool under the résumé's own matching group", () => {
    expect(guessSkillCategory("Terraform", withSkills)).toBe("Cloud & Infra");
    expect(guessSkillCategory("Go", withSkills)).toBe("Languages");
    // Unknown tech goes to the generic tools group rather than the first one.
    expect(guessSkillCategory("Retool", withSkills)).toBe("Tools");
  });

  it("names a bucket when the résumé has no matching group", () => {
    const only = resume({ skills: [{ category: "Core", items: ["SQL"] }] });
    expect(guessSkillCategory("Kubernetes", only)).toBe("Cloud & DevOps");
    expect(guessSkillCategory("Kubernetes", null)).toBe("Cloud & DevOps");
    expect(guessSkillCategory("Retool", only)).toBe("Core");
  });

  it("groups by category for the write", () => {
    expect(groupToolsByCategory(["Terraform", "Go", "Kubernetes"], withSkills)).toEqual([
      { category: "Cloud & Infra", tools: ["Terraform", "Kubernetes"] },
      { category: "Languages", tools: ["Go"] },
    ]);
  });

  it("knows whether there is a Skills section to file into", () => {
    expect(hasSkillsSection(withSkills)).toBe(true);
    expect(hasSkillsSection(resume())).toBe(false);
    expect(hasSkillsSection(null)).toBe(false);
  });
});

describe("collectAppliedTools", () => {
  it("keeps invented tools the user or the server named, if the line uses them", () => {
    expect(collectAppliedTools({
      applied: "Built the admin in Retool and Terraform",
      unverified: ["Retool"],
      vouched: ["InternalMesh"],
    })).toEqual(["Retool", "Terraform"]);
    expect(collectAppliedTools({
      applied: "Built the admin in Retool and InternalMesh",
      vouched: ["InternalMesh", "Retool"],
    })).toEqual(["InternalMesh", "Retool"]);
    expect(collectAppliedTools({
      applied: "Built the admin in Retool",
      vouched: ["InternalMesh"],
    })).toEqual([]);
  });

  it("spots catalog tools in the line and ignores common English", () => {
    expect(toolsNamedInText("Shipped the mapping pipeline on Kubernetes and AWS")).toEqual(
      expect.arrayContaining(["Kubernetes", "AWS"]),
    );
    expect(toolAppearsIn("Go", "used Go to write the service")).toBe(true);
    expect(toolAppearsIn("Go", "ongoing work")).toBe(false);
    expect(toolsNamedInText("the rest of the team")).not.toContain("REST");
  });
});

describe("removeBulletByText", () => {
  it("removes the last matching line in the named entry and leaves others alone", () => {
    const r = resume({
      experience: [
        { company: "A", role: "", dates: "", location: "", bullets: ["x", "Shipped it.", "y", "Shipped it."] },
        { company: "B", role: "", dates: "", location: "", bullets: ["Shipped it."] },
      ],
    });
    const next = removeBulletByText(r, "exp.0", "Shipped it.");
    expect(next?.experience[0].bullets).toEqual(["x", "Shipped it.", "y"]);
    expect(next?.experience[1].bullets).toEqual(["Shipped it."]);
    expect(r.experience[0].bullets).toHaveLength(4);
  });
  it("returns null when nothing matches", () => {
    expect(removeBulletByText(resume(), "exp.0", "not there")).toBeNull();
    expect(removeBulletByText(resume(), "exp.9", "Ran on-call.")).toBeNull();
  });
  it("searches every entry when no path is given", () => {
    const r = resume({ projects: [{ name: "P", tech: "", bullets: ["Built it."] }] });
    expect(removeBulletByText(r, undefined, "Built it.")?.projects[0].bullets).toEqual([]);
  });
});

describe("the change log lists a line the user wrote", () => {
  it("as its own kind, with the text and the entry for undo", () => {
    const changes = deriveResumeChanges(
      [{ id: "qualification:ci/cd", name: "CI/CD", kind: "qualification", status: "applied", detail: "" }],
      [{ label: "CI/CD", appliedText: "Set up CI/CD for 12 services.", via: "bullet", entryPath: "exp.1" }],
      {},
      [],
    );
    expect(changes).toEqual([
      expect.objectContaining({
        kind: "added",
        bulletIndex: -1,
        original: "",
        applied: "Set up CI/CD for 12 services.",
        requirements: ["CI/CD"],
        entryPath: "exp.1",
      }),
    ]);
  });
});
