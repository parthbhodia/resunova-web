"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, Upload, CheckCircle2, AlertCircle, X,
  User, GraduationCap, Code, Briefcase, Folder, Edit3, Wand2
} from "lucide-react";
import { extractResumeData, ExtractedProfileState } from "../../lib/resumeExtractorService";

interface ResumeUploadProps {
  status?: "idle" | "extracting" | "review" | "completed";
  onExtractionStart?: () => void;
  onExtractionComplete?: (data: ExtractedProfileState) => void;
  onProgress?: (progress: number) => void;
  onAcceptAll: (data: ExtractedProfileState) => void;
}

export default function ResumeUpload({ status: parentStatus, onExtractionStart, onExtractionComplete, onProgress, onAcceptAll }: ResumeUploadProps) {
  const [state, setState] = useState<"uploadIdle" | "extracting" | "review">("uploadIdle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedProfileState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (parentStatus === "idle") {
      setState("uploadIdle");
      setProgress(0);
      setError(null);
      setExtractedData(null);
    }
  }, [parentStatus]);

  const handleUpload = async (file: File) => {
    setState("extracting");
    setError(null);
    setProgress(0);
    
    if (onExtractionStart) onExtractionStart();

    // Simulate progress animation while waiting for API
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 3) + 1;
      if (current <= 95) {
        setProgress(current);
        if (onProgress) onProgress(current);
      } else {
          current = 95;
      }
    }, 200);

    try {
      const data = await extractResumeData(file);
      clearInterval(interval);
      setProgress(100);
      if (onProgress) onProgress(100);
      
      setExtractedData(data);
      if (onExtractionComplete) onExtractionComplete(data);
      
      setTimeout(() => {
        setState("review");
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Failed to analyze resume");
      setState("uploadIdle");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  if (parentStatus === "completed") {
    // Hidden since the user requested not to show this message in the header/content
    return null;
  }

  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: 16,
      border: "1px solid var(--border)",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.02)"
    }}>
      {/* Top Gradient Border */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: 4,
        background: "linear-gradient(90deg, #3b82f6, #a855f7)"
      }} />

      {/* Card Header (Persists across all states) */}
      <div style={{ padding: "20px 24px 16px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 10, 
            background: "#eff6ff", 
            display: "flex", alignItems: "center", justifyContent: "center", 
            color: "#3b82f6", flexShrink: 0 
          }}>
            <Wand2 size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 4 }}>
              Build your profile faster with AI
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Upload your resume and Resunova AI will auto-fill every section instantly
            </p>
          </div>
        </div>
        <button style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: "0 24px 24px 24px" }}>
        {state === "uploadIdle" && (
          <div>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                background: "#f8fafc",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#93c5fd";
                e.currentTarget.style.background = "#eff6ff";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }}
            >
              <input 
                type="file" 
                accept=".pdf,.doc,.docx" 
                style={{ display: "none" }} 
                ref={fileInputRef}
                onChange={onFileChange}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, 
                  background: "#eff6ff", 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  color: "#3b82f6" 
                }}>
                  <Upload size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4, marginTop: 0 }}>
                    Drop your resume here, or click to browse
                  </h4>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    Supports PDF, DOCX • AI extracts all details in seconds
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{
                background: "#eff6ff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                padding: "0 20px",
                height: 38,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s"
              }}>
                Upload Resume
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "color-mix(in srgb, var(--error, #ef4444) 10%, transparent)", color: "var(--error, #ef4444)", borderRadius: 8, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>
        )}

        {state === "extracting" && (
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px", 
            background: "#fff", 
            borderRadius: 12 
          }}>
            <div style={{ position: "relative", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ 
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "2px solid #e5eaf3",
                borderTopColor: "#3b82f6",
                animation: "spin 1s linear infinite"
              }} />
              <Sparkles size={20} color="#3b82f6" />
            </div>
            
            <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 8px 0" }}>
              Resunova AI is reading your resume...
            </h4>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px 0" }}>
              Extracting personal details, skills, and experience
            </p>
            
            <div style={{ width: "100%", maxWidth: 300, height: 6, background: "rgba(59, 130, 246, 0.15)", borderRadius: 100, overflow: "hidden" }}>
              <div style={{ 
                height: "100%", 
                width: `${progress}%`,
                background: "linear-gradient(90deg, #3b82f6, #a855f7)",
                transition: "width 0.2s ease-out",
                borderRadius: 100
              }} />
            </div>
          </div>
        )}

        {state === "review" && extractedData && (
          <div style={{ animation: "fadeIn 0.5s ease-out" }}>
            <div style={{ 
              background: "color-mix(in srgb, #10b981 10%, transparent)", 
              border: "1px solid color-mix(in srgb, #10b981 20%, transparent)",
              borderRadius: 8,
              padding: "0 16px",
              height: 40,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} color="#059669" />
                <h4 style={{ fontSize: 13, fontWeight: 600, color: "#059669", margin: 0 }}>
                  ✨ Resunova AI extracted your details
                </h4>
              </div>
              <div style={{ background: "color-mix(in srgb, #10b981 15%, transparent)", color: "#059669", padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                5 sections found
              </div>
            </div>

            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 12, 
              paddingBottom: 16
            }}>
              {/* Personal Card */}
              <ReviewCard title="Personal" icon={<User size={14} />}>
                <div style={{ fontWeight: 600 }}>{extractedData.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{extractedData.email}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{extractedData.phone}</div>
                <div style={{ marginTop: "auto", paddingTop: 8 }}><Badge text="HIGH CONFIDENCE" type="success" /></div>
              </ReviewCard>

              {/* Education Card */}
              <ReviewCard title="Education" icon={<GraduationCap size={14} />}>
                {extractedData.education && extractedData.education.length > 0 ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 11 }}>{extractedData.education[0].institution}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{extractedData.education[0].degree}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>No education found</div>
                )}
                <div style={{ marginTop: "auto", paddingTop: 8 }}><Badge text="HIGH CONFIDENCE" type="success" /></div>
              </ReviewCard>

              {/* Skills Card */}
              <ReviewCard title="Skills" icon={<Code size={14} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2, fontSize: 11, color: "var(--muted)" }}>
                  {extractedData.skills?.slice(0, 4).map(s => (
                    <div key={s}>- {s}</div>
                  ))}
                  {(extractedData.skills?.length || 0) > 4 && <div>+ {extractedData.skills!.length - 4} more</div>}
                </div>
                <div style={{ marginTop: "auto", paddingTop: 8 }}><Badge text="HIGH CONFIDENCE" type="success" /></div>
              </ReviewCard>

              {/* Projects Card */}
              <ReviewCard title="Projects" icon={<Folder size={14} />} warning>
                {extractedData.projects && extractedData.projects.length > 0 ? (
                  <>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>- {extractedData.projects[0].name}</div>
                    {extractedData.projects.length > 1 && <div style={{ fontSize: 11, color: "var(--muted)" }}>- {extractedData.projects[1].name}</div>}
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>No projects found</div>
                )}
                <div style={{ marginTop: "auto", paddingTop: 8 }}><Badge text="NEEDS REVIEW" type="warning" /></div>
              </ReviewCard>

              {/* Experience Card */}
              <ReviewCard title="Experience" icon={<Briefcase size={14} />} warning>
                 {extractedData.experience && extractedData.experience.length > 0 ? (
                  <>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>- {extractedData.experience[0].role}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>No experience found</div>
                )}
                <div style={{ marginTop: "auto", paddingTop: 8 }}><Badge text="NEEDS REVIEW" type="warning" /></div>
              </ReviewCard>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button 
                onClick={() => onAcceptAll(extractedData)}
                style={{
                  flex: 1.5,
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  height: 44,
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px color-mix(in srgb, #2563eb 25%, transparent)",
                  transition: "background 0.2s"
                }}
              >
                <CheckCircle2 size={18} /> Accept All & Apply
              </button>
              <button 
                onClick={() => onAcceptAll(extractedData)}
                style={{
                flex: 1,
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                height: 44,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                transition: "background 0.2s"
              }}>
                <Edit3 size={18} /> Preview & Edit
              </button>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

function ReviewCard({ title, icon, warning, children }: { title: string, icon: React.ReactNode, warning?: boolean, children: React.ReactNode }) {
  return (
    <div style={{
      background: warning ? "color-mix(in srgb, #f59e0b 2%, #fff)" : "#fff",
      border: "1px solid",
      borderColor: warning ? "color-mix(in srgb, #f59e0b 20%, transparent)" : "#e5eaf3",
      borderRadius: 16,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      minHeight: 140,
      boxShadow: "0 4px 20px rgba(0,0,0,0.02)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: warning ? "#d97706" : "#2563eb", marginBottom: 12, fontSize: 13, fontWeight: 700 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: warning ? "color-mix(in srgb, #f59e0b 10%, transparent)" : "color-mix(in srgb, #2563eb 10%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {icon}
        </div>
        <span style={{ color: "var(--text)" }}>{title}</span>
      </div>
      <div style={{ color: "var(--text)", fontSize: 13, display: "flex", flexDirection: "column", flex: 1, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

function Badge({ text, type }: { text: string, type: "success" | "warning" }) {
  return (
    <div style={{ 
      background: type === "success" ? "#ecfdf5" : "#fffbeb", 
      color: type === "success" ? "#059669" : "#d97706", 
      border: "1px solid",
      borderColor: type === "success" ? "#a7f3d0" : "#fde68a",
      padding: "4px 8px", 
      borderRadius: 6, 
      fontSize: 10, 
      fontWeight: 700,
      letterSpacing: 0.5,
      width: "fit-content"
    }}>
      {text}
    </div>
  );
}
