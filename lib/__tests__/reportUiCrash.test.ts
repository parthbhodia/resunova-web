import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiFetch }));

import { reportUiCrash } from "@/lib/reportUiCrash";

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({ ok: true });
  sessionStorage.clear();
});

describe("reportUiCrash", () => {
  it("files one bug report for a crash", async () => {
    window.history.pushState({}, "", "/?view=analyze&analysis=abc");
    await reportUiCrash({ message: "Minified React error #185", digest: "d1" });
    await reportUiCrash({ message: "Minified React error #185", digest: "d1" });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(apiFetch.mock.calls[0][0]).toBe("/api/bug-report");
    expect(body.category).toBe("ui_crash");
    expect(body.title).toBe("UI crash");
    expect(body.description).toContain("#185");
    expect(body.description).toContain("digest d1");
    expect(body.page_url).toContain("/?view=analyze&analysis=abc");
  });

  it("still resolves when the report cannot be sent", async () => {
    apiFetch.mockRejectedValue(new Error("offline"));
    await expect(reportUiCrash({ message: "boom" })).resolves.toBeUndefined();
  });
});
