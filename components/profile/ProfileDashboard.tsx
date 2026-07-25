"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Edit3, Brain, Code, Briefcase, GraduationCap, Folder, Settings, User, Plus, X, CheckCircle2, Save, Mail, Phone, MapPin, Zap
} from "lucide-react";
import { ExtractedProfileState } from "../../lib/resumeExtractorService";
import { type ProfileFormState, EMPTY_PROFILE } from "../../lib/profileStorage";

export type EditSection = "header" | "contact" | "summary" | "skills" | "experience" | "education" | "projects" | "jobPrefs" | "tailoringDefaults" | "eeo" | null;

/** Sections that edit the Tailor-defaults record (`user_profiles`) rather than
 * the extracted résumé (`user_extracted_profiles`). */
const TAILOR_DEFAULT_SECTIONS: ReadonlySet<EditSection> = new Set<EditSection>([
  "jobPrefs",
  "tailoringDefaults",
  "eeo",
]);

const EDIT_SECTION_LABELS: Record<string, string> = {
  jobPrefs: "Job Preferences",
  tailoringDefaults: "Tailoring Defaults",
  eeo: "Application Details",
};

const ROLE_SUGGESTIONS = [
  "Software Engineer", "Data Analyst", "Product Manager", "Business Analyst",
  "Marketing", "Sales", "Designer", "Nurse",
];

const TONE_OPTIONS: { value: string; label: string }[] = [
  { value: "confident", label: "Confident & concise" },
  { value: "formal", label: "Formal" },
  { value: "friendly", label: "Friendly" },
];

const SECTION_ORDER_OPTIONS: { value: string; label: string }[] = [
  { value: "summary-exp-proj-edu", label: "Summary → Experience → Projects → Education" },
  { value: "exp-summary-edu", label: "Experience → Summary → Education" },
  { value: "edu-exp", label: "Education → Experience → …" },
];

const EEO_QUESTIONS: { key: keyof ProfileFormState; label: string; options: string[] }[] = [
  { key: "eeoWorkUs", label: "Are you authorized to work in the U.S.?", options: ["Yes", "No"] },
  { key: "eeoSponsor", label: "Will you require visa sponsorship now or in the future?", options: ["Yes", "No"] },
  { key: "eeoDisability", label: "Do you have a disability?", options: ["Yes", "No", "Decline to state"] },
  { key: "eeoVeteran", label: "Are you a veteran?", options: ["Yes", "No", "Decline to state"] },
  { key: "eeoGender", label: "What is your gender?", options: ["Male", "Female", "Non-Binary", "Decline to state"] },
  { key: "eeoLgbtq", label: "Do you identify as LGBTQ+?", options: ["Yes", "No", "Decline to state"] },
];

interface ProfileDashboardProps {
  extractedData: ExtractedProfileState;
  /** Tailor defaults + EEO (`ProfileFormState`), persisted to `user_profiles`. */
  tailorDefaults?: ProfileFormState;
  status?: "idle" | "extracting" | "review" | "completed";
  onUpdateData?: (newData: Partial<ExtractedProfileState>) => void;
  /** Patch handler for the Tailor-defaults record (writes to `user_profiles`). */
  onUpdateTailorDefaults?: (patch: Partial<ProfileFormState>) => void;
  editSection?: EditSection;
  onOpenEdit?: (section: EditSection) => void;
  onCloseEdit?: () => void;
}

const SkeletonLine = ({ width = "100%", height = 12, borderRadius = 6 }: { width?: string | number, height?: number, borderRadius?: number }) => (
  <div style={{ width, height, background: "var(--surface2)", borderRadius, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
);

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--surface2)", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: "vertical", minHeight: 80, fontFamily: "inherit", lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "block",
};

