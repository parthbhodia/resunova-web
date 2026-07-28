import { describe, expect, it } from "vitest";
import {
  getUserDomain,
  getUserInstitution,
  isInstitutionUser,
  isUmbcUser,
} from "@/lib/userDomainDetection";

describe("institution domain detection", () => {
  it("recognizes Monroe University accounts case-insensitively", () => {
    expect(getUserInstitution("Student@MONROEU.EDU")).toBe("monroe");
    expect(isInstitutionUser("student@monroeu.edu")).toBe(true);
    expect(isUmbcUser("student@monroeu.edu")).toBe(false);
  });

  it("preserves UMBC detection", () => {
    expect(getUserInstitution("student@umbc.edu")).toBe("umbc");
    expect(isUmbcUser("student@umbc.edu")).toBe(true);
  });

  it("does not accept lookalike or malformed domains", () => {
    expect(getUserDomain("student@monroeu.edu.example.com")).toBe("monroeu.edu.example.com");
    expect(getUserInstitution("student@monroeu.edu.example.com")).toBeNull();
    expect(getUserInstitution("not-an-email")).toBeNull();
    expect(isInstitutionUser(null)).toBe(false);
  });
});
