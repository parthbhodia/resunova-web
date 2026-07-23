import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResumeExamplesCatalog from "@/components/ResumeExamplesCatalog";
import type { TBResumeData } from "@/components/TemplateBuilder/types";
import { PUBLIC_RESUME_EXAMPLES } from "@/lib/resumeExamplesCatalog";

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
});

describe("ResumeExamplesCatalog", () => {
  it("renders all 60 fictional examples and filters by search, category, and level", async () => {
    render(<ResumeExamplesCatalog examples={PUBLIC_RESUME_EXAMPLES} />);

    expect(screen.getByText("60 examples")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search resume examples"), {
      target: { value: "Registered Nurse" },
    });
    await waitFor(() => expect(screen.getByText("3 examples")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Search resume examples"), { target: { value: "PostgreSQL" } });
    await waitFor(() => expect(screen.getByText((content, element) => element?.getAttribute("aria-live") === "polite" && /example/.test(content))).toBeInTheDocument());
    expect(screen.getAllByText(/Software Engineer/).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Search resume examples"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Finance" } });
    fireEvent.change(screen.getByLabelText("Experience level"), { target: { value: "Senior" } });
    await waitFor(() => expect(screen.getByText("2 examples")).toBeInTheDocument());
    expect(screen.getByText("Senior Financial Analyst")).toBeInTheDocument();
    expect(screen.getByText("Finance Manager")).toBeInTheDocument();
  });

  it("sanitizes contact data and malformed bullets before opening the template builder", async () => {
    render(<ResumeExamplesCatalog examples={PUBLIC_RESUME_EXAMPLES} />);

    fireEvent.change(screen.getByLabelText("Search resume examples"), {
      target: { value: "Financial Analyst with 5+ years" },
    });
    await waitFor(() => expect(screen.getByText("1 example")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Use Financial Analyst example" }));

    expect(mockStash).toHaveBeenCalledTimes(1);
    const data = mockStash.mock.calls[0][0];
    expect(data.profile).toMatchObject({
      name: "Sample Candidate",
      email: "candidate@example.com",
      phone: "",
      linkedin: "",
      github: "",
    });
    expect(data.workExperiences[0].bullets).toContain("\n");
    expect(data.workExperiences[0].bullets).not.toContain("\\n");
    expect(["classic", "modern", "executive"]).toContain(data.customization.stylePreset);
    expect(mockPush).toHaveBeenCalledWith("/template-builder");
  });

  it("keeps the user on the catalog when browser storage rejects the prefill", () => {
    mockStash.mockReturnValueOnce(false);
    render(<ResumeExamplesCatalog examples={PUBLIC_RESUME_EXAMPLES} />);

    fireEvent.click(screen.getAllByRole("button", { name: /^Use .+ example$/ })[0]);

    expect(screen.getByRole("alert")).toHaveTextContent("could not be opened");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
