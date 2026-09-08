import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RolePrefillCTA from "@/components/RolePrefillCTA";
import { prefillFromRole, prefillFromRoleExample } from "@/lib/templateBuilderPrefill";
import { fullExampleForRole } from "@/lib/roleExampleResume";
import { ROLE_RESUME_DATA } from "@/lib/roleResumeData";
import type { RoleResumeData } from "@/lib/roleResumeData";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const PREFILL_KEY = "rn_template_builder_structured_prefill";

function stashed() {
  const raw = sessionStorage.getItem(PREFILL_KEY);
  return raw ? JSON.parse(raw).data : null;
}

const NURSE = ROLE_RESUME_DATA.find((r) => r.slug === "registered-nurse") as RoleResumeData;
const PARALEGAL = ROLE_RESUME_DATA.find((r) => r.slug === "paralegal") as RoleResumeData;

beforeEach(() => {
  push.mockClear();
  sessionStorage.clear();
});

describe("the role page hands over the example it rendered", () => {
  it("registered nurse resolves to a full example on the page", () => {
    const example = fullExampleForRole(NURSE.slug, NURSE.label);
    expect(example).not.toBeNull();
    expect(example!.data.workExperiences.length).toBeGreaterThan(0);
  });

  it("stashes that example's experience, education and summary", () => {
    const example = fullExampleForRole(NURSE.slug, NURSE.label)!;
    render(<RolePrefillCTA role={NURSE} example={example.data} />);
    fireEvent.click(screen.getByRole("button"));

    const data = stashed();
    // The bug: the CTA opened a skeleton with one blank job and one blank
    // school beside a full example the visitor had just read.
    expect(data.workExperiences[0].company).toBe(example.data.workExperiences[0].company);
    expect(data.workExperiences[0].bullets).toBe(example.data.workExperiences[0].bullets);
    expect(data.educations[0].school).toBe(example.data.educations[0].school);
    expect(data.profile.summary).toBe(example.data.profile.summary);
    expect(push).toHaveBeenCalledWith("/template-builder");
  });

  it("every role with an example hands over real experience", () => {
    for (const role of ROLE_RESUME_DATA) {
      const example = fullExampleForRole(role.slug, role.label);
      if (!example) continue;
      const data = prefillFromRoleExample(example.data);
      expect(data.workExperiences.some((w) => w.company.trim() && w.bullets.trim())).toBe(true);
      expect(data.educations.some((e) => e.school.trim())).toBe(true);
    }
  });

  it("clears the identity so a fictional candidate cannot ride out on someone's résumé", () => {
    const example = fullExampleForRole(NURSE.slug, NURSE.label)!;
    // The catalog's own sanitized placeholder is a real name and email; on a
    // page that DISPLAYS an example that is fine, in an editable document it
    // is not.
    expect(example.data.profile.name).toBeTruthy();
    const data = prefillFromRoleExample(example.data);
    for (const field of ["name", "email", "phone", "location", "website", "linkedin", "github"] as const) {
      expect(data.profile[field]).toBe("");
    }
  });
});

describe("the no-example fallback", () => {
  it("paralegal has no catalog example and keeps the skeleton", () => {
    expect(fullExampleForRole(PARALEGAL.slug, PARALEGAL.label)).toBeNull();
  });

  it("never prints the same skills twice", () => {
    // Reported: a bold featured row of six skills with the identical six
    // repeated as the description line directly under it.
    const data = prefillFromRole(PARALEGAL);
    const featured = data.skills.featuredSkills.map((f) => f.skill.trim()).filter(Boolean);
    const described = data.skills.descriptions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(featured.length).toBeGreaterThan(0);
    for (const skill of featured) {
      expect(described.map((d) => d.toLowerCase())).not.toContain(skill.toLowerCase());
    }
  });

  it("still carries the role's summary and its top skills", () => {
    const data = prefillFromRole(PARALEGAL);
    expect(data.profile.summary).toBe(PARALEGAL.example.summary);
    expect(data.skills.featuredSkills[0].skill).toBe(PARALEGAL.topSkills[0].name);
  });
});

describe("the CTA copy describes where the button actually goes", () => {
  it("says the example opens in the builder, not that a JD gets tailored", () => {
    const example = fullExampleForRole(NURSE.slug, NURSE.label)!;
    render(<RolePrefillCTA role={NURSE} example={example.data} />);
    expect(screen.getByRole("button").textContent).toMatch(/example/i);
    const copy = document.body.textContent ?? "";
    expect(copy).toMatch(/résumé builder/i);
    expect(copy).not.toMatch(/paste a job description/i);
  });

  it("promises blank contact details, which is what the handoff does", () => {
    const example = fullExampleForRole(NURSE.slug, NURSE.label)!;
    render(<RolePrefillCTA role={NURSE} example={example.data} />);
    expect(document.body.textContent).toMatch(/blank/i);
  });

  it("does not claim an example when there is none", () => {
    render(<RolePrefillCTA role={PARALEGAL} example={null} />);
    expect(screen.getByRole("button").textContent).not.toMatch(/example/i);
  });
});
