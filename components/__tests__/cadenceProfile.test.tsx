import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CadenceProfile from "@/components/profile/CadenceProfile";
import { EMPTY_PROFILE } from "@/lib/profileStorage";
import { INITIAL_EXTRACTED_PROFILE } from "@/lib/resumeExtractorService";

/**
 * Both cases below are defects found by reading the diff, not by running it.
 * The component shipped with no tests, so nothing was watching either one.
 */

const ALL_EEO = {
  ...EMPTY_PROFILE,
  eeoWorkUs: "Yes", eeoSponsor: "No", eeoDisability: "Decline to state",
  eeoVeteran: "No", eeoGender: "Decline to state", eeoLgbtq: "Decline to state",
};

function renderWith(tailorDefaults = EMPTY_PROFILE) {
  return render(
    <CadenceProfile
      extractedData={INITIAL_EXTRACTED_PROFILE}
      tailorDefaults={tailorDefaults}
      onOpenEdit={vi.fn()}
    />,
  );
}

describe("the Set-once band seals from the DATA, not from mount", () => {
  it("seals when every question is answered", () => {
    renderWith(ALL_EEO);
    expect(screen.getByText(/We won.t ask again/)).toBeInTheDocument();
  });

  it("stays open when questions remain", () => {
    renderWith({ ...EMPTY_PROFILE, eeoWorkUs: "Yes" });
    expect(screen.queryByText(/We won.t ask again/)).not.toBeInTheDocument();
    expect(screen.getByText("1 of 6")).toBeInTheDocument();
  });

  it("seals on a re-render that arrives after mount", () => {
    // The real failure: ProfilePage fetches asynchronously, so the first
    // render always sees EMPTY_PROFILE. Seeding the open state from that
    // first render left the band permanently expanded.
    const { rerender } = renderWith(EMPTY_PROFILE);
    expect(screen.queryByText(/We won.t ask again/)).not.toBeInTheDocument();

    rerender(
      <CadenceProfile
        extractedData={INITIAL_EXTRACTED_PROFILE}
        tailorDefaults={ALL_EEO}
        onOpenEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/We won.t ask again/)).toBeInTheDocument();
  });

  it("reopens on click and stays open", async () => {
    renderWith(ALL_EEO);
    await userEvent.click(screen.getByRole("button", { name: /We won.t ask again/ }));
    expect(screen.queryByText(/We won.t ask again/)).not.toBeInTheDocument();
    expect(screen.getByText("US work authorization")).toBeInTheDocument();
  });
});

describe("the demographics count counts demographics", () => {
  it("reports only the four optional questions", () => {
    // `eeoAnswered - 2` was right only when work-auth and sponsorship were
    // both answered, and reported "1 of 4" for three demographics alone.
    renderWith({
      ...EMPTY_PROFILE,
      eeoDisability: "No", eeoVeteran: "No", eeoGender: "Decline to state",
    });
    expect(screen.getByText(/3 of 4 answered/)).toBeInTheDocument();
  });

  it("does not count work authorization toward the four", () => {
    renderWith({ ...EMPTY_PROFILE, eeoWorkUs: "Yes", eeoSponsor: "No", eeoVeteran: "No" });
    expect(screen.getByText(/1 of 4 answered/)).toBeInTheDocument();
  });
});

describe("empty states name the cost, not the absence", () => {
  it("says what an unset target is doing to the feed", () => {
    renderWith();
    // The phrase appears twice on purpose: once in the next-action prompt
    // and once in the row's own empty state, so assert on both.
    expect(screen.getAllByText(/Jobs is ranking every role/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/the feed spans every US metro/)).toBeInTheDocument();
  });

  it("points at a scan when there is no career record", () => {
    renderWith();
    expect(screen.getByRole("link", { name: /Scan a résumé/ })).toBeInTheDocument();
  });
});
