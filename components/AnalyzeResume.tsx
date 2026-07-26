"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent } from "react";
import { useSearchParams } from "next/navigation";
import ScoreRing from "./ScoreRing";
import BulletImprovedEditor from "./BulletImprovedEditor";
import {
  buildBulletPrimaryCategories,
  bulletBelongsToCategory,
  bulletMatchesAnalysisCategory,
  getRewriteForCategory,
  cleanAiArtifacts,
  inferPrimaryCategoryFromBullet,
  isLanguageQualityMicroRewrite,
  isTrivialRewrite,
  type CategoryAssignmentOptions,
} from "@/lib/analysisCategoryMatch";
import { patchAppliedEditsIntoResume } from "@/lib/analyzeRescore";
import { hiddenBulletTextsFromStructured } from "@/components/AnalyzeLiveResumeBody";
import { estimateScoreAfterFixes } from "@/lib/analyzeScoreEstimate";
import { resumeFileClientError } from "@/lib/utils";
import { apiErrorFromUnknown, toUserFriendlyErrorMessage, resumeGateErrorFromResponse } from "@/lib/userFriendlyError";
import { mergeAnalyzeApiJson } from "@/lib/mergeAnalyzeApiJson";
import { stripResumeBulletPrefix } from "@/lib/stripResumeBulletPrefix";
import { useResumeAnalyzeStore } from "@/store/resumeAnalyzeStore";
import { getSupabaseClient, fetchAnalysisById, insertAnalysis, createAnalysisVersion, deleteAnalysis } from "@/lib/supabase";
import { groupAnalysesByRoot } from "@/lib/analyzeVersions";
import type { AnalyzeRecord } from "@/lib/supabase";
import AnalyzePreviewPane from "@/components/AnalyzePreviewPane";
import {
  AnalyzeUploadLanding,
  AnalyzeCoachLoader,
} from "@/components/AnalyzeExperience";
import { useAppShellSidebar } from "@/contexts/AppShellSidebarContext";
import { stashAnonAnalysis, takeAnonAnalysisStash, markAnonScanUsed, hasUsedAnonScan, takeAnalyzeJd } from "@/lib/anonScan";
import { logClientEvent, stashPrewallEvent, flushPrewallEvents } from "@/lib/clientEvents";
import { upsertEditedVersion, syncVersionAfterRescore, findVersionBySourceRoot } from "@/lib/resumeVersions";
import { useSignInDialog } from "@/components/SignInDialog";
import { useUpgradeDialog } from "@/components/UpgradeDialog";
import { shouldShowJobActivation } from "@/components/JobSearchActivationWidget";
import type { AnalysisResult } from "./analyze/analyzeTypes";
import {
  SCORE_NEEDS_EXPLANATION, scoreColor, scoreLabel, severityColor, severityBg,
  CATEGORY_LABELS, flaggedBulletFixChip, CATEGORY_COACH, COACH_BODY_STYLE,
  CATEGORY_DESCRIPTIONS, issueCategoryOf, getBulletsForCategory,
  formatExperienceTenureChip,
} from "./analyze/analyzeViewHelpers";
import { lsSave, lsPush } from "./analyze/analyzeHistoryStore";
import { AnalyzeSidebarPinned, AnalyzeHistoryRail } from "./analyze/AnalyzeSidebar";
import SaveToProfilePrompt from "./analyze/SaveToProfilePrompt";
import AnalyzeImprovementPlan from "./analyze/AnalyzeImprovementPlan";
import { useAnalyzeSession } from "./analyze/useAnalyzeSession";
import { useAnalyzeLoaderProgress } from "./analyze/useAnalyzeLoaderProgress";
import { Tip } from "@/components/ui/tip";
import { apiFetch, refusalFrom } from "@/lib/apiClient";


// ── Main component ────────────────────────────────────────────────────────────

