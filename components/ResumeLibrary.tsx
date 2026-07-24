"use client";

/**
 * ResumeLibrary — grid of saved résumés + optional right-hand detail panel (?resume=<folder>).
 *
 * - 2–3 columns desktop, 1 column mobile; score badge by threshold; paper-style preview.
 * - Hover (desktop): overlay with View + Use as base; touch: actions always visible.
 * - Card click → opens detail drawer beside the grid (matches product mockup).
 */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { apiUrl } from "@/lib/utils";
import LibraryResumeDetailPanel from "./LibraryResumeDetailPanel";

// PDF thumbnail is client-only (react-pdf/pdfjs) — never server-rendered.
const PdfCardThumbnail = dynamic(() => import("@/components/PdfCardThumbnail"), { ssr: false });

/** Resolve a stored PDF ref (absolute URL or API-relative path) to a fetchable URL. */
function resolvePdfUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  if (raw.startsWith("http")) return raw;
  return apiUrl(raw.startsWith("/") ? raw : `/${raw}`);
}
import { stashTailorPrefillFromLibrary } from "@/lib/tailorPrefill";
import { displayPdfUrlForResume } from "@/lib/displayResumePdfUrl";
import { deleteBuilderResume, getSupabaseClient, type LibraryItem } from "@/lib/supabase";
import { fetchLibraryFeed, type LibraryFeedItem, type VersionLibraryItem } from "@/lib/libraryFeed";
import { VersionEditor, type VersionEditorHandlers } from "@/components/versions/VersionEditor";
import {
  duplicateVersion,
  listScansForVersion,
  scoreVersionInPlace,
  setVersionAsMyResume,
  type ResumeVersionGroup,
} from "@/lib/resumeVersions";
import { stashVersionForTailor, VERSION_TAILOR_URL } from "@/lib/versionTailorPrefill";
import { stashVersionForBoost, BOOST_JOBS_URL } from "@/lib/versionBoostPrefill";
import { RESUME_LIBRARY_CHANGED_EVENT } from "@/lib/resumeLibraryEvents";
import { RN_BUILDER_LAYOUT_ONLY_KEY } from "@/lib/resumeTemplateStudioPrefs";
import { stashTemplateBuilderStructuredPrefillFromAnalysisResult } from "@/lib/templateBuilderPrefill";
import { Button } from "@/components/ui/button";
import { useSignInDialog } from "@/components/SignInDialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "./ConfirmDialog";

type SortKey = "recent" | "score" | "name";
type FilterKey = "all" | "base" | "analyzed" | "tailored" | "builder" | "cover_letter" | "default";

/** Primary tab bar for the "My Résumés" hub. `base` = analyzed + builder drafts + editable résumés. */
const LIBRARY_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "base", label: "Base Resumes" },
  { key: "tailored", label: "Job Tailored" },
  { key: "builder", label: "Drafts" },
  { key: "cover_letter", label: "Cover Letters" },
];

/** Aligns with Analyze bullet bands: strong ≥70, improvable 55–69, weak &lt;55 */
function matchScoreBand(score: number): "strong" | "mid" | "weak" {
  if (score >= 70) return "strong";
  if (score >= 55) return "mid";
  return "weak";
}

function analysisResult(item: LibraryItem): Record<string, unknown> {
  return item.kind === "analyzed" && item.analysis.result && typeof item.analysis.result === "object"
    ? item.analysis.result as Record<string, unknown>
    : {};
}

