"use client";

/**
 * "My Résumés" workspace — a single page with two tabs: the version list
 * ("My Résumés") and an in-place Editor tab that opens when you pick a version.
 * Editing autosaves without a re-scan (VersionEditor → updateVersion). Wired to
 * lib/resumeVersions.ts via Supabase RLS; Scan/Tailor navigate ?version=<id>.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/utils";
import { normalizeStructuredResume, type StructuredResume } from "@/store/resumeAnalyzeStore";
import { RESUME_LIBRARY_CHANGED_EVENT } from "@/lib/resumeLibraryEvents";
import {
  listVersionGroups,
  duplicateVersion,
  setVersionAsMyResume,
  deleteVersion,
  createVersion,
  scoreVersionInPlace,
  type ResumeVersion,
  type ResumeVersionGroup,
} from "@/lib/resumeVersions";
import { stashVersionForTailor, VERSION_TAILOR_URL } from "@/lib/versionTailorPrefill";
import { stashVersionForBoost, BOOST_JOBS_URL } from "@/lib/versionBoostPrefill";
import { fetchLibraryItems, type LibraryItem } from "@/lib/supabase";
import { MyResumesView, NewVersionModal, type NewVersionChoice } from "./MyResumesView";
import { VersionEditor } from "./VersionEditor";

export default function MyResumes() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<ResumeVersionGroup[]>([]);
  const [legacyItems, setLegacyItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"list" | "editor">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const openedFromUrl = useRef(false);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    // Versions + legacy Library items in parallel; a failure in either leaves
    // the other intact (both default to []), so the page never hard-fails.
    const [groupsRes, legacyRes] = await Promise.allSettled([
      listVersionGroups(),
      fetchLibraryItems(),
    ]);
    if (groupsRes.status === "fulfilled") setGroups(groupsRes.value);
    else console.error("[versions] list", groupsRes.reason);
    if (legacyRes.status === "fulfilled") setLegacyItems(legacyRes.value);
    else console.error("[versions] library", legacyRes.reason);
    setLoading(false);
  }, []);

  // Route a legacy Library item to its existing surface (reuses ResumeLibrary's
  // open targets) — no new detail UI.
  const openLegacy = useCallback(
    (item: LibraryItem) => {
      if (item.kind === "analyzed") router.push(`/?view=analyze&analysis=${encodeURIComponent(item.id)}`);
      else if (item.kind === "builder") router.push(`/template-builder/?builder=${encodeURIComponent(item.id)}`);
      else if (item.kind === "cover_letter") router.push(`/?view=library&cl=${encodeURIComponent(item.id)}`);
      else router.push(`/?view=library&resume=${encodeURIComponent(item.record.folder)}`);
    },
    [router],
  );

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener(RESUME_LIBRARY_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(RESUME_LIBRARY_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const allVersions = useMemo(() => groups.flatMap((g) => g.versions), [groups]);
  const editing = useMemo(
    () => (editingId ? allVersions.find((v) => v.id === editingId) ?? null : null),
    [editingId, allVersions],
  );

  // deep-link: ?version=<id> opens that version in the Editor tab
  useEffect(() => {
    if (openedFromUrl.current || loading) return;
    const id = (searchParams?.get("version") ?? "").trim();
    if (!id) return;
    if (allVersions.some((v) => v.id === id)) {
      openedFromUrl.current = true;
      setEditingId(id);
      setTab("editor");
    }
  }, [searchParams, loading, allVersions]);

  const openEditor = useCallback((v: ResumeVersion) => {
    setEditingId(v.id);
    setTab("editor");
  }, []);

  const listHandlers = {
    onNewVersion: () => setModalOpen(true),
    onOpen: openEditor,
    onTailor: (v: ResumeVersion) => {
      if (stashVersionForTailor(v)) router.push(VERSION_TAILOR_URL);
      else flash("Add some résumé content before tailoring.");
    },
    onDuplicate: async (v: ResumeVersion) => {
      setBusyId(v.id);
      try {
        const made = await duplicateVersion(v);
        if (!made) flash("Sign in to save résumé versions.");
        else flash(`Duplicated as v${made.version}.`);
        await refresh();
      } catch (e) {
        console.error("[versions] duplicate", e);
        flash("Couldn't duplicate — try again.");
      } finally {
        setBusyId(null);
      }
    },
    onSetDefault: async (v: ResumeVersion) => {
      try {
        const promoted = await setVersionAsMyResume(v);
        flash(promoted ? "Now your résumé — Jobs ranks against this one." : "Set as default.");
        await refresh();
      } catch (e) {
        console.error("[versions] setDefault", e);
        flash("Couldn't set as your résumé — try again.");
      }
    },
    onDelete: async (v: ResumeVersion) => {
      try {
        await deleteVersion(v.id);
        if (editingId === v.id) { setTab("list"); setEditingId(null); }
        await refresh();
      } catch (e) {
        console.error("[versions] delete", e);
        flash("Couldn't delete — try again.");
      }
    },
  };

  const editorHandlers = {
    onSwitch: (v: ResumeVersion) => setEditingId(v.id),
    onNewVersion: () => setModalOpen(true),
    onScore: async (structured: StructuredResume) => {
      if (!editing) return { score: null as number | null };
      const r = await scoreVersionInPlace({ id: editing.id, name: editing.name, structured, extractedText: editing.extractedText });
      if (r.score != null) await refresh();
      return r;
    },
    onViewReport: (analysisId: string) => router.push(`/?view=analyze&analysis=${encodeURIComponent(analysisId)}`),
    onTailor: (v: ResumeVersion) => {
      if (stashVersionForTailor(v)) router.push(VERSION_TAILOR_URL);
      else flash("Add some résumé content before tailoring.");
    },
    onBoost: (v: ResumeVersion) => {
      if (stashVersionForBoost(v)) router.push(BOOST_JOBS_URL);
      else flash("Add some résumé content before boosting.");
    },
    onDuplicate: (v: ResumeVersion) => void listHandlers.onDuplicate(v),
  };

  const onChoose = useCallback(
    async (choice: NewVersionChoice) => {
      setModalOpen(false);
      if (choice === "import") { fileRef.current?.click(); return; }
      if (choice === "profile") { router.push("/profile"); return; }
      if (choice === "duplicate") {
        const head = groups[0]?.versions[0];
        if (!head) { flash("Nothing to duplicate yet — import a résumé first."); return; }
        void listHandlers.onDuplicate(head);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, router, flash],
  );

  const onFilePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setBusyId("import");
      flash("Reading your résumé…");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const resp = await fetch(apiUrl("/api/upload-resume"), { method: "POST", body: fd });
        if (!resp.ok) throw new Error(`upload ${resp.status}`);
        const json = await resp.json();
        const structured = normalizeStructuredResume(json.structuredResume as StructuredResume | null);
        if (!structured) throw new Error("no structured résumé in response");
        const name = structured.full_name?.trim() ? `${structured.full_name.trim()}'s résumé` : file.name.replace(/\.[^.]+$/, "");
        const made = await createVersion({
          name,
          structured,
          extractedText: typeof json.extractedText === "string" ? json.extractedText : null,
          origin: "upload",
        });
        if (!made) flash("Sign in to save résumé versions.");
        else { flash("Imported — opening the editor."); openEditor(made); }
        await refresh();
      } catch (err) {
        console.error("[versions] import", err);
        flash("Couldn't import that file — try a PDF or DOCX.");
      } finally {
        setBusyId(null);
      }
    },
    [flash, refresh, openEditor],
  );

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "50vh", color: "var(--muted)", fontSize: 14 }}>
        Loading your résumés…
      </div>
    );
  }

  return (
    <>
      {/* tab bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "10px 20px 0",
          borderBottom: "1px solid var(--border)",
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>My Résumés</TabButton>
        {editing ? (
          <TabButton active={tab === "editor"} onClick={() => setTab("editor")}>
            Editing: {editing.name}
            <span
              role="button"
              aria-label="Close editor tab"
              onClick={(e) => { e.stopPropagation(); setTab("list"); setEditingId(null); }}
              style={{ marginLeft: 8, color: "var(--dim)", fontSize: 14, lineHeight: 1 }}
            >
              ×
            </span>
          </TabButton>
        ) : null}
      </div>

      {tab === "editor" && editing ? (
        <VersionEditor version={editing} groups={groups} handlers={editorHandlers} />
      ) : (
        <MyResumesView
          groups={groups}
          handlers={listHandlers}
          busyId={busyId}
          legacyItems={legacyItems}
          onOpenLegacy={openLegacy}
        />
      )}

      <NewVersionModal open={modalOpen} onClose={() => setModalOpen(false)} onChoose={onChoose} canDuplicate={groups.length > 0} />
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={onFilePicked} style={{ display: "none" }} />
      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
            background: "var(--surface)", border: "1px solid var(--border-h)", color: "var(--text)",
            borderRadius: 10, padding: "10px 16px", fontSize: 13.5,
            boxShadow: "0 8px 24px rgba(1,4,9,0.35)", zIndex: 1300,
          }}
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 13.5,
        fontWeight: 560,
        color: active ? "var(--text)" : "var(--dim)",
        background: "none",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
        padding: "8px 14px",
        marginBottom: -1,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
