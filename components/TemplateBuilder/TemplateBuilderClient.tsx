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
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { PHONE_BREAKPOINT } from "@/components/mui/theme";
import TemplateBuilderTopBar from "./TemplateBuilderTopBar";
import { TBInput, TBTextarea } from "@/components/mui/fields";
import { useCanvasEdit } from "@/components/canvas/useCanvasEdit";
import { CANVAS_STYLESHEET } from "@/components/canvas/CanvasPrimitives";
import { PageBoundaryRule, usePageOverflow } from "@/components/canvas/PageBoundaryRule";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ReorderIcon from "@mui/icons-material/Reorder";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import BoltIcon from "@mui/icons-material/Bolt";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import UndoIcon from "@mui/icons-material/Undo";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Button from "@mui/material/Button";
import LockIcon from "@mui/icons-material/Lock";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import PaletteIcon from "@mui/icons-material/Palette";
import FactCheckIcon from "@mui/icons-material/FactCheck";

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
              : <>✦ AI Enhance{signedIn === false && <LockIcon aria-hidden sx={{ fontSize: 12, ml: 0.25, verticalAlign: "-1px" }} />}</>}
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
            {signedIn === false && <LockIcon aria-hidden sx={{ fontSize: 12, ml: 0.25, verticalAlign: "-1px" }} />}
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

/**
 * Icons are components, not emoji. Emoji are a colour font: they cannot take
 * `currentColor`, so an active tab could never tint its glyph, and they render
 * differently on every OS — an Apple-emoji screenshot is not what a Windows
 * user sees. The previous 📝 🎨 🔍 also carried a note about avoiding ✦
 * because it collided with the toolbar's AI marker; picking from a real icon
 * set removes that whole class of collision.
 */
