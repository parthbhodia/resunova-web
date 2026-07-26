"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTemplateBuilderStore } from "@/store/templateBuilderStore";
import { getSupabaseClient, fetchBuilderResumeById, upsertBuilderResume } from "@/lib/supabase";
import type { TemplateBuilderStore } from "@/store/templateBuilderStore";
import { useHtmlPdfExport } from "@/hooks/useHtmlPdfExport";
import ResumePreview from "./ResumePreview";
import type { TBFont } from "./types";
import { PAGE_WIDTH_OPTIONS, STYLE_PRESETS } from "./templateStyles";
import { resumeFileClientError } from "@/lib/utils";
import { buildNameRoleExportFilename } from "@/lib/resumeFileName";
import { consumeTemplateBuilderStructuredPrefill, stashTemplateBuilderStructuredPrefillFromAnalysisResult } from "@/lib/templateBuilderPrefill";
import TemplateBuilderSectionsPanel from "./TemplateBuilderSectionsPanel";
import { useSupabaseSignedIn } from "@/hooks/useSupabaseSignedIn";
import SignInToUseAi from "@/components/CoverLetterBuilder/SignInToUseAi";
import TemplateBuilderReviewPanel, { reviewScoreColor, type ReviewResult } from "./TemplateBuilderReviewPanel";
import { apiFetch } from "@/lib/apiClient";

/* ── Shared style helpers ──────────────────────────────────────── */
const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "8px 11px",
  borderRadius: 6,
  border: "1.5px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  marginBottom: 4,
};

const textareaBase: React.CSSProperties = {
  ...inputBase,
  resize: "vertical",
  minHeight: 84,
  lineHeight: 1.5,
};

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: half ? "1 1 0" : "none" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>{children}</div>;
}

function FieldWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}>{children}</div>;
}

const addBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: "none",
  border: "1.5px dashed var(--border)",
  borderRadius: 7,
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 14px",
  cursor: "pointer",
  width: "100%",
  marginTop: 6,
  transition: "border-color 0.15s, background 0.15s",
};

const removeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--muted)",
  fontSize: 11,
  cursor: "pointer",
  padding: "2px 4px",
  borderRadius: 4,
};

const orderBtnStyle: React.CSSProperties = {
  background: "var(--surface2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontSize: 11,
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: 4,
  lineHeight: 1.2,
};

const dividerStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--border)",
  margin: "14px 0",
};

const ENTRY_LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text)",
  letterSpacing: 0.1,
};

