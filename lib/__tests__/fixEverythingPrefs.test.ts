import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFixAllAutoApply, setFixAllAutoApply, fixAllButtonLabel,
} from "@/lib/fixEverythingPrefs";

describe("auto-apply preference", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to off", () => {
    // Writing rewrites into a résumé unprompted is not a safe default; it has
    // to be chosen.
    expect(getFixAllAutoApply()).toBe(false);
  });

  it("round-trips a choice", () => {
    setFixAllAutoApply(true);
    expect(getFixAllAutoApply()).toBe(true);
    setFixAllAutoApply(false);
    expect(getFixAllAutoApply()).toBe(false);
  });

  it("treats any unexpected stored value as off", () => {
    localStorage.setItem("rn_fix_all_auto_v1", "yes");
    expect(getFixAllAutoApply()).toBe(false);
  });

  it("falls back to off when storage throws", () => {
    // Private mode must not accidentally enable auto-apply.
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(getFixAllAutoApply()).toBe(false);
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
  it("says review when review is what happens", () => {
    const { title, subtitle } = fixAllButtonLabel(6, false, false);
    expect(title).toContain("Fix everything (6)");
    expect(subtitle.toLowerCase()).toContain("review");
  });

  it("says it applies straight to the résumé when it does", () => {
    // The label has to state the consequence; a user should never be surprised
    // by their résumé changing.
    const { title, subtitle } = fixAllButtonLabel(6, true, false);
    expect(title).toContain("apply");
    expect(subtitle.toLowerCase()).toContain("applies straight");
    expect(subtitle.toLowerCase()).not.toContain("review");
  });

  it("reflects the mode while running", () => {
    expect(fixAllButtonLabel(3, true, true).title).toBe("Fixing…");
    expect(fixAllButtonLabel(3, false, true).title).toBe("Finding fixes…");
  });
});
