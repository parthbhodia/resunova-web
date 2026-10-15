import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CoverLetterShowcase from "@/components/cover-letter/CoverLetterShowcase";
import { CL_TEMPLATES } from "@/components/CoverLetterBuilder/types";

describe("cover letter page showcase", () => {
  it("leads with the builder preview and layout cards, not career examples", () => {
    render(<CoverLetterShowcase />);

    expect(screen.getByRole("heading", { name: "A cover letter written from your resume." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Write my cover letter" }).getAttribute("href")).toBe("/?view=cover-letter");
    expect(screen.getByText("Layout preview. The name and employer are sample text.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Layouts" })).toBeTruthy();
    expect(screen.queryByText(/career examples|cover letter examples/i)).toBeNull();
    expect(screen.queryByRole("heading", { name: "How it works" })).toBeNull();

    for (const template of CL_TEMPLATES) {
      expect(screen.getByText(template.label)).toBeTruthy();
    }
    const layoutLinks = screen.getAllByRole("link", { name: "Open in the builder" });
    expect(layoutLinks).toHaveLength(CL_TEMPLATES.length);
    for (const link of layoutLinks) {
      expect(link.getAttribute("href")).toBe("/?view=cover-letter");
    }
  });
});
