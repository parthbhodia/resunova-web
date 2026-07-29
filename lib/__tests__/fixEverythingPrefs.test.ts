import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFixAllAutoApply, setFixAllAutoApply, fixAllButtonLabel,
} from "@/lib/fixEverythingPrefs";

describe("auto-apply preference", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to on (highlighted preview is the review surface)", () => {
    expect(getFixAllAutoApply()).toBe(true);
  });

  it("round-trips a choice", () => {
    setFixAllAutoApply(true);
    expect(getFixAllAutoApply()).toBe(true);
    setFixAllAutoApply(false);
    expect(getFixAllAutoApply()).toBe(false);
  });

  it("treats any unexpected stored value as on (safe product default)", () => {
    localStorage.setItem("rn_fix_all_auto_v1", "yes");
    expect(getFixAllAutoApply()).toBe(true);
  });

  it("falls back to on when storage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(getFixAllAutoApply()).toBe(true);
    spy.mockRestore();
  });

  it("does not throw when storage rejects a write", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => setFixAllAutoApply(true)).not.toThrow();
    spy.mockRestore();
  });
});

describe("button copy", () => {
  it("says generate-first when review mode is on", () => {
    const { title, subtitle } = fixAllButtonLabel(6, false, false);
    expect(title).toContain("Fix everything (6)");
    expect(subtitle.toLowerCase()).toContain("generate");
  });

  it("says apply to preview when auto-apply is on", () => {
    const { title, subtitle } = fixAllButtonLabel(6, true, false);
    expect(title).toContain("Fix everything");
    expect(subtitle.toLowerCase()).toContain("preview");
    expect(subtitle.toLowerCase()).toContain("highlight");
  });

  it("reflects the mode while running", () => {
    expect(fixAllButtonLabel(3, true, true).title).toBe("Tailoring résumé…");
    expect(fixAllButtonLabel(3, false, true).title).toBe("Finding fixes…");
  });
});