/* ── AI-enhanced textarea ──────────────────────────────────────── */
function countWords(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Gated /api/tb-enhance call. AI is an account feature (consistent with
 *  section generation + the Cover Letter builder), so we require a Supabase
 *  session and return `{needSignIn:true}` when signed out for the caller to
 *  prompt sign-in. */
async function tbEnhanceCall(
  text: string,
  type: "bullets" | "summary",
  context?: { role?: string; company?: string },
): Promise<{ ok: true; enhanced: string } | { ok: false; needSignIn?: boolean; error?: string }> {
  let token: string | undefined;
  try {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    token = session?.access_token;
  } catch { /* treat as signed out */ }
  if (!token) return { ok: false, needSignIn: true };
  try {
    const res = await apiFetch("/api/tb-enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, type, context: context ?? {} }),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, needSignIn: true };
    const data = await res.json();
    if (!res.ok || !data.enhanced) return { ok: false, error: data.error || "AI error" };
    return { ok: true, enhanced: String(data.enhanced) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

interface AITextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  type: "bullets" | "summary";
  context?: { role?: string; company?: string };
  onEnhanced: (text: string) => void;
}

function AITextarea({ type, context, onEnhanced, value, style, ...rest }: AITextareaProps) {
  const { signedIn, signingIn, signIn } = useSupabaseSignedIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoVal, setUndoVal] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const wordCount = countWords(String(value ?? ""));
  const showBtn = wordCount >= 3;

  const enhance = useCallback(async () => {
    setError(null);
    if (signedIn === false) { setShowSignIn(true); return; }
    setLoading(true);
    setShowSignIn(false);
    const r = await tbEnhanceCall(String(value ?? ""), type, context);
    setLoading(false);
    if (!r.ok) {
      if (r.needSignIn) { setShowSignIn(true); return; }
      setError(r.error || "Failed");
      return;
    }
    setUndoVal(String(value ?? ""));
    onEnhanced(r.enhanced);
  }, [value, type, context, onEnhanced, signedIn]);

  const undo = useCallback(() => {
    if (undoVal !== null) {
      onEnhanced(undoVal);
      setUndoVal(null);
    }
  }, [undoVal, onEnhanced]);

  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={value}
        style={{ ...textareaBase, ...style as React.CSSProperties, paddingBottom: showBtn ? 36 : undefined }}
        {...rest}
      />
      {showBtn && (
        <div style={{
          position: "absolute",
          bottom: 7,
          right: 8,
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}>
          {error && (
            <span style={{ fontSize: 10, color: "var(--red, #ef4444)", maxWidth: 140, textAlign: "right" }}>{error}</span>
          )}
          {undoVal !== null && !loading && (
            <button
              type="button"
              onClick={undo}
              title="Undo AI enhancement"
              style={{
                fontSize: 10, color: "var(--muted)", background: "var(--surface2)",
                border: "1px solid var(--border)", borderRadius: 5, padding: "3px 7px",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >↩ Undo</button>
          )}
          <button
            type="button"
            onClick={enhance}
            disabled={loading}
            title="Enhance with AI (ATS-optimized)"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 600,
              color: loading ? "var(--muted)" : "#fff",
              background: loading ? "var(--surface2)" : "var(--accent)",
              border: "none", borderRadius: 5,
              padding: "4px 9px", cursor: loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap", transition: "background 0.15s",
            }}
          >
            {loading
              ? <><span style={{ width: 10, height: 10, border: "1.5px solid var(--border)", borderTopColor: "var(--muted)", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Enhancing…</>
              : <>✦ AI Enhance{signedIn === false && <span aria-hidden="true" style={{ opacity: 0.8, fontSize: 10 }}>🔒</span>}</>}
          </button>
        </div>
      )}
      {showSignIn && (
        <div style={{ position: "absolute", bottom: 44, right: 8, zIndex: 20 }}>
          <SignInToUseAi
            variant="popover"
            signingIn={signingIn}
            onSignIn={signIn}
            onDismiss={() => setShowSignIn(false)}
            title="Sign in to use AI Enhance"
            subtitle="AI rewriting is free with a Google account."
          />
        </div>
      )}
    </div>
  );
}

/* ── AI Generate button (writes section from scratch) ──────────── */

interface AIGenerateButtonProps {
  /** Determines the endpoint kind and context shape. */
  kind: "summary" | "skills";
  /** Context pulled from the current builder data. */
  buildContext: {
    name?: string;
    role?: string;
    company?: string;
    experiences?: Array<{ jobTitle: string; company: string; bullets: string }>;
    education?: Array<{ degree: string; school: string }>;
    skills?: string;
  };
  /** Called with the generated text when the request succeeds. */
  onGenerated: (result: string | string[]) => void;
  /** Visual label for the button. */
  label?: string;
}

/**
 * A standalone "Generate with AI" button for template builder sections.
 * Gates on sign-in (consistent with CoverLetterBuilder AITextarea). Shows
 * a popover sign-in prompt for signed-out users instead of firing a doomed
 * request, and handles 401/403 the same way.
 */
function AIGenerateButton({ kind, buildContext, onGenerated, label = "✦ Generate with AI" }: AIGenerateButtonProps) {
  const { signedIn, signingIn, signIn } = useSupabaseSignedIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  const generate = useCallback(async () => {
    setError(null);
    if (signedIn === false) {
      setShowSignIn(true);
      return;
    }
    setLoading(true);
    setShowSignIn(false);
    try {
      const db = getSupabaseClient();
      const { data: { session } } = await db.auth.getSession();
      if (!session?.access_token) {
        setShowSignIn(true);
        setLoading(false);
        return;
      }
      const res = await apiFetch("/api/tb-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, context: buildContext }),
      });
      if (res.status === 401 || res.status === 403) {
        setShowSignIn(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI error");
      if (kind === "summary") {
        const generated = (data.generated || "").trim();
        if (!generated) throw new Error("Empty response from AI");
        onGenerated(generated);
      } else {
        const skills = Array.isArray(data.skills) ? data.skills : [];
        if (!skills.length) throw new Error("Empty response from AI");
        onGenerated(skills);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [kind, buildContext, onGenerated, signedIn]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        title={signedIn === false ? "Sign in to use AI generation" : `Generate ${kind} with AI`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          fontWeight: 600,
          color: loading ? "var(--muted)" : "var(--accent)",
          background: "var(--surface2)",
          border: "1.5px solid var(--border)",
          borderRadius: 7,
          padding: "6px 12px",
          cursor: loading ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: 10, height: 10,
              border: "1.5px solid var(--border)", borderTopColor: "var(--accent)",
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
              display: "inline-block", flexShrink: 0,
            }} />
            Generating…
          </>
        ) : (
          <>
            {label}
            {signedIn === false && <span aria-hidden="true" style={{ opacity: 0.75, fontSize: 11 }}>🔒</span>}
          </>
        )}
      </button>
      {error && (
        <div style={{ marginTop: 5, fontSize: 11, color: "var(--red, #ef4444)" }}>{error}</div>
      )}
      {showSignIn && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20 }}>
          <SignInToUseAi
            variant="popover"
            signingIn={signingIn}
            onSignIn={signIn}
            onDismiss={() => setShowSignIn(false)}
            title="Sign in to generate with AI"
            subtitle="AI section generation is free with a Google account."
          />
        </div>
      )}
    </div>
  );
}

/* ── Customization constants ───────────────────────────────────── */
const ACCENT_PRESETS = [
  { label: "Charcoal", value: "#1a1a1a" },
  { label: "Navy",     value: "#1e3a5f" },
  { label: "Forest",   value: "#1a4731" },
  { label: "Burgundy", value: "#6b2737" },
  { label: "Steel",    value: "#2d5986" },
  { label: "Slate",    value: "#475569" },
  { label: "Plum",     value: "#5b2d8e" },
  { label: "Teal",     value: "#0f5561" },
];

const FONT_OPTIONS: { label: string; value: TBFont; sub: string }[] = [
  { label: "Helvetica", value: "Helvetica",   sub: "Modern & clean" },
  { label: "Times Roman", value: "Times-Roman", sub: "Classic serif" },
  { label: "Courier", value: "Courier",     sub: "Technical / developer" },
];

/**
 * The editor has three MODES, not eight tabs. Everything you actually write —
 * profile, experience, education, projects, skills — lives together in one
 * continuously scrollable "Content" column (the EnhanceCV/Teal pattern), so
 * filling out a résumé is one scroll instead of eight round-trips through a
 * tab bar. Design and Review are genuinely different activities, so they stay
 * separate modes.
 */
type EditorMode = "content" | "design" | "review";

const MODES: { key: EditorMode; label: string; icon: string }[] = [
  { key: "content", label: "Content", icon: "📝" },
  { key: "design",  label: "Design",  icon: "🎨" },
  // Not "✦" — that glyph is the app's established AI/magic marker (AI Enhance,
  // AI Generate, etc. throughout this file); Review is a plain checklist mode,
  // and reusing ✦ here collided with the toolbar's "Check ATS" button.
  { key: "review",  label: "Review",  icon: "🔍" },
];

/** Anchors for the in-column jump nav. Order matches the stacked blocks. */
type ContentBlockKey = "sections" | "profile" | "experience" | "education" | "projects" | "skills";

const CONTENT_BLOCKS: { key: ContentBlockKey; label: string; icon: string }[] = [
  { key: "sections",   label: "Arrange",    icon: "☰" },
  { key: "profile",    label: "Profile",    icon: "👤" },
  { key: "experience", label: "Experience", icon: "💼" },
  { key: "education",  label: "Education",  icon: "🎓" },
  { key: "projects",   label: "Projects",   icon: "🚀" },
  { key: "skills",     label: "Skills",     icon: "⚡" },
];

const contentBlockDomId = (key: ContentBlockKey) => `tb-block-${key}`;

export default function TemplateBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useTemplateBuilderStore();
  const { data, loaded } = store;
  const [mode, setMode] = useState<EditorMode>("content");
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [savedBuilderId, setSavedBuilderId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{
    kind: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const { exportPdf: exportHtmlPdf, exporting: isGenerating, error: htmlPdfError } = useHtmlPdfExport();

  // Responsive: on iPad / narrow widths the 340px form panel + preview don't
  // both fit, so the form collapses to a vertical icon rail and the active
  // section opens as a flyout drawer over the preview.
  const rootRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const builderIdFromUrl = (searchParams?.get("builder") ?? "").trim();
  const presetFromUrl = (searchParams?.get("preset") ?? "").trim().toLowerCase();

  const showFeedback = useCallback((kind: "success" | "error" | "info", message: string) => {
    setFeedbackToast({ kind, message });
    if (kind === "success") {
      setSaveFlash(true);
      window.setTimeout(() => setSaveFlash(false), 2500);
    }
  }, []);

  useEffect(() => {
    if (!feedbackToast) return;
    const ms = feedbackToast.kind === "error" ? 8000 : 5200;
    const t = window.setTimeout(() => setFeedbackToast(null), ms);
    return () => window.clearTimeout(t);
  }, [feedbackToast]);

  // Watch the builder's own width (robust to the app nav sidebar state). Deps
  // include `loaded` because the root div only mounts once loaded — without it
  // the observer would attach to a null ref and never fire (same gotcha the
  // Cover Letter builder hit).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setNarrow(w < 880);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loaded]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session?.user?.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user?.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    store.loadFromStorage();
    const prefill = consumeTemplateBuilderStructuredPrefill();
    if (prefill) store.replaceData(prefill);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded || !builderIdFromUrl) return;
    let cancelled = false;
    void fetchBuilderResumeById(builderIdFromUrl)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          showFeedback("error", "Saved résumé not found, or you need to sign in.");
          return;
        }
        store.replaceData(row.data);
        setSavedBuilderId(row.id);
        setSavedLabel(row.label);
        showFeedback("info", `Loaded “${row.label}” from Resume Hub`);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          showFeedback("error", e instanceof Error ? e.message : String(e));
        }
      });
    return () => { cancelled = true; };
  }, [loaded, builderIdFromUrl, showFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preselect a style preset from the landing template gallery
  // (?preset=executive|modern|classic). Skipped when loading a specific saved
  // résumé (?builder=) so we don't clobber that résumé's saved style.
  useEffect(() => {
    if (!loaded || !presetFromUrl || builderIdFromUrl) return;
    const preset = STYLE_PRESETS.find((p) => p.id === presetFromUrl);
    if (!preset) return;
    if (data.customization.stylePreset === preset.id) return;
    // Apply the FULL preset, not just the id — creative presets carry an
    // enforcedLayout (e.g. rightSidebar) plus their own font/accent, and
    // setting only stylePreset would leave the layout on "single".
    store.setCustomization("stylePreset", preset.id);
    store.setCustomization("font", preset.font);
    store.setCustomization("accentColor", preset.accentColor);
    if (preset.enforcedLayout) {
      store.setCustomization("layout", preset.enforcedLayout);
    } else if (data.customization.layout === "rightSidebar" || data.customization.layout === "topBannerRightSidebar") {
      store.setCustomization("layout", "single");
    }
  }, [loaded, presetFromUrl, builderIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveToLibrary = useCallback(async () => {
    if (signedIn === false) {
      showFeedback("error", "Sign in to save this résumé to Resume Hub.");
      return;
    }
    const defaultLabel = savedLabel?.trim() || data.profile.name?.trim() || "My résumé";
    const label = typeof window !== "undefined"
      ? window.prompt("Name for Resume Hub", defaultLabel)?.trim()
      : defaultLabel;
    if (!label) {
      showFeedback("info", "Save cancelled — no name entered.");
      return;
    }

    const isUpdate = !!(savedBuilderId ?? builderIdFromUrl);
    setSaveBusy(true);
    try {
      const existingId = savedBuilderId ?? (builderIdFromUrl || undefined);
      const id = await upsertBuilderResume(label, data, existingId);
      if (!id) {
        showFeedback("error", "Sign in to save this résumé to Resume Hub.");
        return;
      }
      setSavedBuilderId(id);
      setSavedLabel(label);
      showFeedback(
        "success",
        isUpdate
          ? `Updated “${label}” in Resume Hub`
          : `Saved “${label}” to Resume Hub`,
      );
      if (builderIdFromUrl !== id) {
        router.replace(`/template-builder/?builder=${encodeURIComponent(id)}`);
      }
    } catch (e: unknown) {
      showFeedback("error", e instanceof Error ? e.message : String(e));
    } finally {
      setSaveBusy(false);
    }
  }, [signedIn, data, savedBuilderId, savedLabel, builderIdFromUrl, router, showFeedback]);

  const handleDownload = useCallback(() => {
    setDownloadError(null);
    if (!previewRef.current) {
      setDownloadError("Resume preview is not ready yet.");
      return;
    }
    const roleLabel = data.workExperiences[0]?.jobTitle?.trim() || "Resume";
    const filename = buildNameRoleExportFilename(data.profile.name, roleLabel, null, "pdf");
    void exportHtmlPdf(previewRef.current, filename);
  }, [data.profile.name, data.workExperiences, exportHtmlPdf]);

  const handleImportFile = useCallback(async (file: File) => {
    setImportError(null);
    const fileErr = resumeFileClientError(file);
    if (fileErr) {
      setImportError(fileErr);
      return;
    }
    // Confirm overwrite if builder already has meaningful content
    const hasContent =
      data.profile.name.trim() ||
      data.workExperiences.some((w) => w.company.trim() || w.bullets.trim());
    if (hasContent && typeof window !== "undefined") {
      const ok = window.confirm(
        "This will replace your current builder content with the imported resume. Continue?",
      );
      if (!ok) return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await apiFetch("/api/upload-resume", { method: "POST", body: fd });
      const json = (await resp.json()) as { error?: string; structuredResume?: unknown };
      if (!resp.ok) {
        throw new Error(json.error ?? `Upload failed (${resp.status})`);
      }
      const ok = stashTemplateBuilderStructuredPrefillFromAnalysisResult(json);
      if (!ok) {
        throw new Error("Could not extract structured data from this file. Try a more complete PDF résumé.");
      }
      const prefill = consumeTemplateBuilderStructuredPrefill();
      if (!prefill) {
        throw new Error("Failed to map the extracted resume into the builder. Please try again.");
      }
      store.replaceData(prefill);
      showFeedback("success", "Resume imported — fill in any missing details below.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Import failed. Please try again.";
      setImportError(msg);
    } finally {
      setImporting(false);
    }
  }, [data.profile.name, data.workExperiences, store, showFeedback]);

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>
        <div style={{ width: 18, height: 18, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const c = data.customization;

  const toastBg =
    feedbackToast?.kind === "success"
      ? "rgba(4, 120, 87, 0.96)"
      : feedbackToast?.kind === "error"
        ? "rgba(185, 28, 28, 0.96)"
        : "rgba(30, 41, 59, 0.96)";

  // Scroll a content block into view within the editor column. Used by the
  // jump nav and by the Arrange panel's per-section edit button — in the
  // scrolling editor "edit this section" means "take me to it", not "swap tabs".
  // Plain function, not useCallback: this sits below an early return, so a hook
  // here would break hook ordering.
  const jumpToBlock = (key: ContentBlockKey) => {
    document.getElementById(contentBlockDomId(key))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // The editor body. In "content" mode every writable section is stacked in one
  // scrollable column so the whole résumé can be filled top-to-bottom without
  // hunting through tabs.
  const editorBody = (
    <>
      {mode === "content" && (
        <>
          <ContentBlock id={contentBlockDomId("sections")} title="Arrange sections" icon="☰" first>
            <TemplateBuilderSectionsPanel
              store={store}
              sectionOrder={data.sectionOrder}
              hiddenSections={data.hiddenSections}
              customSections={data.customSections}
              editingCustomId={editingCustomId}
              onEditCustomSection={setEditingCustomId}
              onEditSection={(tab) => {
                setEditingCustomId(null);
                jumpToBlock(tab);
              }}
            />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("profile")} title="Profile" icon="👤">
            <ProfileSection store={store} data={data} />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("experience")} title="Experience" icon="💼">
            <ExperienceSection store={store} data={data} />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("education")} title="Education" icon="🎓">
            <EducationSection store={store} data={data} />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("projects")} title="Projects" icon="🚀">
            <ProjectsSection store={store} data={data} />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("skills")} title="Skills" icon="⚡">
            <SkillsSection store={store} data={data} />
          </ContentBlock>
        </>
      )}
      {mode === "design" && <CustomizeSection store={store} c={c} />}
      {mode === "review" && <TemplateBuilderReviewPanel data={data} result={reviewResult} onResult={setReviewResult} />}
    </>
  );

  const activeModeMeta = MODES.find((m) => m.key === mode);

  const modeSwitcher = (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${MODES.length}, 1fr)`, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          style={{
            background: mode === m.key ? "var(--bg)" : "transparent",
            border: "none",
            borderBottom: mode === m.key ? "2px solid var(--accent)" : "2px solid transparent",
            borderRight: "1px solid var(--border)",
            padding: "10px 4px", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6, transition: "background 0.12s",
            color: mode === m.key ? "var(--accent)" : "var(--muted)", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 14 }} aria-hidden>{m.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.2 }}>{m.label}</span>
        </button>
      ))}
    </div>
  );

  // Jump nav — only meaningful for the long stacked content column.
  const jumpNav = mode === "content" ? (
    <div
      className="rn-scroll-rail"
      style={{
        display: "flex", gap: 4, padding: "7px 10px", overflowX: "auto",
        background: "var(--surface2)", borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}
    >
      {CONTENT_BLOCKS.map((b) => (
        <button
          key={b.key}
          onClick={() => jumpToBlock(b.key)}
          title={`Jump to ${b.label}`}
          style={{
            flexShrink: 0, background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit",
            fontSize: 11, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap",
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={rootRef} style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
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
            padding: "12px 16px",
            borderRadius: 12,
            background: toastBg,
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 14px 30px rgba(2,6,23,0.35)",
            color: "#f8fafc",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.45,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {feedbackToast.kind === "success" ? (
            <svg width="18" height="18" viewBox="0 0 12 12" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M2 6.5 4.5 9 10 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
          <span>{feedbackToast.message}</span>
        </div>
      ) : null}

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 52,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        flexShrink: 0,
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: -0.3 }}>
            Template Builder
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)", padding: "2px 7px", border: "1px solid var(--border)", borderRadius: 10 }}>
            Free
          </span>
          <button
            type="button"
            onClick={() => { setMode("review"); setPanelOpen(true); }}
            title={reviewResult ? "Open ATS & Job Match review" : "Score your résumé against a job"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", fontFamily: "inherit",
              fontSize: 11, fontWeight: 700,
              padding: "3px 9px", borderRadius: 10,
              border: `1px solid ${reviewResult?.overallScore != null ? reviewScoreColor(reviewResult.overallScore) : "var(--border)"}`,
              background: "transparent",
              color: reviewResult?.overallScore != null ? reviewScoreColor(reviewResult.overallScore) : "var(--muted)",
            }}
          >
            <span aria-hidden>✦</span>
            {reviewResult?.overallScore != null ? `ATS ${reviewResult.overallScore}` : "Check ATS"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {saveFlash ? (
            <span
              role="status"
              style={{
                fontSize: 12,
                color: "var(--green-ink, #047857)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2 6.5 4.5 9 10 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
          ) : savedLabel && savedBuilderId ? (
            <span style={{ fontSize: 11, color: "var(--muted)", maxWidth: 160 }} title="Cloud copy in Resume Hub">
              Hub: {savedLabel}
            </span>
          ) : null}
          <button
            onClick={store.reset}
            title="Restore example resume"
            style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 11px", cursor: "pointer" }}
          >
            Load Example
          </button>
          {/* ── Import resume ─────────────────────────────────── */}
          {importError && (
            <span style={{ fontSize: 11, color: "var(--red, #ef4444)", maxWidth: 200 }}>{importError}</span>
          )}
          <button
            onClick={() => { setImportError(null); importFileRef.current?.click(); }}
            disabled={importing}
            title="Import an existing PDF or Word résumé to fill the builder"
            style={{
              fontSize: 12,
              color: importing ? "var(--muted)" : "var(--text)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "5px 11px",
              cursor: importing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              opacity: importing ? 0.7 : 1,
            }}
          >
            {importing ? (
              <>
                <span style={{ width: 10, height: 10, border: "1.5px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                Importing…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                  <path d="M6.5 1v7.5M3 6l3.5 3.5L10 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 10.5v1a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Import Resume
              </>
            )}
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => void handleSaveToLibrary()}
            disabled={saveBusy || signedIn === false}
            title={signedIn === false ? "Sign in to save to Resume Hub" : savedBuilderId ? "Update saved copy in Resume Hub" : "Save to Resume Hub"}
            style={{
              fontSize: 12,
              color: signedIn === false ? "var(--dim)" : "var(--text)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "5px 11px",
              cursor: saveBusy || signedIn === false ? "not-allowed" : "pointer",
              opacity: saveBusy ? 0.7 : 1,
            }}
          >
            {saveBusy ? "Saving…" : saveFlash ? "Saved ✓" : savedBuilderId ? "Update in Hub" : "Save to Hub"}
          </button>
          {(downloadError || htmlPdfError) && (
            <span style={{ fontSize: 11, color: "var(--red, #ef4444)", maxWidth: 200 }}>{downloadError || htmlPdfError}</span>
          )}
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            style={{
              background: isGenerating ? "var(--surface3)" : "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: isGenerating ? "not-allowed" : "pointer",
              opacity: isGenerating ? 0.7 : 1,
              transition: "opacity 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isGenerating ? (
              <>
                <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                Generating…
              </>
            ) : "↓ Download PDF"}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {/* ── Left: Form Panel ──────────────────────────────── */}
        {narrow ? (
          <>
            {/* Collapsed icon rail — taps open that mode as a flyout */}
            <div style={{
              width: 56, flexShrink: 0, display: "flex", flexDirection: "column",
              borderRight: "1px solid var(--border)", background: "var(--surface)", overflowY: "auto", zIndex: 27,
            }}>
              {MODES.map((m) => {
                const isOpen = panelOpen && mode === m.key;
                return (
                  <button
                    key={m.key}
                    title={m.label}
                    onClick={() => {
                      if (panelOpen && mode === m.key) setPanelOpen(false);
                      else { setMode(m.key); setPanelOpen(true); }
                    }}
                    style={{
                      border: "none",
                      borderLeft: isOpen ? "3px solid var(--accent)" : "3px solid transparent",
                      background: isOpen ? "var(--bg)" : "transparent",
                      cursor: "pointer", fontFamily: "inherit",
                      padding: "11px 2px 9px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      color: isOpen ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    <span style={{ fontSize: 17 }} aria-hidden>{m.icon}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 0.2, lineHeight: 1.1, textAlign: "center" }}>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Flyout drawer over the preview */}
            {panelOpen && (
              <>
                <div
                  onClick={() => setPanelOpen(false)}
                  style={{ position: "absolute", left: 56, top: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.28)", zIndex: 25 }}
                />
                <div style={{
                  position: "absolute", left: 56, top: 0, bottom: 0,
                  width: "min(340px, calc(100% - 56px))", zIndex: 26,
                  background: "var(--surface)", borderRight: "1px solid var(--border)",
                  boxShadow: "8px 0 28px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span aria-hidden style={{ fontSize: 15 }}>{activeModeMeta?.icon}</span>{activeModeMeta?.label}
                    </span>
                    <button
                      onClick={() => setPanelOpen(false)}
                      title="Hide editor"
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}
                    >‹ Hide</button>
                  </div>
                  {jumpNav}
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 36px" }}>
                    {editorBody}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{
            width: 340, minWidth: 300, flexShrink: 0, display: "flex", flexDirection: "column",
            borderRight: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden",
          }}>
            {modeSwitcher}
            {jumpNav}

            {/* One continuous scroll — all content sections stacked */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px 32px" }}>
              {editorBody}
            </div>
          </div>
        )}

        {/* ── Right: Preview Panel ──────────────────────────── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "var(--surface2)",
          overflow: "hidden",
        }}>
          <div style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "auto",
            padding: "28px 20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
          }}>
            <div style={{ transform: "scale(0.82)", transformOrigin: "top center", minWidth: "8.5in" }}>
              <ResumePreview ref={previewRef} data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Bullet list editor ────────────────────────────────────────── */

function parseBulletsToArray(raw: string, minRows = 1): string[] {
  const lines = raw.split("\n").map((l) => l.replace(/^[•·\-*]\s*/, "").trim());
  const filtered = lines.filter((l) => l.length > 0);
  if (filtered.length > 0) return filtered;
  return Array.from({ length: Math.max(1, minRows) }, () => "");
}

function joinBulletsFromArray(items: string[]): string {
  return items.filter((l) => l.trim()).join("\n");
}

interface BulletRowProps {
  value: string;
  isFirst: boolean;
  isLast: boolean;
  context?: { role?: string; company?: string };
  onChange: (v: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  signedIn?: boolean | null;
  onRequireSignIn?: () => void;
}

function BulletRow({ value, isFirst, isLast, context, onChange, onMoveUp, onMoveDown, onRemove, signedIn, onRequireSignIn }: BulletRowProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [undoVal, setUndoVal] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const showAi = wordCount >= 3;

  const enhance = useCallback(async () => {
    setAiError(null);
    if (signedIn === false) { onRequireSignIn?.(); return; }
    setAiLoading(true);
    const r = await tbEnhanceCall(value, "bullets", context);
    setAiLoading(false);
    if (!r.ok) {
      if (r.needSignIn) { onRequireSignIn?.(); return; }
      setAiError(r.error || "Failed");
      return;
    }
    setUndoVal(value);
    const enhanced = r.enhanced.split("\n")[0].replace(/^[•·\-*]\s*/, "").trim();
    onChange(enhanced);
  }, [value, context, onChange, signedIn, onRequireSignIn]);

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
      <span style={{ color: "var(--muted)", fontSize: 14, marginTop: 9, flexShrink: 0, userSelect: "none" }}>•</span>
      <div style={{ flex: 1, position: "relative" }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{
            ...textareaBase,
            minHeight: 38,
            resize: "vertical",
            paddingRight: showAi ? 82 : undefined,
            lineHeight: 1.45,
            fontSize: 12.5,
          }}
          placeholder="Describe an achievement or responsibility..."
        />
        {showAi && (
          <div style={{ position: "absolute", bottom: 7, right: 7, display: "flex", gap: 4, alignItems: "center" }}>
            {aiError && (
              <span style={{ fontSize: 9, color: "var(--red, #ef4444)", maxWidth: 110, textAlign: "right", lineHeight: 1.2 }}>{aiError}</span>
            )}
            {undoVal !== null && !aiLoading && (
              <button
                type="button"
                onClick={() => { onChange(undoVal); setUndoVal(null); }}
                style={{
                  fontSize: 9, color: "var(--muted)", background: "var(--surface2)",
                  border: "1px solid var(--border)", borderRadius: 4, padding: "2px 5px", cursor: "pointer",
                }}
              >↩</button>
            )}
            <button
              type="button"
              onClick={enhance}
              disabled={aiLoading}
              title={signedIn === false ? "Sign in to rewrite this bullet with AI" : "Rewrite this bullet with AI"}
              style={{
                fontSize: 10, fontWeight: 600, padding: "3px 7px", borderRadius: 4, border: "none",
                background: aiLoading ? "var(--surface2)" : "var(--accent)",
                color: aiLoading ? "var(--muted)" : "#fff",
                cursor: aiLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 3,
              }}
            >
              {aiLoading
                ? <span style={{ width: 8, height: 8, border: "1.5px solid var(--border)", borderTopColor: "var(--muted)", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                : <>✦ AI{signedIn === false && <span aria-hidden="true" style={{ opacity: 0.85 }}>🔒</span>}</>}
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          style={{ ...orderBtnStyle, opacity: isFirst ? 0.35 : 1, padding: "1px 5px", fontSize: 10 }}
          title="Move up"
        >↑</button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          style={{ ...orderBtnStyle, opacity: isLast ? 0.35 : 1, padding: "1px 5px", fontSize: 10 }}
          title="Move down"
        >↓</button>
        <button
          onClick={onRemove}
          style={{ ...removeBtnStyle, fontSize: 10, padding: "1px 4px" }}
          title="Remove bullet"
        >✕</button>
      </div>
    </div>
  );
}

function BulletListEditor({ bullets, onChange, context, minRows = 1, label = "Key Achievements" }: {
  bullets: string;
  onChange: (v: string) => void;
  context?: { role?: string; company?: string };
  minRows?: number;
  label?: string;
}) {
  const { signedIn, signingIn, signIn } = useSupabaseSignedIn();
  const items = parseBulletsToArray(bullets, minRows);
  const [showSignIn, setShowSignIn] = useState(false);
  const [rewriteAllLoading, setRewriteAllLoading] = useState(false);
  const [undoAll, setUndoAll] = useState<string | null>(null);
  const [rewriteAllError, setRewriteAllError] = useState<string | null>(null);

  const updateItems = (next: string[]) => onChange(joinBulletsFromArray(next));
  const filledCount = items.filter((b) => b.trim()).length;

  const rewriteAll = useCallback(async () => {
    setRewriteAllError(null);
    if (signedIn === false) { setShowSignIn(true); return; }
    const block = joinBulletsFromArray(items);
    if (!block.trim()) return;
    setRewriteAllLoading(true);
    const r = await tbEnhanceCall(block, "bullets", context);
    setRewriteAllLoading(false);
    if (!r.ok) {
      if (r.needSignIn) { setShowSignIn(true); return; }
      setRewriteAllError(r.error || "Failed");
      return;
    }
    setUndoAll(bullets);
    onChange(r.enhanced);
  }, [items, bullets, context, signedIn, onChange]);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
        {filledCount >= 2 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {rewriteAllError && <span style={{ fontSize: 9, color: "var(--red, #ef4444)" }}>{rewriteAllError}</span>}
            {undoAll !== null && !rewriteAllLoading && (
              <button type="button" onClick={() => { onChange(undoAll); setUndoAll(null); }}
                style={{ fontSize: 9, color: "var(--muted)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>↩ Undo</button>
            )}
            <button type="button" onClick={rewriteAll} disabled={rewriteAllLoading}
              title={signedIn === false ? "Sign in to rewrite all bullets with AI" : "Rewrite every bullet with AI"}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: rewriteAllLoading ? "var(--muted)" : "var(--accent)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 5, padding: "3px 8px", cursor: rewriteAllLoading ? "wait" : "pointer", whiteSpace: "nowrap" }}>
              {rewriteAllLoading
                ? <><span style={{ width: 8, height: 8, border: "1.5px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Rewriting…</>
                : <>✦ Rewrite all{signedIn === false && <span aria-hidden="true" style={{ opacity: 0.8 }}>🔒</span>}</>}
            </button>
          </div>
        )}
      </div>
      {items.map((item, idx) => (
        <BulletRow
          key={idx}
          value={item}
          isFirst={idx === 0}
          isLast={idx === items.length - 1}
          context={context}
          signedIn={signedIn}
          onRequireSignIn={() => setShowSignIn(true)}
          onChange={(v) => { const next = [...items]; next[idx] = v; updateItems(next); }}
          onMoveUp={() => {
            if (idx === 0) return;
            const next = [...items];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            updateItems(next);
          }}
          onMoveDown={() => {
            if (idx === items.length - 1) return;
            const next = [...items];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            updateItems(next);
          }}
          onRemove={() => {
            const next = items.filter((_, i) => i !== idx);
            updateItems(
              next.length >= minRows
                ? next
                : Array.from({ length: minRows }, () => ""),
            );
          }}
        />
      ))}
      <button style={{ ...addBtnStyle, marginTop: 2 }} onClick={() => updateItems([...items, ""])}>
        + Add Bullet
      </button>
      {showSignIn && (
        <div style={{ position: "absolute", top: 28, right: 0, zIndex: 20 }}>
          <SignInToUseAi
            variant="popover"
            signingIn={signingIn}
            onSignIn={signIn}
            onDismiss={() => setShowSignIn(false)}
            title="Sign in to use AI rewrite"
            subtitle="AI rewriting is free with a Google account."
          />
        </div>
      )}
    </div>
  );
}

/* ── Section sub-components ────────────────────────────────────── */

type StoreType = TemplateBuilderStore;

/** One anchored, headed block in the stacked content column. */
function ContentBlock({ id, title, icon, first, children }: {
  id: string;
  title: string;
  icon: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{
        // scroll-margin keeps the heading clear of the sticky nav above the
        // scroll container when jumpToBlock scrolls this into view.
        scrollMarginTop: 8,
        paddingTop: first ? 0 : 22,
        marginTop: first ? 0 : 22,
        borderTop: first ? "none" : "1px solid var(--border)",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 7, marginBottom: 12,
        fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
        color: "var(--muted)",
      }}>
        <span aria-hidden style={{ fontSize: 13 }}>{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 14px", letterSpacing: -0.1 }}>
      {children}
    </h3>
  );
}

function ProfileSection({ store, data }: { store: StoreType; data: StoreType["data"] }) {
  const p = data.profile;

  // Build context for AI summary generation from current builder data
  const summaryGenContext = {
    name: p.name,
    role: data.workExperiences[0]?.jobTitle || "",
    company: data.workExperiences[0]?.company || "",
    experiences: data.workExperiences.map((w) => ({
      jobTitle: w.jobTitle,
      company: w.company,
      bullets: w.bullets,
    })),
    education: data.educations.map((e) => ({
      degree: e.degree,
      school: e.school,
    })),
  };

  return (
    <>
      <SectionHeading>Personal Info</SectionHeading>
      <FieldWrap>
        <Field label="Full Name">
          <input style={inputBase} value={p.name}
            onChange={(e) => store.setProfile("name", e.target.value)} placeholder="Jane Smith" />
        </Field>
      </FieldWrap>
      <Row>
        <Field label="Email" half>
          <input style={inputBase} value={p.email} type="email"
            onChange={(e) => store.setProfile("email", e.target.value)} placeholder="jane@example.com" />
        </Field>
        <Field label="Phone" half>
          <input style={inputBase} value={p.phone}
            onChange={(e) => store.setProfile("phone", e.target.value)} placeholder="(555) 000-0000" />
        </Field>
      </Row>
      <Row>
        <Field label="Location" half>
          <input style={inputBase} value={p.location}
            onChange={(e) => store.setProfile("location", e.target.value)} placeholder="San Francisco, CA" />
        </Field>
        <Field label="Website" half>
          <input style={inputBase} value={p.website}
            onChange={(e) => store.setProfile("website", e.target.value)} placeholder="yoursite.dev" />
        </Field>
      </Row>
      <Row>
        <Field label="LinkedIn" half>
          <input style={inputBase} value={p.linkedin}
            onChange={(e) => store.setProfile("linkedin", e.target.value)} placeholder="linkedin.com/in/jane" />
        </Field>
        <Field label="GitHub" half>
          <input style={inputBase} value={p.github}
            onChange={(e) => store.setProfile("github", e.target.value)} placeholder="github.com/jane" />
        </Field>
      </Row>
      <FieldWrap>
        {/* Summary label row with Generate button alongside */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Professional Summary</label>
          <AIGenerateButton
            kind="summary"
            buildContext={summaryGenContext}
            onGenerated={(result) => store.setProfile("summary", result as string)}
            label="✦ Generate summary"
          />
        </div>
        <AITextarea
          type="summary"
          value={p.summary}
          onChange={(e) => store.setProfile("summary", e.target.value)}
          onEnhanced={(v) => store.setProfile("summary", v)}
          placeholder="Brief 2–3 sentence summary of your experience and goals..."
        />
      </FieldWrap>
    </>
  );
}

function ExperienceSection({ store, data }: { store: StoreType; data: StoreType["data"] }) {
  return (
    <>
      <SectionHeading>Work Experience</SectionHeading>
      {data.workExperiences.map((w, idx) => (
        <div key={w.id}>
          {idx > 0 && <hr style={dividerStyle} />}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={ENTRY_LABEL_STYLE}>{w.company || w.jobTitle || `Position ${idx + 1}`}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                style={{ ...orderBtnStyle, opacity: idx === 0 ? 0.45 : 1 }}
                onClick={() => store.moveWork(idx, idx - 1)}
                disabled={idx === 0}
                title="Move up"
              >
                ↑
              </button>
              <button
                style={{ ...orderBtnStyle, opacity: idx === data.workExperiences.length - 1 ? 0.45 : 1 }}
                onClick={() => store.moveWork(idx, idx + 1)}
                disabled={idx === data.workExperiences.length - 1}
                title="Move down"
              >
                ↓
              </button>
              {data.workExperiences.length > 1 && (
                <button style={removeBtnStyle} onClick={() => store.removeWork(w.id)}>✕ Remove</button>
              )}
            </div>
          </div>
          <Row>
            <Field label="Job Title" half>
              <input style={inputBase} value={w.jobTitle}
                onChange={(e) => store.setWork(w.id, "jobTitle", e.target.value)} placeholder="Software Engineer" />
            </Field>
            <Field label="Company" half>
              <input style={inputBase} value={w.company}
                onChange={(e) => store.setWork(w.id, "company", e.target.value)} placeholder="Acme Inc." />
            </Field>
          </Row>
          <FieldWrap>
            <Field label="Location">
              <input style={inputBase} value={w.location}
                onChange={(e) => store.setWork(w.id, "location", e.target.value)} placeholder="New York, NY" />
            </Field>
          </FieldWrap>
          <Row>
            <Field label="Start Date" half>
              <input style={inputBase} value={w.startDate}
                onChange={(e) => store.setWork(w.id, "startDate", e.target.value)} placeholder="Jan 2022" />
            </Field>
            <Field label="End Date" half>
              <input style={{ ...inputBase, opacity: w.current ? 0.45 : 1 }} value={w.endDate} disabled={w.current}
                onChange={(e) => store.setWork(w.id, "endDate", e.target.value)} placeholder="Dec 2023" />
            </Field>
          </Row>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <input type="checkbox" checked={w.current} id={`cur-${w.id}`}
              onChange={(e) => store.setWork(w.id, "current", e.target.checked)}
              style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
            <label htmlFor={`cur-${w.id}`} style={{ fontSize: 12, color: "var(--dim)", cursor: "pointer" }}>
              Currently working here
            </label>
          </div>
          <BulletListEditor
            bullets={w.bullets}
            onChange={(v) => store.setWork(w.id, "bullets", v)}
            context={{ role: w.jobTitle, company: w.company }}
          />
        </div>
      ))}
      <button style={addBtnStyle} onClick={store.addWork}>+ Add Position</button>
    </>
  );
}

function EducationSection({ store, data }: { store: StoreType; data: StoreType["data"] }) {
  return (
    <>
      <SectionHeading>Education</SectionHeading>
      {data.educations.map((e, idx) => (
        <div key={e.id}>
          {idx > 0 && <hr style={dividerStyle} />}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={ENTRY_LABEL_STYLE}>{e.school || `School ${idx + 1}`}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                style={{ ...orderBtnStyle, opacity: idx === 0 ? 0.45 : 1 }}
                onClick={() => store.moveEducation(idx, idx - 1)}
                disabled={idx === 0}
                title="Move up"
              >
                ↑
              </button>
              <button
                style={{ ...orderBtnStyle, opacity: idx === data.educations.length - 1 ? 0.45 : 1 }}
                onClick={() => store.moveEducation(idx, idx + 1)}
                disabled={idx === data.educations.length - 1}
                title="Move down"
              >
                ↓
              </button>
              {data.educations.length > 1 && (
                <button style={removeBtnStyle} onClick={() => store.removeEducation(e.id)}>✕ Remove</button>
              )}
            </div>
          </div>
          <FieldWrap>
            <Field label="School / University">
              <input style={inputBase} value={e.school}
                onChange={(ev) => store.setEducation(e.id, "school", ev.target.value)} placeholder="Stanford University" />
            </Field>
          </FieldWrap>
          <FieldWrap>
            <Field label="Degree">
              <input style={inputBase} value={e.degree}
                onChange={(ev) => store.setEducation(e.id, "degree", ev.target.value)} placeholder="B.S. Computer Science" />
            </Field>
          </FieldWrap>
          <Row>
            <Field label="Start Date" half>
              <input style={inputBase} value={e.startDate}
                onChange={(ev) => store.setEducation(e.id, "startDate", ev.target.value)} placeholder="Sep 2018" />
            </Field>
            <Field label="End Date" half>
              <input style={inputBase} value={e.endDate}
                onChange={(ev) => store.setEducation(e.id, "endDate", ev.target.value)} placeholder="Jun 2022" />
            </Field>
          </Row>
          <Row>
            <Field label="Location" half>
              <input style={inputBase} value={e.location}
                onChange={(ev) => store.setEducation(e.id, "location", ev.target.value)} placeholder="Stanford, CA" />
            </Field>
            <Field label="GPA" half>
              <input style={inputBase} value={e.gpa}
                onChange={(ev) => store.setEducation(e.id, "gpa", ev.target.value)} placeholder="3.8" />
            </Field>
          </Row>
          <FieldWrap>
            <Field label="Relevant Coursework">
              <input style={inputBase} value={e.coursework}
                onChange={(ev) => store.setEducation(e.id, "coursework", ev.target.value)}
                placeholder="Algorithms, Distributed Systems, ML" />
            </Field>
          </FieldWrap>
        </div>
      ))}
      <button style={addBtnStyle} onClick={store.addEducation}>+ Add Education</button>
    </>
  );
}

function ProjectsSection({ store, data }: { store: StoreType; data: StoreType["data"] }) {
  return (
    <>
      <SectionHeading>Projects</SectionHeading>
      {data.projects.map((p, idx) => (
        <div key={p.id}>
          {idx > 0 && <hr style={dividerStyle} />}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={ENTRY_LABEL_STYLE}>{p.name || `Project ${idx + 1}`}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                style={{ ...orderBtnStyle, opacity: idx === 0 ? 0.45 : 1 }}
                onClick={() => store.moveProject(idx, idx - 1)}
                disabled={idx === 0}
                title="Move up"
              >
                ↑
              </button>
              <button
                style={{ ...orderBtnStyle, opacity: idx === data.projects.length - 1 ? 0.45 : 1 }}
                onClick={() => store.moveProject(idx, idx + 1)}
                disabled={idx === data.projects.length - 1}
                title="Move down"
              >
                ↓
              </button>
              {data.projects.length > 1 && (
                <button style={removeBtnStyle} onClick={() => store.removeProject(p.id)}>✕ Remove</button>
              )}
            </div>
          </div>
          <Row>
            <Field label="Project Name" half>
              <input style={inputBase} value={p.name}
                onChange={(e) => store.setProject(p.id, "name", e.target.value)} placeholder="My SaaS Tool" />
            </Field>
            <Field label="Year / Date" half>
              <input style={inputBase} value={p.date}
                onChange={(e) => store.setProject(p.id, "date", e.target.value)} placeholder="2024" />
            </Field>
          </Row>
          <FieldWrap>
            <Field label="Tech Stack">
              <input style={inputBase} value={p.tech}
                onChange={(e) => store.setProject(p.id, "tech", e.target.value)} placeholder="React, Python, PostgreSQL" />
            </Field>
          </FieldWrap>
          <FieldWrap>
            <Field label="Link">
              <input style={inputBase} value={p.link}
                onChange={(e) => store.setProject(p.id, "link", e.target.value)} placeholder="github.com/you/project" />
            </Field>
          </FieldWrap>
          <BulletListEditor
            bullets={p.bullets}
            onChange={(v) => store.setProject(p.id, "bullets", v)}
            context={{ role: p.name }}
            minRows={2}
            label="Bullet Points"
          />
        </div>
      ))}
      <button style={addBtnStyle} onClick={store.addProject}>+ Add Project</button>
    </>
  );
}

function SkillsSection({ store, data }: { store: StoreType; data: StoreType["data"] }) {
  const { featuredSkills, descriptions } = data.skills;

  // Build context for AI skills suggestion from current builder data
  const skillsGenContext = {
    experiences: data.workExperiences.map((w) => ({
      jobTitle: w.jobTitle,
      company: w.company,
      bullets: w.bullets,
    })),
    education: data.educations.map((e) => ({
      degree: e.degree,
      school: e.school,
    })),
    skills: descriptions,
  };

  return (
    <>
      <SectionHeading>Skills</SectionHeading>

      {/* Featured skills — plain names; proficiency-dot ratings were removed
          (self-assessed dots carry no signal for recruiters or ATS parsers). */}
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.5 }}>
        Featured skills — shown as a highlighted list at the top of the Skills section.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 20 }}>
        {featuredSkills.map((fs, idx) => (
          <input
            key={idx}
            style={{ ...inputBase, fontSize: 12 }}
            placeholder={`Skill ${idx + 1}`}
            value={fs.skill}
            onChange={(e) => store.setFeaturedSkill(idx, e.target.value, fs.rating)}
          />
        ))}
      </div>

      {/* Category description lines — label row with Suggest skills button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Skill categories</label>
        <AIGenerateButton
          kind="skills"
          buildContext={skillsGenContext}
          onGenerated={(result) => {
            // result is string[] of "Category: A, B, C" lines — join to textarea value
            const lines = Array.isArray(result) ? result : [result as string];
            store.setSkillDescriptions(lines.join("\n"));
          }}
          label="✦ Suggest skills"
        />
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
        One category per line, e.g. "Languages: Python, Go"
      </p>
      <textarea
        style={{ ...textareaBase, minHeight: 120 }}
        value={descriptions}
        onChange={(e) => store.setSkillDescriptions(e.target.value)}
        placeholder={"Languages: Python, TypeScript, Go\nFrontend: React, Next.js, Tailwind\nBackend: Node.js, FastAPI, PostgreSQL\nCloud: AWS, Docker, Kubernetes"}
      />
    </>
  );
}

function CustomizeSection({ store, c }: { store: StoreType; c: StoreType["data"]["customization"] }) {
  const applyStylePreset = (preset: (typeof STYLE_PRESETS)[number]) => {
    store.setCustomization("stylePreset", preset.id);
    store.setCustomization("font", preset.font);
    store.setCustomization("accentColor", preset.accentColor);
    if (preset.enforcedLayout) {
      store.setCustomization("layout", preset.enforcedLayout);
    } else if (c.layout === "rightSidebar" || c.layout === "topBannerRightSidebar") {
      store.setCustomization("layout", "single");
    }
  };

  const isEnforcedLayout = c.layout === "rightSidebar" || c.layout === "topBannerRightSidebar";

  return (
    <>
      <SectionHeading>Style & Customization</SectionHeading>

      {/* Layout */}
      {!isEnforcedLayout && (
        <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Layout</label>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
          Two-column places contact, education, and skills in a sidebar.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {([
            {
              id: "single" as const,
              label: "Single column",
              desc: "Classic top-to-bottom",
              preview: (
                <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="4" y="3" width="28" height="3" rx="1" fill="currentColor" opacity="0.7" />
                  <rect x="4" y="9" width="28" height="2" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="4" y="13" width="22" height="2" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="4" y="17" width="28" height="2" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="4" y="21" width="18" height="2" rx="1" fill="currentColor" opacity="0.3" />
                </svg>
              ),
            },
            {
              id: "twoColumn" as const,
              label: "Two column",
              desc: "Sidebar + main",
              preview: (
                <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="2" y="2" width="11" height="24" rx="1" fill="currentColor" opacity="0.12" />
                  <rect x="3" y="4" width="9" height="2" rx="1" fill="currentColor" opacity="0.6" />
                  <rect x="3" y="8" width="9" height="1.5" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="3" y="11" width="7" height="1.5" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="3" y="14" width="9" height="1.5" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="16" y="4" width="18" height="2" rx="1" fill="currentColor" opacity="0.7" />
                  <rect x="16" y="9" width="18" height="1.5" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="16" y="13" width="14" height="1.5" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="16" y="17" width="18" height="1.5" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="16" y="21" width="12" height="1.5" rx="1" fill="currentColor" opacity="0.3" />
                </svg>
              ),
            },
          ] as const).map((opt) => {
            const active = (c.layout ?? "single") === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => store.setCustomization("layout", opt.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 8px",
                  borderRadius: 9,
                  border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                  background: active ? "color-mix(in srgb, var(--accent) 8%, var(--bg))" : "var(--bg)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: active ? "var(--accent)" : "var(--text)",
                  transition: "border-color 0.15s, background 0.15s",
                  textAlign: "center",
                }}
              >
                <div style={{ color: active ? "var(--accent)" : "var(--muted)" }}>
                  {opt.preview}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.3 }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Style Presets */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Start with a curated default, then adjust font and color below if needed.
        </p>

        {/* Technical Layouts */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          Technical
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {STYLE_PRESETS.filter(p => p.category === "technical").map((preset) => {
            const active = c.stylePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyStylePreset(preset)}
                aria-pressed={active}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 12px",
                  borderRadius: 9,
                  border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                  background: active ? "color-mix(in srgb, var(--accent) 8%, var(--bg))" : "var(--bg)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <div style={{
                  width: 44,
                  height: 36,
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  padding: "6px 7px",
                  boxSizing: "border-box",
                }} aria-hidden>
                  <div style={{ width: "68%", height: 4, borderRadius: 2, background: preset.accentColor, marginBottom: 5 }} />
                  <div style={{ width: "100%", height: 2, borderRadius: 2, background: "var(--border)", marginBottom: 4 }} />
                  <div style={{ width: "78%", height: 2, borderRadius: 2, background: "var(--border)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{preset.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>{preset.description}</div>
                </div>
                {active && <span aria-hidden style={{ fontSize: 13, color: "var(--accent)" }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Creative Layouts */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          Creative
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STYLE_PRESETS.filter(p => p.category === "creative").map((preset) => {
            const active = c.stylePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyStylePreset(preset)}
                aria-pressed={active}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 12px",
                  borderRadius: 9,
                  border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                  background: active ? "color-mix(in srgb, var(--accent) 8%, var(--bg))" : "var(--bg)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <div style={{
                  width: 44,
                  height: 36,
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  padding: "6px 7px",
                  boxSizing: "border-box",
                }} aria-hidden>
                  <div style={{ width: "68%", height: 4, borderRadius: 2, background: preset.accentColor, marginBottom: 5 }} />
                  <div style={{ width: "100%", height: 2, borderRadius: 2, background: "var(--border)", marginBottom: 4 }} />
                  <div style={{ width: "78%", height: 2, borderRadius: 2, background: "var(--border)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{preset.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>{preset.description}</div>
                </div>
                {active && <span aria-hidden style={{ fontSize: 13, color: "var(--accent)" }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page Width */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>PDF width</label>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
          Controls side margins in preview and downloaded PDF.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
          {PAGE_WIDTH_OPTIONS.map((option) => {
            const active = c.pageWidth === option.id;
            return (
              <button
                key={option.id}
                onClick={() => store.setCustomization("pageWidth", option.id)}
                title={option.description}
                style={{
                  borderRadius: 8,
                  border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                  background: active ? "color-mix(in srgb, var(--accent) 8%, var(--bg))" : "var(--bg)",
                  padding: "9px 7px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: active ? "var(--accent)" : "var(--text)",
                  textAlign: "center",
                }}
              >
                <div style={{
                  width: option.id === "narrow" ? 18 : option.id === "standard" ? 26 : 34,
                  height: 20,
                  borderRadius: 3,
                  border: "1px solid currentColor",
                  margin: "0 auto 6px",
                  opacity: 0.9,
                }} />
                <div style={{ fontSize: 11, fontWeight: 700 }}>{option.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Font Size</label>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
          Controls text size across the entire résumé.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
          {([
            { id: "small",  label: "Small",  sub: "Fits more content",   sample: 11 },
            { id: "medium", label: "Medium", sub: "Default balance",     sample: 13 },
            { id: "large",  label: "Large",  sub: "Easy to read",        sample: 15 },
          ] as const).map((opt) => {
            const active = (c.fontSize ?? "medium") === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => store.setCustomization("fontSize", opt.id)}
                style={{
                  borderRadius: 8,
                  border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                  background: active ? "color-mix(in srgb, var(--accent) 8%, var(--bg))" : "var(--bg)",
                  padding: "10px 7px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: active ? "var(--accent)" : "var(--text)",
                  textAlign: "center",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <div style={{
                  fontSize: opt.sample,
                  fontWeight: 700,
                  lineHeight: 1,
                  marginBottom: 5,
                  color: active ? "var(--accent)" : "var(--text)",
                }}>Aa</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, lineHeight: 1.3 }}>{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Font</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => store.setCustomization("font", f.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 13px",
                borderRadius: 7,
                border: c.font === f.value ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                background: c.font === f.value ? "color-mix(in srgb, var(--accent) 8%, var(--bg))" : "var(--bg)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: "var(--surface2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, flexShrink: 0,
                fontFamily: f.value === "Times-Roman" ? "'Times New Roman', serif" : f.value === "Courier" ? "'Courier New', monospace" : "Helvetica, Arial, sans-serif",
                color: c.font === f.value ? "var(--accent)" : "var(--text)",
              }}>Aa</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{f.sub}</div>
              </div>
              {c.font === f.value && (
                <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--accent)" }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Accent Color</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.value}
              title={p.label}
              onClick={() => store.setCustomization("accentColor", p.value)}
              style={{
                width: 32, height: 32,
                borderRadius: 8,
                background: p.value,
                border: c.accentColor === p.value ? "3px solid var(--text)" : "2px solid transparent",
                boxShadow: c.accentColor === p.value ? "0 0 0 2px var(--bg)" : "none",
                cursor: "pointer",
                padding: 0,
                transition: "border 0.12s, box-shadow 0.12s",
                position: "relative",
              }}
            >
              {c.accentColor === p.value && (
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>✓</span>
              )}
            </button>
          ))}
          {/* Custom color picker */}
          <label title="Custom color" style={{ position: "relative", cursor: "pointer", display: "block" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
              border: "2px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "#fff", fontWeight: 700, lineHeight: 1,
            }}>+</div>
            <input
              type="color"
              value={c.accentColor}
              onChange={(e) => store.setCustomization("accentColor", e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
            />
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: c.accentColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "monospace" }}>{c.accentColor}</span>
        </div>
      </div>

      {/* Preview hint */}
      <div style={{ fontSize: 11, color: "var(--muted)", padding: "10px 12px", background: "var(--surface2)", borderRadius: 7, lineHeight: 1.5 }}>
        Changes appear live in the preview. Download PDF preserves all styling.
      </div>
    </>
  );
}
