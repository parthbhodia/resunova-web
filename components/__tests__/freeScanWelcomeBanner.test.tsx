import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FreeScanWelcomeBanner } from "@/components/FreeScanWelcomeBanner";
import { FREE_SCAN_BANNER_KEY, FREE_SCAN_BANNER_MS, resetFreeScanBannerClock } from "@/lib/freeScanBanner";

vi.mock("@/lib/productNotices", async () => {
  const actual = await vi.importActual<typeof import("@/lib/productNotices")>("@/lib/productNotices");
  return {
    ...actual,
    persistDismissedNotice: vi.fn(async () => undefined),
  };
});

vi.mock("@/components/app-shell/useScansRemaining", () => ({
  useScansRemaining: () => ({
    state: { kind: "metered", remaining: 3, limit: 3, resetAt: null, anonymous: false },
  }),
}));

describe("FreeScanWelcomeBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    resetFreeScanBannerClock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts a close control on the note and keeps that side clear of the bell", () => {
    render(<FreeScanWelcomeBanner userId="user-a" isUmbc={false} />);
    expect(screen.getByRole("button", { name: "Dismiss free scan message" })).toBeInTheDocument();
    const frame = screen.getByRole("status").parentElement;
    expect(frame?.className).toContain("pr-[4.75rem]");
    expect(frame?.className).not.toContain("fixed");
    expect(screen.getByRole("status").className).toContain("max-w-[22rem]");
  });

  it("stays gone after the close control", async () => {
    render(<FreeScanWelcomeBanner userId="user-a" isUmbc={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss free scan message" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(localStorage.getItem(FREE_SCAN_BANNER_KEY)).toBe("1");
  });

  it("keeps counting when the shell remounts the note", () => {
    vi.useFakeTimers();
    const first = render(<FreeScanWelcomeBanner userId="user-a" isUmbc={false} />);
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    first.unmount();
    render(<FreeScanWelcomeBanner userId="user-a" isUmbc={false} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(FREE_SCAN_BANNER_MS - 3_000);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("closes itself after it has been readable", () => {
    vi.useFakeTimers();
    render(<FreeScanWelcomeBanner userId="user-a" isUmbc={false} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(FREE_SCAN_BANNER_MS);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(localStorage.getItem(FREE_SCAN_BANNER_KEY)).toBe("1");
  });
});
