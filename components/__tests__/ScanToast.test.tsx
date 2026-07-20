import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// @ts-ignore -- test-only JSX types
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ScanToast } from "@/components/ScanToast";

describe("ScanToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders the message inside a polite live status region", () => {
    render(
      <ScanToast
        open
        message="Welcome back! You have 7 of 10 free résumé scans left today."
        onClose={() => {}}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(/7 of 10 free résumé scans left today/);
  });

  it("renders nothing when closed or when the message is empty", () => {
    const { rerender } = render(<ScanToast open={false} message="hi" onClose={() => {}} />);
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<ScanToast open message="" onClose={() => {}} />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("calls onClose when the dismiss button is clicked", () => {
    const onClose = vi.fn();
    render(<ScanToast open message="hey" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss notification/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses after the given duration", () => {
    const onClose = vi.fn();
    render(<ScanToast open message="hey" duration={5000} onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not auto-dismiss when duration is 0", () => {
    const onClose = vi.fn();
    render(<ScanToast open message="hey" duration={0} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
