import { describe, expect, it } from "vitest";
import { CL_TEMPLATES, resolveLayoutParam } from "@/components/CoverLetterBuilder/types";

/**
 * `?clt=` presets a layout for a new cover letter, and every layout card on
 * /cover-letter links with it.
 *
 * The param has to be validated against CL_TEMPLATES, because an unvalidated id
 * would reach `setCustomization("templateId", ...)` and then the renderer switch
 * would fall through to nothing for that layout.
 *
 * The sibling `?cl=` is a saved-document id, not a layout id. Passing one where
 * a layout is expected skips the localStorage fallback and leaves the editor
 * stuck on the mode screen, which is why this needed its own param.
 */

describe("cover letter ?clt= layout param", () => {
  it.each(CL_TEMPLATES.map((t) => [t.id, t.id] as const))("accepts the real layout id %s", (input, expected) => {
    expect(resolveLayoutParam(input)).toBe(expected);
  });

  it("returns null when no layout was requested", () => {
    expect(resolveLayoutParam(null)).toBeNull();
    expect(resolveLayoutParam(undefined)).toBeNull();
    expect(resolveLayoutParam("")).toBeNull();
    expect(resolveLayoutParam("   ")).toBeNull();
  });

  it("refuses an id with no renderer behind it", () => {
    expect(resolveLayoutParam("not-a-layout")).toBeNull();
    // A saved-document id arriving in the layout param is the exact mix-up this
    // param exists to avoid; it must not silently become a templateId.
    expect(resolveLayoutParam("some-uuid-from-the-library")).toBeNull();
  });

  it("normalises case and surrounding space from a hand-edited URL", () => {
    expect(resolveLayoutParam(" Wakanda ")).toBe("wakanda");
    expect(resolveLayoutParam("MODERN")).toBe("modern");
  });
});