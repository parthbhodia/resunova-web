import { describe, it, expect } from "vitest";
import { resolveIntentJobRedirect } from "../tailorIntentRedirect";

describe("resolveIntentJobRedirect", () => {
  it("stays on /tailor-2 when the intent=job handoff lands there", () => {
    const params = new URLSearchParams("flow=tailor&intent=job");
    expect(resolveIntentJobRedirect("/tailor-2", params)).toBe("/tailor-2?flow=tailor");
  });

  it("normalizes a trailing slash on /tailor-2/", () => {
    const params = new URLSearchParams("flow=tailor&intent=job");
    expect(resolveIntentJobRedirect("/tailor-2/", params)).toBe("/tailor-2?flow=tailor");
  });

  it("falls back to /tailor-2?flow=tailor when intent is the only param", () => {
    const params = new URLSearchParams("intent=job");
    expect(resolveIntentJobRedirect("/tailor-2", params)).toBe("/tailor-2?flow=tailor");
  });

  it("preserves the classic root handoff (view=builder&flow=tailor)", () => {
    const params = new URLSearchParams("view=builder&flow=tailor&intent=job");
    expect(resolveIntentJobRedirect("/", params)).toBe("/?view=builder&flow=tailor");
  });

  it("falls back to /?view=builder&flow=tailor on root when intent is the only param", () => {
    const params = new URLSearchParams("intent=job");
    expect(resolveIntentJobRedirect("/", params)).toBe("/?view=builder&flow=tailor");
  });

  it("treats a null/missing pathname as root", () => {
    const params = new URLSearchParams("intent=job");
    expect(resolveIntentJobRedirect(null, params)).toBe("/?view=builder&flow=tailor");
    expect(resolveIntentJobRedirect(undefined, params)).toBe("/?view=builder&flow=tailor");
  });

  it("never leaves `view` unset when redirecting to /tailor-2 with extra params", () => {
    const params = new URLSearchParams("flow=tailor&base=my-resume&intent=job");
    const result = resolveIntentJobRedirect("/tailor-2", params);
    expect(result).toBe("/tailor-2?flow=tailor&base=my-resume");
    expect(result).not.toContain("intent=job");
  });
});