function issueLabel(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (!raw || typeof raw !== "object") return "";
  const obj = raw as Record<string, unknown>;
  for (const key of ["issue", "title", "description", "whyItMatters", "suggestion"]) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getAnalysisIssues(item: LibraryItem, limit = 2): string[] {
  const issues = analysisResult(item).topIssues;
  if (!Array.isArray(issues)) return [];
  return issues.map(issueLabel).filter(Boolean).slice(0, limit);
}

function getAnalysisExtractedText(item: LibraryItem): string {
  const text = analysisResult(item).extractedText;
  return typeof text === "string" ? text.trim() : "";
}

export default function ResumeLibrary({ onUseAsBase }: {
  onUseAsBase?: (folder: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFolder = (searchParams?.get("resume") ?? "").trim();
  const selectedAnalysisId = (searchParams?.get("analysis") ?? "").trim();
  const selectedBuilderId = (searchParams?.get("builder") ?? "").trim();
  const selectedCoverLetterId = (searchParams?.get("cl") ?? "").trim();
  const selectedVersionId = (searchParams?.get("version") ?? "").trim();
  const [items, setItems] = useState<LibraryFeedItem[]>([]);
  const [groups, setGroups] = useState<ResumeVersionGroup[]>([]);
  /** In-pane deep editor for a résumé version (M3) — replaces the grid while set. */
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** `null` until first auth check completes — avoids flashing the wrong empty state. */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const { openSignIn } = useSignInDialog();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [filter, setFilter] = useState("");
  const [kindFilter, setKindFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    const syncLibrary = async () => {
      setLoadError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setSignedIn(!!session?.user?.id);
      setLoading(true);
      try {
        const feed = await fetchLibraryFeed();
        if (!cancelled) {
          setItems(feed.items);
          setGroups(feed.groups);
        }
      } catch (e: unknown) {
        console.error("[library] fetchLibraryFeed", e);
        if (!cancelled) {
          setItems([]);
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void syncLibrary();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void syncLibrary();
    });

    const onRemoteResumeWrite = () => {
      void syncLibrary();
    };
    if (typeof window !== "undefined") {
      window.addEventListener(RESUME_LIBRARY_CHANGED_EVENT, onRemoteResumeWrite);
    }
    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener(RESUME_LIBRARY_CHANGED_EVENT, onRemoteResumeWrite);
      }
    };
  }, []);

  const selectedItem = useMemo(() => {
    if (selectedVersionId) {
      return items.find(item => item.kind === "version" && item.id === selectedVersionId) ?? null;
    }
    if (selectedAnalysisId) {
      return items.find(item => item.kind === "analyzed" && item.id === selectedAnalysisId) ?? null;
    }
    if (selectedBuilderId) {
      return items.find(item => item.kind === "builder" && item.id === selectedBuilderId) ?? null;
    }
    if (selectedCoverLetterId) {
      return items.find(item => item.kind === "cover_letter" && item.id === selectedCoverLetterId) ?? null;
    }
    if (selectedFolder) {
      return items.find(item => item.kind === "tailored" && item.record.folder === selectedFolder) ?? null;
    }
    return null;
  }, [items, selectedAnalysisId, selectedBuilderId, selectedFolder, selectedCoverLetterId, selectedVersionId]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    let arr = items.filter(item => {
      // Versions bucket with what they ARE: a Boost/tailor version sits with
      // Job Tailored; everything else is a base résumé.
      const versionIsTailored = item.kind === "version" && item.version.origin === "tailor";
      if (kindFilter === "base" && item.kind !== "analyzed" && item.kind !== "builder" && !(item.kind === "version" && !versionIsTailored)) return false;
      if (kindFilter === "analyzed" && item.kind !== "analyzed") return false;
      if (kindFilter === "tailored" && item.kind !== "tailored" && !versionIsTailored) return false;
      if (kindFilter === "builder" && item.kind !== "builder") return false;
      if (kindFilter === "cover_letter" && item.kind !== "cover_letter") return false;
      if (kindFilter === "default" && !item.isDefault) return false;
      if (!f) return true;
      const issueText = item.kind === "analyzed" ? getAnalysisIssues(item).join(" ") : "";
      return `${item.title} ${item.subtitle} ${issueText}`.toLowerCase().includes(f);
    });
    if (sort === "recent") {
      arr = [...arr].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    } else if (sort === "score") {
      arr = [...arr].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    } else {
      arr = [...arr].sort((a, b) => a.title.localeCompare(b.title));
    }
    return arr;
  }, [items, filter, kindFilter, sort]);

  const openItem = (item: LibraryFeedItem) => {
    if (item.kind === "version") {
      router.push(`/?view=library&version=${encodeURIComponent(item.id)}`);
      return;
    }
    if (item.kind === "analyzed") {
      router.push(`/?view=library&analysis=${encodeURIComponent(item.id)}`);
      return;
    }
    if (item.kind === "builder") {
      router.push(`/?view=library&builder=${encodeURIComponent(item.id)}`);
      return;
    }
    if (item.kind === "cover_letter") {
      router.push(`/?view=library&cl=${encodeURIComponent(item.id)}`);
      return;
    }
    router.push(`/?view=library&resume=${encodeURIComponent(item.record.folder)}`);
  };

  const closeDetail = () => {
    router.push("/?view=library");
  };

  const applyResumeAsBase = (item: LibraryFeedItem) => {
    if (item.kind !== "tailored") return;
    const r = item.record;
    onUseAsBase?.(r.folder);
    stashTailorPrefillFromLibrary(r);
    try {
      sessionStorage.removeItem(RN_BUILDER_LAYOUT_ONLY_KEY);
    } catch { /* ignore */ }
    router.push(`/?view=builder&flow=tailor&base=${encodeURIComponent(r.folder)}&intent=job`);
  };

  const openAnalysis = (item: LibraryFeedItem) => {
    if (item.kind !== "analyzed") return;
    router.push(`/?view=analyze&analysis=${encodeURIComponent(item.id)}`);
  };

  const tailorFromAnalysis = (item: LibraryFeedItem) => {
    if (item.kind !== "analyzed") return;
    const text = getAnalysisExtractedText(item);
    try {
      if (text) sessionStorage.setItem("rn_builder_profile_prefill", text);
      sessionStorage.removeItem(RN_BUILDER_LAYOUT_ONLY_KEY);
    } catch { /* ignore */ }
    router.push("/?view=builder&flow=tailor&fromAnalyze=1");
  };

  const editAnalysisInTemplateBuilder = (item: LibraryFeedItem) => {
    if (item.kind !== "analyzed") return;
    try {
      stashTemplateBuilderStructuredPrefillFromAnalysisResult(item.analysis.result);
      sessionStorage.removeItem(RN_BUILDER_LAYOUT_ONLY_KEY);
    } catch {
      // ignore and still route to builder
    }
    router.push("/template-builder/");
  };

  const openBuilderDraft = (item: LibraryFeedItem) => {
    if (item.kind !== "builder") return;
    router.push(`/template-builder/?builder=${encodeURIComponent(item.id)}`);
  };

  const deleteBuilderItem = async (item: LibraryFeedItem) => {
    if (item.kind !== "builder") return;
    setConfirmConfig({
      title: "Delete Resume Draft",
      description: `Delete "${item.title}" from Resume Hub? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteBuilderResume(item.id);
          setItems(prev => prev.filter(i => i.key !== item.key));
          if (selectedBuilderId === item.id) {
            router.push("/?view=library");
          }
        } catch (e: unknown) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    });
    setConfirmOpen(true);
  };

  const deleteCoverLetterItem = async (item: LibraryFeedItem) => {
    if (item.kind !== "cover_letter") return;
    setConfirmConfig({
      title: "Delete Cover Letter",
      description: `Delete "${item.title}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const { deleteCoverLetter } = await import("@/lib/supabase");
          await deleteCoverLetter(item.id);
          setItems(prev => prev.filter(i => i.key !== item.key));
          if (selectedCoverLetterId === item.id) {
            router.push("/?view=library");
          }
        } catch (e: unknown) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    });
    setConfirmOpen(true);
  };

  /* ── Résumé versions in the hub (M3) ─────────────────────────────── */

  const editingVersion = editingVersionId
    ? groups.flatMap(g => g.versions).find(v => v.id === editingVersionId) ?? null
    : null;

  const openVersionEditor = (item: LibraryFeedItem) => {
    if (item.kind !== "version") return;
    setEditingVersionId(item.version.id);
  };

  const tailorFromVersion = (item: LibraryFeedItem) => {
    if (item.kind !== "version") return;
    if (stashVersionForTailor(item.version)) router.push(VERSION_TAILOR_URL);
  };

  const useVersionAsMyResume = async (item: LibraryFeedItem) => {
    if (item.kind !== "version") return;
    await setVersionAsMyResume(item.version);
  };

  const boostFromVersion = (item: LibraryFeedItem) => {
    if (item.kind !== "version") return;
    if (stashVersionForBoost(item.version)) router.push(BOOST_JOBS_URL);
  };

  const editorHandlers: VersionEditorHandlers = {
    onSwitch: v => setEditingVersionId(v.id),
    // The hub keeps creation flows elsewhere (Analyze / Boost / Import); "new"
    // inside the deep editor means "branch from here".
    onNewVersion: () => {
      if (!editingVersion) return;
      void duplicateVersion(editingVersion).then(nv => { if (nv) setEditingVersionId(nv.id); });
    },
    onScore: async structured => {
      if (!editingVersion) return { score: null };
      return scoreVersionInPlace({
        id: editingVersion.id,
        name: editingVersion.name,
        structured,
        extractedText: editingVersion.extractedText,
      });
    },
    onViewReport: aid => router.push(`/?view=analyze&analysis=${encodeURIComponent(aid)}`),
    onLoadScans: vid => listScansForVersion(vid),
    onTailor: v => { if (stashVersionForTailor(v)) router.push(VERSION_TAILOR_URL); },
    onBoost: v => { if (stashVersionForBoost(v)) router.push(BOOST_JOBS_URL); },
    onDuplicate: v => { void duplicateVersion(v); },
  };

  if (editingVersion) {
    return (
      <div
        className="library-page fade-in"
        style={{ flex: 1, minHeight: 0, width: "100%", overflowY: "auto", padding: "18px 22px" }}
      >
        <div style={{ marginBottom: 12 }}>
          <Button type="button" onClick={() => setEditingVersionId(null)} style={actionBtnGhost}>
            ← Back to your résumés
          </Button>
        </div>
        <VersionEditor version={editingVersion} groups={groups} handlers={editorHandlers} />
      </div>
    );
  }

  return (
    <div
      className="library-page fade-in"
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .library-shell {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          width: 100%;
        }
        .library-main-scroll {
          flex: 1 1 0%;
          min-width: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          display: flex;
          justify-content: center;
        }
        .library-main-inner {
          width: 100%;
          max-width: 1180px;
          padding: 24px 20px 32px;
          box-sizing: border-box;
        }
        .library-backdrop {
          display: none;
        }
        @media (max-width: 900px) {
          .library-backdrop.is-open {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 199;
            margin: 0;
            padding: 0;
            border: none;
            background: rgba(15, 23, 42, 0.42);
            cursor: pointer;
          }
          .library-detail-panel {
            position: fixed !important;
            top: 0;
            right: 0;
            bottom: 0;
            width: min(100%, 400px) !important;
            max-width: 100vw;
            z-index: 200;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.18);
          }
          [data-theme="dark"] .library-backdrop.is-open {
            background: rgba(0, 0, 0, 0.55);
          }
        }
        .library-actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 22px;
        }
        @media (max-width: 720px) {
          .library-actions-grid { grid-template-columns: 1fr; }
        }
        .library-action-card {
          text-align: left;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl, 14px);
          padding: 20px 22px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: border-color 0.14s ease, box-shadow 0.14s ease, transform 0.1s ease;
          font-family: inherit;
        }
        .library-action-card:hover {
          border-color: color-mix(in srgb, var(--accent) 40%, transparent);
          box-shadow: 0 6px 22px rgba(15, 23, 42, 0.08);
        }
        [data-theme="dark"] .library-action-card:hover {
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
        }
        .library-action-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .library-tabbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }
        .library-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--surface2);
          border-radius: var(--radius-pill, 99px);
          flex-wrap: wrap;
        }
        .library-tab {
          border: none;
          background: transparent;
          color: var(--muted);
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.01em;
          padding: 7px 14px;
          border-radius: var(--radius-pill, 99px);
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
          white-space: nowrap;
        }
        .library-tab:hover { color: var(--text); }
        .library-tab.is-active {
          background: var(--surface);
          color: var(--accent);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
        }
        .library-tabbar-controls {
          display: flex;
          gap: 8px;
          align-items: center;
          flex: 1 1 240px;
          min-width: 0;
          justify-content: flex-end;
        }
        .library-create-card {
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: var(--radius-xl, 14px);
          min-height: 280px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
          padding: 24px;
          font-family: inherit;
          transition: border-color 0.14s ease, background 0.14s ease;
        }
        .library-create-card:hover {
          border-color: color-mix(in srgb, var(--accent) 45%, transparent);
          background: color-mix(in srgb, var(--accent) 5%, var(--surface));
        }
        .library-create-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .library-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .library-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .library-card {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl, 14px);
          box-shadow: var(--shadow-card, 0 1px 4px rgba(0,0,0,0.08));
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.14s ease, box-shadow 0.14s ease, transform 0.1s ease;
          display: flex;
          flex-direction: column;
          min-height: 280px;
        }
        .library-card:hover {
          border-color: color-mix(in srgb, var(--accent) 35%, transparent);
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
        }
        [data-theme="dark"] .library-card:hover {
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
        }
        .library-card:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .library-card-preview {
          flex-shrink: 0;
          aspect-ratio: 8.5 / 11;
          max-height: 148px;
          background: linear-gradient(180deg, var(--resume-paper-bg, #fff) 0%, var(--surface2) 100%);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        [data-theme="dark"] .library-card-preview {
          background: linear-gradient(180deg, #1e293b 0%, var(--surface2) 100%);
        }
        .library-card-body { padding: 14px 16px 16px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .library-card-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        @media (min-width: 768px) {
          .library-card-actions--hover {
            position: absolute;
            left: 0; right: 0; bottom: 0;
            z-index: 2;
            padding: 14px 16px 16px;
            background: linear-gradient(to top, var(--surface) 72%, rgba(255,255,255,0) 100%);
            border-top: none;
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 0.12s ease, transform 0.12s ease;
          }
          [data-theme="dark"] .library-card-actions--hover {
            background: linear-gradient(to top, var(--surface) 72%, rgba(22,27,34,0) 100%);
          }
          .library-card:hover .library-card-actions--hover {
            opacity: 1;
            transform: translateY(0);
          }
          .library-card .library-card-actions--static { display: none; }
        }
        @media (max-width: 767px) {
          .library-card-actions--hover { display: none !important; }
          .library-card .library-card-actions--static { display: flex; }
        }
      `}</style>

      {selectedFolder || selectedAnalysisId || selectedBuilderId || selectedCoverLetterId ? (
        <button
          type="button"
          className={`library-backdrop is-open`}
          aria-label="Close resume details"
          onClick={closeDetail}
        />
      ) : null}

      <div className="library-shell">
        <div className="library-main-scroll">
          <div className="library-main-inner">
            <header
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--text)",
                    marginBottom: 6,
                    lineHeight: 1.15,
                  }}
                >
                  My Résumés
                </h1>
                <p style={{ fontSize: 13.5, color: "var(--muted)", letterSpacing: "-0.02em", lineHeight: 1.55, margin: 0, maxWidth: 520 }}>
                  {loading || signedIn === null
                    ? "Loading…"
                    : signedIn
                      ? "Create and manage your professional resumes"
                      : "Sign in to sync analyzed and tailored résumés"}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem(RN_BUILDER_LAYOUT_ONLY_KEY);
                  } catch { /* ignore */ }
                  router.push("/?view=builder&flow=tailor&intent=job");
                }}
                className="shrink-0"
              >
                + Create New
              </Button>
            </header>

            {signedIn === false ? (
              <div
                role="region"
                aria-label="Sign in required"
                style={{
                  marginBottom: 18,
                  padding: "14px 16px",
                  borderRadius: "var(--radius-xl, 14px)",
                  border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                  background: "var(--accent-bg)",
                  fontSize: 13,
                  color: "var(--text)",
                  lineHeight: 1.55,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span style={{ flex: "1 1 220px", minWidth: 0 }}>
                  The Resume Hub only lists items tied to your account. After you sign in with Google, Analyze runs and
                  Builder exports are saved here automatically.
                </span>
                <Button
                  type="button"
                  onClick={() => openSignIn({ title: "Sign in to your Resume Hub", reason: "Analyze runs and Builder exports are saved to your account automatically once you sign in." })}
                  className="shrink-0"
                >
                  Sign in with Google
                </Button>
              </div>
            ) : null}

            {loadError ? (
              <div
                style={{
                  marginBottom: 18,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(248,113,113,0.35)",
                  background: "var(--red-bg)",
                  color: "var(--red)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Could not load your library: {loadError}
              </div>
            ) : null}

            {/* Two entry-action cards (score a fresh draft / match to a JD) */}
            <div className="library-actions-grid">
              <LibraryActionCard
                eyebrow="Score a new version"
                title="Check your resume score across 20+ ATS parameters"
                desc="Upload a fresh draft — we'll score it instantly so you know what to fix."
                cta="Check resume score"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M12 12l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                  </svg>
                }
                onClick={() => router.push("/?view=analyze")}
              />
              <LibraryActionCard
                eyebrow="Targeting a new role?"
                title="Check how well your resume matches the job"
                desc="Paste a JD — we'll score your resume against it instantly."
                cta="Check job match"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 3l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 15l-4.6 2.4.9-5.1L4.5 8.5l5.2-.8L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                }
                onClick={() => {
                  try { sessionStorage.removeItem(RN_BUILDER_LAYOUT_ONLY_KEY); } catch { /* ignore */ }
                  router.push("/?view=builder&flow=tailor&intent=job");
                }}
              />
            </div>

            {/* Tab bar + compact search/sort */}
            <div className="library-tabbar">
              <div className="library-tabs" role="tablist" aria-label="Filter resumes">
                {LIBRARY_TABS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={kindFilter === tab.key}
                    className={`library-tab${kindFilter === tab.key ? " is-active" : ""}`}
                    onClick={() => setKindFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="library-tabbar-controls">
                <input
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Search…"
                  aria-label="Search resume hub"
                  style={{ flex: "1 1 140px", minWidth: 0 }}
                />
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  aria-label="Sort resumes"
                  style={{ width: "auto", minWidth: 130, flexShrink: 0 }}
                >
                  <option value="recent">Most recent</option>
                  <option value="score">Highest score</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="library-grid" aria-busy>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className={`h-[300px] rounded-xl stagger-${Math.min(i + 1, 4)}`}
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyLibrary
                hasAny={items.length > 0}
                filter={filter}
                signedIn={signedIn === true}
                onGoBuilder={() => {
                  try {
                    sessionStorage.removeItem(RN_BUILDER_LAYOUT_ONLY_KEY);
                  } catch { /* ignore */ }
                  router.push("/?view=builder&flow=tailor&intent=job");
                }}
              />
            ) : (
              <div className="library-grid">
                {filtered.map((item, i) => (
                  <ResumeCard
                    key={item.key}
                    item={item}
                    isSelected={
                      item.kind === "analyzed"
                        ? selectedAnalysisId === item.id
                        : item.kind === "builder"
                          ? selectedBuilderId === item.id
                          : item.kind === "cover_letter"
                            ? selectedCoverLetterId === item.id
                            : item.kind === "version"
                              ? selectedVersionId === item.id
                              : selectedFolder === item.record.folder
                    }
                    stagger={Math.min(i % 5, 4)}
                    onOpen={() => openItem(item)}
                    onUseAsBase={() => applyResumeAsBase(item)}
                    onOpenAnalysis={() => openAnalysis(item)}
                    onTailorAnalysis={() => tailorFromAnalysis(item)}
                    onEditInTemplateBuilder={() => editAnalysisInTemplateBuilder(item)}
                    onOpenInBuilder={() => openBuilderDraft(item)}
                    onEditVersion={() => openVersionEditor(item)}
                    onTailorVersion={() => tailorFromVersion(item)}
                  />
                ))}
                <CreateNewCard onClick={() => router.push("/?view=content-source")} />
              </div>
            )}
          </div>
        </div>

        {selectedFolder || selectedAnalysisId || selectedBuilderId || selectedCoverLetterId || selectedVersionId ? (
          <LibraryResumeDetailPanel
            item={selectedItem}
            loading={loading}
            notFound={!loading && !selectedItem}
            onClose={closeDetail}
            onTailorNewJob={() => {
              if (selectedItem) applyResumeAsBase(selectedItem);
            }}
            onOpenAnalysis={() => {
              if (selectedItem) openAnalysis(selectedItem);
            }}
            onTailorAnalysis={() => {
              if (selectedItem) tailorFromAnalysis(selectedItem);
            }}
            onEditInTemplateBuilder={() => {
              if (selectedItem) editAnalysisInTemplateBuilder(selectedItem);
            }}
            onOpenInBuilder={() => {
              if (selectedItem) openBuilderDraft(selectedItem);
            }}
            onDeleteBuilder={() => {
              if (selectedItem) void deleteBuilderItem(selectedItem);
            }}
            onDeleteCoverLetter={() => {
              if (selectedItem) void deleteCoverLetterItem(selectedItem);
            }}
            onEditVersion={() => {
              if (selectedItem) openVersionEditor(selectedItem);
            }}
            onTailorVersion={() => {
              if (selectedItem) tailorFromVersion(selectedItem);
            }}
            onBoostVersion={() => {
              if (selectedItem) boostFromVersion(selectedItem);
            }}
            onUseVersionAsMyResume={() => {
              if (selectedItem) void useVersionAsMyResume(selectedItem);
            }}
          />
        ) : null}
      </div>

      {confirmConfig && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          onConfirm={confirmConfig.onConfirm}
        />
      )}
    </div>
  );
}

function LibraryActionCard({
  eyebrow,
  title,
  desc,
  cta,
  icon,
  onClick,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  cta: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="library-action-card" onClick={onClick}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--accent-bg)",
          color: "var(--accent)",
          marginBottom: 8,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>
        {eyebrow}
      </span>
      <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", lineHeight: 1.3 }}>
        {title}
      </span>
      <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{desc}</span>
      <span style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{cta} →</span>
    </button>
  );
}

function CreateNewCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="library-create-card" onClick={onClick} aria-label="Create a new resume">
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "var(--accent-bg)",
          color: "var(--accent)",
          marginBottom: 4,
        }}
        aria-hidden
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
        Create New Resume
      </span>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, maxWidth: 220 }}>
        Upload, start from scratch, or tailor for a specific job.
      </span>
      <span style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Get Started →</span>
    </button>
  );
}

function EmptyLibrary({
  hasAny,
  filter,
  signedIn,
  onGoBuilder,
}: {
  hasAny: boolean;
  filter: string;
  signedIn: boolean;
  onGoBuilder: () => void;
}) {
  return (
    <div
      className="scale-in fade-in-up"
      style={{
        padding: "48px 28px",
        textAlign: "center",
        background: "var(--surface)",
        border: "1px dashed var(--border)",
        borderRadius: "var(--radius-xl, 14px)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }} aria-hidden>📋</div>
      <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: 8 }}>
        {hasAny ? "No matches" : signedIn ? "No résumés yet" : "Nothing to show yet"}
      </h2>
      <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, maxWidth: 400, margin: "0 auto 20px" }}>
        {hasAny
          ? `Nothing matches “${filter}”. Try another search or clear the filter.`
          : signedIn
            ? "Analyze a résumé or tailor one to a job posting — saved runs appear here so you can compare, improve, and reuse them."
            : "Use “Sign in with Google” above, then analyze or generate a résumé — successful runs are saved to this hub."}
      </p>
      {!hasAny && signedIn && (
        <Button
          type="button"
          onClick={onGoBuilder}
        >
          Open Résumé Builder
        </Button>
      )}
    </div>
  );
}

function ResumeCard({
  item,
  isSelected,
  stagger,
  onOpen,
  onUseAsBase,
  onOpenAnalysis,
  onTailorAnalysis,
  onEditInTemplateBuilder,
  onOpenInBuilder,
  onEditVersion,
  onTailorVersion,
}: {
  item: LibraryFeedItem;
  isSelected?: boolean;
  stagger: number;
  onOpen: () => void;
  onUseAsBase: () => void;
  onOpenAnalysis: () => void;
  onTailorAnalysis: () => void;
  onEditInTemplateBuilder: () => void;
  onOpenInBuilder: () => void;
  onEditVersion: () => void;
  onTailorVersion: () => void;
}) {
  const displayPdf = useMemo(
    () => item.kind === "tailored" ? displayPdfUrlForResume(item.record) : null,
    [item],
  );
  // Real first-page PDF preview for the card thumbnail — uploaded source PDF for
  // analyzed résumés, the generated PDF for tailored ones. Null ⇒ placeholder.
  const thumbUrl = useMemo(
    () =>
      resolvePdfUrl(
        item.kind === "analyzed"
          ? item.analysis.sourcePdfUrl
          : item.kind === "version"
            ? item.version.sourcePdfUrl
            : item.kind === "tailored" ? displayPdf : null,
      ),
    [item, displayPdf],
  );
  const sc = item.score;
  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
  const band = sc != null ? matchScoreBand(sc) : null;
  const issues = item.kind === "analyzed" ? getAnalysisIssues(item) : [];

  const scoreBadge =
    sc != null ? (
      <Badge
        variant="secondary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: "var(--radius-pill, 99px)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          background:
            band === "strong" ? "var(--green-bg)"
              : band === "mid" ? "var(--amber-bg)"
                : "var(--red-bg)",
          color: band === "strong" ? "var(--green)" : band === "mid" ? "var(--amber)" : "var(--red)",
        }}
      >
        {sc}/100
      </Badge>
    ) : (
      <Badge variant="outline" style={{ fontSize: 11, fontWeight: 600, color: "var(--dim)" }}>No score</Badge>
    );

  const actions = (className: string) => (
    <div className={className} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button
        type="button"
        onClick={e => {
          e.stopPropagation();
          if (item.kind === "analyzed") onOpenAnalysis();
          else if (item.kind === "builder") onOpenInBuilder();
          else if (item.kind === "version") onEditVersion();
          else onOpen();
        }}
        style={actionBtnPrimary}
      >
        {item.kind === "analyzed"
          ? "Open analysis"
          : item.kind === "builder"
            ? "Open in Builder"
            : item.kind === "cover_letter"
              ? "Open in Builder"
              : item.kind === "version"
                ? "Edit"
                : "Details"}
      </Button>
      {item.kind === "version" ? (
        <>
          <Button
            type="button"
            onClick={e => { e.stopPropagation(); onTailorVersion(); }}
            title="Tailor this résumé to a job"
            style={actionBtnGhost}
          >
            Tailor
          </Button>
          <Button
            type="button"
            onClick={e => { e.stopPropagation(); onOpen(); }}
            style={actionBtnGhost}
          >
            Details
          </Button>
        </>
      ) : item.kind === "builder" || item.kind === "cover_letter" ? (
        <Button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onOpen();
          }}
          style={actionBtnGhost}
        >
          Details
        </Button>
      ) : item.kind === "analyzed" ? (
        <>
          <Button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onEditInTemplateBuilder();
            }}
            title="Open this analyzed resume in Template Builder with structured prefill"
            style={actionBtnGhost}
          >
            Edit in Builder
          </Button>
          <Button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onTailorAnalysis();
            }}
            style={actionBtnGhost}
          >
            Tailor
          </Button>
          <Button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpenAnalysis();
            }}
            title="Open analysis, then use Download PDF from the preview"
            style={actionBtnGhost}
          >
            Export PDF
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onUseAsBase();
            }}
            title="Start the builder with this version as the base"
            style={actionBtnGhost}
          >
            Use as base
          </Button>
          {displayPdf && (
            <a
              href={displayPdf}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title="View PDF"
              style={{ ...actionBtnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                <path d="M6.5 2v7M3.5 6.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 11h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              View PDF
            </a>
          )}
        </>
      )}
    </div>
  );

  return (
    <article
      role="button"
      tabIndex={0}
      className={`library-card fade-in-up stagger-${stagger + 1}`}
      style={{
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? "var(--accent)" : "var(--border)",
        boxShadow: isSelected ? "0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)" : undefined,
      }}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${item.title}, ${item.subtitle}. Open ${item.kind === "analyzed" ? "analysis" : item.kind === "builder" ? "builder draft" : "resume"}.`}
    >
      <div className="library-card-preview">
        {thumbUrl ? <PdfCardThumbnail url={thumbUrl} /> : null}
        {item.kind === "builder" ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background:
                "radial-gradient(circle at top right, rgba(196,121,58,0.14), transparent 45%), linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)",
            }}
          >
            <Badge variant="secondary" style={kindBadgeBuilder}>Builder draft</Badge>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ height: 6, width: "70%", borderRadius: 99, background: "var(--border)" }} />
              <div style={{ height: 6, width: "88%", borderRadius: 99, background: "var(--border)" }} />
              <div style={{ height: 6, width: "52%", borderRadius: 99, background: "var(--border)" }} />
            </div>
            <Badge variant="outline" style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Editable layout
            </Badge>
          </div>
        ) : item.kind === "analyzed" ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background:
                "radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 16%, transparent), transparent 42%), linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <Badge variant="secondary" style={kindBadgeAnalyzed}>Analyzed</Badge>
              {scoreBadge}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ height: 6, width: "78%", borderRadius: 99, background: "var(--border)" }} />
              <div style={{ height: 6, width: "92%", borderRadius: 99, background: "var(--border)" }} />
              <div style={{ height: 6, width: "58%", borderRadius: 99, background: "var(--border)" }} />
            </div>
            <Badge variant="outline" style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Improvement plan saved
            </Badge>
          </div>
        ) : item.kind === "version" ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background:
                "radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 20%, transparent), transparent 46%), linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <Badge variant="secondary" style={kindBadgeTailored}>{item.isDefault ? "My résumé" : "Résumé"}</Badge>
              {scoreBadge}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ height: 6, width: "82%", borderRadius: 99, background: "var(--border)" }} />
              <div style={{ height: 6, width: "64%", borderRadius: 99, background: "var(--border)" }} />
              <div style={{ height: 6, width: "90%", borderRadius: 99, background: "var(--border)" }} />
            </div>
            <Badge variant="outline" style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Editable — no re-scan needed
            </Badge>
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: 12,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.4 }}>
              <path d="M7 3h8l4 4v14H7V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M14 3v4h4M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <Badge variant="secondary" style={kindBadgeTailored}>{item.isDefault ? "Default" : "Tailored"}</Badge>
            {displayPdf ? (
              <Badge
                variant="secondary"
                title={item.kind === "tailored" && item.record.pdf_url ? "Stored PDF link" : "API PDF path (not saved to library — open to verify)"}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-pill, 99px)",
                  background: "var(--accent-bg)",
                }}
              >
                PDF ready
              </Badge>
            ) : (
              <Badge variant="outline" style={{ fontSize: 10, fontWeight: 600, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                No PDF yet
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="library-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          {item.kind === "analyzed" ? (
            <Badge variant="secondary" style={kindBadgeAnalyzed}>Analyzed</Badge>
          ) : item.kind === "builder" ? (
            <Badge variant="secondary" style={kindBadgeBuilder}>Builder</Badge>
          ) : (
            scoreBadge
          )}
          <time dateTime={item.createdAt} style={{ fontSize: 11, color: "var(--dim)", whiteSpace: "nowrap", flexShrink: 0 }}>
            {dateStr}
          </time>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text)",
              lineHeight: 1.25,
              marginBottom: 4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.title}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted)",
              letterSpacing: "-0.02em",
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: item.kind === "analyzed" && issues.length ? 1 : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.subtitle}
          </p>
          {item.kind === "analyzed" && issues.length > 0 && (
            <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
              {issues.map((issue, i) => (
                <div key={`${issue}-${i}`} style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.35, display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--amber)", fontWeight: 800 }}>•</span>
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {actions("library-card-actions library-card-actions--static")}
      </div>

      {actions("library-card-actions library-card-actions--hover")}
    </article>
  );
}

const kindBadgeAnalyzed: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: "var(--radius-pill, 99px)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  background: "var(--accent-bg)",
  color: "var(--accent)",
};

const kindBadgeBuilder: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "4px 10px",
  borderRadius: "var(--radius-pill, 99px)",
  background: "var(--accent-bg)",
  color: "var(--accent)",
};

const kindBadgeTailored: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: "var(--radius-pill, 99px)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  background: "var(--amber-bg)",
  color: "var(--amber)",
};

const actionBtnPrimary: CSSProperties = {
  flex: "1 1 calc(50% - 4px)",
  minWidth: 92,
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 12px",
  borderRadius: "var(--radius, 8px)",
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "-0.02em",
};

const actionBtnGhost: CSSProperties = {
  flex: "1 1 calc(50% - 4px)",
  minWidth: 92,
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 12px",
  borderRadius: "var(--radius, 8px)",
  border: "1px solid var(--border)",
  background: "var(--surface2)",
  color: "var(--text)",
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "-0.02em",
};
