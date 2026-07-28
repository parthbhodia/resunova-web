import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResumeExamplesMarketplace from "@/components/ResumeExamplesMarketplace";
import type { TBResumeData } from "@/components/TemplateBuilder/types";

const { mockPush, mockStash } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockStash: vi.fn<(data: TBResumeData) => boolean>(() => true),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/templateBuilderPrefill", () => ({
  stashTemplateBuilderExactPrefill: mockStash,
}));

beforeEach(() => {
  mockPush.mockClear();
  mockStash.mockClear();
  // jsdom doesn't implement scrollIntoView; category-tile clicks call it.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ResumeExamplesMarketplace", () => {
  it("filters the grid by search, category tile, and level pill", async () => {
    render(<ResumeExamplesMarketplace />);

    // Full catalog starts at 60.
    expect(screen.getByText("60 examples")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search resume examples"), {
      target: { value: "PostgreSQL" },
    });
    await waitFor(() => expect(screen.getAllByText(/Software Engineer/).length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText("Search resume examples"), { target: { value: "" } });

    // A category tile with no matching role page (Customer Support) filters the grid in place.
    // Every category tile also reads "N examples" (all counts happen to be 5),
    // so the live grid count must be queried by its aria-live region specifically.
    const gridCount = (text: string) =>
      screen.getByText((_, el) => el?.getAttribute("aria-live") === "polite" && el.textContent === text);
    fireEvent.click(screen.getByRole("button", { name: /Customer Support/ }));
    await waitFor(() => expect(gridCount("5 examples")).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Senior" }));
    await waitFor(() => expect(gridCount("1 example")).toBeInTheDocument());
  });

  it("navigates straight to the role page for a category tile with a sourced role page", () => {
    render(<ResumeExamplesMarketplace />);

    fireEvent.click(screen.getByRole("button", { name: /Software Engineering/ }));

    expect(mockPush).toHaveBeenCalledWith("/resume-examples/software-engineer/");
  });

  it("sanitizes contact data and a valid style preset before opening the template builder", async () => {
    render(<ResumeExamplesMarketplace />);

    fireEvent.click(screen.getAllByRole("button", { name: /^Use .+ example$/ })[0]);

    expect(mockStash).toHaveBeenCalledTimes(1);
    const data = mockStash.mock.calls[0][0];
    expect(data.profile).toMatchObject({
      name: "Sample Candidate",
      email: "candidate@example.com",
      phone: "",
      linkedin: "",
      github: "",
    });
    expect(["classic", "modern", "executive"]).toContain(data.customization.stylePreset);
    expect(mockPush).toHaveBeenCalledWith("/template-builder");
  });

  it("keeps the user on the page when browser storage rejects the prefill", () => {
    mockStash.mockReturnValueOnce(false);
    render(<ResumeExamplesMarketplace />);

    fireEvent.click(screen.getAllByRole("button", { name: /^Use .+ example$/ })[0]);

    expect(screen.getByRole("alert")).toHaveTextContent("could not be opened");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("routes a role-name search to the matching sourced role page", () => {
    render(<ResumeExamplesMarketplace />);

    fireEvent.change(screen.getByLabelText("Search resume examples"), {
      target: { value: "Data Analyst" },
    });
    fireEvent.keyDown(screen.getByLabelText("Search resume examples"), { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/resume-examples/data-analyst/");
  });

  it("uses the highest-scoring example as the featured resume, never a fabricated rating or usage count", () => {
    render(<ResumeExamplesMarketplace />);

    expect(screen.getByText(/Resunova score \d+\/100/)).toBeInTheDocument();
    // The original Figma design hardcoded these as fake trust stats — assert
    // none of them made it into the real, data-driven page. (A plain "200,000+"
    // check would false-positive on genuine résumé bullet prose like "used by
    // 200,000+ monthly active users", so this only checks stat-shaped patterns.)
    for (const fake of [/\d\.\d\/5/, /\d+k\+/i, /97% ATS Pass Rate/i]) {
      expect(screen.queryByText(fake)).not.toBeInTheDocument();
    }
  });
});
