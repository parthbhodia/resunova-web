import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Resunova — AI Resume Scoring & Tailoring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1a2744 60%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Subtle grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(196,121,58,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          display: "flex",
        }} />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "linear-gradient(135deg, #e09050, #c4793a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(196,121,58,0.4)",
          }}>
            {/* Nova R mark — keep paths in sync with components/BrandLogo.tsx */}
            <svg width="58" height="58" viewBox="0 0 28 28">
              <path d="M8.7 8.2v12.6" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
              <path
                d="M8.7 8.2h4.1a4.1 4.1 0 0 1 0 8.2H8.7"
                stroke="white" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round" fill="none"
              />
              <path d="M13.2 16.4l4.4 4.4" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
              <path
                d="M21.4 4.6c.35 1.75 1.25 2.65 3 3-1.75.35-2.65 1.25-3 3-.35-1.75-1.25-2.65-3-3 1.75-.35 2.65-1.25 3-3z"
                fill="white" opacity="0.88"
              />
            </svg>
          </div>
          <span style={{
            color: "white", fontSize: 56, fontWeight: 800,
            letterSpacing: -2, lineHeight: 1,
          }}>
            Resunova
          </span>
        </div>

        {/* Tagline */}
        <p style={{
          color: "#94a3b8", fontSize: 26, textAlign: "center",
          margin: "0 0 36px", padding: "0 120px", lineHeight: 1.45,
          fontWeight: 400,
        }}>
          AI Resume Scoring &amp; Tailoring for Every Job Description
        </p>

        {/* Feature chips */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Match Score", "Gap Analysis", "ATS Check", "PDF Export"].map((label) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 100,
              padding: "10px 22px",
              color: "#cbd5e1",
              fontSize: 15,
              fontWeight: 500,
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Free badge */}
        <div style={{
          marginTop: 28,
          background: "rgba(196,121,58,0.15)",
          border: "1px solid rgba(196,121,58,0.35)",
          borderRadius: 100,
          padding: "8px 28px",
          color: "#e09050",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Free for Students &amp; the Community
        </div>
      </div>
    ),
    { ...size },
  );
}
