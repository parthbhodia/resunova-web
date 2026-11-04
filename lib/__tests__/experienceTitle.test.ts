import { describe, expect, it } from "vitest";
import { applyFieldOverridesToStructured } from "@/lib/resumeBulletMatch";
import {
  applyHeaderLineToExperience,
  attachAggressiveRoleTitle,
  defensibleRoleTitle,
  effectiveExperienceRole,
  experienceHeaderLine,
  pickExperienceIndex,
  titlesEqual,
  type RoleTitleSuggestion,
} from "@/lib/experienceTitle";

const exp = (
  role: string,
  company = "Acme",
  extra: { location?: string; dates?: string; bullets?: string[] } = {},
) => ({
  role,
  company,
  location: extra.location ?? "NY",
  dates: extra.dates ?? "2022 – Present",
  bullets: extra.bullets ?? ["Built the API."],
});

describe("experienceHeaderLine", () => {
  it("joins non-empty pieces with pipes, matching the preview", () => {
    expect(experienceHeaderLine(exp("Software Engineer"))).toBe(
      "Software Engineer | Acme | NY | 2022 – Present",
    );
  });
});

describe("applyHeaderLineToExperience", () => {
  it("a single segment is a title-only edit", () => {
    const row = exp("Software Engineer");
    applyHeaderLineToExperience(row, "Senior Fullstack Engineer");
    expect(row.role).toBe("Senior Fullstack Engineer");
    expect(row.company).toBe("Acme");
    expect(row.dates).toBe("2022 – Present");
  });

  it("parses a full header back onto the row", () => {
    const row = exp("Dev");
    applyHeaderLineToExperience(row, "Platform Engineer | Globex | Austin | 2020 – 2024");
    expect(row).toMatchObject({
      role: "Platform Engineer",
      company: "Globex",
      location: "Austin",
      dates: "2020 – 2024",
    });
  });
});

describe("defensibleRoleTitle", () => {
  it("returns the posting title when the current one differs", () => {
    expect(defensibleRoleTitle("Software Engineer", "Senior Fullstack Engineer"))
      .toBe("Senior Fullstack Engineer");
  });

  it("refuses a no-op", () => {
    expect(defensibleRoleTitle("Software Engineer", "software engineer")).toBeNull();
  });

  it("refuses intern to staff/director even in aggressive mode", () => {
    expect(defensibleRoleTitle("Software Engineering Intern", "Staff Engineer")).toBeNull();
    expect(defensibleRoleTitle("Student Researcher", "Director of Engineering")).toBeNull();
  });
});

describe("pickExperienceIndex", () => {
  const rows = [exp("Software Engineer", "Acme"), exp("Analyst", "Globex")];

  it("prefers the employer the rewrite sat under", () => {
    expect(pickExperienceIndex(rows, { employer: "Globex" })).toBe(1);
  });

  it("falls back to the role whose title overlaps the posting", () => {
    expect(pickExperienceIndex(rows, { jdTitle: "Senior Software Engineer" })).toBe(0);
  });

  it("returns 0 (most recent) when nothing else matches", () => {
    expect(pickExperienceIndex(rows)).toBe(0);
  });
});

describe("attachAggressiveRoleTitle", () => {
  const rows = [exp("Software Engineer", "Acme")];
  const sug = (over: RoleTitleSuggestion = {}): RoleTitleSuggestion => ({ employer: "Acme", ...over });

  it("is a no-op in honest mode", () => {
    const out = attachAggressiveRoleTitle(
      [sug()],
      rows,
      "Senior Fullstack Engineer",
      "honest",
    );
    expect(out[0].suggested_role).toBeUndefined();
  });

  it("treats a missing mode as the default, which is aggressive", () => {
    for (const mode of [null, undefined, "yolo"]) {
      const out = attachAggressiveRoleTitle([sug()], rows, "Senior Fullstack Engineer", mode);
      expect(out[0].suggested_role).toBeDefined();
    }
  });

  it("strips a model-supplied title in honest mode", () => {
    const out = attachAggressiveRoleTitle(
      [sug({ suggested_role: "Senior Fullstack Engineer" })],
      rows,
      "Senior Fullstack Engineer",
      "honest",
    );
    expect(out[0].suggested_role).toBeUndefined();
  });

  it("fills the posting title onto the closest role in aggressive mode", () => {
    const out = attachAggressiveRoleTitle(
      [sug()],
      rows,
      "Senior Fullstack Engineer",
      "aggressive",
    );
    expect(out[0]).toMatchObject({
      suggested_role: "Senior Fullstack Engineer",
      original_role: "Software Engineer",
    });
  });

  it("keeps a defensible model-supplied title", () => {
    const out = attachAggressiveRoleTitle(
      [sug({ suggested_role: "Full Stack Engineer" })],
      rows,
      "Senior Fullstack Engineer",
      "aggressive",
    );
    expect(out[0].suggested_role).toBe("Full Stack Engineer");
  });

  it("drops an indefensible model title rather than applying intern→staff", () => {
    const intern = [exp("Software Engineering Intern", "Acme")];
    const out = attachAggressiveRoleTitle(
      [sug({ suggested_role: "Staff Engineer" })],
      intern,
      "Staff Engineer",
      "aggressive",
    );
    expect(out[0].suggested_role).toBeUndefined();
  });
});

describe("applyFieldOverridesToStructured", () => {
  const structured = {
    experience: [exp("Software Engineer", "Acme", { bullets: ["Shipped the API."] })],
    projects: [],
  };

  it("writes exp.N.role onto the structured role the scorer reads", () => {
    const next = applyFieldOverridesToStructured(structured, {
      "exp.0.role": "Senior Fullstack Engineer",
    });
    expect(next.experience[0].role).toBe("Senior Fullstack Engineer");
    expect(next.experience[0].company).toBe("Acme");
    expect(next).not.toBe(structured);
  });

  it("parses exp.N.head into role (and the rest of the header)", () => {
    const next = applyFieldOverridesToStructured(structured, {
      "exp.0.head": "Platform Engineer | Globex | Austin | 2021 – 2023",
    });
    expect(next.experience[0]).toMatchObject({
      role: "Platform Engineer",
      company: "Globex",
      location: "Austin",
      dates: "2021 – 2023",
    });
  });

  it("still writes bullet overrides", () => {
    const next = applyFieldOverridesToStructured(structured, {
      "exp.0.bullets.0": "Shipped the API on Kubernetes.",
    });
    expect(next.experience[0].bullets[0]).toBe("Shipped the API on Kubernetes.");
    expect(next.experience[0].role).toBe("Software Engineer");
  });
});

describe("effectiveExperienceRole", () => {
  it("prefers the role override, then the head's first segment", () => {
    const row = exp("Old");
    expect(effectiveExperienceRole(row, 0, { "exp.0.role": "New" })).toBe("New");
    expect(effectiveExperienceRole(row, 0, { "exp.0.head": "Head Title | Acme" })).toBe("Head Title");
    expect(effectiveExperienceRole(row, 0, {})).toBe("Old");
  });
});

describe("titlesEqual", () => {
  it("folds punctuation and case", () => {
    expect(titlesEqual("Sr. Software Engineer", "sr software engineer")).toBe(true);
    expect(titlesEqual("Engineer", "Analyst")).toBe(false);
  });
});
