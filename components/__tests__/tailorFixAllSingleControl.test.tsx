import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TailorMatchSidebar, TailorMatchDetail } from "@/components/DetailedRatingsView";

/**
 * One Fix-everything control on screen, in either sidebar state.
 *
 * A field screenshot showed the button AND its "show suggestions first"
 * checkbox rendered twice, stacked: the sidebar had one and the detail column
 * had its own ungated copy.
 *
 * The second copy looked like cover for a collapsed sidebar — it is not. The
 * collapsed rail carries its own compact button, so the sidebar owns this
 * action in BOTH states and the detail copy was redundant either way. It is
 * deleted; these tests pin that it stays deleted.
 *
 * Two identical controls is not a convenience: it makes a user ask whether
 * they do different things, and nothing on screen answers that.
 */

const ratings = {
  overall_score: 72,
  match_score: 72,
  job_title: { matched: false, jd_title: "Software Engineer", resume_title: "Senior Fullstack Developer", score: 8 },
  qualifications: { score: 90, missing: [{ text: "CI/CD", analysis: "Not shown." }], covered: [] },
  responsibilities: { score: 80, missing: [], covered: [] },
  keywords: { found_count: 19, total_count: 24, direct_skills: { found: [], missing: [] }, contextual: { found: [], missing: [] } },
  whats_working: [], gaps: [], verdict: "",
} as never;

const shared = {
  ratings,
  // `overall`, not `overview` — an unknown tab id has no impact mapping and
  // the component throws on it. The screenshot that prompted this was on
  // `job_title`, which behaves the same for this control.
  activeTab: "overall" as const,
  onActiveTabChange: vi.fn(),
  onFixEverything: vi.fn(),
  openGapCount: 2,
  fixEverythingAutoApply: true,
  onFixEverythingAutoApplyChange: vi.fn(),
};

const fixAll = () => screen.queryAllByRole("button", { name: /fix everything/i });
const optOut = () => screen.queryAllByText(/show suggestions first/i);

describe("Fix everything renders exactly once", () => {
  it("sidebar expanded: the sidebar owns it, the detail column stays quiet", () => {
    render(<>
      <TailorMatchSidebar {...shared} collapsed={false} onCollapsedChange={vi.fn()} />
      <TailorMatchDetail {...shared} />
    </>);
    expect(fixAll()).toHaveLength(1);
    expect(optOut()).toHaveLength(1);
  });

  it("sidebar collapsed: the icon rail still carries it", () => {
    // The compact rail has its own button (aria-label "Fix everything, N
    // gaps"), which is why the detail copy was never needed as cover.
    render(<>
      <TailorMatchSidebar {...shared} collapsed onCollapsedChange={vi.fn()} />
      <TailorMatchDetail {...shared} />
    </>);
    expect(fixAll()).toHaveLength(1);
    // The rail deliberately has no room for the opt-out checkbox. Recorded
    // rather than asserted away: collapsing the sidebar does cost you the
    // "show suggestions first" toggle until you expand it again. Pre-existing,
    // and not something this change introduces or fixes.
    expect(optOut()).toHaveLength(0);
  });

  it("never renders two, in either state", () => {
    for (const collapsed of [false, true]) {
      const { unmount } = render(<>
        <TailorMatchSidebar {...shared} collapsed={collapsed} onCollapsedChange={vi.fn()} />
        <TailorMatchDetail {...shared} />
      </>);
      expect(fixAll().length).toBeLessThanOrEqual(1);
      unmount();
    }
  });
});
