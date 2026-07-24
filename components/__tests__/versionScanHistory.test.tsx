import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { VersionEditor, type VersionEditorHandlers } from "@/components/versions/VersionEditor";
import type { ResumeVersion, ResumeVersionGroup, VersionScan } from "@/lib/resumeVersions";

function mkVersion(over: Partial<ResumeVersion> = {}): ResumeVersion {
  return {
    id: "pm3", name: "Product Manager résumé", rootId: "pm", parentId: null, version: 3,
    structured: null, extractedText: null, origin: "upload", sourcePdfUrl: null,
    jdText: null, jdCompany: null, jdTitle: null, lastScore: 84, lastScoreSource: "llm",
    isDefault: true, sourceRootId: null, createdAt: "2026-07-10T00:00:00Z", updatedAt: "2026-07-17T00:00:00Z",
    ...over,
  };
}

const version = mkVersion();
const groups: ResumeVersionGroup[] = [{ root: "pm", versions: [version] }];

const SCANS: VersionScan[] = [
  { id: "s3", label: "PM résumé", score: 84, scoreSource: "llm", createdAt: "2026-07-17T07:10:00Z" },
  { id: "s2", label: "PM résumé", score: 80, scoreSource: "llm", createdAt: "2026-07-16T18:20:00Z" },
  { id: "s1", label: "PM résumé", score: 71, scoreSource: "llm", createdAt: "2026-07-12T09:00:00Z" },
];

function handlers(over: Partial<VersionEditorHandlers> = {}): VersionEditorHandlers {
  return {
    onSwitch: vi.fn(),
    onNewVersion: vi.fn(),
    onScore: vi.fn(async () => ({ score: null as number | null })),
    onTailor: vi.fn(),
    onDuplicate: vi.fn(),
    ...over,
  };
}

describe("VersionEditor — Scan history panel (résumé-storage merge Phase 3)", () => {
  it("loads and renders a scan per linked analysis", async () => {
    const onLoadScans = vi.fn(async () => SCANS);
    const { findByText, getAllByText } = render(
      <VersionEditor version={version} groups={groups} demo handlers={handlers({ onLoadScans, onViewReport: vi.fn() })} />,
    );
    // heading always present; the count + rows appear once onLoadScans resolves
    await findByText("3 scans");
    expect(onLoadScans).toHaveBeenCalledWith("pm3");
    expect(getAllByText("View report →")).toHaveLength(3);
  });

  it("shows the empty state when no scans are linked", async () => {
    const { findByText } = render(
      <VersionEditor version={version} groups={groups} demo handlers={handlers({ onLoadScans: vi.fn(async () => []) })} />,
    );
    await findByText(/No scans yet/i);
  });

  it("'View report →' opens the linked analysis via onViewReport", async () => {
    const onViewReport = vi.fn();
    const { findAllByText } = render(
      <VersionEditor version={version} groups={groups} demo handlers={handlers({ onLoadScans: vi.fn(async () => SCANS), onViewReport })} />,
    );
    const links = await findAllByText("View report →");
    fireEvent.click(links[0]); // newest scan is first
    expect(onViewReport).toHaveBeenCalledWith("s3");
  });

  it("renders no scan rows (nor a crash) when onLoadScans is absent", async () => {
    const { findByText, queryAllByText } = render(
      <VersionEditor version={version} groups={groups} demo handlers={handlers()} />,
    );
    await findByText(/No scans yet/i);
    expect(queryAllByText("View report →")).toHaveLength(0);
  });
});
