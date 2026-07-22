import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MyResumesView, type VersionActionHandlers } from "@/components/versions/MyResumesView";
import type { ResumeVersion, ResumeVersionGroup } from "@/lib/resumeVersions";
import type { LibraryItem } from "@/lib/supabase";

/* ── fixtures ────────────────────────────────────────────────────── */

function mkVersion(over: Partial<ResumeVersion>): ResumeVersion {
  return {
    id: "v1", name: "Product Manager résumé", rootId: "r1", parentId: null, version: 1,
    structured: null, extractedText: null, origin: "upload", sourcePdfUrl: null,
    jdText: null, jdCompany: null, jdTitle: null, lastScore: 82, lastScoreSource: "llm",
    isDefault: false, createdAt: "2026-07-10T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z",
    ...over,
  };
}

const GROUP: ResumeVersionGroup = {
  root: "r1",
  versions: [mkVersion({ id: "v1", version: 1, isDefault: true })],
};

const analyzed: LibraryItem = {
  kind: "analyzed", key: "analyzed:a1", id: "a1", title: "Krish — Analyst résumé",
  subtitle: "Overall 82", score: 82, createdAt: "2026-07-10T00:00:00Z",
  isDefault: false, analysis: {} as never,
};
const tailored: LibraryItem = {
  kind: "tailored", key: "tailored:t1", id: "t1", title: "BA résumé — Stripe",
  subtitle: "Match 71%", score: 71, createdAt: "2026-07-11T00:00:00Z",
  isDefault: false, record: {} as never,
};
const builder: LibraryItem = {
  kind: "builder", key: "builder:b1", id: "b1", title: "Modern draft",
  subtitle: "Builder draft", score: null, createdAt: "2026-07-09T00:00:00Z",
  isDefault: false, builder: {} as never,
};
const coverLetter: LibraryItem = {
  kind: "cover_letter", key: "cover_letter:c1", id: "c1", title: "Cover letter — Notion",
  subtitle: "Cover letter", score: null, createdAt: "2026-07-08T00:00:00Z",
  isDefault: false, coverLetter: {} as never,
};

function noopHandlers(over: Partial<VersionActionHandlers> = {}): VersionActionHandlers {
  return {
    onNewVersion: vi.fn(), onOpen: vi.fn(), onTailor: vi.fn(),
    onDuplicate: vi.fn(), onSetDefault: vi.fn(), ...over,
  };
}

/* ── tests ───────────────────────────────────────────────────────── */

describe("MyResumesView — versions + 'From your history' (résumé-storage merge Phases 1–2)", () => {
  it("renders the version card and the history section side by side", () => {
    const { getByText } = render(
      <MyResumesView
        groups={[GROUP]}
        handlers={noopHandlers()}
        legacyItems={[analyzed, tailored, builder, coverLetter]}
        onOpenLegacy={vi.fn()}
        onSaveAsVersion={vi.fn()}
      />,
    );
    // version card head
    expect(getByText("Product Manager résumé")).toBeTruthy();
    // history section + one title per kind
    expect(getByText("From your history")).toBeTruthy();
    expect(getByText("Krish — Analyst résumé")).toBeTruthy();
    expect(getByText("BA résumé — Stripe")).toBeTruthy();
    expect(getByText("Modern draft")).toBeTruthy();
    expect(getByText("Cover letter — Notion")).toBeTruthy();
    // kind badges
    expect(getByText("Analyzed")).toBeTruthy();
    expect(getByText("Tailored")).toBeTruthy();
    expect(getByText("Draft")).toBeTruthy();
    expect(getByText("Cover letter")).toBeTruthy();
  });

  it("shows 'Save as version' ONLY on analyzed + tailored history rows", () => {
    const { getAllByText, getByText } = render(
      <MyResumesView
        groups={[]}
        handlers={noopHandlers()}
        legacyItems={[analyzed, tailored, builder, coverLetter]}
        onOpenLegacy={vi.fn()}
        onSaveAsVersion={vi.fn()}
      />,
    );
    // exactly two promotable items (analyzed, tailored)
    expect(getAllByText("Save as version")).toHaveLength(2);
    // every history row has an Open
    expect(getAllByText("Open")).toHaveLength(4);
    // the non-promotable rows still render (their titles are present)
    expect(getByText("Modern draft")).toBeTruthy();
    expect(getByText("Cover letter — Notion")).toBeTruthy();
  });

  it("routes 'Save as version' and 'Open' to the right item", () => {
    const onSaveAsVersion = vi.fn();
    const onOpenLegacy = vi.fn();
    const { getAllByText } = render(
      <MyResumesView
        groups={[]}
        handlers={noopHandlers()}
        legacyItems={[analyzed, tailored, builder, coverLetter]}
        onOpenLegacy={onOpenLegacy}
        onSaveAsVersion={onSaveAsVersion}
      />,
    );
    // first "Save as version" belongs to the analyzed row (list order)
    fireEvent.click(getAllByText("Save as version")[0]);
    expect(onSaveAsVersion).toHaveBeenCalledWith(analyzed);
    // first "Open" belongs to the analyzed row too
    fireEvent.click(getAllByText("Open")[0]);
    expect(onOpenLegacy).toHaveBeenCalledWith(analyzed);
  });

  it("omits 'Save as version' entirely when no onSaveAsVersion handler is provided", () => {
    const { queryByText, getAllByText } = render(
      <MyResumesView groups={[]} handlers={noopHandlers()} legacyItems={[analyzed]} onOpenLegacy={vi.fn()} />,
    );
    expect(queryByText("Save as version")).toBeNull();
    expect(getAllByText("Open")).toHaveLength(1);
  });

  it("shows the empty state only when there are no versions AND no history", () => {
    const { getByText, rerender, queryByText } = render(
      <MyResumesView groups={[]} handlers={noopHandlers()} legacyItems={[]} />,
    );
    expect(getByText("No résumés yet")).toBeTruthy();

    // history-only (no versions) must NOT show the empty state
    rerender(
      <MyResumesView groups={[]} handlers={noopHandlers()} legacyItems={[analyzed]} onOpenLegacy={vi.fn()} />,
    );
    expect(queryByText("No résumés yet")).toBeNull();
    expect(getByText("From your history")).toBeTruthy();
  });

  it("fires onNewVersion from the header button", () => {
    const onNewVersion = vi.fn();
    const { getByText } = render(
      <MyResumesView groups={[GROUP]} handlers={noopHandlers({ onNewVersion })} />,
    );
    fireEvent.click(getByText("New version"));
    expect(onNewVersion).toHaveBeenCalledTimes(1);
  });
});
