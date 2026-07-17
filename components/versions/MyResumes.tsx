"use client";

/**
 * "My Résumés" container — wires the presentational MyResumesView to
 * lib/resumeVersions.ts (Phase 1 of the résumé-versions plan). Client-direct
 * CRUD via Supabase RLS; no new API routes. The version-load into Analyze/Tailor
 * (?version=<id>) is consumed by the switcher slice that follows.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/utils";
import { normalizeStructuredResume, type StructuredResume } from "@/store/resumeAnalyzeStore";
import { RESUME_LIBRARY_CHANGED_EVENT } from "@/lib/resumeLibraryEvents";
import {
  listVersionGroups,
  duplicateVersion,
  setDefaultVersion,
  deleteVersion,
  createVersion,
  type ResumeVersion,
  type ResumeVersionGroup,
} from "@/lib/resumeVersions";
import { MyResumesView, NewVersionModal, type NewVersionChoice } from "./MyResumesView";

export default function MyResumes() {
  const router = useRouter();
  const [groups, setGroups] = useState<ResumeVersionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setGroups(await listVersionGroups());
    } catch (e) {
      console.error("[versions] list", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener(RESUME_LIBRARY_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(RESUME_LIBRARY_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const handlers = {
    onNewVersion: () => setModalOpen(true),
    onOpenAnalyze: (v: ResumeVersion) => router.push(`/?view=analyze&version=${encodeURIComponent(v.id)}`),
    onTailor: (v: ResumeVersion) => router.push(`/?view=builder&flow=tailor&version=${encodeURIComponent(v.id)}`),
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
        await setDefaultVersion(v.id);
        await refresh();
      } catch (e) {
        console.error("[versions] setDefault", e);
        flash("Couldn't set default — try again.");
      }
    },
    onDelete: async (v: ResumeVersion) => {
      try {
        await deleteVersion(v.id);
        await refresh();
      } catch (e) {
        console.error("[versions] delete", e);
        flash("Couldn't delete — try again.");
      }
    },
  };

  const onChoose = useCallback(
    async (choice: NewVersionChoice) => {
      setModalOpen(false);
      if (choice === "import") {
        fileRef.current?.click();
        return;
      }
      if (choice === "profile") {
        router.push("/profile");
        return;
      }
      if (choice === "duplicate") {
        const head = groups[0]?.versions[0];
        if (!head) {
          flash("Nothing to duplicate yet — import a résumé first.");
          return;
        }
        void handlers.onDuplicate(head);
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
        const name = structured.full_name?.trim()
          ? `${structured.full_name.trim()}'s résumé`
          : file.name.replace(/\.[^.]+$/, "");
        const made = await createVersion({
          name,
          structured,
          extractedText: typeof json.extractedText === "string" ? json.extractedText : null,
          origin: "upload",
        });
        if (!made) flash("Sign in to save résumé versions.");
        else flash("Imported as a new résumé.");
        await refresh();
      } catch (err) {
        console.error("[versions] import", err);
        flash("Couldn't import that file — try a PDF or DOCX.");
      } finally {
        setBusyId(null);
      }
    },
    [flash, refresh],
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
      <MyResumesView groups={groups} handlers={handlers} busyId={busyId} />
      <NewVersionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onChoose={onChoose}
        canDuplicate={groups.length > 0}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf"
        onChange={onFilePicked}
        style={{ display: "none" }}
      />
      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface)",
            border: "1px solid var(--border-h)",
            color: "var(--text)",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13.5,
            boxShadow: "0 8px 24px rgba(1,4,9,0.35)",
            zIndex: 1300,
          }}
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
