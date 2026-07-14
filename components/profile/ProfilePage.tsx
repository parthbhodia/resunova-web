"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ProfileDashboard from "./ProfileDashboard";
import ResumeUpload from "./ResumeUpload";
import { ExtractedProfileState, INITIAL_EXTRACTED_PROFILE } from "../../lib/resumeExtractorService";
import { CheckCircle2, AlertCircle, Sparkles, AlertTriangle, ArrowRight, TrendingUp, Bell, Star, FileText, MessageSquare, Briefcase } from "lucide-react";
import { EditSection } from "./ProfileDashboard";
import { loadExtractedProfile, saveExtractedProfile } from "../../lib/profileStorage";
import { fetchExtractedProfile, upsertExtractedProfile } from "../../lib/supabase";

export default function ProfilePage() {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "extracting" | "review" | "completed">("idle");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedProfileState>(INITIAL_EXTRACTED_PROFILE);
  const [editSection, setEditSection] = useState<EditSection>(null);

  // Autosave State
  const [baseline, setBaseline] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  const dirty = typeof window !== "undefined" && baseline !== "" && baseline !== JSON.stringify(extractedData);

  // Load Profile on Mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      const dbProfile = await fetchExtractedProfile();
      const localProfile = loadExtractedProfile();
      const initial = dbProfile || localProfile;
      if (mounted) {
        setExtractedData(initial);
        setBaseline(JSON.stringify(initial));
        
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

  // Debounced Autosave
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

  // Prevent closing tab with unsaved changes
  useEffect(() => {
    if (!dirty || typeof window === "undefined") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // --- AI RECOMMENDATION LOGIC ---
  const getRecommendations = () => {
    const recs = [];
    
    // Check Summary
    if ((extractedData.summary?.length || 0) < 100) {
      recs.push({
        id: "summary",
        title: "Improve summary",
        desc: "Add technologies and career goals. Short summaries perform poorly.",
        points: 5,
        section: "summary" as EditSection
      });
    }

    // Check Skills
    if ((extractedData.skills?.length || 0) < 5) {
      recs.push({
        id: "skills",
        title: "Add core skills",
        desc: "ATS systems look for specific keywords. Add at least 5 key skills relevant to your industry.",
        points: 10,
        section: "skills" as EditSection
      });
    }

    // Check Experience Metrics
    const expLacksNumbers = extractedData.experience?.some(exp => {
      const text = ((exp as any).description || "") + (exp.bullets?.join(" ") || "");
      return text.length > 0 && !/\d/.test(text); // No numbers found
    });
    if (expLacksNumbers) {
      recs.push({
        id: "exp_metrics",
        title: "Add measurable impact to experience",
        desc: "Your experience has tasks but no numbers. Add metrics like 'improved efficiency by 40%'.",
        points: 15,
        section: "experience" as EditSection
      });
    }

    // Check Projects / Achievements
    if ((extractedData.projects?.length || 0) + (extractedData.experience?.length || 0) < 2) {
      recs.push({
        id: "achievements",
        title: "Add experience or projects",
        desc: "Profiles with detailed experience or projects perform better.",
        points: 15,
        section: "projects" as EditSection
      });
    }

    // Check Links (LinkedIn/Portfolio etc)
    if (!(extractedData as any).linkedin && !(extractedData as any).github && !(extractedData as any).portfolio) {
      recs.push({
        id: "links",
        title: "Add professional links",
        desc: "Recruiters prefer candidates with a LinkedIn profile or professional portfolio.",
        points: 10,
        section: "contact" as EditSection // Map to contact/header
      });
    }

    return recs;
  };

  const recommendations = getRecommendations();
  
  // Calculate a fake score based on recommendations left
  const baseScore = 100;
  const penalty = recommendations.reduce((sum, r) => sum + r.points, 0);
  const profileScore = uploadStatus === "completed" ? Math.max(0, baseScore - penalty) : 0;

  const handleExtractionStart = () => {
    setUploadStatus("extracting");
    setExtractionProgress(0);
  };

  const handleExtractionProgress = (progress: number) => {
    setExtractionProgress(progress);
  };

  const handleExtractionComplete = (data: ExtractedProfileState) => {
    // Data extracted, wait for user to review
    setUploadStatus("review");
  };

  const handleAcceptAll = (data: ExtractedProfileState) => {
    setExtractedData(data);
    setUploadStatus("completed");
  };

  const handleUpdateData = (newData: Partial<ExtractedProfileState>) => {
    setExtractedData(prev => ({ ...prev, ...newData }));
  };

  const GlobalStyles = (
    <style dangerouslySetInnerHTML={{__html: `
      .profile-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 24px;
        align-items: flex-start;
        width: 100%;
      }
      .profile-sidebar {
        display: flex;
        flex-direction: column;
        gap: 24px;
        width: 320px;
        position: sticky;
        top: 24px;
      }
      .clean-card {
        background: var(--surface);
        border-radius: 16px;
        border: 1px solid var(--border);
        padding: 24px;
        box-shadow: var(--shadow-card, 0 4px 20px rgba(0,0,0,0.03));
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .clean-card:hover {
        box-shadow: var(--shadow-card-hover, 0 8px 30px rgba(0,0,0,0.06));
      }
      @media (max-width: 1024px) {
        .profile-grid {
          grid-template-columns: 1fr;
        }
        .profile-sidebar {
          width: 100%;
          position: static;
        }
      }
    `}} />
  );



  return (
    <div style={{ background: "var(--bg)", color: "var(--text)" }}>
      {GlobalStyles}
      <main style={{ padding: "24px 32px", width: "100%" }}>
        
        {/* Generic Career Profile Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: "var(--text)", lineHeight: "normal" }}>Career Profile</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>AI-powered dashboard • Last updated today</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {uploadStatus === "completed" && (
              <div style={{ fontSize: 13, fontWeight: 600, color: saving ? "#3b82f6" : dirty ? "#94a3b8" : "#10b981", display: "flex", alignItems: "center", gap: 6, transition: "color 0.2s ease" }}>
                {saving ? "Saving..." : dirty ? "Unsaved changes" : <><CheckCircle2 size={14} /> Saved</>}
              </div>
            )}
            <button 
              onClick={() => setUploadStatus("idle")}
              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 100, padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--text)", cursor: "pointer" }}
            >
              Update Resume
            </button>
          </div>
        </div>

        <div className="profile-grid">
          {/* Main Content (Left) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
            <ResumeUpload 
              status={uploadStatus}
              onExtractionStart={handleExtractionStart}
              onProgress={handleExtractionProgress}
              onExtractionComplete={handleExtractionComplete} 
              onAcceptAll={handleAcceptAll}
            />
            <ProfileDashboard 
              extractedData={extractedData} 
              status={uploadStatus} 
              onUpdateData={handleUpdateData}
              editSection={editSection}
              onOpenEdit={setEditSection}
              onCloseEdit={() => setEditSection(null)}
            />
          </div>          {/* Right Sidebar */}
          <div className="profile-sidebar">
            {/* Profile Score Card */}
            <div className="clean-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, color: "var(--muted)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <TrendingUp size={16} color="#3b82f6" /> PROFILE SCORE
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#3b82f6" strokeWidth="6" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - profileScore / 100)}`} style={{ transition: "stroke-dashoffset 1s ease-out" }} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: "absolute", fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{profileScore}</div>
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px 0", color: "var(--text)" }}>
                    {uploadStatus === "completed" ? (extractedData?.name || "Your Name") : "Your Name"}
                  </h3>
                  <p style={{ fontSize: 13, margin: "0 0 8px 0", color: "#3b82f6", fontWeight: 600 }}>
                    {uploadStatus === "completed" ? (extractedData?.role || "Your Role") : "Your Role"}
                  </p>
                  {profileScore >= 90 ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#ecfdf5", color: "#059669", padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} /> Excellent
                    </div>
                  ) : profileScore >= 60 ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fffbeb", color: "#d97706", padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} /> Good
                    </div>
                  ) : (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fef2f2", color: "#b91c1c", padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} /> Needs Work
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                COMPLETION CHECKLIST
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Add profile photo", points: 5, done: false },
                  { label: "Add professional links", points: 10, done: !!((extractedData as any).linkedin || (extractedData as any).github || (extractedData as any).portfolio) },
                  { label: "Add experience/projects", points: 15, done: ((extractedData.projects?.length || 0) + (extractedData.experience?.length || 0)) >= 2 },
                  { label: "Add core skills", points: 10, done: (extractedData.skills?.length || 0) > 0 },
                  { label: "Write career summary", points: 5, done: !!extractedData.summary },
                  { label: "Add education details", points: 5, done: (extractedData.education?.length || 0) > 0 }
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: item.done ? "#94a3b8" : "var(--text)", fontWeight: 500 }}>
                      {item.done ? <CheckCircle2 size={18} color="#3b82f6" /> : <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #e2e8f0" }} />}
                      <span style={{ textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.done ? "#94a3b8" : "#3b82f6", background: item.done ? "#f8fafc" : "#eff6ff", padding: "2px 6px", borderRadius: 100 }}>
                      +{item.points}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ background: "#eff6ff", borderRadius: 12, padding: 16, border: "1px solid #bfdbfe" }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", margin: "0 0 12px 0" }}>Completing improves:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2563eb", fontWeight: 500 }}><TrendingUp size={14} /> ATS Score <ArrowRight size={14} style={{ marginLeft: "auto" }} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2563eb", fontWeight: 500 }}><TrendingUp size={14} /> Job Matching <ArrowRight size={14} style={{ marginLeft: "auto" }} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2563eb", fontWeight: 500 }}><TrendingUp size={14} /> Interview Questions <ArrowRight size={14} style={{ marginLeft: "auto" }} /></div>
                </div>
              </div>
            </div>

            {/* AI Coach Card (Clean Theme) */}
            <div className="clean-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "color-mix(in srgb, var(--accent) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                  <Sparkles size={14} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" }}>Resunova AI Coach</h3>
              </div>

              <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 16, marginBottom: 24, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Profile {profileScore}% complete</span>
                  {profileScore >= 90 ? (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(16, 185, 129, 0.2)", color: "#10b981", padding: "2px 8px", borderRadius: 100 }}>Fully Optimized</span>
                  ) : profileScore >= 60 ? (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", padding: "2px 8px", borderRadius: 100 }}>Room to grow</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "2px 8px", borderRadius: 100 }}>Action Required</span>
                  )}
                </div>
                <div style={{ width: "100%", height: 6, background: "#0f172a", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${profileScore}%`, height: "100%", background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", borderRadius: 3 }} />
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                RECOMMENDATIONS
              </div>

              {recommendations.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {recommendations.map(rec => (
                    <div key={rec.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>{rec.title}</h4>
                        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px 0", lineHeight: 1.5 }}>{rec.desc}</p>
                        <button onClick={() => setEditSection(rec.section)} style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                          Fix Now <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span style={{ fontSize: 13, color: "#e2e8f0" }}>Profile is fully optimized!</span>
                </div>
              )}
            </div>

            {/* Next Steps Card */}
            <div className="clean-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Star size={16} color="#f59e0b" />
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.5 }}>Next Steps</h3>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ width: "100%", height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden", marginRight: 12 }}>
                  <div style={{ width: `${profileScore}%`, height: "100%", background: "linear-gradient(90deg, #f59e0b, #10b981)", borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{profileScore}/100</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                <div style={{ background: "var(--surface2)", padding: 16, borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Improve resume keywords</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", background: "color-mix(in srgb, var(--text) 10%, transparent)", padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap" }}>High impact</div>
                </div>
                <div style={{ background: "var(--surface2)", padding: 16, borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Complete projects section</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", background: "color-mix(in srgb, var(--text) 10%, transparent)", padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap" }}>Quick win</div>
                </div>
                <div style={{ background: "var(--surface2)", padding: 16, borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>3</div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Prepare for interviews</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", background: "color-mix(in srgb, var(--text) 10%, transparent)", padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap" }}>Recommended</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button 
                  onClick={() => window.location.href = '/?view=analyze'}
                  style={{ width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}
                  onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
                  onMouseOut={(e) => (e.currentTarget.style.filter = "brightness(1)")}
                >
                  <FileText size={18} /> Analyze Resume
                </button>
                <div style={{ display: "flex", gap: 12 }}>
                  <button 
                    onClick={() => window.location.href = '/interview-prep'}
                    style={{ flex: 1, background: "var(--surface2)", color: "var(--text)", border: "none", borderRadius: 12, padding: "10px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <MessageSquare size={16} /> Interview
                  </button>
                  <button 
                    onClick={() => window.location.href = '/?view=jobs'}
                    style={{ flex: 1, background: "var(--surface2)", color: "var(--text)", border: "none", borderRadius: 12, padding: "10px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <Briefcase size={16} /> View Jobs
                  </button>
                </div>
              </div>
            </div>
          </div>      
        </div>
      </main>
    </div>
  );
}
