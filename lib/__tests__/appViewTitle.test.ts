import { describe, it, expect } from "vitest";
import {
  APP_VIEW_TITLES,
  APP_VIEW_TITLE_LABELS,
  TITLE_SUFFIX,
  appViewTitleFromSearch,
} from "@/lib/appViewTitle";
import { VIEW_LABELS } from "@/components/app-shell/nav-config";

/**
 * The title map is a second mention of the view list, so it is pinned to
 * VIEW_LABELS in BOTH directions — the templateGallery.test.ts rule. A tenth
 * view must not be able to ship without a title (it would silently merge back
 * into the marketing homepage row, which is the bug all of this exists to
 * fix), and a title must not be able to point at a view that was deleted.
 */
describe("app view titles are pinned to the nav's own view list", () => {
  it("covers every view the rail can navigate to", () => {
    expect(Object.keys(APP_VIEW_TITLE_LABELS).sort()).toEqual(Object.keys(VIEW_LABELS).sort());
  });

  it("uses the same words the nav uses, so a report row names a real nav item", () => {
    for (const [view, label] of Object.entries(VIEW_LABELS)) {
      expect(APP_VIEW_TITLE_LABELS[view]).toBe(label);
    }
  });

  it("gives every view a title distinct from the marketing homepage title", () => {
    const marketing = "Free AI Resume Builder: Get Past the ATS | Resunova";
    for (const title of Object.values(APP_VIEW_TITLES)) {
      expect(title).not.toBe(marketing);
      expect(title.endsWith(TITLE_SUFFIX)).toBe(true);
    }
  });

  it("gives each view its OWN title — two views sharing one re-merges them", () => {
    const titles = Object.values(APP_VIEW_TITLES);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("appViewTitleFromSearch", () => {
  it("resolves a known view", () => {
    expect(appViewTitleFromSearch("?view=analyze")).toBe("Analyze · Resunova");
    expect(appViewTitleFromSearch("?view=jobs&job=abc")).toBe("Jobs · Resunova");
  });

  it("is case-insensitive, because URLs in the wild are", () => {
    expect(appViewTitleFromSearch("?view=Analyze")).toBe("Analyze · Resunova");
  });

  /**
   * ⚠️ The load-bearing case. Bare "/" is the marketing landing page for a
   * signed-out visitor and the app home for a signed-in one, and nothing
   * available when the gtag bootstrap runs can tell them apart. Retitling it
   * would mislabel the most-visited marketing page in the property — a worse
   * bug than the merge. AppShell's `app_view` is what resolves the signed-in
   * case, because by then React knows which one it rendered.
   */
  it("returns null for a bare path rather than claiming it is the app home", () => {
    expect(appViewTitleFromSearch("")).toBeNull();
    expect(appViewTitleFromSearch("?utm_source=x")).toBeNull();
  });

  it("returns null for an unknown view instead of inventing a title", () => {
    expect(appViewTitleFromSearch("?view=nonsense")).toBeNull();
  });
});
