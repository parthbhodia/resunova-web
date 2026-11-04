import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

import { TailoringModeModal } from "@/components/TailoringModeModal";
import { TailoringModeCard } from "@/components/accountSettingsCards";

beforeEach(() => localStorage.clear());

describe("TailoringModeModal with aggressive as the default", () => {
  it("opens with aggressive selected and marked as the recommended choice", () => {
    render(<TailoringModeModal open onSave={() => {}} onCancel={() => {}} />);
    const aggressive = screen.getByRole("button", { name: /Aggressive/ });
    const honest = screen.getByRole("button", { name: /^Honest/ });
    expect(aggressive).toHaveAttribute("aria-pressed", "true");
    expect(honest).toHaveAttribute("aria-pressed", "false");
    expect(within(aggressive).getByText("Recommended")).toBeInTheDocument();
    expect(within(honest).queryByText("Recommended")).toBeNull();
  });

  it("saves the default without the person touching anything", async () => {
    const onSave = vi.fn();
    render(<TailoringModeModal open onSave={onSave} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(onSave).toHaveBeenCalledWith("aggressive");
  });

  it("still lets someone choose honest", async () => {
    const onSave = vi.fn();
    render(<TailoringModeModal open onSave={onSave} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /^Honest/ }));
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(onSave).toHaveBeenCalledWith("honest");
  });

  it("states the floor that holds in both modes, in terms that are true", () => {
    render(<TailoringModeModal open onSave={() => {}} onCancel={() => {}} />);
    const note = screen.getByText(/Either way, Resunova never adds/);
    expect(note.textContent).toMatch(/employers, titles, dates, degrees or certifications/);
    // The old line said it never invents "metrics", which the product does not keep.
    expect(note.textContent).not.toMatch(/metrics/i);
  });
});

describe("TailoringModeCard (Account settings)", () => {
  it("shows aggressive for someone who never chose", async () => {
    render(<TailoringModeCard />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Aggressive" })).toHaveAttribute("aria-checked", "true"),
    );
    expect(screen.getByRole("radio", { name: "Honest" })).toHaveAttribute("aria-checked", "false");
  });

  it("shows honest for someone who chose it", async () => {
    localStorage.setItem("rn_tailoring_mode_v1", "honest");
    render(<TailoringModeCard />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Honest" })).toHaveAttribute("aria-checked", "true"),
    );
  });

  it("describes the floor without claiming nothing is ever added", () => {
    render(<TailoringModeCard />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/never add employers, titles, dates, degrees or certifications/);
    expect(text).not.toMatch(/nothing is ever fabricated/i);
  });
});
