import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { JobTitleSection } from "@/components/ratings/JobTitleSection";

const jobTitle = {
  matched: false,
  jd_title: "Senior Fullstack Engineer",
  resume_title: "Software Engineer",
  score: 62,
  detail: "",
};

describe("JobTitleSection experience titles", () => {
  it("lets the user retitle a role toward the posting", () => {
    const onRole = vi.fn();
    render(
      <JobTitleSection
        jobTitle={jobTitle}
        experienceRoles={[{ index: 0, role: "Software Engineer", company: "Acme" }]}
        onRoleTitleChange={onRole}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Match target title" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply title" }));
    expect(onRole).toHaveBeenCalledWith(0, "Senior Fullstack Engineer");
  });

  it("does not show Experience titles without a write handler", () => {
    render(<JobTitleSection jobTitle={jobTitle} />);
    expect(screen.queryByText("EXPERIENCE TITLES")).toBeNull();
  });
});
