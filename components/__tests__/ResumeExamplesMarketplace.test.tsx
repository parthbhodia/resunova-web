import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// Only the stash is faked. prefillFromRoleExample stays REAL so this test
// keeps checking what actually reaches the builder, not a stub of it.
vi.mock("@/lib/templateBuilderPrefill", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/templateBuilderPrefill")>()),
  stashTemplateBuilderExactPrefill: mockStash,
}));

beforeEach(() => {
  mockPush.mockClear();
  mockStash.mockClear();
  // jsdom doesn't implement scrollIntoView; category-tile clicks call it.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ResumeExamplesMarketplace", () => {
  it("keeps category browsing on this page and previews three examples until Show all", async () => {
    render(<ResumeExamplesMarketplace />);

    const gridCount = (text: string) =>
      screen.getByText((_, el) => el?.getAttribute("aria-live") === "polite" && el.textContent === text);
    expect(gridCount("60 examples")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search resume examples"), {
      target: { value: "PostgreSQL" },
    });
    await waitFor(() => expect(screen.getAllByText(/Software Engineer/).length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText("Search resume examples"), { target: { value: "" } });

    fireEvent.click(screen.getByRole("link", { name: /Customer Support/ }));
    expect(mockPush).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    const support = document.getElementById("customer-support");
    expect(support).not.toBeNull();
    expect(within(support as HTMLElement).getAllByRole("button", { name: /^Use / })).toHaveLength(3);
    fireEvent.click(within(support as HTMLElement).getByRole("button", { name: "Show all" }));
    expect(within(support as HTMLElement).getAllByRole("button", { name: /^Use / })).toHaveLength(5);

    fireEvent.click(screen.getByRole("link", { name: /Software Engineering/ }));
    expect(mockPush).not.toHaveBeenCalled();
    expect(document.getElementById("software-engineering")).not.toBeNull();
  });

  it("sanitizes contact data and a valid style preset before opening the template builder", async () => {
    render(<ResumeExamplesMarketplace />);

    fireEvent.click(screen.getAllByRole("button", { name: /^Use .+ example$/ })[0]);

    expect(mockStash).toHaveBeenCalledTimes(1);
    const data = mockStash.mock.calls[0][0];
    // Every identity field is BLANK, not a neutral-looking placeholder. On a
    // page that displays an example, "Sample Candidate <candidate@example.com>"
    // is fine; in an editable document handed to a user it is a name and an
    // email that can be downloaded and sent.
    expect(data.profile).toMatchObject({
      name: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
      github: "",
    });
    // The example's own content is what makes this worth opening.
    expect(data.workExperiences.some((w) => w.company.trim() && w.bullets.trim())).toBe(true);
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
