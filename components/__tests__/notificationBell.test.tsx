import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "@/components/NotificationBell";
import { notificationFeed, publishNotificationFeed, PRODUCT_NOTICES } from "@/lib/productNotices";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("NotificationBell", () => {
  it("shows a red count for signed-in notification items", async () => {
    publishNotificationFeed(notificationFeed({
      notice: PRODUCT_NOTICES[0],
      outcomeRows: [
        { id: "o1", status: "referred", role: "Backend Engineer", referrerName: "Priya Raman", referrerCompany: "Globex", createdAt: "2026-10-12T15:00:00Z" },
        { id: "o2", status: "declined", role: "Data Analyst", referrerName: "Sam Ortiz", referrerCompany: "Initech", createdAt: "2026-10-12T15:00:00Z" },
      ],
    }));
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Notifications, 3 new" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Notifications, 3 new" }));
    expect(screen.getByText("Refer candidates at your company")).toBeInTheDocument();
    // ⚠️ Two outcomes, two DIFFERENT rows naming the step each reached — the
    // defect was one aggregate row reading "a request you sent was updated".
    expect(screen.getByText("You were referred")).toBeInTheDocument();
    expect(screen.getByText("Referral declined")).toBeInTheDocument();
    expect(screen.getByText("Priya Raman marked you as referred for Backend Engineer at Globex.")).toBeInTheDocument();
  });

  it("hides the red number when there is nothing new", () => {
    publishNotificationFeed(notificationFeed({ notice: null }));
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});