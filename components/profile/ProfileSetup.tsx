import React from "react";
import { Sparkles, FileText, Check } from "lucide-react";

interface ProfileSetupProps {
  onSelectUpload: () => void;
  onSelectWizard: () => void;
  userName?: string;
}

export default function ProfileSetup({
  onSelectUpload,
  onSelectWizard,
  userName = "User",
}: ProfileSetupProps) {
  return (
    <div style={{ padding: "20px", maxWidth: 960, margin: "0 auto", width: "100%" }}>
      {/* Header Section */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>
          Welcome to Resunova 👋
        </h2>
        <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 540, margin: "0 auto", lineHeight: 1.5 }}>
          Create your career profile once and use it to personalize resumes, job matches, and interview preparation.
        </p>
      </div>

      {/* Cards Section */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", 
          gap: 24,
          alignItems: "stretch"
        }}
      >
        
        {/* Card 1: Upload Resume (Recommended) */}
        <div
          style={{
            border: "2px solid var(--accent)",
            borderRadius: "var(--radius-xl)",
            background: "var(--surface)",
            padding: 28,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--accent) 15%, transparent)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -14,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--accent)",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              whiteSpace: "nowrap"
            }}
          >
            Recommended
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                flexShrink: 0
              }}
            >
              <Sparkles size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Upload Resume
            </h3>
          </div>

          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5 }}>
            Let Resunova AI build your profile automatically from your existing resume.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Extract personal details",
              "Detect skills and experience",
              "Import education and projects",
              "Review before saving",
            ].map((feature, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text)" }}>
                <Check size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: "auto" }}>
            <button
              onClick={onSelectUpload}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "var(--radius-lg)",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "transform 0.2s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              Upload Resume
            </button>
          </div>
        </div>

        {/* Card 2: Build Manually */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            background: "var(--surface)",
            padding: 28,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--surface2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text)",
                flexShrink: 0
              }}
            >
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Build Manually
            </h3>
          </div>

          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5 }}>
            Create your profile step by step with guided questions.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Add your information manually",
              "Save progress anytime",
              "Edit whenever needed",
            ].map((feature, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text)" }}>
                <Check size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: "auto" }}>
            <button
              onClick={onSelectWizard}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "var(--radius-lg)",
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--border)",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Start Profile Wizard
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
