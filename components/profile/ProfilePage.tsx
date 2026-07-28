"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ResumeUpload from "./ResumeUpload";
import { ExtractedProfileState, INITIAL_EXTRACTED_PROFILE } from "../../lib/resumeExtractorService";
import {
  ChevronRight,
  FileText,
  Pencil,
  Upload,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  Link,
  Briefcase,
  GraduationCap,
  Folder,
  Target,
  Settings,
  Shield,
} from "lucide-react";
import { loadExtractedProfile, saveExtractedProfile, loadProfile, saveProfile, mergeProfilePreferEmpty, tailorContactHintsFromExtracted, type ProfileFormState, EMPTY_PROFILE } from "../../lib/profileStorage";
import { fetchExtractedProfile, upsertExtractedProfile, fetchUserProfile, upsertUserProfile } from "../../lib/supabase";

export default function ProfilePage() {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "extracting" | "review" | "completed">("idle");
  const [extractedData, setExtractedData] = useState<ExtractedProfileState>(INITIAL_EXTRACTED_PROFILE);

  const [baseline, setBaseline] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  const [tailorDefaults, setTailorDefaults] = useState<ProfileFormState>(EMPTY_PROFILE);
  const [tdBaseline, setTdBaseline] = useState<string>("");
  const [tdSaving, setTdSaving] = useState(false);
  const tdSaveTimerRef = useRef<number | null>(null);

  const dirty = typeof window !== "undefined" && baseline !== "" && baseline !== JSON.stringify(extractedData);
  const tdDirty = typeof window !== "undefined" && tdBaseline !== "" && tdBaseline !== JSON.stringify(tailorDefaults);
  const anyDirty = dirty || tdDirty;
  const anySaving = saving || tdSaving;

  useEffect(() => {
    let mounted = true;
    async function init() {
      const dbProfile = await fetchExtractedProfile();
      const localProfile = loadExtractedProfile();
      const initial = dbProfile || localProfile;

      const dbDefaults = await fetchUserProfile();
      const localDefaults = loadProfile();
      const initialDefaults = dbDefaults || localDefaults;

      if (mounted) {
        setExtractedData(initial);
        setBaseline(JSON.stringify(initial));
        setTailorDefaults(initialDefaults);
        setTdBaseline(JSON.stringify(initialDefaults));

        if (initial.name || (initial.skills && initial.skills.length > 0) || (initial.experience && initial.experience.length > 0)) {
          setUploadStatus("completed");
        }
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    const snap = { ...extractedData };
    try {
      saveExtractedProfile(snap);
      await upsertExtractedProfile(snap);
      setBaseline(JSON.stringify(snap));
    } catch (e) {
      console.warn("Save failed", e);
    } finally {
      setSaving(false);
    }
  }, [extractedData]);

  const saveTailorDefaults = useCallback(async () => {
    setTdSaving(true);
    const snap = { ...tailorDefaults };
    try {
      saveProfile(snap);
      await upsertUserProfile(snap);
      setTdBaseline(JSON.stringify(snap));
    } catch (e) {
      console.warn("Tailor-defaults save failed", e);
    } finally {
      setTdSaving(false);
    }
  }, [tailorDefaults]);

  useEffect(() => {
    if (!dirty || saving) return;
    if (typeof window === "undefined") return;
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void save();
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [extractedData, dirty, saving, save]);

  useEffect(() => {
    if (!tdDirty || tdSaving) return;
    if (typeof window === "undefined") return;
    if (tdSaveTimerRef.current) window.clearTimeout(tdSaveTimerRef.current);
    tdSaveTimerRef.current = window.setTimeout(() => {
      tdSaveTimerRef.current = null;
      void saveTailorDefaults();
    }, 1500);
    return () => {
      if (tdSaveTimerRef.current) {
        window.clearTimeout(tdSaveTimerRef.current);
        tdSaveTimerRef.current = null;
      }
    };
  }, [tailorDefaults, tdDirty, tdSaving, saveTailorDefaults]);

  useEffect(() => {
    if (!anyDirty || typeof window === "undefined") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const handleExtractionStart = () => setUploadStatus("extracting");

  const handleExtractionComplete = () => {
    setUploadStatus("review");
  };

  const handleAcceptAll = (data: ExtractedProfileState) => {
    setExtractedData(data);
    setUploadStatus("completed");
    setTailorDefaults(prev => mergeProfilePreferEmpty(prev, tailorContactHintsFromExtracted(data)).next);
  };

  const hasData = uploadStatus === "completed" && (extractedData.name || extractedData.experience?.length > 0 || extractedData.skills?.length > 0);

  const experienceYears = extractedData.experience?.length
    ? `${extractedData.experience.length} role${extractedData.experience.length !== 1 ? "s" : ""}`
    : "";

  const totalYears = (() => {
    if (!extractedData.experience?.length) return "";
    let earliest = new Date().getFullYear();
    let latest = 0;
    for (const exp of extractedData.experience) {
      const match = exp.dates?.match(/(\d{4})/);
      if (match) {
        const y = parseInt(match[1], 10);
        if (y < earliest) earliest = y;
      }
      const endMatch = exp.dates?.match(/(\d{4})\s*$/);
      if (endMatch) {
        const y = parseInt(endMatch[1], 10);
        if (y > latest) latest = y;
      }
    }
    if (latest >= earliest) return `${latest - earliest} years`;
    return "";
  })();

  const summaryItems = [experienceYears, totalYears].filter(Boolean).join(" \u00b7 ");

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .cm-page { max-width: 760px; margin: 0 auto; padding: 32px 24px 72px; }
        .cm-eyebrow { margin: 0 0 8px; color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; }
        .cm-title { margin: 0; font-size: clamp(32px, 5vw, 44px); font-weight: 400; line-height: 1.1; letter-spacing: -1px; }
        .cm-promise { max-width: 560px; margin: 12px auto 0; color: var(--muted); font-size: 16px; line-height: 1.55; }
        .cm-meta { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px 12px; margin-top: 18px; color: var(--muted); font-size: 12px; }
        .cm-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 4px; font-weight: 600; font-size: 12px; }
        .cm-chip svg { width: 13px; height: 13px; flex-shrink: 0; }
        .cm-saved { display: inline-flex; align-items: center; gap: 4px; color: #2ea043; font-weight: 600; }
        .cm-saved::before { content: ""; width: 6px; height: 6px; background: #2ea043; border-radius: 50%; }
        .cm-sep { color: var(--muted); }

        .cm-attention { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 24px 0 0; padding: 10px 12px; background: rgba(210, 153, 34, 0.08); color: #9a6700; border: 1px solid rgba(210, 153, 34, 0.3); border-left: 3px solid #d29922; border-radius: 3px; font-size: 13px; }
        [data-theme="dark"] .cm-attention { background: rgba(210, 153, 34, 0.12); color: #e3b341; border-color: rgba(210, 153, 34, 0.35); border-left-color: #d29922; }
        .cm-attention-body { display: flex; align-items: center; gap: 8px; }
        .cm-attention-body svg { width: 16px; height: 16px; flex-shrink: 0; }
        .cm-text-btn { flex-shrink: 0; padding: 2px 0; background: none; border: 0; border-bottom: 1px solid currentColor; color: var(--accent); cursor: pointer; font-size: 12px; font-weight: 700; }

        .cm-identity { display: grid; grid-template-columns: 1fr auto; gap: 20px; padding: 20px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-top: 20px; }
        .cm-identity-name { margin: 0; font-size: 22px; font-weight: 600; line-height: 1.2; }
        .cm-identity-role { margin: 2px 0 0; color: var(--muted); font-size: 14px; }
        .cm-contact { display: flex; flex-wrap: wrap; gap: 6px 16px; grid-column: 1 / -1; margin-top: 4px; color: var(--muted); font-size: 12px; }
        .cm-contact-item { display: inline-flex; align-items: center; gap: 4px; }
        .cm-contact-item svg { width: 12px; height: 12px; }
        .cm-edit-btn { align-self: center; display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--accent); cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.15s; }
        .cm-edit-btn:hover { background: var(--accent-bg); }

        .cm-ledger { border-bottom: 1px solid var(--border); }
        .cm-section { border-bottom: 1px solid var(--border); }
        .cm-section:last-child { border-bottom: 0; }
        .cm-section summary { display: grid; min-height: 56px; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 8px; cursor: pointer; list-style: none; user-select: none; padding: 0; }
        .cm-section summary::-webkit-details-marker { display: none; }
        .cm-section summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
        .cm-chevron { display: grid; width: 18px; height: 18px; place-items: center; color: var(--accent); transition: transform 0.16s ease; }
        .cm-section[open] .cm-chevron { transform: rotate(90deg); }
        .cm-section-title { font-size: 16px; font-weight: 600; line-height: 1.25; }
        .cm-section-count { display: block; margin-top: 1px; color: var(--muted); font-size: 11px; }
        .cm-section-label { color: var(--muted); font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .cm-detail-body { padding: 0 0 20px 28px; }

        .cm-entry { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 16px; padding: 12px 0; border-top: 1px dotted var(--border); }
        .cm-entry:first-child { padding-top: 2px; border-top: 0; }
        .cm-entry h4 { margin: 0; font-size: 13px; font-weight: 600; }
        .cm-entry p { margin: 2px 0 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
        .cm-entry-date { color: var(--muted); font-size: 11px; white-space: nowrap; }

        .cm-tag-list { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 2px; }
        .cm-tag { padding: 4px 8px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 3px; font-size: 11px; }

        .cm-inline-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding-top: 10px; border-top: 1px dotted var(--border); }
        .cm-source-note { color: var(--muted); font-size: 10px; }

        .cm-page-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 20px; }
        .cm-action-note { color: var(--muted); font-size: 11px; }
        .cm-upload-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--accent); cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.15s; }
        .cm-upload-btn:hover { background: var(--accent-bg); }

        .cm-privacy { display: flex; max-width: 480px; align-items: flex-start; gap: 8px; margin: 16px auto 0; color: var(--muted); text-align: left; font-size: 11px; line-height: 1.5; }
        .cm-privacy svg { flex-shrink: 0; width: 13px; height: 13px; margin-top: 1px; }

        .cm-toast { position: fixed; right: 20px; bottom: 20px; z-index: 30; padding: 8px 12px; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 4px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); font-size: 12px; opacity: 0; transform: translateY(6px); pointer-events: none; transition: opacity 0.18s, transform 0.18s; }
        .cm-toast.show { opacity: 1; transform: translateY(0); }

        @media (max-width: 640px) {
          .cm-page { padding: 20px 16px 80px; }
          .cm-title { font-size: 32px; }
          .cm-identity { grid-template-columns: 1fr auto; gap: 12px; }
          .cm-contact { grid-column: 1 / -1; }
          .cm-section summary { min-height: 52px; }
          .cm-detail-body { padding-left: 24px; }
          .cm-entry { grid-template-columns: 1fr; }
          .cm-entry-date { grid-row: 2; }
          .cm-page-actions { flex-direction: column; align-items: stretch; }
        }
      ` }} />

      <div className="cm-page">
        <header style={{ textAlign: "center", marginBottom: 28 }}>
          <p className="cm-eyebrow">Career record</p>
          <h1 className="cm-title">Career Memory</h1>
          <p className="cm-promise">Upload once. Resunova remembers your career history and uses it across every application.</p>

          {hasData && (
            <div className="cm-meta">
              {extractedData.name && (
                <>
                  <span className="cm-chip">
                    <FileText />
                    {extractedData.name}&apos;s Resume
                  </span>
                  <span className="cm-sep">&middot;</span>
                </>
              )}
              {anySaving ? (
                <span style={{ color: "var(--muted)" }}>Saving&hellip;</span>
              ) : anyDirty ? (
                <span style={{ color: "var(--muted)" }}>Unsaved changes</span>
              ) : (
                <span className="cm-saved">Saved</span>
              )}
            </div>
          )}
        </header>

        {hasData ? (
          <>
            {/* Attention strip — facts needing review */}
            <FactReviewStrip data={extractedData} />

            {/* Identity card */}
            <section className="cm-identity">
              <div>
                <h2 className="cm-identity-name">{extractedData.name || "Your Name"}</h2>
                <p className="cm-identity-role">
                  {extractedData.role || extractedData.headline || "Your role"}
                  {extractedData.location ? <> &middot; {extractedData.location}</> : null}
                </p>
              </div>
              <button className="cm-edit-btn" type="button" onClick={() => {
                const el = document.querySelector(".cm-section[data-section='contact']") as HTMLDetailsElement | null;
                if (el) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "center" }); }
              }}>
                <Pencil size={12} /> Edit
              </button>
              <div className="cm-contact">
                {extractedData.email && (
                  <span className="cm-contact-item"><Mail size={12} /> {extractedData.email}</span>
                )}
                {extractedData.phone && (
                  <span className="cm-contact-item"><Phone size={12} /> {extractedData.phone}</span>
                )}
                {extractedData.linkedin && (
                  <span className="cm-contact-item"><Link size={12} /> LinkedIn</span>
                )}
                {extractedData.github && (
                  <span className="cm-contact-item"><Link size={12} /> GitHub</span>
                )}
                {extractedData.portfolio && (
                  <span className="cm-contact-item"><Globe size={12} /> Portfolio</span>
                )}
              </div>
            </section>

            {/* Ledger sections */}
            <div className="cm-ledger">
              <LedgerSection
                title="Experience"
                count={summaryItems || undefined}
                label="Resume"
                icon={<Briefcase size={14} />}
                defaultOpen
              >
                {extractedData.experience?.length ? (
                  extractedData.experience.map((exp, i) => (
                    <div className="cm-entry" key={i}>
                      <div>
                        <h4>{exp.role}{exp.company ? `, ${exp.company}` : ""}</h4>
                        {exp.description && <p>{exp.description}</p>}
                        {exp.bullets?.length > 0 && !exp.description && (
                          <p>{exp.bullets.slice(0, 2).join(" \u2022 ")}</p>
                        )}
                      </div>
                      <span className="cm-entry-date">{exp.dates || ""}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No experience added yet.</p>
                )}
                <div className="cm-inline-actions">
                  <span className="cm-source-note">Source: resume</span>
                  <button className="cm-text-btn" type="button">Edit experience</button>
                </div>
              </LedgerSection>

              <LedgerSection
                title="Education"
                count={extractedData.education?.length ? `${extractedData.education.length} school${extractedData.education.length !== 1 ? "s" : ""}` : undefined}
                label="Resume"
                icon={<GraduationCap size={14} />}
              >
                {extractedData.education?.length ? (
                  extractedData.education.map((edu, i) => (
                    <div className="cm-entry" key={i}>
                      <div>
                        <h4>{edu.degree || "Degree"}</h4>
                        <p>{edu.institution}</p>
                      </div>
                      <span className="cm-entry-date">{edu.dates || ""}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No education added yet.</p>
                )}
                <div className="cm-inline-actions">
                  <span className="cm-source-note">Source: resume</span>
                  <button className="cm-text-btn" type="button">Edit education</button>
                </div>
              </LedgerSection>

              <LedgerSection
                title="Skills"
                count={extractedData.skills?.length ? `${extractedData.skills.length} skills` : undefined}
                label="Resume"
                icon={<Settings size={14} />}
              >
                {extractedData.skills?.length ? (
                  <div className="cm-tag-list">
                    {extractedData.skills.map((skill, i) => (
                      <span className="cm-tag" key={i}>{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No skills added yet.</p>
                )}
                <div className="cm-inline-actions">
                  <span className="cm-source-note">Source: resume</span>
                  <button className="cm-text-btn" type="button">Edit skills</button>
                </div>
              </LedgerSection>

              <LedgerSection
                title="Projects"
                count={extractedData.projects?.length ? `${extractedData.projects.length} projects` : undefined}
                label="Resume"
                icon={<Folder size={14} />}
              >
                {extractedData.projects?.length ? (
                  extractedData.projects.map((proj, i) => (
                    <div className="cm-entry" key={i}>
                      <div>
                        <h4>{proj.name}</h4>
                        {proj.description && <p>{proj.description}</p>}
                        {proj.tech && <p style={{ fontStyle: "italic" }}>{proj.tech}</p>}
                        {!proj.description && proj.bullets?.length > 0 && (
                          <p>{proj.bullets.slice(0, 2).join(" \u2022 ")}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No projects added yet.</p>
                )}
                <div className="cm-inline-actions">
                  <span className="cm-source-note">Source: resume</span>
                  <button className="cm-text-btn" type="button">Edit projects</button>
                </div>
              </LedgerSection>

              <LedgerSection
                title="Summary"
                label="Resume"
                icon={<FileText size={14} />}
              >
                {extractedData.summary ? (
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{extractedData.summary}</p>
                ) : (
                  <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No summary written yet.</p>
                )}
                <div className="cm-inline-actions">
                  <span className="cm-source-note">Source: resume</span>
                  <button className="cm-text-btn" type="button">Edit summary</button>
                </div>
              </LedgerSection>

              <LedgerSection
                title="Target roles"
                label="You"
                icon={<Target size={14} />}
              >
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  {tailorDefaults.roles || "No target roles set. Edit your preferences to help Resunova tailor applications."}
                </p>
                <div className="cm-inline-actions">
                  <span className="cm-source-note">Source: your preferences</span>
                  <button className="cm-text-btn" type="button">Edit target roles</button>
                </div>
              </LedgerSection>

              <LedgerSection
                title="Application defaults"
                label="You"
                icon={<Shield size={14} />}
              >
                <div className="cm-entry" style={{ borderTop: 0, paddingTop: 0 }}>
                  <div>
                    <h4>Preferred tone</h4>
                    <p>{tailorDefaults.tone === "confident" ? "Confident & concise" : tailorDefaults.tone === "formal" ? "Formal" : tailorDefaults.tone === "friendly" ? "Friendly" : "Not set"}</p>
                  </div>
                </div>
                {tailorDefaults.portfolio && (
                  <div className="cm-entry">
                    <div>
                      <h4>Portfolio</h4>
                      <p>{tailorDefaults.portfolio}</p>
                    </div>
                  </div>
                )}
                <div className="cm-inline-actions">
                  <span className="cm-source-note">Source: your preferences</span>
                  <button className="cm-text-btn" type="button">Edit defaults</button>
                </div>
              </LedgerSection>
            </div>

            <div className="cm-page-actions">
              <span className="cm-action-note">
                {anySaving ? "Saving changes\u2026" : anyDirty ? "Unsaved changes" : "Changes save to your Career Memory."}
              </span>
              <button className="cm-upload-btn" type="button" onClick={() => setUploadStatus("idle")}>
                <Upload size={13} /> Update from resume
              </button>
            </div>
          </>
        ) : (
          /* Empty state — single upload entry (ResumeUpload). Do not stack a second CTA. */
          <section style={{ marginTop: 8, maxWidth: 720, marginInline: "auto" }}>
            <ResumeUpload
              status={uploadStatus}
              onExtractionStart={handleExtractionStart}
              onExtractionComplete={handleExtractionComplete}
              onAcceptAll={handleAcceptAll}
            />
            <div className="cm-privacy" id="cm-upload-privacy">
              <Shield size={13} />
              <span>Your resume stays private. We reuse only the career facts you approve, so future applications start with accurate context.</span>
            </div>
          </section>
        )}
      </div>

      <Toast />
    </div>
  );
}

/* ---- Sub-components ---- */

function LedgerSection({
  title,
  count,
  label,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: string;
  label: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="cm-section" data-section={title.toLowerCase().replace(/\s+/g, "-")} open={defaultOpen}>
      <summary>
        <span className="cm-chevron"><ChevronRight size={14} /></span>
        <span>
          <span className="cm-section-title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {icon && <span style={{ color: "var(--muted)" }}>{icon}</span>}
            {title}
          </span>
          {count && <span className="cm-section-count">{count}</span>}
        </span>
        <span className="cm-section-label">{label}</span>
      </summary>
      <div className="cm-detail-body">{children}</div>
    </details>
  );
}

function FactReviewStrip({ data }: { data: ExtractedProfileState }) {
  const issues: string[] = [];

  if (data.experience?.length) {
    for (const exp of data.experience) {
      if (!exp.dates || /present/i.test(exp.dates)) {
        // Check if dates look incomplete
        if (!exp.dates || exp.dates.split(/\s*[-\u2013]\s*/).length < 2) {
          issues.push(`${exp.role || "A role"} needs date review`);
        }
      }
    }
  }

  if (data.summary && data.summary.length < 80) {
    issues.push("Summary is very short");
  }

  if (issues.length === 0) return null;

  return (
    <div className="cm-attention" role="status">
      <div className="cm-attention-body">
        <AlertCircle />
        <span><strong>{issues.length} fact{issues.length !== 1 ? "s" : ""} to review</strong> from your latest resume.</span>
      </div>
      <button className="cm-text-btn" type="button" onClick={() => {
        const el = document.querySelector(".cm-section[data-section='experience']") as HTMLDetailsElement | null;
        if (el) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      }}>
        Review now
      </button>
    </div>
  );
}

function Toast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      setMsg(e.detail);
      setShow(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setShow(false), 2200);
    };
    window.addEventListener("cm:toast" as string, handler as EventListener);
    return () => window.removeEventListener("cm:toast" as string, handler as EventListener);
  }, []);

  return <div className={`cm-toast${show ? " show" : ""}`} role="status" aria-live="polite">{msg}</div>;
}