export default function ProfileDashboard({ extractedData, tailorDefaults = EMPTY_PROFILE, status = "completed", onUpdateData, onUpdateTailorDefaults, editSection = null, onOpenEdit, onCloseEdit }: ProfileDashboardProps) {
  const isReady = status === "completed";

  // Local state if not controlled by parent
  const [localEditSection, setLocalEditSection] = useState<EditSection>(null);
  const activeEditSection = onOpenEdit ? editSection : localEditSection;

  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const skillInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Partial<ExtractedProfileState>>({});
  // Separate draft for the Tailor-defaults sections (different persistence target).
  const [tdDraft, setTdDraft] = useState<Partial<ProfileFormState>>({});

  useEffect(() => {
    if (isAddingSkill && skillInputRef.current) skillInputRef.current.focus();
  }, [isAddingSkill]);

  useEffect(() => {
    // Sync draft when active section changes
    if (activeEditSection === "header" || activeEditSection === "contact") {
      setDraft({ name: extractedData.name || "", role: extractedData.role || "", location: extractedData.location || "", email: extractedData.email || "", phone: extractedData.phone || "" });
    } else if (activeEditSection === "summary") {
      setDraft({ summary: extractedData.summary || "", headline: extractedData.headline || "" });
    } else if (activeEditSection === "experience") {
      setDraft({ experience: JSON.parse(JSON.stringify(extractedData.experience || [])) });
    } else if (activeEditSection === "education") {
      setDraft({ education: JSON.parse(JSON.stringify(extractedData.education || [])) });
    } else if (activeEditSection === "projects") {
      setDraft({ projects: JSON.parse(JSON.stringify(extractedData.projects || [])) });
    } else if (activeEditSection === "jobPrefs") {
      setTdDraft({ roles: tailorDefaults.roles || "", locations: tailorDefaults.locations || "" });
    } else if (activeEditSection === "tailoringDefaults") {
      setTdDraft({ tone: tailorDefaults.tone || "confident", sectionOrder: tailorDefaults.sectionOrder || "summary-exp-proj-edu" });
    } else if (activeEditSection === "eeo") {
      setTdDraft({
        eeoWorkUs: tailorDefaults.eeoWorkUs || "", eeoSponsor: tailorDefaults.eeoSponsor || "",
        eeoDisability: tailorDefaults.eeoDisability || "", eeoVeteran: tailorDefaults.eeoVeteran || "",
        eeoGender: tailorDefaults.eeoGender || "", eeoLgbtq: tailorDefaults.eeoLgbtq || "",
      });
    }
  }, [activeEditSection, extractedData, tailorDefaults]);

  const handleOpenEdit = (section: EditSection) => {
    if (onOpenEdit) onOpenEdit(section);
    else setLocalEditSection(section);
  };

  const handleCloseEdit = () => {
    if (onCloseEdit) onCloseEdit();
    else setLocalEditSection(null);
    setDraft({});
    setTdDraft({});
  };

  const saveEdit = () => {
    if (TAILOR_DEFAULT_SECTIONS.has(activeEditSection)) {
      if (onUpdateTailorDefaults) onUpdateTailorDefaults(tdDraft);
    } else if (onUpdateData) {
      onUpdateData(draft);
    }
    handleCloseEdit();
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && onUpdateData) {
      onUpdateData({ skills: [...(extractedData.skills || []), newSkill.trim()] });
    }
    setNewSkill("");
    setIsAddingSkill(false);
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAddSkill();
    else if (e.key === "Escape") { setNewSkill(""); setIsAddingSkill(false); }
  };

  // SaaS Card Styles
  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    boxShadow: "var(--shadow-card, 0 4px 20px rgba(0,0,0,0.03))",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  };

  const cardHeaderStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20
  };

  const titleWrapperStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 12
  };

  const iconCircleStyle = (color: string) => ({
    width: 32, height: 32, borderRadius: "50%",
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    color: color,
    display: "flex", alignItems: "center", justifyContent: "center"
  });

  const titleStyle: React.CSSProperties = {
    fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0
  };

  const editButtonStyle: React.CSSProperties = {
    background: "transparent", border: "1px solid transparent", color: "var(--muted)", cursor: "pointer",
    display: "flex", alignItems: "center", padding: 6, borderRadius: 8, transition: "background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s, opacity 0.2s"
  };

  return (
    <>
      {/* ===== EDIT MODAL OVERLAY ===== */}
      {activeEditSection && (
        <div onClick={handleCloseEdit} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.15s ease-out" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.15)", animation: "slideUp 0.2s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--surface)", zIndex: 1, borderRadius: "20px 20px 0 0" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text)", textTransform: "capitalize" }}>Edit {(activeEditSection && EDIT_SECTION_LABELS[activeEditSection]) || activeEditSection}</h3>
              <button onClick={handleCloseEdit} style={{ background: "var(--surface2)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text)" }}><X size={16} /></button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {(activeEditSection === "header" || activeEditSection === "contact") && (
                <>
                  <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={draft.name || ""} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
                  <div><label style={labelStyle}>Role / Title</label><input style={inputStyle} value={draft.role || ""} onChange={e => setDraft({ ...draft, role: e.target.value })} /></div>
                  <div><label style={labelStyle}>Email</label><input style={inputStyle} value={draft.email || ""} onChange={e => setDraft({ ...draft, email: e.target.value })} /></div>
                  <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={draft.phone || ""} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></div>
                  <div><label style={labelStyle}>Location</label><input style={inputStyle} value={draft.location || ""} onChange={e => setDraft({ ...draft, location: e.target.value })} /></div>
                </>
              )}
              {activeEditSection === "summary" && (
                <div><label style={labelStyle}>Career Summary</label><textarea style={textareaStyle} value={draft.summary || ""} onChange={e => setDraft({ ...draft, summary: e.target.value })} rows={5} /></div>
              )}
              {activeEditSection === "experience" && (
                <>
                  {(draft.experience || []).map((exp, i) => (
                    <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Experience {i + 1}</span><button onClick={() => setDraft({ ...draft, experience: (draft.experience || []).filter((_, j) => j !== i) })} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={14} /></button></div>
                      <div><label style={labelStyle}>Role</label><input style={inputStyle} value={exp.role || ""} onChange={e => { const ex = [...(draft.experience || [])]; ex[i] = { ...ex[i], role: e.target.value }; setDraft({ ...draft, experience: ex }); }} /></div>
                      <div><label style={labelStyle}>Company</label><input style={inputStyle} value={exp.company || ""} onChange={e => { const ex = [...(draft.experience || [])]; ex[i] = { ...ex[i], company: e.target.value }; setDraft({ ...draft, experience: ex }); }} /></div>
                      <div><label style={labelStyle}>Dates</label><input style={inputStyle} value={exp.dates || ""} onChange={e => { const ex = [...(draft.experience || [])]; ex[i] = { ...ex[i], dates: e.target.value }; setDraft({ ...draft, experience: ex }); }} /></div>
                      <div><label style={labelStyle}>Description</label><textarea style={textareaStyle} value={exp.description || ""} onChange={e => { const ex = [...(draft.experience || [])]; ex[i] = { ...ex[i], description: e.target.value }; setDraft({ ...draft, experience: ex }); }} /></div>
                    </div>
                  ))}
                  <button onClick={() => setDraft({ ...draft, experience: [...(draft.experience || []), { role: "", company: "", dates: "", location: "", bullets: [] }] })} style={{ padding: "10px 16px", background: "var(--surface2)", border: "1px dashed var(--border)", borderRadius: 10, cursor: "pointer", fontSize: 14, color: "var(--muted)", fontWeight: 500 }}><Plus size={16} /> Add Experience</button>
                </>
              )}
              {activeEditSection === "education" && (
                <>
                  {(draft.education || []).map((edu, i) => (
                    <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Education {i + 1}</span><button onClick={() => setDraft({ ...draft, education: (draft.education || []).filter((_, j) => j !== i) })} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={14} /></button></div>
                      <div><label style={labelStyle}>Degree</label><input style={inputStyle} value={edu.degree || ""} onChange={e => { const ed = [...(draft.education || [])]; ed[i] = { ...ed[i], degree: e.target.value }; setDraft({ ...draft, education: ed }); }} /></div>
                      <div><label style={labelStyle}>Institution</label><input style={inputStyle} value={edu.institution || ""} onChange={e => { const ed = [...(draft.education || [])]; ed[i] = { ...ed[i], institution: e.target.value }; setDraft({ ...draft, education: ed }); }} /></div>
                      <div><label style={labelStyle}>Dates</label><input style={inputStyle} value={edu.dates || ""} onChange={e => { const ed = [...(draft.education || [])]; ed[i] = { ...ed[i], dates: e.target.value }; setDraft({ ...draft, education: ed }); }} /></div>
                    </div>
                  ))}
                  <button onClick={() => setDraft({ ...draft, education: [...(draft.education || []), { degree: "", institution: "", dates: "", bullets: [] }] })} style={{ padding: "10px 16px", background: "var(--surface2)", border: "1px dashed var(--border)", borderRadius: 10, cursor: "pointer", fontSize: 14, color: "var(--muted)", fontWeight: 500 }}><Plus size={16} /> Add Education</button>
                </>
              )}
              {activeEditSection === "projects" && (
                <>
                  {(draft.projects || []).map((proj, i) => (
                    <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Project {i + 1}</span><button onClick={() => setDraft({ ...draft, projects: (draft.projects || []).filter((_, j) => j !== i) })} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={14} /></button></div>
                      <div><label style={labelStyle}>Name</label><input style={inputStyle} value={proj.name || ""} onChange={e => { const pr = [...(draft.projects || [])]; pr[i] = { ...pr[i], name: e.target.value }; setDraft({ ...draft, projects: pr }); }} /></div>
                      <div><label style={labelStyle}>Description</label><textarea style={textareaStyle} value={proj.description || ""} onChange={e => { const pr = [...(draft.projects || [])]; pr[i] = { ...pr[i], description: e.target.value }; setDraft({ ...draft, projects: pr }); }} /></div>
                    </div>
                  ))}
                  <button onClick={() => setDraft({ ...draft, projects: [...(draft.projects || []), { name: "", tech: "", bullets: [] }] })} style={{ padding: "10px 16px", background: "var(--surface2)", border: "1px dashed var(--border)", borderRadius: 10, cursor: "pointer", fontSize: 14, color: "var(--muted)", fontWeight: 500 }}><Plus size={16} /> Add Project</button>
                </>
              )}
              {activeEditSection === "jobPrefs" && (
                <>
                  <div>
                    <label style={labelStyle}>Target Roles</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      {ROLE_SUGGESTIONS.map((r) => {
                        const current = (tdDraft.roles || "").split(",").map(s => s.trim()).filter(Boolean);
                        const active = current.some(c => c.toLowerCase() === r.toLowerCase());
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              const next = active ? current.filter(c => c.toLowerCase() !== r.toLowerCase()) : [...current, r];
                              setTdDraft({ ...tdDraft, roles: next.join(", ") });
                            }}
                            style={{
                              padding: "5px 12px", borderRadius: 20,
                              border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                              background: active ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--surface2)",
                              color: active ? "var(--accent)" : "var(--text)",
                              fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            {active ? "✓ " : ""}{r}
                          </button>
                        );
                      })}
                    </div>
                    <input style={inputStyle} value={tdDraft.roles || ""} onChange={e => setTdDraft({ ...tdDraft, roles: e.target.value })} placeholder="Or type custom roles, comma-separated…" />
                    <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, lineHeight: 1.45 }}>Guides which JD keywords get emphasised when tailoring, and scopes your Jobs feed.</div>
                  </div>
                  <div>
                    <label style={labelStyle}>Target Locations</label>
                    <input style={inputStyle} value={tdDraft.locations || ""} onChange={e => setTdDraft({ ...tdDraft, locations: e.target.value })} placeholder="Remote · NYC · …" />
                  </div>
                </>
              )}
              {activeEditSection === "tailoringDefaults" && (
                <>
                  <div>
                    <label style={labelStyle}>Default Tone</label>
                    <select style={{ ...inputStyle, cursor: "pointer" }} value={tdDraft.tone || "confident"} onChange={e => setTdDraft({ ...tdDraft, tone: e.target.value })}>
                      {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Default Section Order</label>
                    <select style={{ ...inputStyle, cursor: "pointer" }} value={tdDraft.sectionOrder || "summary-exp-proj-edu"} onChange={e => setTdDraft({ ...tdDraft, sectionOrder: e.target.value })}>
                      {SECTION_ORDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </>
              )}
              {activeEditSection === "eeo" && (
                <>
                  <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 4px 0" }}>
                    Optional. Stored so Apply-jobs flows can pre-fill these on supported forms. Never used for résumé scoring or tailoring. Clear anytime.
                  </p>
                  {EEO_QUESTIONS.map((q) => (
                    <div key={q.key}>
                      <label style={labelStyle}>{q.label}</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {q.options.map((opt) => {
                          const active = tdDraft[q.key] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setTdDraft({ ...tdDraft, [q.key]: active ? "" : opt })}
                              style={{
                                padding: "6px 14px", borderRadius: 20,
                                border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                                background: active ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--surface2)",
                                color: active ? "var(--accent)" : "var(--text)",
                                fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              {active ? "✓ " : ""}{opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderTop: "1px solid var(--border)", position: "sticky", bottom: 0, background: "var(--surface)", borderRadius: "0 0 20px 20px" }}>
              <button onClick={handleCloseEdit} style={{ flex: 1, height: 40, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex: 2, height: 40, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent)" }}><Save size={16} /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DASHBOARD ===== */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))", 
        gap: 20, 
        width: "100%", 
        animation: "fadeIn 0.5s ease-out" 
      }}>

        {/* Top Profile Banner (Full Width) */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden", gridColumn: "1 / -1", borderRadius: 16 }} className="clean-card">
          <div style={{ height: 120, background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 80%, transparent), var(--accent))", position: "relative" }}>
            <button onClick={() => isReady && handleOpenEdit("header")} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", border: "none", color: "#fff", padding: 8, borderRadius: "50%", cursor: "pointer", transition: "background 0.2s" }}><Edit3 size={16} /></button>
          </div>
          <div style={{ padding: "0 24px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -32, marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: 16, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid var(--surface)", color: "#fff", flexShrink: 0, boxShadow: "var(--shadow-card)" }}>
                {isReady && extractedData.name ? (
                  <span style={{ fontSize: 24, fontWeight: 700 }}>{extractedData.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}</span>
                ) : <User size={32} />}
              </div>
              <div style={{ paddingBottom: 4, display: "flex", flex: 1, justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  {isReady ? (
                    <>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: 8 }}>
                        {extractedData.name || "Your Name"}
                        <span style={{ fontSize: 11, background: "color-mix(in srgb, var(--green) 15%, transparent)", color: "var(--green)", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>Available</span>
                      </h2>
                      <p style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600, margin: 0 }}>{extractedData.role || "Your Role"}</p>
                    </>
                  ) : (
                    <><SkeletonLine width="200px" height={24} /><div style={{ marginTop: 8 }}><SkeletonLine width="150px" height={16} /></div></>
                  )}
                </div>
                <button onClick={() => isReady && handleOpenEdit("header")} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}><Edit3 size={14} /></button>
              </div>
            </div>

            {/* Meta information row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              {isReady ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 20, color: "#64748b", fontSize: 13, fontWeight: 500 }}>
                    {extractedData.location && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> {extractedData.location}</div>}
                    {extractedData.experience && extractedData.experience.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Briefcase size={14} /> {extractedData.experience.length} {extractedData.experience.length === 1 ? 'role' : 'roles'}</div>}
                    {extractedData.education && extractedData.education.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><GraduationCap size={14} /> {extractedData.education[0].institution}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#3b82f6", fontSize: 13, fontWeight: 600 }}>
                    {extractedData.linkedin && <a href={extractedData.linkedin} style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>LinkedIn</a>}
                    {extractedData.github && <a href={extractedData.github} style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>GitHub</a>}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 20 }}>
                  <SkeletonLine width="100px" height={16} />
                  <SkeletonLine width="120px" height={16} />
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 32, borderBottom: "1px solid var(--border)" }}>
              <div style={{ padding: "0 0 12px 0", color: "var(--accent)", fontSize: 14, fontWeight: 700, borderBottom: "2px solid var(--accent)", cursor: "pointer" }}>Overview</div>
              <div style={{ padding: "0 0 12px 0", color: "var(--muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "color 0.2s" }}>Experience</div>
              <div style={{ padding: "0 0 12px 0", color: "var(--muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "color 0.2s" }}>Skills</div>
              <div style={{ padding: "0 0 12px 0", color: "var(--muted)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "color 0.2s" }}>Preferences</div>
            </div>
          </div>
        </div>

        {/* Career Summary (Full Width) */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#8b5cf6")}><Brain size={16} /></div>
              <h3 style={titleStyle}>Career Summary</h3>
            </div>
            <button onClick={() => isReady && handleOpenEdit("summary")} style={editButtonStyle}><Edit3 size={16} /></button>
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
            {isReady ? (extractedData.summary || "No summary provided. Click ✏️ to add one.") : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><SkeletonLine /><SkeletonLine /><SkeletonLine width="80%" /></div>
            )}
          </div>
        </div>

        {/* Contact (Half) */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#10b981")}><Phone size={16} /></div>
              <h3 style={titleStyle}>Contact</h3>
            </div>
            <button onClick={() => isReady && handleOpenEdit("contact")} style={editButtonStyle}><Edit3 size={16} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isReady ? (
              <>
                <div style={{ display: "flex", gap: 8, fontSize: 14, color: "var(--muted)" }}><Mail size={16} /> {extractedData.email || "No email"}</div>
                <div style={{ display: "flex", gap: 8, fontSize: 14, color: "var(--muted)" }}><Phone size={16} /> {extractedData.phone || "No phone"}</div>
                <div style={{ display: "flex", gap: 8, fontSize: 14, color: "var(--muted)" }}><MapPin size={16} /> {extractedData.location || "No location"}</div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}><SkeletonLine width="70%" /><SkeletonLine width="60%" /><SkeletonLine width="50%" /></div>
            )}
          </div>
        </div>

        {/* Education (Half) */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#3b82f6")}><GraduationCap size={16} /></div>
              <h3 style={titleStyle}>Education</h3>
            </div>
            <button onClick={() => isReady && handleOpenEdit("education")} style={editButtonStyle}><Edit3 size={16} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {isReady ? (
              extractedData.education && extractedData.education.length > 0 ? (
                extractedData.education.map((edu, i) => (
                  <div key={i}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0", color: "var(--text)" }}>{edu.degree}</h4>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{edu.institution} • {edu.dates}</div>
                  </div>
                ))
              ) : <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>No education provided.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}><SkeletonLine width="80%" /><SkeletonLine width="50%" /></div>
            )}
          </div>
        </div>

        {/* Skills (Full Width) */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#06b6d4")}><Code size={16} /></div>
              <h3 style={titleStyle}>Skills & Technologies</h3>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {isReady ? (
              <>
                {(extractedData.skills || []).map(skill => (
                  <span key={skill} style={{ background: "#eff6ff", color: "#2563eb", padding: "6px 14px", borderRadius: 100, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, border: "1px solid #bfdbfe" }}>
                    {skill}
                    <button onClick={() => onUpdateData && onUpdateData({ skills: (extractedData.skills || []).filter(s => s !== skill) })} style={{ background: "transparent", border: "none", color: "inherit", padding: 0, cursor: "pointer", opacity: 0.6 }}><X size={12} /></button>
                  </span>
                ))}
                {isAddingSkill ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input ref={skillInputRef} type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={handleSkillKeyDown} onBlur={() => { if (!newSkill.trim()) setIsAddingSkill(false); }} placeholder="Add skill..." style={{ border: "1px solid #e5eaf3", background: "#fff", color: "var(--text)", padding: "6px 14px", borderRadius: 100, fontSize: 13, outline: "none", width: 120 }} />
                    <button onClick={handleAddSkill} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><CheckCircle2 size={14} /></button>
                  </div>
                ) : (
                  <span onClick={() => setIsAddingSkill(true)} style={{ border: "1px dashed #cbd5e1", color: "#64748b", padding: "6px 14px", borderRadius: 100, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Plus size={14} /> Add Skill</span>
                )}
              </>
            ) : (
              <><SkeletonLine width="80px" height={30} borderRadius={15} /><SkeletonLine width="110px" height={30} borderRadius={15} /><SkeletonLine width="90px" height={30} borderRadius={15} /></>
            )}
          </div>
        </div>

        {/* Work Experience (Full Width) */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#8b5cf6")}><Briefcase size={16} /></div>
              <h3 style={titleStyle}>Work Experience</h3>
            </div>
            <button onClick={() => isReady && handleOpenEdit("experience")} style={editButtonStyle}><Edit3 size={16} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {isReady ? (
              extractedData.experience && extractedData.experience.length > 0 ? (
                extractedData.experience.map((exp, i) => (
                  <div key={i} style={{ display: "flex", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "var(--text)", flexShrink: 0 }}>
                      {exp.company ? exp.company[0].toUpperCase() : "W"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" }}>{exp.role}</h4>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>{exp.dates}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 500, margin: "0 0 8px 0" }}>{exp.company}</p>
                      <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{exp.description || (exp.bullets && exp.bullets.join(" "))}</p>
                    </div>
                  </div>
                ))
              ) : <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>No experience provided.</p>
            ) : (
              <div style={{ display: "flex", gap: 16 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface2)", flexShrink: 0, animation: "pulse 2s infinite" }} /><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}><SkeletonLine width="140px" height={16} /><SkeletonLine width="100px" /><SkeletonLine width="90%" /></div></div>
            )}
          </div>
        </div>

        {/* Projects (Half) */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#f59e0b")}><Folder size={16} /></div>
              <h3 style={titleStyle}>Projects</h3>
            </div>
            <button onClick={() => isReady && handleOpenEdit("projects")} style={editButtonStyle}><Edit3 size={16} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {isReady ? (
              extractedData.projects && extractedData.projects.length > 0 ? (
                extractedData.projects.map((proj, i) => (
                  <div key={i}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0", color: "var(--text)" }}>{proj.name}</h4>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{proj.description}</p>
                  </div>
                ))
              ) : <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>No projects provided.</p>
            ) : (
               <div style={{ display: "flex", flexDirection: "column", gap: 12 }}><SkeletonLine width="70%" /><SkeletonLine width="100%" /></div>
            )}
          </div>
        </div>
        
        {/* Job Preferences (Half) — target roles + locations (Tailor/Jobs defaults) */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#6366f1")}><Settings size={16} /></div>
              <h3 style={titleStyle}>Job Preferences</h3>
            </div>
            <button onClick={() => isReady && handleOpenEdit("jobPrefs")} style={editButtonStyle}><Edit3 size={16} /></button>
          </div>
          {isReady ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Target Roles</div>
                {tailorDefaults.roles?.trim() || "Not set yet."}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Target Locations</div>
                {tailorDefaults.locations?.trim() || "Not set yet."}
              </div>
            </div>
          ) : <SkeletonLine width="60%" />}
        </div>

        {/* Tailoring Defaults (Half) — tone + section order */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#ec4899")}><Zap size={16} /></div>
              <h3 style={titleStyle}>Tailoring Defaults</h3>
            </div>
            <button onClick={() => isReady && handleOpenEdit("tailoringDefaults")} style={editButtonStyle}><Edit3 size={16} /></button>
          </div>
          {isReady ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Tone</div>
                {TONE_OPTIONS.find(o => o.value === (tailorDefaults.tone || "confident"))?.label ?? tailorDefaults.tone}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Section Order</div>
                {SECTION_ORDER_OPTIONS.find(o => o.value === (tailorDefaults.sectionOrder || "summary-exp-proj-edu"))?.label ?? tailorDefaults.sectionOrder}
              </div>
            </div>
          ) : <SkeletonLine width="60%" />}
        </div>

        {/* Application Details (Full) — optional EEO answers for Apply-jobs pre-fill */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={cardHeaderStyle}>
            <div style={titleWrapperStyle}>
              <div style={iconCircleStyle("#0ea5e9")}><User size={16} /></div>
              <h3 style={titleStyle}>Application Details <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dim)" }}>· optional</span></h3>
            </div>
            <button onClick={() => isReady && handleOpenEdit("eeo")} style={editButtonStyle}><Edit3 size={16} /></button>
          </div>
          {isReady ? (
            <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
              {(() => {
                const filled = EEO_QUESTIONS.filter(q => (tailorDefaults[q.key] || "").trim()).length;
                return filled > 0
                  ? `${filled} of ${EEO_QUESTIONS.length} saved — used to pre-fill Apply-jobs forms, never for scoring.`
                  : "Save optional work-authorization and EEO answers to auto-fill job applications later.";
              })()}
            </div>
          ) : <SkeletonLine width="60%" />}
        </div>

      </div>
    </>
  );
}