const MODES: { key: EditorMode; label: string; Icon: typeof EditNoteIcon }[] = [
  { key: "content", label: "Content", Icon: EditNoteIcon },
  { key: "design",  label: "Design",  Icon: PaletteIcon },
  { key: "review",  label: "Review",  Icon: FactCheckIcon },
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

  // Responsive: TWO thresholds, not one.
  //
  // `narrow` (<880) was previously the only question asked, and it meant "not
  // desktop" — so a 390px phone got the tablet treatment: a 56px vertical icon
  // rail (7% of a tablet, 14% of a phone) with the editor behind a flyout, so
  // the phone opened on a read-only preview it could not type into.
  //
  // `phone` (<640) now gets its own layout: horizontal tabs, and the editor is
  // the default surface. On a phone the drawer IS the screen, which makes it a
  // modal — and making a modal the default state of an editor is the bug.
  const rootRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [phone, setPhone] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // Phone only: which surface is showing. Defaults to the editor.
  const [phoneView, setPhoneView] = useState<"edit" | "preview">("edit");

  // The preview used to be pinned at scale(0.82), then at a floor of 0.55 —
  // both tuned on a wide screen. At 390px the computed fit is ~0.40, so the
  // floor overrode the measurement and clipped the paper. Fit honestly.
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.82);

  // Direct-manipulation editing on the paper. Off on phones: a 390px canvas
  // scaled to ~0.42 gives a 5px tap target per bullet, so the form is the
  // honest editor there and the canvas stays read-only.
  const canvasEdit = useCanvasEdit(store, { aiLocked: signedIn === false });

  // US Letter is 1056px at 96dpi. Content past that silently becomes page 2,
  // which is the single most consequential thing a résumé editor can hide
  // from the user, so it is surfaced as a rule on the canvas.
  const paperContentRef = useRef<HTMLDivElement>(null);
  const pageOverflowPx = usePageOverflow(paperContentRef, loaded);

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
      if (w > 0) { setNarrow(w < 880); setPhone(w < PHONE_BREAKPOINT); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loaded]);

  // Fit the 8.5in paper to the preview pane. Same `loaded` dependency reason as
  // above: the pane only mounts once the builder has loaded.
  useEffect(() => {
    const el = previewPaneRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const PAPER_PX = 816; // 8.5in at 96dpi
    const GUTTER = 44;    // horizontal padding of the scroll area
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) {
        // No floor. A small but WHOLE page beats a large clipped one, and the
        // user can pinch-zoom or open the PDF if they need to read it. The
        // old Math.max(0.55, …) measured the pane correctly and then threw
        // the measurement away on anything under ~500px.
        setPreviewScale(Math.min(1, (w - GUTTER) / PAPER_PX));
      }
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
          <ContentBlock id={contentBlockDomId("sections")} title="Arrange sections" Icon={ReorderIcon} first>
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
          <ContentBlock id={contentBlockDomId("profile")} title="Profile" Icon={PersonIcon}>
            <ProfileSection store={store} data={data} />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("experience")} title="Experience" Icon={WorkIcon}>
            <ExperienceSection store={store} data={data} />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("education")} title="Education" Icon={SchoolIcon}>
            <EducationSection store={store} data={data} />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("projects")} title="Projects" Icon={RocketLaunchIcon}>
            <ProjectsSection store={store} data={data} />
          </ContentBlock>
          <ContentBlock id={contentBlockDomId("skills")} title="Skills" Icon={BoltIcon}>
            <SkillsSection store={store} data={data} />
          </ContentBlock>
        </>
      )}
      {mode === "design" && <CustomizeSection store={store} c={c} />}
      {mode === "review" && <TemplateBuilderReviewPanel data={data} result={reviewResult} onResult={setReviewResult} />}
    </>
  );

  const activeModeMeta = MODES.find((m) => m.key === mode);

  // Design is a left-hand MODE only where there is no inspector to hold it.
  const visibleModes = narrow ? MODES : MODES.filter((m) => m.key !== "design");
  const modeSwitcher = (
    <Tabs
      value={visibleModes.some((m) => m.key === mode) ? mode : "content"}
      onChange={(_, v: EditorMode) => setMode(v)}
      variant="fullWidth"
      sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0, minHeight: 48 }}
    >
      {visibleModes.map((m) => (
        <Tab key={m.key} value={m.key} label={m.label} icon={<m.Icon fontSize="small" />} iconPosition="start" />
      ))}
    </Tabs>
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
    <MuiThemeRegistry>
    <style>{CANVAS_STYLESHEET}</style>
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
      <TemplateBuilderTopBar
        atsScore={reviewResult?.overallScore ?? null}
        atsColor={reviewResult?.overallScore != null ? reviewScoreColor(reviewResult.overallScore) : undefined}
        onOpenReview={() => { setMode("review"); setPanelOpen(true); }}
        onLoadExample={store.reset}
        onImport={() => { setImportError(null); importFileRef.current?.click(); }}
        onSave={() => void handleSaveToLibrary()}
        onDownload={handleDownload}
        importing={importing}
        saveBusy={saveBusy}
        saveFlash={saveFlash}
        savedBuilderId={savedBuilderId}
        signedIn={signedIn}
        isGenerating={isGenerating}
        error={importError || downloadError || htmlPdfError}
      />
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

      {/* Phone only: which surface is showing. A phone cannot usefully hold
          the editor and the preview at once, and the previous layout resolved
          that by showing the preview and hiding the editor behind a drawer —
          i.e. it opened an editor in a state where you could not edit. */}
      {phone && (
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={phoneView}
          onChange={(_, v: "edit" | "preview" | null) => { if (v) setPhoneView(v); }}
          sx={{ px: 1.5, py: 0.75, flexShrink: 0, gap: 1,
                borderBottom: 1, borderColor: "divider",
                "& .MuiToggleButton-root": { minHeight: 44, border: 1, borderColor: "divider", borderRadius: 1 } }}
        >
          <ToggleButton value="edit"><EditNoteIcon fontSize="small" sx={{ mr: 0.75 }} />Edit</ToggleButton>
          <ToggleButton value="preview"><VisibilityIcon fontSize="small" sx={{ mr: 0.75 }} />Preview</ToggleButton>
        </ToggleButtonGroup>
      )}

      {/* ── Body ────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {/* ── Left: Form Panel ──────────────────────────────── */}
        {phone ? (
          // Full width, no rail, no drawer. The editor IS the screen.
          phoneView === "edit" ? (
            <div style={{
              flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
              background: "var(--surface)", overflow: "hidden",
            }}>
              {modeSwitcher}
              {jumpNav}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 40px" }}>
                {editorBody}
              </div>
            </div>
          ) : null
        ) : narrow ? (
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
                    <m.Icon fontSize="small" aria-hidden />
                    {/* 10px is the floor for chrome text; the old 8px was not
                        small type, it was unreadable type. */}
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2, lineHeight: 1.1, textAlign: "center" }}>{m.label}</span>
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
                      {activeModeMeta ? <activeModeMeta.Icon fontSize="small" aria-hidden /> : null}{activeModeMeta?.label}
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

        {/* ── Centre: the canvas ────────────────────────────── */}
        <div ref={previewPaneRef} style={{
          flex: 1,
          display: phone && phoneView === "edit" ? "none" : "flex",
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
            {/*
              `zoom`, not `transform: scale()`. A transform changes what is
              painted but NOT the layout box: the wrapper kept its full 816px
              width, so this centred overflow container overflowed in BOTH
              directions and the left edge of the page could not be scrolled
              to — while the right edge was simply cut off. `zoom` reflows real
              layout, so the box shrinks with the content and the containment
              problem disappears with it.

              Safe for the PDF export: useHtmlPdfExport captures `previewRef`
              (the paper element) and the zoom lives on this wrapper, exactly
              as the transform did. Same precedent as ResumeThumbnail.tsx.
            */}
            <div style={{ zoom: previewScale, position: "relative" }}>
              <div ref={paperContentRef}>
                {/* Editing is enabled on pointer widths only — see canvasEdit. */}
                <ResumePreview ref={previewRef} data={data} edit={phone ? undefined : canvasEdit} />
              </div>

              {/*
                The US-Letter page boundary, drawn on the canvas. Everything
                below this line is page 2 in the PDF; without the rule the
                only way to discover that is to download the file.
                az-pdf-ignore keeps it out of the export.
              */}
              {!phone && <PageBoundaryRule overflowPx={pageOverflowPx} />}
            </div>
          </div>
        </div>

        {/* ── Right: Style Inspector ────────────────────────── */}
        {!narrow && (
          <aside style={{
            width: 280, flexShrink: 0, display: "flex", flexDirection: "column",
            borderLeft: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
              borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
              <PaletteIcon fontSize="small" style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Design</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 32px" }}>
              <CustomizeSection store={store} c={c} />
            </div>
          </aside>
        )}
      </div>
    </div>
    </MuiThemeRegistry>
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
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Grow the field to fit its content. This writes to the DOM rather than to
  // state on purpose — an external-system update is what effects are for, and
  // a setState here would be the cascading render the ratchet rejects.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(44, el.scrollHeight)}px`;
  }, [value]);
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
    /*
      Was: textarea and a VERTICAL stack of icon buttons side by side, with the
      AI button absolutely positioned over the text.

      Three things broke at once in a narrow panel. The 44px tap floor made the
      button column ~132px tall next to a ~38px textarea, so every bullet grew a
      huge blank gutter. `rows={2}` clipped any bullet longer than two lines.
      And the AI button sat bottom-right INSIDE the text box, so it covered the
      last line rather than sitting beside it.

      Now: the text gets the full width and grows with its content, and the
      controls sit in one horizontal row underneath. Same 44px targets, no
      overlap, no dead vertical space.
    */
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 10 }}>
      <span style={{ color: "var(--muted)", fontSize: 14, marginTop: 9, flexShrink: 0, userSelect: "none" }}>•</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // Height is MEASURED, not estimated. A character-count guess was the
          // first attempt and it still clipped: how many lines a bullet wraps
          // to depends on the column width and the glyphs, which the component
          // cannot know. scrollHeight is the browser's own answer.
          rows={1}
          style={{
            ...textareaBase,
            minHeight: 44,
            resize: "vertical",
            lineHeight: 1.45,
            fontSize: 12.5,
            width: "100%",
          }}
          placeholder="Describe an achievement or responsibility..."
        />
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 2 }}>
          {showAi && (
            <>
              <Button
                onClick={enhance}
                disabled={aiLoading}
                size="small"
                variant="contained"
                startIcon={aiLoading
                  ? <CircularProgress size={12} color="inherit" />
                  : <AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                endIcon={signedIn === false ? <LockIcon sx={{ fontSize: 12 }} /> : undefined}
                sx={{ minHeight: 32, fontSize: 11, px: 1.25 }}
              >
                {aiLoading ? "Rewriting…" : "AI"}
              </Button>
              {undoVal !== null && !aiLoading && (
                <Tooltip title="Undo the AI rewrite">
                  <IconButton size="small" aria-label="Undo the AI rewrite"
                    onClick={() => { onChange(undoVal); setUndoVal(null); }}
                    sx={{ minWidth: 32, minHeight: 32 }}>
                    <UndoIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
              {aiError && (
                <span style={{ fontSize: 10, color: "var(--red, #ef4444)", lineHeight: 1.2 }}>{aiError}</span>
              )}
            </>
          )}
          <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>
            <Tooltip title="Move bullet up">
              <span>
                <IconButton size="small" onClick={onMoveUp} disabled={isFirst} aria-label="Move bullet up"
                  sx={{ minWidth: 32, minHeight: 32 }}>
                  <ArrowUpwardIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move bullet down">
              <span>
                <IconButton size="small" onClick={onMoveDown} disabled={isLast} aria-label="Move bullet down"
                  sx={{ minWidth: 32, minHeight: 32 }}>
                  <ArrowDownwardIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove bullet">
              <IconButton size="small" onClick={onRemove} aria-label="Remove bullet" color="error"
                sx={{ minWidth: 32, minHeight: 32 }}>
                <CloseIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </div>
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
                : <>✦ Rewrite all{signedIn === false && <LockIcon aria-hidden sx={{ fontSize: 12, ml: 0.25, verticalAlign: "-1px" }} />}</>}
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
function ContentBlock({ id, title, Icon, first, children }: {
  id: string;
  title: string;
  Icon: typeof EditNoteIcon;
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
        <Icon aria-hidden sx={{ fontSize: 15 }} />
        {title}
      </div>
      {children}
    </section>
  );
}

/**
 * Reorder + remove controls for one entry (a job, a degree, a project).
 *
 * Was three copies of the same raw glyph buttons — `↑` `↓` `✕ Remove` at
 * roughly 22x19, with a native `title` and no accessible name. IconButton
 * takes the theme's 44px floor and Tooltip gives a label that survives
 * keyboard focus and touch.
 */
function EntryOrderControls({ index, count, onMoveUp, onMoveDown, onRemove, noun }: {
  index: number;
  count: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  noun: string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Tooltip title={`Move ${noun} up`}>
        <span>
          <IconButton size="small" onClick={onMoveUp} disabled={index === 0} aria-label={`Move ${noun} up`}>
            <ArrowUpwardIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`Move ${noun} down`}>
        <span>
          <IconButton size="small" onClick={onMoveDown} disabled={index === count - 1} aria-label={`Move ${noun} down`}>
            <ArrowDownwardIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      {count > 1 && (
        <Tooltip title={`Remove this ${noun}`}>
          <IconButton size="small" color="error" onClick={onRemove} aria-label={`Remove this ${noun}`}>
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
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
          <TBInput value={p.name}
            onChange={(e) => store.setProfile("name", e.target.value)} placeholder="Jane Smith" />
        </Field>
      </FieldWrap>
      <Row>
        <Field label="Email" half>
          <TBInput value={p.email} type="email"
            onChange={(e) => store.setProfile("email", e.target.value)} placeholder="jane@example.com" />
        </Field>
        <Field label="Phone" half>
          <TBInput value={p.phone}
            onChange={(e) => store.setProfile("phone", e.target.value)} placeholder="(555) 000-0000" />
        </Field>
      </Row>
      <Row>
        <Field label="Location" half>
          <TBInput value={p.location}
            onChange={(e) => store.setProfile("location", e.target.value)} placeholder="San Francisco, CA" />
        </Field>
        <Field label="Website" half>
          <TBInput value={p.website}
            onChange={(e) => store.setProfile("website", e.target.value)} placeholder="yoursite.dev" />
        </Field>
      </Row>
      <Row>
        <Field label="LinkedIn" half>
          <TBInput value={p.linkedin}
            onChange={(e) => store.setProfile("linkedin", e.target.value)} placeholder="linkedin.com/in/jane" />
        </Field>
        <Field label="GitHub" half>
          <TBInput value={p.github}
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
            <EntryOrderControls
                index={idx}
                count={data.workExperiences.length}
                onMoveUp={() => store.moveWork(idx, idx - 1)}
                onMoveDown={() => store.moveWork(idx, idx + 1)}
                onRemove={() => store.removeWork(w.id)}
                noun="position"
              />
          </div>
          <Row>
            <Field label="Job Title" half>
              <TBInput value={w.jobTitle}
                onChange={(e) => store.setWork(w.id, "jobTitle", e.target.value)} placeholder="Software Engineer" />
            </Field>
            <Field label="Company" half>
              <TBInput value={w.company}
                onChange={(e) => store.setWork(w.id, "company", e.target.value)} placeholder="Acme Inc." />
            </Field>
          </Row>
          <FieldWrap>
            <Field label="Location">
              <TBInput value={w.location}
                onChange={(e) => store.setWork(w.id, "location", e.target.value)} placeholder="New York, NY" />
            </Field>
          </FieldWrap>
          <Row>
            <Field label="Start Date" half>
              <TBInput value={w.startDate}
                onChange={(e) => store.setWork(w.id, "startDate", e.target.value)} placeholder="Jan 2022" />
            </Field>
            <Field label="End Date" half>
              <TBInput sx={{ opacity: w.current ? 0.45 : 1 }} value={w.endDate} disabled={w.current}
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
            <EntryOrderControls
                index={idx}
                count={data.educations.length}
                onMoveUp={() => store.moveEducation(idx, idx - 1)}
                onMoveDown={() => store.moveEducation(idx, idx + 1)}
                onRemove={() => store.removeEducation(e.id)}
                noun="school"
              />
          </div>
          <FieldWrap>
            <Field label="School / University">
              <TBInput value={e.school}
                onChange={(ev) => store.setEducation(e.id, "school", ev.target.value)} placeholder="Stanford University" />
            </Field>
          </FieldWrap>
          <FieldWrap>
            <Field label="Degree">
              <TBInput value={e.degree}
                onChange={(ev) => store.setEducation(e.id, "degree", ev.target.value)} placeholder="B.S. Computer Science" />
            </Field>
          </FieldWrap>
          <Row>
            <Field label="Start Date" half>
              <TBInput value={e.startDate}
                onChange={(ev) => store.setEducation(e.id, "startDate", ev.target.value)} placeholder="Sep 2018" />
            </Field>
            <Field label="End Date" half>
              <TBInput value={e.endDate}
                onChange={(ev) => store.setEducation(e.id, "endDate", ev.target.value)} placeholder="Jun 2022" />
            </Field>
          </Row>
          <Row>
            <Field label="Location" half>
              <TBInput value={e.location}
                onChange={(ev) => store.setEducation(e.id, "location", ev.target.value)} placeholder="Stanford, CA" />
            </Field>
            <Field label="GPA" half>
              <TBInput value={e.gpa}
                onChange={(ev) => store.setEducation(e.id, "gpa", ev.target.value)} placeholder="3.8" />
            </Field>
          </Row>
          <FieldWrap>
            <Field label="Relevant Coursework">
              <TBInput value={e.coursework}
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
            <EntryOrderControls
                index={idx}
                count={data.projects.length}
                onMoveUp={() => store.moveProject(idx, idx - 1)}
                onMoveDown={() => store.moveProject(idx, idx + 1)}
                onRemove={() => store.removeProject(p.id)}
                noun="project"
              />
          </div>
          <Row>
            <Field label="Project Name" half>
              <TBInput value={p.name}
                onChange={(e) => store.setProject(p.id, "name", e.target.value)} placeholder="My SaaS Tool" />
            </Field>
            <Field label="Year / Date" half>
              <TBInput value={p.date}
                onChange={(e) => store.setProject(p.id, "date", e.target.value)} placeholder="2024" />
            </Field>
          </Row>
          <FieldWrap>
            <Field label="Tech Stack">
              <TBInput value={p.tech}
                onChange={(e) => store.setProject(p.id, "tech", e.target.value)} placeholder="React, Python, PostgreSQL" />
            </Field>
          </FieldWrap>
          <FieldWrap>
            <Field label="Link">
              <TBInput value={p.link}
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
          <TBInput
            key={idx}
            sx={{ "& .MuiOutlinedInput-root": { fontSize: 12 } }}
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
      <TBTextarea
        minRows={5}
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
