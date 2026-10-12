import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/productNotices", async () => {
  const actual = await vi.importActual<typeof import("@/lib/productNotices")>("@/lib/productNotices");
  return {
    ...actual,
    persistDismissedNotice: vi.fn(async () => undefined),
  };
});

import { dismissFreeScanBanner, isFreeScanBannerDismissed } from "@/lib/freeScanBanner";
import { DISMISSED_NOTICES_KEY } from "@/lib/productNotices";

describe("free scan welcome dismiss", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stays dismissed in this browser after the close", () => {
    expect(isFreeScanBannerDismissed("user-a")).toBe(false);
    dismissFreeScanBanner("user-a");
    expect(isFreeScanBannerDismissed("user-a")).toBe(true);
    expect(isFreeScanBannerDismissed("user-b")).toBe(true);
    expect(isFreeScanBannerDismissed(null)).toBe(true);
  });

  it("honors a dismiss already stored on the account", () => {
    localStorage.setItem(DISMISSED_NOTICES_KEY, JSON.stringify(["free-scan-welcome"]));
    expect(isFreeScanBannerDismissed("user-a")).toBe(true);
  });
});
