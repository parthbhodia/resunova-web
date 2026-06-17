import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card, Field, ToggleSwitch, inputStyle } from "@/components/profileSettingsUi";

describe("ToggleSwitch", () => {
  it("renders the label and optional sub-text", () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Email me" sub="when it changes" />);
    expect(screen.getByText("Email me")).toBeInTheDocument();
    expect(screen.getByText("when it changes")).toBeInTheDocument();
  });

  it("exposes role=switch with aria-checked reflecting the checked prop", () => {
    const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} label="Notify me" />);
    const sw = screen.getByRole("switch", { name: "Notify me" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    rerender(<ToggleSwitch checked onChange={() => {}} label="Notify me" />);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  // The regression this guards: the OLD design only toggled when the 38px track
  // was clicked. The whole row is now the switch, so clicking the label flips it.
  it("toggles when the LABEL TEXT is clicked (not just the track)", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Tell me about features" sub="new + updates" />);
    await userEvent.click(screen.getByText("Tell me about features"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("toggles when the sub-text is clicked too", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked onChange={onChange} label="Account changes" sub="password, email" />);
    await userEvent.click(screen.getByText("password, email"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("does not fire onChange when disabled", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Locked" disabled />);
    await userEvent.click(screen.getByText("Locked"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: "Locked" })).toBeDisabled();
  });

  it("is keyboard operable as a native button (Space activates)", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Kbd" />);
    const sw = screen.getByRole("switch", { name: "Kbd" });
    sw.focus();
    expect(sw).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("Card", () => {
  it("renders title, badge, action and children", () => {
    render(
      <Card title="Plan & usage" badge="Free" action={<span>status</span>}>
        <p>body content</p>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Plan & usage" })).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
  });

  it("applies domId to the section for deep-linking", () => {
    const { container } = render(<Card title="X" domId="rn-profile-contact">y</Card>);
    expect(container.querySelector("section#rn-profile-contact")).not.toBeNull();
  });
});

describe("Field", () => {
  it("shows the hint when there is no error, and the error otherwise", () => {
    const { rerender } = render(
      <Field label="Email" hint="we prefill it">
        <input />
      </Field>,
    );
    expect(screen.getByText("we prefill it")).toBeInTheDocument();
    rerender(
      <Field label="Email" hint="we prefill it" error="bad email" errorId="e1">
        <input />
      </Field>,
    );
    expect(screen.getByText("bad email")).toBeInTheDocument();
    expect(screen.queryByText("we prefill it")).not.toBeInTheDocument();
  });
});

describe("inputStyle", () => {
  it("uses theme CSS variables (no hardcoded colors)", () => {
    const s = inputStyle();
    expect(s.background).toBe("var(--surface2)");
    expect(s.color).toBe("var(--text)");
    expect(s.border).toContain("var(--border)");
  });
});
