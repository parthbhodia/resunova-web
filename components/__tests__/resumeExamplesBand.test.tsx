import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ResumeExamplesBand from "@/components/landing/ResumeExamplesBand";
import { RESUME_CATEGORIES } from "@/lib/resumeExampleCategories";

describe("homepage resume examples band", () => {
  it("links every category to its section on the examples index", () => {
    render(<ResumeExamplesBand />);

    expect(screen.getByRole("link", { name: "All resume examples" }).getAttribute("href")).toMatch(/^\/resume-examples\/?$/);
    expect(screen.getByRole("link", { name: "Cover Letters" }).getAttribute("href")).toMatch(/^\/cover-letter\/?$/);

    for (const category of RESUME_CATEGORIES) {
      expect(screen.getByRole("link", { name: category.name }).getAttribute("href")).toContain(
        `#${category.anchor}`,
      );
    }
  });
});
