import { describe, expect, it } from "vitest";
import { parseJdBlocks } from "@/components/JobDetail";

describe("parseJdBlocks", () => {
  it("splits blank-line-less JDs into structured blocks (AppOne blob regression)", () => {
    // Replica of a real AppOne posting: every blank line stripped at ingest,
    // headings and flattened bullets all separated by single newlines. The old
    // parser joined ALL of this into one blob paragraph.
    const jd = [
      "Junior Finance Analyst",
      "EOE Statement",
      "Eccalon provides equal employment opportunities to all employees and applicants.",
      "Description",
      "The Junior Finance Analyst supports the accounting and finance functions.",
      "Responsibilities",
      "Assist with daily accounting and finance operations",
      "Prepare and post journal entries in the general ledger",
      "Required Qualifications",
      "Bachelor's degree in Accounting, Finance, or a related field",
      "Proficiency in Microsoft Excel (reconciliations, basic formulas)",
    ].join("\n");

    const blocks = parseJdBlocks(jd);
    expect(blocks.length).toBeGreaterThan(5); // NOT one blob
    const headings = blocks.filter(b => b.type === "heading").map(b => (b as { text: string }).text);
    expect(headings).toContain("Responsibilities");
    expect(headings).toContain("Required Qualifications");
    // The long EOE sentence stays a paragraph, not a heading.
    const paras = blocks.filter(b => b.type === "para").map(b => (b as { text: string }).text);
    expect(paras.some(p => p.startsWith("Eccalon provides"))).toBe(true);
  });

  it("keeps joining single newlines inside blank-line-separated JDs (Greenhouse shape)", () => {
    const jd = [
      "About the role",
      "",
      "We are looking for an engineer to",
      "build our data platform end to end.",
      "",
      "Requirements:",
      "- 5+ years of Python",
      "- SQL and dbt",
    ].join("\n");

    const blocks = parseJdBlocks(jd);
    // The wrapped sentence joins into ONE paragraph (single newlines are soft).
    const paras = blocks.filter(b => b.type === "para").map(b => (b as { text: string }).text);
    expect(paras).toContain("We are looking for an engineer to build our data platform end to end.");
    // Bullets become one list; heading detected.
    const lists = blocks.filter(b => b.type === "list");
    expect(lists).toHaveLength(1);
    expect((lists[0] as { items: string[] }).items).toEqual(["5+ years of Python", "SQL and dbt"]);
    const headings = blocks.filter(b => b.type === "heading").map(b => (b as { text: string }).text);
    expect(headings).toContain("Requirements:");
  });

  it("re-joins wrapped sentences even in hard-line mode", () => {
    const jd = [
      "Overview",
      "This role reports to the director of",
      "platform engineering in Detroit.",
      "Benefits",
      "Health insurance and 401k",
      "Paid time off",
      "Line seven to trigger hard-line mode",
    ].join("\n");
    const blocks = parseJdBlocks(jd);
    const paras = blocks.filter(b => b.type === "para").map(b => (b as { text: string }).text);
    expect(paras).toContain("This role reports to the director of platform engineering in Detroit.");
  });
});
