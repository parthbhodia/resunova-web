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
      inboxUnread: 2,
      outcomeUnread: 0,
    }));
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Notifications, 3 new" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Notifications, 3 new" }));
    expect(screen.getByText("Refer candidates at your company")).toBeInTheDocument();
    expect(screen.getByText("2 new referral requests")).toBeInTheDocument();
  });

  it("hides the red number when there is nothing new", () => {
    publishNotificationFeed(notificationFeed({ notice: null, inboxUnread: 0, outcomeUnread: 0 }));
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});