export default function AnalyzeResume() {
  const searchParams = useSearchParams();
  const appShellSidebar = useAppShellSidebar();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [result, setResult]             = useState<AnalysisResult | null>(null);
  const [jd, setJd]                     = useState("");
  // A job detail's "Upload your résumé" CTA stashes that role's JD here, so the
  // first anonymous scan matches the exact job. One-shot: consumed on mount.
  useEffect(() => {
    const jd0 = takeAnalyzeJd();
    if (jd0) setJd(jd0);
  }, []);
  // Loader step/tip progression while a scan runs (state + timers in the hook).
  const { loadingMsg, loadingTipIdx } = useAnalyzeLoaderProgress(loading, jd);
  const [expandedBullets, setExpandedBullets] = useState<Record<number, boolean>>({});
  const [historyOpen, setHistoryOpen]   = useState(false);
  // Mobile/tablet: the score + category header collapses to a slim bar by
  // default so the résumé preview isn't pushed off-screen. Tap to expand.
  const [mobileHeadExpanded, setMobileHeadExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  /** Accordion for category-detail flagged bullets (`bulletAnalysis` index, or null = all collapsed). */
  const [expandedFlaggedBulletIdx, setExpandedFlaggedBulletIdx] = useState<number | null>(null);
  /** When a category switch is triggered by clicking a bullet in the preview,
   *  remember which bullet to auto-expand so the [activeCategory] effect opens
   *  *that* card instead of defaulting to the first flagged one. */
  const pendingExpandIdxRef = useRef<number | null>(null);
  const restoredFromUrlRef = useRef(false);
  /** Desktop: recent-analyses / improvement-plan column — open by default; user can hide via toggle. */
  const [improvementPlanVisible, setImprovementPlanVisible] = useState(true);
  const [selectedBulletIndex, setSelectedBulletIndex] = useState<number | null>(null);
  /** Summary-card editor: draft text (null = not editing), and whether the textarea is open. */
  const [summaryDraft, setSummaryDraft] = useState<string | null>(null);
  const [summaryCopied, setSummaryCopied] = useState(false);
  /** User picked a row from Recent Analyses — original upload file is not available until they upload again. */
  const [historyRestoreActive, setHistoryRestoreActive] = useState(false);
  /** Keys local preview-edit drafts (`rn_az_edit_v1_*` in localStorage); set to history row id or optimistic `local_*` id. */
  const [activeEditDraftId, setActiveEditDraftId] = useState<string | null>(null);
  const [editDraftStatus, setEditDraftStatus] = useState<string | null>(null);
  /** The editable version mirroring the active analyses lineage (re-entry chip). */
  const [hasEditedVersion, setHasEditedVersion] = useState(false);
  // Edit-at-score funnel (M2): dedupe report_view/delta_view per draft; detect
  // edit_bounce (clicked Edit, changed nothing, left).
  const editClickedRef = useRef(false);
  const versionSavedRef = useRef(false);
  const reportViewLoggedForRef = useRef<string | null>(null);
  const deltaLoggedForRef = useRef<string | null>(null);
  const [aiRewritingIdx, setAiRewritingIdx] = useState<number | null>(null);
  // Session + history bootstrap (user identity, analyze history, scan quota) —
  // state + mount effect live in the hook; scan/restore/delete/save-version
  // flows below mutate via the returned setters.
  const {
    userId, userEmail, isAnon, azHistory, setAzHistory,
    loadingHistory, scansRemaining, setScansRemaining,
  } = useAnalyzeSession();
  const { openSignIn } = useSignInDialog();
  const { openUpgrade } = useUpgradeDialog();
  /** Show job activation widget in sidebar after a successful scan. */
  const [showJobActivation, setShowJobActivation] = useState(false);
  const rewriteEdits = useResumeAnalyzeStore((s) => s.rewriteEdits);
  const patchRewrite = useResumeAnalyzeStore((s) => s.patchRewrite);
  const previewLineOverrides = useResumeAnalyzeStore((s) => s.lineOverrides);
  // Bullets whose fix has been applied to the preview count as resolved for
  // the sidebar badges / need-work counts.
  const resolvedBulletIndices = useMemo(
    () => new Set(Object.keys(previewLineOverrides).map(Number)),
    [previewLineOverrides],
  );
  const persistEdits = useResumeAnalyzeStore((s) => s.persistEdits);
  const restoreEdits = useResumeAnalyzeStore((s) => s.restoreEdits);
  const clearEditsStore = useResumeAnalyzeStore((s) => s.clearEdits);
  const migrateEdits = useResumeAnalyzeStore((s) => s.migrateEdits);
  const summaryOverride = useResumeAnalyzeStore((s) => s.summaryOverride);
  const setSummaryOverride = useResumeAnalyzeStore((s) => s.setSummaryOverride);
  const clearSummaryOverride = useResumeAnalyzeStore((s) => s.clearSummaryOverride);

  const analyzePreviewSnapshot = useMemo(
    () =>
      result
        ? {
            extractedText: result.extractedText ?? null,
            resumeHeader: Array.isArray(result.resumeHeader) ? result.resumeHeader : null,
            bulletAnalysis: Array.isArray(result.bulletAnalysis) ? result.bulletAnalysis : null,
          }
        : null,
    [result],
  );

  // Anonymous flow: keep the finished scan in localStorage at all times so the
  // OAuth redirect (full page unload) can't lose it. One stash, overwritten on
  // each new anonymous result.
  useEffect(() => {
    if (!isAnon || !result) return;
    // First free scan is now fully unlocked; record that it was used so the
    // next scan attempt asks the visitor to sign in.
    markAnonScanUsed();
    const label =
      result.resumeHeader?.[0]?.trim() ||
      result.structuredResume?.full_name?.trim() ||
      "Resume";
    stashAnonAnalysis(label, result);
  }, [isAnon, result]);

  useLayoutEffect(() => {
    if (!result) {
      useResumeAnalyzeStore.getState().reset();
      return;
    }
    useResumeAnalyzeStore.getState().hydrateFromAnalysis({
      extractedText: result.extractedText,
      bulletAnalysis: result.bulletAnalysis,
      resumeHeader: result.resumeHeader,
      structuredResume: result.structuredResume,
      bulletMap: result.bulletMap,
    });
  }, [result]);

  /** Re-apply browser-stored preview edits after hydrate. */
  useEffect(() => {
    if (!result || !activeEditDraftId) return;
    const restored = restoreEdits(activeEditDraftId);
    if (restored) setEditDraftStatus("Loaded saved preview edits from this browser.");
  }, [result, activeEditDraftId, restoreEdits]);

  useEffect(() => {
    if (!editDraftStatus) return;
    const t = window.setTimeout(() => setEditDraftStatus(null), 4500);
    return () => clearTimeout(t);
  }, [editDraftStatus]);

  useEffect(() => {
    if (!feedbackToast) return;
    const t = window.setTimeout(() => setFeedbackToast(null), 5200);
    return () => clearTimeout(t);
  }, [feedbackToast]);

  // Persist result to Supabase + localStorage
  const persistResult = useCallback(async (label: string, res: AnalysisResult, forcedDraftId?: string) => {
    const optimistic: AnalyzeRecord = {
      id:        forcedDraftId ?? `local_${Date.now()}`,
      label,
      score:     res.overallScore,
      createdAt: new Date().toISOString(),
      // Lineage carried from a persisted rescore (a verified child version);
      // absent for a fresh analysis, which groups as its own root v1.
      parentId:  res.analysisParentId ?? null,
      version:   res.analysisVersion,
      rootId:    res.analysisRootId ?? null,
      scoreSource: res.analysisScoreSource ?? null,
      result:    res,
    };
    // Optimistic update — show instantly
    setAzHistory(prev => [optimistic, ...prev].slice(0, 20));
    if (userId) lsPush(userId, optimistic);

    try {
      const backendPersisted = res.analysisPersisted === true;
      const backendId = backendPersisted ? (res.analysisId ?? null) : null;
      const sourcePdfUrl = res.sourcePdfUrl ?? null;
      const sourceFilename = res.sourceFilename ?? null;
      const newId = backendId ?? await insertAnalysis(label, res, {
        sourcePdfUrl,
        sourceFilename,
      });
      if (newId) {
        migrateEdits(optimistic.id, newId);
        setActiveEditDraftId((cur) => (cur === optimistic.id ? newId : cur));
        // Replace optimistic row with real DB id
        setAzHistory(prev => prev.map(r => r.id === optimistic.id ? { ...r, id: newId } : r));
        if (userId) lsSave(userId, azHistory.map(r => r.id === optimistic.id ? { ...r, id: newId } : r));
      }
    } catch { /* DB save failed — localStorage copy is still intact */ }
  }, [userId, azHistory]);

  // ── Update score: re-run the analysis with applied fixes baked in ──────────
  // Patches the applied bullet rewrites + summary override into the extracted
  // text AND the structured résumé, re-runs the comprehensive analysis, and
  // persists the result as a NEW analysis row. That row becomes the latest, so
  // the Jobs feed / Boost immediately rank against the fixed résumé, and
  // reopening from the Resume Hub restores the fixed version with fresh scores.
  const [rescoring, setRescoring] = useState(false);
  const handleRescore = useCallback(async () => {
    if (rescoring) return;
    const st = useResumeAnalyzeStore.getState();
    // The analysis being rescored is the current head; chain the verified
    // re-score as its child version (skip a not-yet-persisted local draft).
    const parentAnalysisId = activeEditDraftId && !activeEditDraftId.startsWith("local_")
      ? activeEditDraftId
      : undefined;
    const patch = patchAppliedEditsIntoResume({
      extractedText: st.extractedText,
      structuredResume: st.structuredResume,
      analysisBullets: st.analysisBullets,
      lineOverrides: st.lineOverrides,
      summaryOverride: st.summaryOverride,
      hiddenBulletTexts: hiddenBulletTextsFromStructured(st.structuredResume, st.hiddenPaths),
    });
    if (patch.appliedCount === 0) {
      setFeedbackToast("Apply at least one fix to the preview first, then update the score.");
      return;
    }
    setRescoring(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setFeedbackToast("Sign in to update your score — the rescored report is saved to your history.");
        return;
      }
      const resp = await apiFetch("/api/analyze-rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: patch.patchedText,
          structured_resume: patch.patchedStructured ?? undefined,
          parent_analysis_id: parentAnalysisId,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        const refusal = refusalFrom(resp.status, json);
        if (refusal?.remedy === "sign_in") {
          setFeedbackToast("Sign in to update your score. The rescored report is saved to your history.");
          openSignIn({ reason: "Sign in to rescore and keep your report history." });
          return;
        }
        if (refusal) {
          setFeedbackToast("Daily scan limit reached. Updating the score counts as a scan, so try again tomorrow.");
          openUpgrade(json);
          return;
        }
        throw new Error(json?.error || "Rescore failed");
      }
      const res = mergeAnalyzeApiJson(json as Record<string, unknown>) as unknown as AnalysisResult;
      const resWithMeta: AnalysisResult = { ...res, libraryFolder: null };
      const draftId = `local_${Date.now()}`;
      setExpandedBullets({});
      setSelectedBulletIndex(null);
      setHistoryRestoreActive(false);
      setActiveEditDraftId(draftId);
      setResult(resWithMeta);
      if (res.scanLimitStatus) setScansRemaining(res.scanLimitStatus.remaining);
      setFeedbackToast("Score updated — your fixes are saved and future job matching uses the fixed résumé.");
      const candidateName = res.resumeHeader?.[0]?.trim() || res.structuredResume?.full_name?.trim();
      void persistResult(candidateName || "Updated résumé", resWithMeta, draftId);
      // Reconciliation rule (M2): the verified score also lands on the linked
      // editable version, so it never holds a stale estimate or stale text.
      const parentRec = parentAnalysisId ? azHistory.find((r) => r.id === parentAnalysisId) : undefined;
      const rescoreSourceRoot =
        (res as { analysisRootId?: string | null }).analysisRootId ?? parentRec?.rootId ?? parentAnalysisId ?? null;
      if (rescoreSourceRoot) {
        void syncVersionAfterRescore({
          sourceRootId: rescoreSourceRoot,
          score: typeof res.overallScore === "number" ? res.overallScore : null,
          structured: patch.patchedStructured ?? undefined,
          extractedText: patch.patchedText,
        });
      }
    } catch (e: unknown) {
      setError(toUserFriendlyErrorMessage(e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setRescoring(false);
    }
  }, [rescoring, persistResult, activeEditDraftId, azHistory]);

  // After sign-in lands (fresh mount post-OAuth), restore the stashed anonymous
  // scan: the user arrives on their already-finished, now-unlocked report and
  // it persists to their history like any signed-in scan.
  useEffect(() => {
    if (!userId) return;
    const stash = takeAnonAnalysisStash();
    if (!stash) return;
    const res = mergeAnalyzeApiJson(stash.result) as unknown as AnalysisResult;
    if (typeof res?.overallScore !== "number") return;
    const resWithMeta: AnalysisResult = { ...res, libraryFolder: null };
    const draftId = `local_${Date.now()}`;
    setActiveEditDraftId(draftId);
    setResult(resWithMeta);
    setFeedbackToast("Report unlocked — saved to your history.");
    void persistResult(stash.label, resWithMeta, draftId);
    // persistResult is intentionally omitted: this must run exactly once when
    // the session lands, and the stash read is one-shot either way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Pre-wall funnel events (a signed-out edit_click) flush once a session
  // exists; a stashed edit_click also resumes the edit intent on the restored
  // report so the user lands back "in the editor" after sign-in.
  const resumeEditIntentRef = useRef(false);
  useEffect(() => {
    if (!userId) return;
    void flushPrewallEvents().then((events) => {
      if (events.some((e) => e.event === "edit_click")) resumeEditIntentRef.current = true;
    });
  }, [userId]);

  // report_view — the click-through denominator. Signed-in views only (RLS);
  // logged once per persisted analysis.
  useEffect(() => {
    if (!result || !userId || !activeEditDraftId) return;
    if (activeEditDraftId.startsWith("local_")) return;
    if (reportViewLoggedForRef.current === activeEditDraftId) return;
    reportViewLoggedForRef.current = activeEditDraftId;
    void logClientEvent("report_view", { analysis_id: activeEditDraftId });
  }, [result, userId, activeEditDraftId]);

  // Re-entry: does the active analyses lineage already have an edited version?
  useEffect(() => {
    let cancelled = false;
    setHasEditedVersion(false);
    if (!userId || !result || !activeEditDraftId || activeEditDraftId.startsWith("local_")) return;
    const rec = azHistory.find((r) => r.id === activeEditDraftId);
    const sourceRootId = rec?.rootId ?? rec?.id ?? activeEditDraftId;
    void findVersionBySourceRoot(sourceRootId).then((v) => {
      if (!cancelled && v) setHasEditedVersion(true);
    });
    return () => { cancelled = true; };
  }, [userId, result, activeEditDraftId, azHistory]);

  const run = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    appShellSidebar?.collapseSidebar();

    setExpandedBullets({});
    setActiveCategory(null);
    setSelectedBulletIndex(null);
    setHistoryRestoreActive(false);
    const fd = new FormData();
    fd.append("file", file);
    if (jd.trim()) fd.append("jd", jd);
    if (userId)    fd.append("user_id", userId);
    if (userEmail) fd.append("user_email", userEmail);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        fd.set("user_id", session.user.id);
        if (session.user.email) fd.set("user_email", session.user.email);
      }
      const resp = await apiFetch("/api/analyze-upload", { method: "POST", body: fd });
      const json = await resp.json();
      if (!resp.ok) {
        // Branch on the refusal's `remedy`, not on its wording: what the user
        // has to do next is the backend's call, and matching prose meant a copy
        // edit could quietly start pitching Pro to someone who only needed to
        // sign in.
        const refusal = refusalFrom(resp.status, json);
        if (refusal) {
          if (refusal.remedy === "sign_in") {
            setFeedbackToast("Free scans used for today. Sign in (it's free) for 3 scans a day and saved reports.");
            openSignIn({ reason: "Sign in free for more résumé scans and saved reports." });
          } else {
            const freeLimit = refusal.limit && refusal.limit > 0 ? refusal.limit : 3;
            setFeedbackToast(`Daily limit reached. The free plan includes ${freeLimit} scans a day.`);
            openUpgrade(json);
          }
          return;
        }
        // Content gate (422): not a résumé we can analyze — show a calm,
        // instructive banner instead of the generic "analysis failed" error.
        const gateErr = resumeGateErrorFromResponse(resp.status, json);
        if (gateErr) { setError(gateErr); return; }
        throw new Error(json.error || "Analysis failed");
      }
      const res = mergeAnalyzeApiJson(json as Record<string, unknown>) as unknown as AnalysisResult;
      const resWithMeta: AnalysisResult = { ...res, libraryFolder: null };
      const draftId = `local_${Date.now()}`;
      setActiveEditDraftId(draftId);
      setResult(resWithMeta);
      if (!isAnon && shouldShowJobActivation()) setShowJobActivation(true);
      if (res.scanLimitStatus) setScansRemaining(res.scanLimitStatus.remaining);
      // Non-blocking nudges from the content gate (e.g. missing contact info)
      // take precedence over the scan-count toast — they're actionable.
      const inputWarnings: string[] = Array.isArray((json as Record<string, unknown>)?.inputWarnings)
        ? ((json as Record<string, unknown>).inputWarnings as string[])
        : [];
      if (inputWarnings.length > 0) {
        setFeedbackToast(`Analyzed — heads-up: we couldn't find ${inputWarnings.join(", ")} on your résumé.`);
      } else if (res.scanLimitStatus) {
        const { remaining, limit } = res.scanLimitStatus;
        setFeedbackToast(
          remaining === 0
            ? `0 of ${limit} free scans remaining today · Resets at midnight UTC`
            : `${remaining} of ${limit} free scan${limit !== 1 ? "s" : ""} remaining today`,
        );
      }
      const candidateName = res.resumeHeader?.[0]?.trim() || res.structuredResume?.full_name?.trim();
      const label = candidateName || file.name.replace(/\.(pdf|docx)$/i, "");
      persistResult(label, resWithMeta, draftId);
    } catch (e: unknown) {
      setError(toUserFriendlyErrorMessage(e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [jd, persistResult, appShellSidebar]);

  const runFolder = useCallback(async (folder: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    appShellSidebar?.collapseSidebar();

    setExpandedBullets({});
    setActiveCategory(null);
    setSelectedBulletIndex(null);
    setHistoryRestoreActive(false);
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const resp = await apiFetch(`/api/analyze-folder/${encodeURIComponent(folder)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id ?? "", jd }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Analysis failed");
      const res = mergeAnalyzeApiJson(json as Record<string, unknown>) as unknown as AnalysisResult;
      const resWithMeta: AnalysisResult = { ...res, libraryFolder: folder };
      const draftId = `local_${Date.now()}`;
      setActiveEditDraftId(draftId);
      setResult(resWithMeta);
      persistResult(folder, resWithMeta, draftId);
    } catch (e: unknown) {
      setError(toUserFriendlyErrorMessage(e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [jd, persistResult, appShellSidebar]);

  // Restore a cached result — lazy-fetches the full result blob if not already loaded
  const restoreRecord = useCallback(async (rec: AnalyzeRecord) => {
    setActiveEditDraftId(rec.id);
    setHistoryOpen(false);
    setExpandedBullets({});
    setActiveCategory(null);
    setSelectedBulletIndex(null);
    setHistoryRestoreActive(true);
    setImprovementPlanVisible(true);

    let fullRec = rec;
    if (!rec.result && !rec.id.startsWith("local_")) {
      setLoading(true);
      try {
        fullRec = (await fetchAnalysisById(rec.id)) ?? rec;
        // Cache the result back into azHistory so subsequent clicks are instant
        setAzHistory(prev => prev.map(r => r.id === rec.id ? { ...r, result: fullRec.result } : r));
      } catch {
        // fall through — will show empty result
      } finally {
        setLoading(false);
      }
    }

    if (fullRec.result) {
      const merged = mergeAnalyzeApiJson(fullRec.result as Record<string, unknown>) as unknown as AnalysisResult;
      setResult(merged);
    }
  }, []);

  useEffect(() => {
    if (restoredFromUrlRef.current || loadingHistory) return;
    const id = (searchParams?.get("analysis") ?? "").trim();
    if (!id) return;
    const rec = azHistory.find((row) => row.id === id);
    if (!rec) return;
    restoredFromUrlRef.current = true;
    restoreRecord(rec);
  }, [azHistory, loadingHistory, restoreRecord, searchParams]);

  const deleteRecord = useCallback(async (id: string) => {
    // Optimistic remove
    const next = azHistory.filter(r => r.id !== id);
    setAzHistory(next);
    if (userId) lsSave(userId, next);
    // Skip DB delete for optimistic local-only rows
    if (!id.startsWith("local_")) {
      try { await deleteAnalysis(id); } catch { /* ignore */ }
    }
  }, [userId, azHistory]);

  // Collapse very long version chains in the history rail (per-root toggle).
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const azHistoryRows = useMemo(
    () => {
      const historyRow = (
        rec: AnalyzeRecord,
        opts?: { versionBadge?: string; isHead?: boolean },
      ) => (
        <div
          key={rec.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 10px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            transition: "background var(--transition), border-color var(--transition)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "var(--amber-bg)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(196,121,58,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          }}
        >
          <button
            type="button"
            onClick={() => restoreRecord(rec)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              padding: 0,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: "var(--surface2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: scoreColor(rec.score),
              }}
            >
              {rec.score}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {opts?.versionBadge ? (
                  <>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: opts.isHead ? "var(--amber)" : "var(--muted)",
                        background: opts.isHead ? "var(--amber-bg)" : "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        padding: "1px 6px",
                        flexShrink: 0,
                      }}
                    >
                      {opts.versionBadge}
                    </span>
                    {opts.isHead && (
                      <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 500 }}>current</span>
                    )}
                    {rec.scoreSource === "estimate" && (
                      <span
                        title="Estimated score from applied edits (not a fresh LLM re-score)"
                        style={{ fontSize: 10, color: "var(--dim)", fontWeight: 500, fontStyle: "italic" }}
                      >
                        est
                      </span>
                    )}
                  </>
                ) : (
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {rec.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>
                {new Date(rec.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
            </div>
          </button>
          <Tip label="Remove analysis"><button
            type="button"
            onClick={() => deleteRecord(rec.id)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              flexShrink: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--dim)",
              transition: "background var(--transition), color var(--transition)",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(248,113,113,0.15)";
              e.currentTarget.style.color = "var(--red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--dim)";
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button></Tip>
        </div>
      );

      // A résumé with a single version renders exactly as before; multiple
      // versions collapse into a labelled lineage chain (newest = "current").
      return groupAnalysesByRoot(azHistory).map((g) => {
        if (g.recs.length <= 1) return historyRow(g.recs[0]);
        // Collapse long chains so one heavily-versioned résumé can't flood the
        // narrow history rail; the head + a few recent versions stay visible.
        const COLLAPSE_AT = 4;
        const isExpanded = expandedGroups.has(g.root);
        const shown =
          g.recs.length > COLLAPSE_AT && !isExpanded ? g.recs.slice(0, COLLAPSE_AT) : g.recs;
        const hiddenCount = g.recs.length - shown.length;
        return (
          <div key={g.root} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "1px 4px 3px",
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {g.recs[0].label}
              </span>
              <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 600, flexShrink: 0 }}>
                {g.recs.length} versions
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                paddingLeft: 8,
                marginLeft: 4,
                borderLeft: "2px solid rgba(196,121,58,0.35)",
              }}
            >
              {shown.map((rec, i) =>
                historyRow(rec, { versionBadge: `v${rec.version ?? 1}`, isHead: i === 0 }),
              )}
              {g.recs.length > COLLAPSE_AT && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.root)) next.delete(g.root);
                      else next.add(g.root);
                      return next;
                    })
                  }
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 2,
                    padding: "2px 6px",
                    background: "none",
                    border: "none",
                    color: "var(--dim)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {isExpanded ? "Show fewer" : `+${hiddenCount} older`}
                </button>
              )}
            </div>
          </div>
        );
      });
    },
    [azHistory, restoreRecord, deleteRecord, expandedGroups],
  );

  const categoryAssignmentOpts = useMemo((): CategoryAssignmentOptions => {
    if (!result) return {};
    const kw = [
      ...(result.keywordAnalysis?.matchedKeywords ?? []),
      ...(result.keywordAnalysis?.missingKeywords ?? []),
    ]
      .map((k) => k.trim())
      .filter((k) => k.length >= 2);
    return { jdKeywords: kw };
  }, [result]);

  // Instant deterministic score estimate as fixes are applied — the real,
  // persisted number still comes from the "Update score" LLM pass.
  const scoreEstimate = useMemo(
    () =>
      result
        ? estimateScoreAfterFixes({
            overallScore: result.overallScore,
            categoryScores: result.categoryScores,
            bullets: result.bulletAnalysis ?? [],
            lineOverrides: previewLineOverrides,
            categoryAssignmentOpts,
          })
        : null,
    [result, previewLineOverrides, categoryAssignmentOpts],
  );

  // ── Edit at the moment of score (M2) ───────────────────────────────────────
  // The edit affordances (inline preview edits + fix cards) predate this button;
  // it exists to make them DISCOVERABLE right where the score is judged, and to
  // instrument the funnel. Signed-out clicks stash intent and hit the wall.
  const startEditFlow = useCallback(() => {
    if (!result) return;
    if (!userId) {
      stashPrewallEvent("edit_click", {});
      openSignIn({ reason: "Sign in free to edit your résumé here and watch your score improve." });
      return;
    }
    editClickedRef.current = true;
    void logClientEvent("edit_click", { analysis_id: activeEditDraftId });
    setImprovementPlanVisible(true);
    if ((result.bulletAnalysis?.length ?? 0) > 0) setSelectedBulletIndex(0);
    setFeedbackToast(
      "Click any line in your résumé preview to edit it — the score estimate updates as you fix things, and Save keeps the edits in your history.",
    );
  }, [result, userId, activeEditDraftId, openSignIn]);

  // A stashed pre-wall edit_click resumes automatically once the restored
  // report is on screen post-sign-in.
  useEffect(() => {
    if (!resumeEditIntentRef.current || !result || !userId) return;
    resumeEditIntentRef.current = false;
    startEditFlow();
  }, [result, userId, startEditFlow]);

  // delta_view — the first time a draft shows a projected score movement.
  useEffect(() => {
    if (!result || !userId || !activeEditDraftId) return;
    if (!scoreEstimate || scoreEstimate.resolvedCount === 0) return;
    if (deltaLoggedForRef.current === activeEditDraftId) return;
    deltaLoggedForRef.current = activeEditDraftId;
    void logClientEvent("delta_view", {
      analysis_id: activeEditDraftId,
      current: scoreEstimate.current,
      projected: scoreEstimate.projected,
    });
  }, [result, userId, activeEditDraftId, scoreEstimate]);

  // edit_bounce — entered edit mode, changed nothing, left (report/draft
  // switched away or unmounted). Distinguishes "wrong editor" from "no demand".
  useEffect(() => {
    if (!activeEditDraftId) return;
    const draftAtMount = activeEditDraftId;
    return () => {
      if (!editClickedRef.current || versionSavedRef.current) return;
      const st = useResumeAnalyzeStore.getState();
      const touched =
        Object.keys(st.lineOverrides).length > 0 || (st.summaryOverride ?? "").trim().length > 0;
      if (!touched) void logClientEvent("edit_bounce", { analysis_id: draftAtMount });
      editClickedRef.current = false;
      versionSavedRef.current = false;
    };
  }, [activeEditDraftId]);

  const bulletPrimaryCategories = useMemo(
    () => (result?.bulletAnalysis?.length
      ? buildBulletPrimaryCategories(result.bulletAnalysis, categoryAssignmentOpts)
      : []),
    [result, categoryAssignmentOpts],
  );

  const handleBulletLinkedSelect = useCallback(
    (index: number) => {
      useResumeAnalyzeStore.getState().pulseBullet(index);
      setSelectedBulletIndex(index);
      const b = result?.bulletAnalysis[index];
      if (!b) return;
      if (
        activeCategory
        && result
        && bulletMatchesAnalysisCategory(b, activeCategory, result.bulletAnalysis, index, categoryAssignmentOpts)
      ) {
        return;
      }
      setActiveCategory(
        inferPrimaryCategoryFromBullet(
          b,
          result?.bulletAnalysis,
          index,
          categoryAssignmentOpts,
        ) as keyof AnalysisResult["categoryScores"],
      );
    },
    [result, activeCategory, categoryAssignmentOpts],
  );

  // Clicking a bullet in the résumé preview should open that bullet's
  // suggestion card on the left. If the bullet belongs to a different
  // category than the one currently shown, switch to its primary category
  // first (the [activeCategory] effect then expands the pending bullet).
  const handleBulletSelectFromPreview = useCallback(
    (index: number) => {
      handleBulletLinkedSelect(index);
      // bulletPrimaryCategories is the authoritative per-bullet assignment
      // (same string[] that builds the rendered flagged list).
      const primaryCat = bulletPrimaryCategories[index];
      if (primaryCat && primaryCat !== activeCategory) {
        // Defer expansion to the [activeCategory] effect via the ref.
        pendingExpandIdxRef.current = index;
        setActiveCategory(primaryCat as keyof AnalysisResult["categoryScores"]);
      } else {
        // Same category already active (or none) — expand directly.
        setExpandedFlaggedBulletIdx(index);
      }
    },
    [handleBulletLinkedSelect, bulletPrimaryCategories, activeCategory],
  );

  const bulletBlurClearRef = useRef<number | null>(null);
  const cancelBulletSelectionClear = useCallback(() => {
    if (bulletBlurClearRef.current !== null) {
      clearTimeout(bulletBlurClearRef.current);
      bulletBlurClearRef.current = null;
    }
  }, []);
  const scheduleBulletSelectionClear = useCallback(() => {
    cancelBulletSelectionClear();
    bulletBlurClearRef.current = window.setTimeout(() => {
      bulletBlurClearRef.current = null;
      setSelectedBulletIndex(null);
    }, 220);
  }, [cancelBulletSelectionClear]);

  const onBulletWorkspaceTextareaFocus = useCallback(
    (index: number) => {
      cancelBulletSelectionClear();
      handleBulletLinkedSelect(index);
    },
    [cancelBulletSelectionClear, handleBulletLinkedSelect],
  );

  const onBulletWorkspaceTextareaBlur = useCallback(
    (index: number, e: FocusEvent<HTMLTextAreaElement>) => {
      const rt = e.relatedTarget as Node | null;
      const host = e.currentTarget.closest(`[data-az-bullet-workspace="${index}"]`);
      if (rt && host?.contains(rt)) return;
      scheduleBulletSelectionClear();
    },
    [scheduleBulletSelectionClear],
  );

  useEffect(
    () => () => {
      if (bulletBlurClearRef.current !== null) clearTimeout(bulletBlurClearRef.current);
    },
    [],
  );

  useEffect(() => {
    // Auto-open a flagged bullet card when a category is selected so users
    // immediately see the suggestion without having to click.
    if (!result?.bulletAnalysis) { setExpandedFlaggedBulletIdx(null); return; }
    if (activeCategory) {
      // If this category switch was triggered by clicking a bullet in the
      // preview, open *that* bullet's card. Otherwise default to the first
      // flagged bullet in the category.
      const pending = pendingExpandIdxRef.current;
      pendingExpandIdxRef.current = null;
      if (pending !== null) {
        setExpandedFlaggedBulletIdx(pending);
        return;
      }
      // Use the same per-bullet primary-category assignment that builds the
      // rendered flagged list, so "first flagged" matches what the user sees.
      const firstFlaggedIdx = result.bulletAnalysis.findIndex((b, i) =>
        bulletBelongsToCategory(b, activeCategory, result.bulletAnalysis, i, categoryAssignmentOpts),
      );
      setExpandedFlaggedBulletIdx(firstFlaggedIdx >= 0 ? firstFlaggedIdx : null);
    } else {
      setExpandedFlaggedBulletIdx(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  const onFile = (f: File | null | undefined) => {
    const fileErr = resumeFileClientError(f);
    if (fileErr) { setError(fileErr); return; }
    // First scan free; a second scan for a signed-out visitor asks them to sign in.
    if (isAnon && hasUsedAnonScan()) {
      openSignIn({
        title: "That was your free scan",
        reason: "Sign in free to run more scans, save your reports, and unlock every feature — your first report stays right here.",
      });
      return;
    }
    run(f as File);
  };

  // Sort issues high → medium → low
  const sortedIssues = result?.topIssues
    ? [...result.topIssues].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
      })
    : [];

  // Split categories into TOP FIXES (score < 70 AND has actionable content)
  // vs COMPLETED (score >= 70 OR low score but nothing actionable). A
  // category lacking any flagged bullets AND any related topIssue has no
  // real fix to surface — putting it in TOP FIXES leads to the dead-end
  // "No specific issues found" detail view the user shouldn't have to
  // click through. Honesty alignment with the rewrite-validator: if the
  // category has nothing to do, don't list it as a fix.
  /** Rule-based topIssues are regex-fallback only; hide on LLM runs (incl. saved history). */
  const isLlmTopIssue = (issue: AnalysisResult["topIssues"][number]) =>
    issue.source !== "deterministic";

  const categoryHasActionableContent = (key: string): boolean => {
    if (!result) return false;
    const bullets = getBulletsForCategory(
      key,
      result.bulletAnalysis,
      categoryAssignmentOpts,
    );
    if (bullets.length > 0) return true;
    const related = result.topIssues.filter(
      (issue) => isLlmTopIssue(issue) && issueCategoryOf(issue) === key,
    );
    return related.length > 0;
  };

  const topFixCategories = result
    ? CATEGORY_LABELS
        .filter(({ key }) => {
          const s = result.categoryScores[key];
          if (s === null || s === undefined) return false;
          if (s >= 70) return false;
          return categoryHasActionableContent(key);
        })
        .sort((a, b) => (result.categoryScores[a.key] ?? 100) - (result.categoryScores[b.key] ?? 100))
    : [];

  const completedCategories = result
    ? CATEGORY_LABELS.filter(({ key }) => {
        const s = result.categoryScores[key];
        if (s === null || s === undefined) return false;
        // Score >= 70 OR low-score-with-no-actionable-content (the latter
        // would otherwise be a flagged category the user can't act on).
        return s >= 70 || !categoryHasActionableContent(key);
      })
    : [];

  /** Résumé on the right, suggestions on the left (desktop/tablet split). */
  /** Résumé preview stays on whenever we have a result (no user toggle). */
  const workspaceSplit = !!result;

  // Professional-summary fix — surfaced as its own sidebar entry (visible on any
  // tab) + an amber highlight on the summary in the preview. "summary" is a
  // pseudo-category for activeCategory (not a real categoryScores key).
  const summaryAnalysis = result?.summaryAnalysis ?? null;
  const summaryIssueCount = summaryAnalysis?.issues?.length ?? 0;
  const summaryFlagged = !!summaryAnalysis && (summaryIssueCount > 0 || !!summaryAnalysis.improvedSummary);
  const summaryHint = summaryFlagged && summaryAnalysis
    ? `${summaryAnalysis.wordCount} words · ${summaryIssueCount} issue${summaryIssueCount === 1 ? "" : "s"} — click to fix`
    : undefined;

  // For the active category detail view
  const activeCategoryLabel =
    activeCategory === "summary"
      ? "Summary"
      : CATEGORY_LABELS.find(c => c.key === activeCategory)?.label ?? "";
  const activeCategoryScore = activeCategory && result ? result.categoryScores[activeCategory as keyof AnalysisResult["categoryScores"]] : null;
  const activeBullets = activeCategory && result
    ? getBulletsForCategory(activeCategory, result.bulletAnalysis, categoryAssignmentOpts)
    : [];
  const relatedTopIssues = activeCategory && result
    ? result.topIssues.filter(
        issue => isLlmTopIssue(issue) && issueCategoryOf(issue) === activeCategory,
      )
    : [];

  // Inline copy + editable AI-suggestion drafts (keyed by bulletAnalysis index)
  const [copiedBullet, setCopiedBullet] = useState<number | null>(null);
  const [fetchedCategoryRationales, setFetchedCategoryRationales] = useState<Record<string, string>>({});
  const [explainingCategory, setExplainingCategory] = useState<string | null>(null);
  const explainInflightRef = useRef<Set<string>>(new Set());
  const explainAttemptedRef = useRef<Set<string>>(new Set());

  const activeCategoryRationale = activeCategory && result
    ? (
        result.categoryRationales?.[activeCategory as keyof AnalysisResult["categoryScores"]]
        || fetchedCategoryRationales[activeCategory]
        || ""
      ).trim()
    : "";
  const activeCategoryNeedsExplanation =
    typeof activeCategoryScore === "number"
    && activeCategoryScore < SCORE_NEEDS_EXPLANATION;

  const patchBulletRewrite = useCallback((index: number, value: string | null) => {
    patchRewrite(index, value);
  }, [patchRewrite]);

  const requestAiRewrite = useCallback(async (idx: number, originalBullet: string, category: string) => {
    setAiRewritingIdx(idx);
    try {
      const resp = await apiFetch("/api/rewrite-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullet: originalBullet, rewrite: true, instruction: category }),
      });
      if (!resp.ok) throw new Error("rewrite failed");
      const json = await resp.json() as { improved?: string | null };
      const improved = (json.improved ?? "").trim();
      if (improved && improved !== originalBullet) {
        patchBulletRewrite(idx, improved);
      }
    } catch {
      // silently ignore — button will re-enable
    } finally {
      setAiRewritingIdx(null);
    }
  }, [patchBulletRewrite]);

  const patchPreviewLine = useCallback((index: number, value: string | null) => {
    if (value === null || value === "") {
      useResumeAnalyzeStore.getState().clearLineOverride(index);
      return;
    }
    useResumeAnalyzeStore.getState().setLineOverride(index, value);
  }, []);

  const copyBullet = useCallback(async (text: string, idx: number) => {
    try { await navigator.clipboard.writeText(text); }
    catch { /* ignore */ }
    setCopiedBullet(idx);
    setTimeout(() => setCopiedBullet(null), 2000);
  }, []);

  const explainCategoryScore = useCallback(async (category: string) => {
    if (!result) return;
    if (explainInflightRef.current.has(category)) return;
    const score = result.categoryScores[category as keyof AnalysisResult["categoryScores"]];
    if (score === null || score === undefined) return;
    const resumeText = (result.extractedText || "").trim();
    if (!resumeText) return;

    explainInflightRef.current.add(category);
    setExplainingCategory(category);
    try {
      const resp = await apiFetch("/api/explain-category-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          category_score: score,
          resume_text: resumeText,
          jd,
        }),
      });
      const json = await resp.json() as { rationale?: string; error?: string };
      if (!resp.ok) throw new Error(json.error ?? "Could not explain this score.");
      const rationale = (json.rationale ?? "").trim();
      if (rationale) {
        setFetchedCategoryRationales(prev => ({ ...prev, [category]: rationale }));
      }
    } catch (e: unknown) {
      setError(apiErrorFromUnknown(e));
    } finally {
      explainInflightRef.current.delete(category);
      setExplainingCategory(null);
    }
  }, [result, jd]);

  useEffect(() => {
    explainAttemptedRef.current = new Set();
    setFetchedCategoryRationales({});
  }, [result]);

  useEffect(() => {
    if (!activeCategory || !result || !activeCategoryNeedsExplanation) return;
    if (activeCategoryRationale) return;
    if (explainAttemptedRef.current.has(activeCategory)) return;
    if (!(result.extractedText || "").trim()) return;
    explainAttemptedRef.current.add(activeCategory);
    void explainCategoryScore(activeCategory);
  }, [
    activeCategory,
    result,
    activeCategoryNeedsExplanation,
    activeCategoryRationale,
    explainCategoryScore,
  ]);

  const startOverAnalyze = useCallback(() => {
    setResult(null);
    setError(null);
    setExpandedBullets({});
    setJd("");
    setHistoryOpen(false);
    setActiveCategory(null);
    setSelectedBulletIndex(null);
    setHistoryRestoreActive(false);
    setActiveEditDraftId(null);
    setEditDraftStatus(null);
    setImprovementPlanVisible(true);
  }, []);

  const [savingVersion, setSavingVersion] = useState(false);
  const saveLocalPreviewDraft = useCallback(async () => {
    if (!activeEditDraftId) {
      setEditDraftStatus("Open an analysis first (upload or history).");
      return;
    }
    // Always keep the browser-local draft (instant, offline, and covers the
    // not-yet-persisted case).
    persistEdits(activeEditDraftId);

    let parent = azHistory.find((r) => r.id === activeEditDraftId);
    let persisted = !!parent && !activeEditDraftId.startsWith("local_");
    // A local_ draft with a signed-in session (anon-scanned then signed up, or
    // the original insert failed): persist the analysis NOW so the save can
    // dual-write — this cohort must not silently skip the versions experiment.
    if (!persisted && parent && result && userId) {
      try {
        const newId = await insertAnalysis(parent.label || "My résumé", result, {
          sourcePdfUrl: result.sourcePdfUrl ?? null,
          sourceFilename: result.sourceFilename ?? null,
        });
        if (newId) {
          migrateEdits(activeEditDraftId, newId);
          setActiveEditDraftId(newId);
          setAzHistory((prev) => prev.map((r) => (r.id === activeEditDraftId ? { ...r, id: newId } : r)));
          parent = { ...parent, id: newId };
          persisted = true;
        }
      } catch { /* fall through to the browser-only save below */ }
    }
    if (!persisted || !parent || !result || !userId) {
      setEditDraftStatus("Saved preview edits in this browser.");
      return;
    }

    // Bake the applied edits into an immutable version snapshot. No LLM call —
    // the score is the deterministic estimate the preview already shows. The
    // parent row is never mutated (resume_analyses has no UPDATE policy), so
    // every save is an append-only child version, git-commit style.
    setSavingVersion(true);
    try {
      const st = useResumeAnalyzeStore.getState();
      const patch = patchAppliedEditsIntoResume({
        extractedText: st.extractedText,
        structuredResume: st.structuredResume,
        analysisBullets: st.analysisBullets,
        lineOverrides: st.lineOverrides,
        summaryOverride: st.summaryOverride,
        hiddenBulletTexts: hiddenBulletTextsFromStructured(st.structuredResume, st.hiddenPaths),
      });
      if (patch.appliedCount === 0) {
        setEditDraftStatus("Make an edit in the preview first, then save a version.");
        return;
      }
      const versionResult: AnalysisResult = {
        ...result,
        extractedText: patch.patchedText,
        ...(patch.patchedStructured ? { structuredResume: patch.patchedStructured } : {}),
        ...(typeof scoreEstimate?.projected === "number"
          ? { overallScore: scoreEstimate.projected }
          : {}),
      };
      const created = await createAnalysisVersion(
        { id: parent.id, version: parent.version, rootId: parent.rootId, label: parent.label },
        versionResult,
      );
      if (!created) {
        setEditDraftStatus("Saved preview edits in this browser.");
        return;
      }
      // The analyses child is committed — this save counts (bounce guard) even
      // if the version mirror below fails.
      versionSavedRef.current = true;
      // The new version is the head: the just-committed edits are baked into it,
      // so re-hydrate the working copy from the snapshot and drop the parent's
      // now-committed draft. Subsequent edits branch a further child from here.
      clearEditsStore(activeEditDraftId);
      setAzHistory((prev) => [created, ...prev].slice(0, 40));
      lsPush(userId, created);
      setActiveEditDraftId(created.id);
      setExpandedBullets({});
      setSelectedBulletIndex(null);
      setHistoryRestoreActive(false);
      setResult(versionResult);
      useResumeAnalyzeStore.getState().hydrateFromAnalysis({
        extractedText: versionResult.extractedText,
        bulletAnalysis: versionResult.bulletAnalysis,
        resumeHeader: versionResult.resumeHeader,
        structuredResume: versionResult.structuredResume,
        bulletMap: versionResult.bulletMap,
      });
      setEditDraftStatus("Saved — your edits are in this résumé's history.");

      // Dual-write (M2): mirror the save onto the ONE editable version for this
      // lineage. Isolated on purpose — the analyses child above is already
      // committed, so a version failure must not turn the save into an error
      // (it logs, and the next save self-heals via the source_root_id lookup).
      const sourceRootId = created.rootId ?? parent.rootId ?? parent.id;
      const structuredForVersion = patch.patchedStructured ?? st.structuredResume;
      if (structuredForVersion) {
        try {
          const up = await upsertEditedVersion({
            sourceRootId,
            analysisId: created.id,
            name: parent.label || "",
            structured: structuredForVersion,
            extractedText: patch.patchedText,
            projectedScore: typeof scoreEstimate?.projected === "number" ? scoreEstimate.projected : null,
          });
          if (up) {
            setHasEditedVersion(true);
            void logClientEvent("version_save", {
              version_id: up.version.id,
              created: up.created,
              linked: up.linked,
              analysis_id: created.id,
            });
          }
        } catch {
          void logClientEvent("version_write_failed", { analysis_id: created.id });
        }
      }
    } catch {
      setEditDraftStatus("Saved locally; couldn't add a cloud version this time.");
    } finally {
      setSavingVersion(false);
    }
  }, [activeEditDraftId, result, userId, azHistory, scoreEstimate, persistEdits, clearEditsStore, migrateEdits, setAzHistory]);

  const clearLocalPreviewDraft = useCallback(() => {
    if (!activeEditDraftId || !result) return;
    clearEditsStore(activeEditDraftId);
    useResumeAnalyzeStore.getState().hydrateFromAnalysis({
      extractedText: result.extractedText,
      bulletAnalysis: result.bulletAnalysis,
      resumeHeader: result.resumeHeader,
      structuredResume: result.structuredResume,
      bulletMap: result.bulletMap,
    });
    
    setEditDraftStatus("Cleared saved draft; preview reset to analysis text.");
  }, [activeEditDraftId, result]);

  /* ── Shared sidebar: pinned strip (score / recent header) + scrollable body ─── */
  const sidebarPinned = (
    <AnalyzeSidebarPinned result={result} onEditResume={startEditFlow} hasEditedVersion={hasEditedVersion} />
  );

  const sidebarScroll = !result ? (
    <AnalyzeHistoryRail loading={loadingHistory} empty={azHistory.length === 0} rows={azHistoryRows} />
  ) : (
    <AnalyzeImprovementPlan
      result={result}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      setSelectedBulletIndex={setSelectedBulletIndex}
      showJobActivation={showJobActivation}
      setShowJobActivation={setShowJobActivation}
      setFeedbackToast={setFeedbackToast}
      saveLocalPreviewDraft={saveLocalPreviewDraft}
      clearLocalPreviewDraft={clearLocalPreviewDraft}
      savingVersion={savingVersion}
      editDraftStatus={editDraftStatus}
      summaryFlagged={summaryFlagged}
      summaryIssueCount={summaryIssueCount}
      topFixCategories={topFixCategories}
      completedCategories={completedCategories}
      categoryAssignmentOpts={categoryAssignmentOpts}
      resolvedBulletIndices={resolvedBulletIndices}
      azHistory={azHistory}
      azHistoryRows={azHistoryRows}
    />
  );


  // Anonymous visitors now see their full first-scan report (no teaser lock).
  // The result is still stashed for the OAuth round-trip; a second scan is
  // intercepted in onFile() and routed to the sign-in prompt below.

  return (
    <div
      className={`az-shell${improvementPlanVisible ? "" : " az-desktop-sidebar-hidden"}${workspaceSplit ? " az-shell-workspace-split" : ""}`}
      style={{
        display: "flex",
        width: "100%",
        ...(workspaceSplit
          ? {
            flex: "1 1 0%",
            minHeight: 0,
            overflow: "hidden",
            alignItems: "stretch",
          }
          : {
            flex: "1 1 0%",
            minHeight: 0,
            overflowX: "hidden" as const,
            overflowY: "auto" as const,
            alignItems: "stretch",
          }),
        background: "var(--bg)",
        position: "relative",
      }}
    >

      {feedbackToast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: 16,
            bottom: 18,
            zIndex: 1200,
            maxWidth: "min(440px, calc(100vw - 32px))",
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(30,41,59,0.96)",
            border: "1px solid rgba(148,163,184,0.32)",
            boxShadow: "0 14px 30px rgba(2,6,23,0.35)",
            color: "#f8fafc",
            fontSize: 13,
            lineHeight: 1.45,
            letterSpacing: -0.15,
          }}
        >
          {feedbackToast}
        </div>
      ) : null}

      {/* After an analysis: one-tap "save this résumé to your Profile" (self-hides
          when no structured résumé / already saved or dismissed). */}
      <SaveToProfilePrompt />

      {/* ── Mobile backdrop (close history drawer) ─── */}
      {historyOpen && (
        <button
          type="button"
          className="az-sidebar-scrim-mobile"
          aria-label="Close history panel"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* ── Desktop: dim page behind sliding improvement plan — opacity transition (no layout shift) ─── */}
      <button
        type="button"
        className={`az-sidebar-scrim-desktop${improvementPlanVisible ? " is-on" : ""}`}
        aria-label={improvementPlanVisible ? "Close improvement plan" : undefined}
        aria-hidden={!improvementPlanVisible}
        tabIndex={improvementPlanVisible ? 0 : -1}
        onClick={() => setImprovementPlanVisible(false)}
      />

      {/* ── Sidebar: inline sticky column on desktop; mobile keeps slide-over overlay ── */}
      <style>{`
        @keyframes az-scrim-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ── Desktop: inline sidebar — stretches with shell height (no fixed 100vh) ── */
        .az-sidebar {
          width: min(320px, 40vw);
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          padding: 20px 14px;
          box-sizing: border-box;
          align-self: stretch;
          height: auto;
          min-height: 0;
          flex-grow: 0;
          position: relative;
          transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.22s,
                      padding 0.28s,
                      border-color 0.28s;
        }
        .az-shell.az-desktop-sidebar-hidden .az-sidebar {
          width: 0;
          padding-left: 0;
          padding-right: 0;
          opacity: 0;
          overflow: hidden;
          border-right-color: transparent;
          pointer-events: none;
        }

        .az-sidebar-inner {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .az-sidebar-pinned {
          flex-shrink: 0;
          padding-bottom: 12px;
          margin-bottom: 4px;
          border-bottom: 1px solid var(--border);
        }
        .az-sidebar-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-top: 4px;
        }
        @media (min-width: 1025px) {
          .az-sidebar {
            max-height: 100vh;
            max-height: 100dvh;
            display: flex;
            flex-direction: column;
          }
        }

        /* Desktop scrim never shows — sidebar is inline, not overlaying */
        .az-sidebar-scrim-desktop { display: none !important; }
        /* Collapsed score rail: compact affordances that expand the score/fix plan */
        .az-sidebar-restore-fab {
          display: none;
          position: fixed;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1001;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
          width: 58px;
          min-height: 82px;
          padding: 9px 6px;
          border-radius: 0 16px 16px 0;
          border: 1px solid var(--border);
          border-left: none;
          background: var(--surface);
          box-shadow: 2px 0 14px rgba(0,0,0,0.08);
          cursor: pointer;
          font-family: inherit;
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.02em;
          transition: background var(--transition), color var(--transition), box-shadow var(--transition);
        }
        .az-score-fab-score {
          min-width: 28px;
          height: 24px;
          padding: 0 5px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid currentColor;
          background: color-mix(in srgb, currentColor 10%, transparent);
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
        }
        .az-score-fab-label {
          font-size: 9.5px;
          line-height: 1;
          color: var(--dim);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .az-sidebar-scan-fab {
          display: none;
          position: fixed;
          left: 0;
          top: calc(50% + 76px);
          transform: translateY(-50%);
          z-index: 1001;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 5px;
          width: 58px;
          min-height: 66px;
          padding: 8px 6px;
          border-radius: 0 16px 16px 0;
          border: 1px solid var(--border);
          border-left: none;
          background: var(--surface);
          box-shadow: 2px 0 14px rgba(0,0,0,0.08);
          cursor: pointer;
          font-family: inherit;
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.02em;
          transition: background var(--transition), color var(--transition), box-shadow var(--transition);
        }
        .az-sidebar-scan-fab span {
          font-size: 9.5px;
          line-height: 1;
          color: var(--dim);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        @media (min-width: 1025px) {
          .az-sidebar-restore-fab.is-visible {
            display: inline-flex;
          }
          .az-sidebar-scan-fab.is-visible {
            display: inline-flex;
          }
        }

        /* Mobile: keep slide-over overlay (screen too narrow for inline) */
        .az-sidebar-scrim-mobile { display: none; }
        @media (max-width: 1024px) {
          .az-sidebar-scrim-mobile {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 999;
            margin: 0; padding: 0; border: none;
            background: rgba(15, 23, 42, 0.32);
            cursor: pointer;
            animation: az-scrim-in 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          .az-resume-panel { display: none !important; }
          .az-sidebar {
            position: fixed;
            top: 0; left: 0; bottom: 0;
            z-index: 1000;
            width: min(296px, 92vw);
            height: auto;
            max-height: 100dvh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 8px 0 32px rgba(15, 23, 42, 0.14);
            transform: translateX(-100%);
            pointer-events: none;
            transition: transform 0.34s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 1;
            border-right: 1px solid var(--border);
          }
          .az-sidebar.open {
            transform: translateX(0);
            pointer-events: auto;
          }
          .az-shell.az-desktop-sidebar-hidden .az-sidebar {
            width: min(296px, 92vw);
            padding: 20px 14px;
            opacity: 1;
            overflow: hidden;
            border-right-color: var(--border);
          }
          .az-main { padding: 20px 16px 60px !important; -webkit-overflow-scrolling: touch; }
        }

        .az-resume-panel {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          width: min(420px, 38vw);
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          border-left: 1px solid var(--border);
        }
        .az-resume-panel.hidden { display: none !important; }

        .az-desktop-sidebar-toggle {
          display: none;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 1025px) {
          .az-desktop-sidebar-toggle { display: inline-flex; }
        }

        @media (prefers-reduced-motion: reduce) {
          .az-sidebar { transition-duration: 0.01ms !important; }
          .az-sidebar-scrim-mobile { animation: none !important; opacity: 1; }
        }

        /* Desktop workspace: main area height-bounded so only the work column scrolls */
        @media (min-width: 1025px) {
          .az-shell.az-shell-workspace-split {
            flex: 1 1 0%;
            min-height: 0;
            overflow: hidden;
            align-items: stretch;
          }
        }
        .az-mobile-only { display: flex; }
        @media (min-width: 1025px) { .az-mobile-only { display: none !important; } }
      `}</style>
      <aside className={`az-sidebar${historyOpen ? " open" : ""}`}>
        {result && (
          <button
            type="button"
            onClick={startOverAnalyze}
            title="Go back to Analyze home and start a fresh scan"
            style={{
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "7px 12px",
              marginBottom: 12,
              borderRadius: 8,
              border: "none",
              background: "var(--amber)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: -0.05,
              transition: "opacity var(--transition)",
              boxSizing: "border-box",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.92"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 2v9M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            New Scan
          </button>
        )}
        {/* Sidebar header with close button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Improvement Plan
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Tip label="Hide improvement plan for more space"><button
              type="button"
              className="az-desktop-sidebar-toggle"
              onClick={() => setImprovementPlanVisible(false)}
              style={{
                width: 24, height: 24, borderRadius: 6,
                border: "none", background: "var(--surface2)",
                cursor: "pointer", alignItems: "center", justifyContent: "center",
                color: "var(--dim)", transition: "background var(--transition)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface3)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface2)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button></Tip>
            {/* Mobile: close overlay */}
            <Tip label="Close panel"><button
              onClick={() => setHistoryOpen(false)}
              className="az-mobile-only"
              style={{
                width: 24, height: 24, borderRadius: 6,
                border: "none", background: "var(--surface2)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--dim)", transition: "background var(--transition)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface3)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface2)"; }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button></Tip>
          </div>
        </div>
        <div className="az-sidebar-inner">
          <div className="az-sidebar-pinned">{sidebarPinned}</div>
          <div className="az-sidebar-scroll">{sidebarScroll}</div>
        </div>
      </aside>

      {/* Desktop: compact score rail — parent action opens the full score/fix plan */}
      <button
        type="button"
        className={`az-sidebar-restore-fab${!improvementPlanVisible ? " is-visible" : ""}`}
        onClick={() => setImprovementPlanVisible(true)}
        title="Open improvement plan: scores, fixes, and past analyses"
        aria-label="Open improvement plan and analysis history"
        onMouseEnter={e => {
          e.currentTarget.style.background = "var(--surface2)";
          e.currentTarget.style.boxShadow = "2px 0 18px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "var(--surface)";
          e.currentTarget.style.boxShadow = "";
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, opacity: 0.85 }}>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.35" />
          <path d="M8 8l2.3-2.3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M5 10.5h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.75" />
        </svg>
        {result ? (
          <span className="az-score-fab-score" style={{ color: scoreColor(result.overallScore) }}>
            {result.overallScore}
          </span>
        ) : null}
        <span className="az-score-fab-label">Scores</span>
      </button>
      <button
        type="button"
        className={`az-sidebar-scan-fab${!improvementPlanVisible && !!result ? " is-visible" : ""}`}
        onClick={startOverAnalyze}
        title="Start a fresh scan from Analyze home"
        aria-label="Start a new scan"
        onMouseEnter={e => {
          e.currentTarget.style.background = "var(--surface2)";
          e.currentTarget.style.boxShadow = "2px 0 18px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "var(--surface)";
          e.currentTarget.style.boxShadow = "";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, opacity: 0.85 }}>
          <path d="M8 2v9M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <span>{"New scan"}</span>
      </button>
      <main
        className={`az-main${workspaceSplit ? " az-main-workspace-split" : ""}`}
        style={{
          ...(workspaceSplit
            ? {
              flex: "1 1 0%",
              minWidth: 0,
              display: "grid",
              gridTemplateColumns: "minmax(260px, 2fr) minmax(280px, 3fr)",
              gridTemplateRows: "minmax(0, 1fr)",
              overflow: "hidden",
              padding: 0,
              minHeight: 0,
              height: "100%",
              alignSelf: "stretch",
              width: "100%",
            }
            : {
              flex: 1,
              overflowY: "auto",
              padding: "28px 36px",
              minHeight: 0,
              minWidth: 0,
            }),
        }}
      >

        <style>{`
          .az-mobile-sticky-head { display: none; }
          @media (max-width: 1024px) {
            .az-mobile-sticky-head {
              display: flex !important;
              flex-direction: column;
              gap: 10px;
              position: sticky;
              top: 0;
              z-index: 8;
              background: var(--bg);
              padding: 0 14px 12px;
              margin: 0 0 12px;
              border-bottom: 1px solid var(--border);
              align-self: stretch;
            }
            .az-main:not(.az-main-workspace-split) {
              padding: 16px 14px 60px !important;
            }
          }
          @media (min-width: 1025px) {
            .az-main.az-main-workspace-split {
              height: 100%;
              max-height: 100%;
              min-height: 0 !important;
            }
            .az-split-work-slot {
              min-height: 0 !important;
            }
            .az-split-resume-slot {
              min-height: 0 !important;
            }
          }
          @media (max-width: 1024px) {
            .az-main.az-main-workspace-split {
              display: flex !important;
              flex-direction: column !important;
              overflow-y: auto !important;
              -webkit-overflow-scrolling: touch;
              padding: 16px 0 60px !important;
            }
            .az-main.az-main-workspace-split .az-mobile-sticky-head {
              order: 1;
              flex-shrink: 0;
            }
            .az-main.az-main-workspace-split .az-split-resume-slot {
              order: 2;
            }
            .az-main.az-main-workspace-split .az-split-work-slot {
              order: 3;
            }
            .az-split-resume-slot {
              height: auto !important;
              min-height: 54vh !important;
              max-height: 72vh !important;
              overflow-y: auto !important;
              border-left: none !important;
              border-bottom: 1px solid var(--border) !important;
            }
            .az-split-work-slot {
              height: auto !important;
              overflow-y: visible !important;
              padding: 12px 16px 48px !important;
            }
            /* Résumé is the focus on small screens — keep the analysis below it
               compact so it reads as supporting context, not the headline. */
            .az-overview-stack {
              gap: 18px !important;
            }
            .az-overview-summary > div {
              padding: 13px 15px !important;
              border-radius: 12px !important;
            }
            .az-overview-summary p {
              font-size: 13px !important;
              line-height: 1.5 !important;
              margin-bottom: 10px !important;
            }
            .az-overview-summary span {
              font-size: 11px !important;
              padding: 3px 9px !important;
            }
          }
        `}</style>

        {/* ── Mobile: score + category pills + history opener — sticky under top bar while scrolling ── */}
        {(result || azHistory.length > 0) && (
          <div className="az-mobile-sticky-head">
            {result ? (
          <>
            {/* Slim collapsed bar — always visible; frees vertical space for the résumé */}
            <button
              type="button"
              onClick={() => setMobileHeadExpanded((v) => !v)}
              aria-expanded={mobileHeadExpanded}
              aria-label={mobileHeadExpanded ? "Hide score details" : "Show score details"}
              style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%",
                padding: "8px 12px", borderRadius: 10, boxSizing: "border-box",
                border: "1px solid var(--border)", background: "var(--surface)",
                cursor: "pointer", fontFamily: "inherit",
                marginBottom: mobileHeadExpanded ? 10 : 0,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(result.overallScore), lineHeight: 1 }}>
                {result.overallScore}
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--dim)" }}>/100</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(result.overallScore) }}>
                {scoreLabel(result.overallScore)}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>· Resume score</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dim)" }}>
                {mobileHeadExpanded ? "Hide" : "Details"}
              </span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden style={{ color: "var(--dim)", transform: mobileHeadExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {mobileHeadExpanded && (
          <div className="az-mobile-score" style={{ marginBottom: 0 }}>
            {/* Score row */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "18px 16px", marginBottom: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ScoreRing score={result.overallScore} size={80} label="" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--amber)", textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "var(--font-sans), Inter, system-ui, sans-serif", marginBottom: 6 }}>
                    Resume Score
                  </div>
                  {/* Number already lives inside the ScoreRing — show the verdict here, not a duplicate score. */}
                  <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(result.overallScore), lineHeight: 1.1 }}>
                    {scoreLabel(result.overallScore)}
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={startEditFlow}
                  style={{
                    padding: "8px 14px", borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--accent-bg)", color: "var(--accent)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    whiteSpace: "nowrap", flexShrink: 0, marginRight: 8,
                  }}
                >✎ {hasEditedVersion ? "Keep editing" : "Edit"}</button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null); setError(null); setExpandedBullets({});
                    setActiveCategory(null); setSelectedBulletIndex(null);
                    setHistoryRestoreActive(false);
                  }}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "none",
                    background: "var(--amber)", color: "#fff",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >New ↑</button>
              </div>
            </div>

            {/* Category bars */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "14px 16px",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px",
            }}>
              {CATEGORY_LABELS.map(({ key, label }) => {
                const score = result.categoryScores[key];
                const color = scoreColor(score);
                const pct = score !== null ? score : 0;
                const isActive = activeCategory === key;
                const clickable = score !== null; // Job Match with no JD has nothing to open
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!clickable}
                    aria-pressed={isActive}
                    onClick={() => {
                      if (!clickable) return;
                      setSelectedBulletIndex(null);
                      setActiveCategory(isActive ? null : key);
                      if (!isActive) {
                        // On mobile the category detail renders in the work slot BELOW
                        // the résumé, so scroll it up just under the sticky head — without
                        // this the tap would silently change content off-screen.
                        setTimeout(() => {
                          const main = document.querySelector(".az-main") as HTMLElement | null;
                          const work = document.querySelector(".az-split-work-slot") as HTMLElement | null;
                          const head = document.querySelector(".az-mobile-sticky-head") as HTMLElement | null;
                          if (main && work) {
                            const headH = head ? head.getBoundingClientRect().height : 0;
                            const top = work.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - headH - 8;
                            main.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
                          }
                        }, 60);
                      }
                    }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      border: "none", borderRadius: 8, font: "inherit",
                      background: isActive ? "rgba(33,150,243,0.10)" : "transparent",
                      boxShadow: isActive ? "inset 0 0 0 1px rgba(33,150,243,0.32)" : "none",
                      padding: "6px 8px", margin: "-6px -8px",
                      cursor: clickable ? "pointer" : "default",
                      WebkitTapHighlightColor: "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: isActive ? "var(--accent)" : "var(--muted)", fontWeight: isActive ? 700 : 500 }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: score === null ? "var(--dim)" : color }}>
                        {score === null ? "–" : score}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "var(--surface2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: score === null ? "var(--border)" : color, transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
            )}
          </>
            ) : null}
            {azHistory.length > 0 && (!result || mobileHeadExpanded) ? (
          <div className="az-history-bar" style={{ marginBottom: 0 }}>
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                color: "var(--muted)",
                boxSizing: "border-box",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {`Recent analyses (${azHistory.length})`}
            </button>
          </div>
            ) : null}
          </div>
        )}

        {/* Pre-result upload state */}
        {!result && !loading && (
          <AnalyzeUploadLanding
            jd={jd}
            onJdChange={setJd}
            dragging={dragging}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFile(e.dataTransfer.files[0]);
            }}
            onBrowseClick={() => fileRef.current?.click()}
            error={error}
            scansRemaining={scansRemaining}
          />
        )}

        {/* Loading state */}
        {loading && (
          <AnalyzeCoachLoader stepIndex={loadingMsg} tipIndex={loadingTipIdx} hasJd={!!jd.trim()} />
        )}

        {result && workspaceSplit ? (
          <div
            className="az-split-resume-slot"
            style={{
              gridColumn: 2,
              gridRow: 1,
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "var(--bg)",
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <AnalyzePreviewPane
              analyzeSnapshot={analyzePreviewSnapshot}
              sectionFeedback={result.sectionFeedback}
              activeCategory={activeCategory}
              activeCategoryLabel={activeCategoryLabel}
              rewriteEdits={rewriteEdits}
              patchBulletRewrite={patchBulletRewrite}
              patchPreviewLine={patchPreviewLine}
              selectedBulletIndex={selectedBulletIndex}
              onBulletLinkedSelect={handleBulletSelectFromPreview}
              summaryFlagged={summaryFlagged}
              summaryHint={summaryHint}
              onSummarySelect={() => { setSelectedBulletIndex(null); setActiveCategory("summary"); }}
              presentationOnly
              restoredResumeNoPdfHint={historyRestoreActive}
              categoryAssignmentOpts={categoryAssignmentOpts}
              onRescore={handleRescore}
              rescoring={rescoring}
              scoreEstimate={scoreEstimate}
            />
            </div>
          </div>
        ) : null}

        {result ? (
          <div
            className={workspaceSplit ? "az-split-work-slot" : undefined}
            style={
              workspaceSplit
                ? {
                    gridColumn: 1,
                    gridRow: 1,
                    overflowY: "auto",
                    minWidth: 0,
                    minHeight: 0,
                    height: "100%",
                    padding: "28px 28px 32px 36px",
                    borderRight: "1px solid var(--border)",
                  }
                : undefined
            }
          >

        {/* ── Issue Detail View (shown when a category is selected) ── */}
        {activeCategory && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 700 }}>

            {/* Back button */}
            <button
              onClick={() => { setActiveCategory(null); setSelectedBulletIndex(null); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--surface2)", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 500, color: "var(--muted)", width: "fit-content",
                transition: "background var(--transition)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface3)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface2)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to overview
            </button>

            {/* Hero card. "summary" is a pseudo-category with no categoryScores
                entry — show word count instead of a bogus "–/100" score. */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 16,
              padding: "22px 24px",
              background: "var(--surface)",
              border: `1px solid ${activeCategory === "summary"
                ? "rgba(245,158,11,0.4)"
                : (activeCategoryScore ?? 0) >= 80
                  ? "rgba(52,211,153,0.3)"
                  : (activeCategoryScore ?? 0) >= 60
                    ? "rgba(251,191,36,0.35)"
                    : "rgba(248,113,113,0.3)"}`,
              borderRadius: 16,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 16, flexShrink: 0,
                background: activeCategory === "summary"
                  ? "rgba(245,158,11,0.12)"
                  : (activeCategoryScore ?? 0) >= 80
                    ? "rgba(52,211,153,0.10)"
                    : (activeCategoryScore ?? 0) >= 60
                      ? "rgba(251,191,36,0.12)"
                      : "rgba(248,113,113,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 2,
              }}>
                {activeCategory === "summary" ? (
                  <>
                    <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: "var(--amber-ink, #b45309)" }}>
                      {summaryAnalysis?.wordCount ?? "–"}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.4 }}>words</span>
                  </>
                ) : (
                  <>
                    <span style={{
                      fontSize: 22, fontWeight: 800, lineHeight: 1,
                      color: scoreColor(activeCategoryScore ?? 0),
                    }}>
                      {activeCategoryScore ?? "–"}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.4 }}>/100</span>
                  </>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                  {activeCategoryLabel}
                </div>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
                  {activeCategory === "summary"
                    ? "Recruiters skim the summary first. Aim for 25-75 words leading with role + years + domain, with specifics instead of filler. Apply the rewrite below or edit it, and it updates the preview and PDF."
                    : CATEGORY_DESCRIPTIONS[activeCategory] ?? ""}
                </p>
                {activeCategoryNeedsExplanation && (
                  <div style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface2)",
                    borderLeft: "3px solid var(--accent)",
                  }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.45,
                      color: "var(--muted)",
                      marginBottom: 6,
                    }}>
                      Why this score
                    </div>
                    {explainingCategory === activeCategory ? (
                      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
                        Generating explanation…
                      </p>
                    ) : activeCategoryRationale ? (
                      <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65, margin: 0 }}>
                        {activeCategoryRationale}
                      </p>
                    ) : activeCategory ? (
                      <button
                        type="button"
                        onClick={() => explainCategoryScore(activeCategory)}
                        disabled={!(result.extractedText || "").trim()}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "6px 12px", borderRadius: 7,
                          border: "1px solid var(--accent)",
                          background: "rgba(99,102,241,0.10)",
                          color: "var(--accent)",
                          fontSize: 13, fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Ask AI why
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {activeCategory !== "summary" && result.bulletAnalysis.length > 0 && (
              <div style={{
                padding: "14px 16px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {activeBullets.length > 0
                    ? `${activeBullets.length} of ${result.bulletAnalysis.length} reviewed bullets flagged`
                    : "No sample bullets flagged here"}
                </p>
                <div style={{
                  height: 8,
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "var(--surface3)",
                }}>
                  <div style={{
                    height: "100%",
                    width: "100%",
                    background: (() => {
                      const t = Math.max(result.bulletAnalysis.length, 1);
                      const mapped = Math.min(activeBullets.length, t);
                      const p = (mapped / t) * 100;
                      return `linear-gradient(90deg, rgba(33,150,243,0.55) 0%, rgba(33,150,243,0.55) ${p}%, var(--surface3) ${p}%, var(--surface3) 100%)`;
                    })(),
                    transition: "background 0.6s cubic-bezier(0.16,1,0.3,1)",
                  }} />
                </div>
              </div>
            )}

            {/* Related top issues — why it matters + what to do */}
            {relatedTopIssues.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
                  Next steps
                </h3>
                {relatedTopIssues.map((issue, i) => (
                  <div key={i} style={{
                    border: "1px solid var(--border)", borderRadius: 12,
                    padding: "12px 14px", background: "var(--surface)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        textTransform: "uppercase", letterSpacing: 0.4,
                        background: severityBg(issue.severity), color: severityColor(issue.severity),
                      }}>
                        {issue.severity}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{issue.issue}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                      {issue.suggestion}
                    </p>
                    {issue.items && issue.items.length > 0 && (() => {
                      // Short tokens (words/phrases) render as chips; long ones (bullets) as lines.
                      const isChips = issue.items.every(it => it.length <= 28);
                      return (
                        <div style={{ marginTop: 10 }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: "var(--muted)",
                            textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6,
                          }}>
                            Found in your résumé
                          </div>
                          {isChips ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {issue.items.map((it, k) => (
                                <span key={k} style={{
                                  fontSize: 13, padding: "3px 9px", borderRadius: 8,
                                  background: "var(--red-tint, rgba(248,113,113,0.12))",
                                  color: "var(--red-ink, var(--red))",
                                  border: "1px solid rgba(248,113,113,0.25)",
                                }}>{it}</span>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {issue.items.map((it, k) => (
                                <div key={k} style={{
                                  fontSize: 13, lineHeight: 1.5, padding: "7px 10px", borderRadius: 8,
                                  background: "var(--red-tint, rgba(248,113,113,0.10))",
                                  color: "var(--text)",
                                  border: "1px solid rgba(248,113,113,0.20)",
                                }}>{it.replace(/^[•\-–*▪▸]\s*/, "")}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            {/* Summary rewrite card — shown under Readability when LLM produced one */}
            {(activeCategory === "summary" || activeCategory === "readability")
              && result.summaryAnalysis
              && (result.summaryAnalysis.improvedSummary || (result.summaryAnalysis.issues?.length ?? 0) > 0) && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>
                  Summary Rewrite
                </h3>
                <div style={{
                  border: "1px solid var(--border)", borderRadius: 12,
                  padding: "14px 16px", background: "var(--surface)",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  {result.summaryAnalysis.issues.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.summaryAnalysis.issues.map((iss, i) => (
                        <span key={i} style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 9px",
                          borderRadius: 20, background: "rgba(248,113,113,0.12)",
                          color: "var(--red, #ef4444)", border: "1px solid rgba(248,113,113,0.25)",
                        }}>{iss}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Original ({result.summaryAnalysis.wordCount} words)
                  </div>
                  <div style={{
                    fontSize: 13, color: "var(--muted)", lineHeight: 1.55,
                    padding: "8px 12px", background: "var(--surface2)",
                    borderRadius: 8, borderLeft: "3px solid var(--border)",
                  }}>
                    {result.summaryAnalysis.original}
                  </div>
                  {result.summaryAnalysis.improvedSummary && (() => {
                    const sa = result.summaryAnalysis!;
                    const applied = !!summaryOverride.trim();
                    const baseText = applied ? summaryOverride : (sa.improvedSummary || "");
                    const editing = summaryDraft !== null;
                    const shownText = editing ? (summaryDraft || "") : baseText;
                    const btn: React.CSSProperties = {
                      fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 8,
                      cursor: "pointer", background: "var(--surface2)",
                      border: "1px solid var(--border)", color: "var(--text)",
                    };
                    const primaryBtn: React.CSSProperties = {
                      ...btn, background: "#1565c0", border: "1px solid #1565c0", color: "#fff",
                    };
                    return (
                      <>
                        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 8 }}>
                          Suggested rewrite
                          {applied && !editing && (
                            <span style={{ fontSize: 11, color: "var(--green-ink, #047857)", fontWeight: 700 }}>· applied to preview ✓</span>
                          )}
                        </div>
                        {editing ? (
                          <textarea
                            value={summaryDraft ?? ""}
                            onChange={(e) => setSummaryDraft(e.target.value)}
                            rows={4}
                            autoFocus
                            style={{
                              fontSize: 13, color: "var(--text)", lineHeight: 1.55,
                              padding: "8px 12px", background: "var(--surface)",
                              borderRadius: 8, border: "1px solid #1565c0",
                              fontFamily: "inherit", resize: "vertical", width: "100%",
                            }}
                          />
                        ) : (
                          <div style={{
                            fontSize: 13, color: "var(--text)", lineHeight: 1.55,
                            padding: "8px 12px", background: "rgba(34,197,94,0.06)",
                            borderRadius: 8, borderLeft: "3px solid rgba(34,197,94,0.4)",
                          }}>
                            {baseText}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => { setSummaryOverride(shownText); setSummaryDraft(null); }}
                            style={primaryBtn}
                          >
                            {applied ? "Update preview" : "Apply to preview"}
                          </button>
                          <button
                            onClick={() => setSummaryDraft(editing ? null : baseText)}
                            style={btn}
                          >
                            {editing ? "Cancel" : "Edit"}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(shownText).catch(() => {});
                              setSummaryCopied(true);
                              window.setTimeout(() => setSummaryCopied(false), 1500);
                            }}
                            style={btn}
                          >
                            {summaryCopied ? "Copied" : "Copy"}
                          </button>
                          {applied && (
                            <button
                              onClick={() => { clearSummaryOverride(); setSummaryDraft(null); }}
                              style={btn}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Affected bullets with rewrites */}
            {activeBullets.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>
                  Flagged Bullets
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeBullets.map((bullet, i) => {
                    const gi = result.bulletAnalysis.indexOf(bullet);
                    const safeIdx = gi >= 0 ? gi : i;
                    const rawCategoryRewrite = activeCategory
                      ? getRewriteForCategory(
                          bullet,
                          activeCategory,
                          undefined,
                          result.bulletAnalysis,
                          safeIdx,
                          categoryAssignmentOpts,
                        )
                      : (bullet.improvedBullet ?? "");
                    // Strip the two big "written by AI" tells from anything we
                    // surface: turn "[X%]" placeholders into concrete example
                    // figures the student swaps for their own, and replace
                    // em-dashes with commas. Never a bracket, never a "—".
                    const { text: categoryRewriteBase, examples: referenceFigures } =
                      cleanAiArtifacts(rawCategoryRewrite);
                    const hasReferenceFigures = referenceFigures.length > 0;
                    const isFirstFlaggedCard = i === 0;
                    const isLanguageMicroEdit = categoryRewriteBase.trim().length > 0
                      && activeCategory === "languageQuality"
                      && isLanguageQualityMicroRewrite(bullet.originalBullet, categoryRewriteBase);
                    const draft = rewriteEdits[safeIdx] ?? categoryRewriteBase;
                    const fixChipLabel = flaggedBulletFixChip(
                      activeCategory as keyof AnalysisResult["categoryScores"] | null,
                      isLanguageMicroEdit,
                    );
                    const coach = activeCategory
                      ? CATEGORY_COACH[activeCategory as keyof AnalysisResult["categoryScores"]] ?? null
                      : null;
                    const previewMain = previewLineOverrides[safeIdx] ?? bullet.originalBullet;
                    const previewLineAppliedHere = previewLineOverrides[safeIdx] !== undefined;
                    const isFlaggedAccordionOpen = expandedFlaggedBulletIdx === safeIdx;
                    const bColor = bullet.score < 50
                      ? "var(--red)"
                      : bullet.score < 70
                        ? "#f59e0b"
                        : "var(--green)";
                    const bBg = bullet.score < 50
                      ? "rgba(248,113,113,0.14)"
                      : bullet.score < 70
                        ? "rgba(245,158,11,0.14)"
                        : "rgba(52,211,153,0.12)";
                    const bBorderSoft = bullet.score < 50
                      ? "rgba(248,113,113,0.28)"
                      : bullet.score < 70
                        ? "rgba(245,158,11,0.28)"
                        : "rgba(52,211,153,0.28)";
                    const bRowBgOpen = bullet.score < 50
                      ? "rgba(248,113,113,0.07)"
                      : bullet.score < 70
                        ? "rgba(245,158,11,0.06)"
                        : "rgba(52,211,153,0.06)";
                    const bRowBgClosed = bullet.score < 50
                      ? "rgba(248,113,113,0.04)"
                      : bullet.score < 70
                        ? "rgba(245,158,11,0.03)"
                        : "rgba(52,211,153,0.04)";
                    const displayBulletLine = stripResumeBulletPrefix(previewMain);
                    const onFlaggedAccordionToggle = () => {
                      handleBulletLinkedSelect(safeIdx);
                      setExpandedFlaggedBulletIdx((prev) => (prev === safeIdx ? null : safeIdx));
                    };
                    return (
                    <div
                      key={safeIdx}
                      data-az-bullet-workspace={safeIdx}
                      style={{
                      border: `1px solid ${bBorderSoft}`,
                      borderLeft: `4px solid ${bColor}`,
                      borderRadius: 10,
                      overflow: "hidden",
                      background: isFlaggedAccordionOpen ? bRowBgOpen : bRowBgClosed,
                    }}>
                      <button
                        type="button"
                        onClick={onFlaggedAccordionToggle}
                        aria-expanded={isFlaggedAccordionOpen}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          border: "none",
                          background: isFlaggedAccordionOpen ? bRowBgOpen : "transparent",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textAlign: "left",
                          transition: "background 0.12s",
                        }}
                      >
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "3px 9px",
                          borderRadius: 20,
                          background: bBg,
                          color: bColor,
                          flexShrink: 0,
                        }}>
                          {bullet.score}
                        </span>
                        <span style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text)",
                          lineHeight: 1.45,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }} title={previewMain}>
                          <span aria-hidden style={{ color: "var(--muted)", fontWeight: 700, marginRight: "0.35em" }}>•</span>
                          {displayBulletLine}
                          {previewLineAppliedHere && (
                            <span title="Applied to preview." style={{ marginLeft: 6, color: "var(--green)", fontSize: 10, fontWeight: 800 }}>✓</span>
                          )}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 20,
                          flexShrink: 0,
                          background: isLanguageMicroEdit ? "rgba(99,102,241,0.14)" : bBg,
                          color: isLanguageMicroEdit ? "var(--accent)" : bColor,
                          border: `1px solid ${isLanguageMicroEdit ? "rgba(99,102,241,0.28)" : bBorderSoft}`,
                        }}>
                          {fixChipLabel}
                        </span>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden
                          style={{
                            flexShrink: 0,
                            color: "var(--dim)",
                            transform: isFlaggedAccordionOpen ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s ease",
                          }}
                        >
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {isFlaggedAccordionOpen && (
                        <div style={{ padding: "0 14px 14px 14px" }}>
                      {coach && isFirstFlaggedCard && !isLanguageMicroEdit && (
                        <p style={{ ...COACH_BODY_STYLE, marginBottom: 10 }}>
                          <span style={{ fontWeight: 700, color: "var(--accent)" }}>Why&nbsp;&nbsp;</span>
                          {coach.why}
                        </p>
                      )}
                      {!draft.trim() && rewriteEdits[safeIdx] === undefined && (
                        <div style={{
                          marginBottom: 10,
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}>
                          <span style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.45 }}>
                            No auto-rewrite passed quality checks.
                          </span>
                          <button
                            type="button"
                            disabled={aiRewritingIdx === safeIdx}
                            onClick={e => {
                              e.stopPropagation();
                              void requestAiRewrite(safeIdx, bullet.originalBullet, activeCategory ?? "achievementQuality");
                            }}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "5px 11px", borderRadius: 7, flexShrink: 0,
                              border: "1px solid rgba(139,92,246,0.4)",
                              background: aiRewritingIdx === safeIdx ? "var(--surface2)" : "rgba(139,92,246,0.1)",
                              color: aiRewritingIdx === safeIdx ? "var(--dim)" : "rgb(139,92,246)",
                              fontSize: 11, fontWeight: 600, cursor: aiRewritingIdx === safeIdx ? "wait" : "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {aiRewritingIdx === safeIdx
                              ? <><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />Generating…</>
                              : <>✦ Generate AI rewrite</>
                            }
                          </button>
                        </div>
                      )}
                      <BulletImprovedEditor
                        variant="compact"
                        layout="card"
                        suggestionLabel={hasReferenceFigures ? "Suggested · example numbers" : "Suggested"}
                        suggestionNote={hasReferenceFigures ? "Figures below are examples. Swap in your real numbers." : undefined}
                        highlightTerms={hasReferenceFigures ? referenceFigures : undefined}
                        value={draft}
                        onChange={v => patchBulletRewrite(safeIdx, v)}
                        onReset={() => patchBulletRewrite(safeIdx, null)}
                        canReset={rewriteEdits[safeIdx] !== undefined}
                        minHeight={64}
                        previewLineApplied={previewLineAppliedHere}
                        onReplaceInPreview={() => patchPreviewLine(safeIdx, draft.trim())}
                        onRevertPreviewLine={() => patchPreviewLine(safeIdx, null)}
                        onTextareaFocus={() => onBulletWorkspaceTextareaFocus(safeIdx)}
                        onTextareaBlur={e => onBulletWorkspaceTextareaBlur(safeIdx, e)}
                        toolbarRight={(
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              copyBullet(draft, safeIdx);
                            }}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "5px 10px", borderRadius: 7,
                              border: `1px solid ${copiedBullet === safeIdx ? "rgba(52,211,153,0.5)" : "rgba(52,211,153,0.3)"}`,
                              background: copiedBullet === safeIdx ? "rgba(52,211,153,0.15)" : "rgba(52,211,153,0.08)",
                              color: "var(--green)", fontSize: 11, fontWeight: 600,
                              cursor: "pointer", fontFamily: "inherit",
                              transition: "background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s, opacity 0.15s",
                            }}
                          >
                            {copiedBullet === safeIdx ? "Copied!" : "Copy"}
                          </button>
                        )}
                      />
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If no related issues or bullets */}
            {activeBullets.length === 0 && relatedTopIssues.length === 0 && !((activeCategory === "summary" || activeCategory === "readability") && result.summaryAnalysis && (result.summaryAnalysis.improvedSummary || (result.summaryAnalysis.issues?.length ?? 0) > 0)) && (
              <div style={{
                padding: "32px", textAlign: "center",
                border: "1px solid var(--border)", borderRadius: 14,
                background: "var(--surface)",
              }}>
                {(activeCategoryScore ?? 0) >= SCORE_NEEDS_EXPLANATION ? (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                      No specific issues found
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      This category looks strong in your resume.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                      No flagged bullets in {activeCategoryLabel}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                      {activeCategoryRationale || explainingCategory === activeCategory
                        ? `The ${activeCategoryScore}/100 score is explained above.`
                        : `Scored ${activeCategoryScore ?? "–"}/100. Generating an explanation above.`}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )}

        {/* ── Full analysis (shown when no category is active) ── */}
        {!activeCategory && (
          <div className="az-overview-stack" style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 760 }}>

            {/* 1. Summary banner */}
            <section className="az-overview-summary">
              <div style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "20px 24px",
              }}>
                <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7, margin: "0 0 16px" }}>
                  {result.summary}
                </p>
                {(formatExperienceTenureChip(result.experienceSummary) || result.topStrengths.length > 0) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {formatExperienceTenureChip(result.experienceSummary) && (
                      <span
                        title="Merged tenure from experience date ranges (internships included)"
                        style={{
                          fontSize: 12, fontWeight: 600, padding: "4px 12px",
                          borderRadius: 20, background: "rgba(99,102,241,0.12)",
                          color: "var(--accent)",
                        }}
                      >
                        {formatExperienceTenureChip(result.experienceSummary)}
                      </span>
                    )}
                    {result.topStrengths.slice(0, 3).map((s, i) => (
                      <span key={i} style={{
                        fontSize: 12, fontWeight: 600, padding: "4px 12px",
                        borderRadius: 20, background: "rgba(52,211,153,0.12)",
                        color: "var(--green-ink)",
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 1b. Light "reads AI-written" nudge — only when em-dashes are heavy */}
            {(() => {
              const emCount = (result.extractedText || "").split("—").length - 1;
              if (emCount < 4) return null;
              return (
                <section>
                  <div style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderLeft: "3px solid var(--accent)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}>
                    <span aria-hidden style={{ fontSize: 16, lineHeight: 1.4 }}>✍️</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                        Reads a little AI-written
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)", margin: 0 }}>
                        Your résumé uses the em-dash (—) {emCount} times. It&rsquo;s a common AI-writing
                        tell that many recruiters notice. Swapping most of them for commas or periods
                        makes it read more like you. (The fixes this tool suggests already avoid it.)
                      </p>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* 2. Top Issues */}
            {sortedIssues.length > 0 && (
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>
                  Top Issues
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sortedIssues.map((issue, i) => (
                    <div key={i} style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px 18px",
                      background: "var(--surface)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "3px 8px",
                          borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.4,
                          background: severityBg(issue.severity),
                          color: severityColor(issue.severity),
                        }}>
                          {issue.severity}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                          {issue.issue}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.6 }}>
                        {issue.whyItMatters}
                      </p>
                      <div style={{
                        background: "var(--surface2)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 13,
                        color: "var(--text)",
                        lineHeight: 1.6,
                        borderLeft: "3px solid var(--accent)",
                      }}>
                        {issue.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2b. Structural Flags — deterministic ATS / formatting checks */}
            {Array.isArray(result.structuralFlags) && result.structuralFlags.length > 0 && (
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
                  Structural Flags
                </h2>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Formatting and completeness issues an ATS or a quick recruiter scan can trip on, separate from your bullet wording.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.structuralFlags.map((flag, i) => {
                    const sev = flag.severity ?? "low";
                    const dot = sev === "high" ? "var(--red)" : sev === "medium" ? "#f59e0b" : "var(--dim)";
                    return (
                      <div key={i} style={{
                        border: "1px solid var(--border)", borderRadius: 12,
                        padding: "14px 16px", background: "var(--surface)",
                        display: "flex", gap: 12, alignItems: "flex-start",
                      }}>
                        <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: dot, marginTop: 6, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.4, marginBottom: 3 }}>
                            {flag.issue}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                            {flag.risk}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 3. ATS Warnings */}
            {result.atsWarnings.length > 0 && (
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>
                  ATS Warnings
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.atsWarnings.map((w, i) => (
                    <div key={i} style={{
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: 10,
                      padding: "14px 16px",
                      background: "rgba(245,158,11,0.06)",
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1 }}>⚠️</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>
                            {w.warning}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                            {w.suggestion}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Keyword Analysis */}
            {result.keywordAnalysis.keywordScore !== null && (
              <section>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                    Keyword Analysis
                  </h2>
                  <span style={{
                    fontSize: 13, fontWeight: 700, padding: "3px 12px",
                    borderRadius: 20,
                    background: scoreColor(result.keywordAnalysis.keywordScore) === "var(--green)"
                      ? "rgba(52,211,153,0.12)"
                      : scoreColor(result.keywordAnalysis.keywordScore) === "var(--yellow)"
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(248,113,113,0.12)",
                    color: scoreColor(result.keywordAnalysis.keywordScore),
                  }}>
                    {result.keywordAnalysis.keywordScore}/100
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  {/* Matched */}
                  <div style={{
                    border: "1px solid var(--border)", borderRadius: 12,
                    padding: "14px 16px", background: "var(--surface)",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>
                      Matched Keywords
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.keywordAnalysis.matchedKeywords.length === 0 ? (
                        <span style={{ fontSize: 12, color: "var(--dim)" }}>None found</span>
                      ) : result.keywordAnalysis.matchedKeywords.map((kw, i) => (
                        <span key={i} style={{
                          fontSize: 11, fontWeight: 500, padding: "3px 9px",
                          borderRadius: 20, background: "rgba(52,211,153,0.12)", color: "var(--green)",
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing */}
                  <div style={{
                    border: "1px solid var(--border)", borderRadius: 12,
                    padding: "14px 16px", background: "var(--surface)",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>
                      Missing Keywords
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.keywordAnalysis.missingKeywords.length === 0 ? (
                        <span style={{ fontSize: 12, color: "var(--dim)" }}>None. Great coverage!</span>
                      ) : result.keywordAnalysis.missingKeywords.map((kw, i) => (
                        <span key={i} style={{
                          fontSize: 11, fontWeight: 500, padding: "3px 9px",
                          borderRadius: 20, background: "rgba(248,113,113,0.12)", color: "var(--red)",
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {result.keywordAnalysis.suggestions.length > 0 && (
                  <div style={{
                    border: "1px solid var(--border)", borderRadius: 10,
                    padding: "14px 16px", background: "var(--surface2)",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                      Suggestions
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                      {result.keywordAnalysis.suggestions.map((s, i) => (
                        <li key={i} style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* 5. Bullet Analysis */}
            {result.bulletAnalysis.length > 0 && (
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>
                  Weakest Bullets · AI Rewrites
                </h2>
                <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                  {result.bulletAnalysis.map((bullet, i) => {
                    const isExpanded = !!expandedBullets[i];
                    const bColor = bullet.score < 50
                      ? "var(--red)"
                      : bullet.score < 70
                      ? "#f59e0b"
                      : "var(--green)";
                    const bBg = bullet.score < 50
                      ? "rgba(248,113,113,0.12)"
                      : bullet.score < 70
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(52,211,153,0.12)";
                    const baseImp = isTrivialRewrite(bullet.originalBullet, bullet.improvedBullet)
                      ? ""
                      : (bullet.improvedBullet ?? "");
                    const previewAcc = previewLineOverrides[i] ?? bullet.originalBullet;
                    const hasAccordionRewrite = baseImp.trim().length > 0;
                    const draftAcc = hasAccordionRewrite
                      ? (rewriteEdits[i] ?? baseImp)
                      : (rewriteEdits[i] ?? previewAcc);
                    const previewLineAppliedAcc = previewLineOverrides[i] !== undefined;
                    return (
                      <div
                        key={i}
                        data-az-bullet-workspace={i}
                        style={{ borderBottom: i === result.bulletAnalysis.length - 1 ? "none" : "1px solid var(--border)" }}
                      >
                        {/* Accordion header */}
                        <div
                          onClick={() => setExpandedBullets(e => ({ ...e, [i]: !e[i] }))}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "14px 18px", cursor: "pointer",
                            background: isExpanded ? "var(--surface2)" : "var(--surface)",
                            transition: "background 0.1s",
                          }}
                        >
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "2px 8px",
                            borderRadius: 20, background: bBg, color: bColor, flexShrink: 0,
                          }}>
                            {bullet.score}
                          </span>
                          <span style={{
                            fontSize: 13, color: "var(--muted)", flex: 1, minWidth: 0,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }} title={previewAcc}>
                            <span aria-hidden style={{ color: "var(--dim)", fontWeight: 700, marginRight: "0.35em" }}>•</span>
                            {stripResumeBulletPrefix(previewAcc)}
                          </span>
                          <svg
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                            style={{
                              flexShrink: 0,
                              transition: "transform 0.2s",
                              transform: isExpanded ? "rotate(180deg)" : "none",
                            }}
                          >
                            <path d="M4 6l4 4 4-4" stroke="var(--dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>

                        {/* Accordion body */}
                        {isExpanded && (
                          <div style={{ padding: "12px 18px 16px", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 }}>
                            {bullet.issues.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {bullet.issues.map((issue, j) => (
                                  <span key={j} style={{
                                    fontSize: 11, fontWeight: 500, padding: "2px 8px",
                                    borderRadius: 20, background: "rgba(248,113,113,0.10)", color: "var(--red)",
                                  }}>
                                    {issue}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div style={{
                              fontSize: 13, color: "var(--muted)", fontStyle: "italic",
                              borderLeft: "3px solid var(--border)", paddingLeft: 12,
                              lineHeight: 1.6,
                            }}>
                              {previewAcc}
                              {previewLineAppliedAcc && (
                                <span style={{ marginLeft: 6, color: "#fbbf24", fontSize: 11, fontWeight: 700 }} title="Preview line replaced for this session">●</span>
                              )}
                            </div>
                            {hasAccordionRewrite ? (
                              <BulletImprovedEditor
                                layout="plain"
                                value={draftAcc}
                                onChange={v => patchBulletRewrite(i, v)}
                                onReset={() => patchBulletRewrite(i, null)}
                                canReset={rewriteEdits[i] !== undefined}
                                previewLineApplied={previewLineAppliedAcc}
                                onReplaceInPreview={() => patchPreviewLine(i, draftAcc.trim())}
                                onRevertPreviewLine={() => patchPreviewLine(i, null)}
                                onTextareaFocus={() => onBulletWorkspaceTextareaFocus(i)}
                                onTextareaBlur={e => onBulletWorkspaceTextareaBlur(i, e)}
                                toolbarRight={(
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      copyBullet(draftAcc, i);
                                    }}
                                    style={{
                                      display: "inline-flex", alignItems: "center", gap: 4,
                                      padding: "3px 9px", borderRadius: 6,
                                      border: `1px solid ${copiedBullet === i ? "rgba(52,211,153,0.5)" : "rgba(52,211,153,0.3)"}`,
                                      background: copiedBullet === i ? "rgba(52,211,153,0.15)" : "rgba(52,211,153,0.08)",
                                      color: "var(--green)", fontSize: 11, fontWeight: 600,
                                      cursor: "pointer", fontFamily: "inherit", transition: "background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s, opacity 0.15s",
                                    }}
                                  >
                                    {copiedBullet === i ? "✓ Copied" : "Copy"}
                                  </button>
                                )}
                              />
                            ) : (
                              <BulletImprovedEditor
                                layout="plain"
                                value={draftAcc}
                                onChange={v => patchBulletRewrite(i, v)}
                                onReset={() => patchBulletRewrite(i, null)}
                                canReset={rewriteEdits[i] !== undefined}
                                eyebrow="Manual edit"
                                helperText="Start from the original"
                                resetLabel="Reset to original"
                                accentColor="var(--amber)"
                                previewLineApplied={previewLineAppliedAcc}
                                onReplaceInPreview={() => patchPreviewLine(i, draftAcc.trim())}
                                onRevertPreviewLine={() => patchPreviewLine(i, null)}
                                onTextareaFocus={() => onBulletWorkspaceTextareaFocus(i)}
                                onTextareaBlur={e => onBulletWorkspaceTextareaBlur(i, e)}
                                toolbarRight={(
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      copyBullet(draftAcc, i);
                                    }}
                                    style={{
                                      display: "inline-flex", alignItems: "center", gap: 4,
                                      padding: "3px 9px", borderRadius: 6,
                                      border: `1px solid ${copiedBullet === i ? "rgba(251,191,36,0.55)" : "rgba(251,191,36,0.34)"}`,
                                      background: copiedBullet === i ? "rgba(251,191,36,0.16)" : "rgba(251,191,36,0.08)",
                                      color: "var(--amber)", fontSize: 11, fontWeight: 600,
                                      cursor: "pointer", fontFamily: "inherit", transition: "background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s, opacity 0.15s",
                                    }}
                                  >
                                    {copiedBullet === i ? "✓ Copied" : "Copy draft"}
                                  </button>
                                )}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 6. Section Feedback */}
            {result.sectionFeedback.length > 0 && (
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>
                  Section Feedback
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                  {result.sectionFeedback.map((sf, i) => (
                    <div key={i} style={{
                      border: "1px solid var(--border)", borderRadius: 12,
                      padding: "14px 16px", background: "var(--surface)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{sf.section}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(sf.score) }}>{sf.score}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--surface2)", overflow: "hidden", marginBottom: 8 }}>
                        <div style={{
                          height: "100%", borderRadius: 2,
                          width: `${sf.score}%`,
                          background: scoreColor(sf.score),
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{sf.feedback}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Rewrite Suggestions */}
            {result.rewriteSuggestions.length > 0 && (
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>
                  Suggested Rewrites
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {result.rewriteSuggestions.map((rw, i) => (
                    <div key={i} style={{
                      border: "1px solid var(--border)", borderRadius: 12,
                      padding: "16px 18px", background: "var(--surface)",
                    }}>
                      <div style={{
                        fontSize: 13, color: "var(--muted)", fontStyle: "italic",
                        borderLeft: "3px solid var(--border)", paddingLeft: 12,
                        lineHeight: 1.6, marginBottom: 10,
                      }}>
                        {rw.before}
                      </div>
                      <div style={{
                        fontSize: 13, color: "var(--green)",
                        borderLeft: "3px solid var(--green)", paddingLeft: 12,
                        lineHeight: 1.6, marginBottom: 10,
                      }}>
                        {rw.after}
                      </div>
                      <div style={{
                        fontSize: 11, color: "var(--dim)", fontStyle: "italic",
                        paddingLeft: 15,
                      }}>
                        {rw.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 8. Final Recommendations */}
            {result.finalRecommendations.length > 0 && (
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>
                  Final Recommendations
                </h2>
                <div style={{
                  border: "1px solid var(--border)", borderRadius: 12,
                  padding: "18px 20px", background: "var(--surface2)",
                }}>
                  <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.finalRecommendations.map((rec, i) => (
                      <li key={i} style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
                        {rec}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            {/* ── Analyze another CTA ───────────────────── */}
            <section>
              <div style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 32,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                textAlign: "center",
              }}>
                <div>
                  <div style={{
                    fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
                    fontSize: 26, fontWeight: 600, letterSpacing: -0.5,
                    color: "var(--text)", marginBottom: 6,
                  }}>
                    Ready to analyze another?
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                    Upload a new résumé PDF or paste a different job description<br />to get a fresh score and set of recommendations.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  {/* Primary — go back to Analyze home */}
                  <button
                    type="button"
                    onClick={startOverAnalyze}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "11px 22px", borderRadius: 10,
                      background: "var(--amber)", border: "none", color: "#fff",
                      fontSize: 14, fontWeight: 600, cursor: "pointer",
                      transition: "opacity var(--transition)",
                      letterSpacing: -0.2,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v9M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    New scan
                  </button>

                  {/* Secondary — clear and start over */}
                  <button
                    type="button"
                    onClick={startOverAnalyze}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "11px 20px", borderRadius: 10,
                      background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)",
                      fontSize: 14, fontWeight: 500, cursor: "pointer",
                      transition: "background var(--transition), border-color var(--transition)",
                      letterSpacing: -0.2,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--surface3)"; e.currentTarget.style.borderColor = "var(--border-h)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    ← Start over
                  </button>
                </div>
              </div>
            </section>

          </div>
        )}
        {/* end !activeCategory full-analysis block */}
          </div>
        ) : null}

      </main>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: "none" }}
        onChange={e => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
