import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "How to Tailor Your Resume to a Job Description — Resunova";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const score = 87;
  const size2 = 200;
  const r = size2 / 2 - 14;
  const circ = 2 * Math.PI * r;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "linear-gradient(135deg, #0d1117 0%, #161b22 60%, #0d1117 100%)",
          fontFamily: "sans-serif",
          padding: "0 80px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(47,129,247,0.08) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            display: "flex",
          }}
        />

        {/* Left: copy */}
        <div style={{ display: "flex", flexDirection: "column", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "linear-gradient(135deg, #2f81f7, #388bfd)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              R
            </div>
            <span style={{ color: "white", fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>Resunova</span>
          </div>
          <p
            style={{
              color: "white",
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.1,
              margin: "0 0 20px",
            }}
          >
            Tailor Your Resume to Any Job Description
          </p>
          <p style={{ color: "#8b949e", fontSize: 24, margin: 0, lineHeight: 1.4 }}>
            Keyword match · Gap analysis · Bullet rewrites
          </p>
        </div>

        {/* Right: score ring */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, position: "relative" }}>
          <svg width={size2} height={size2} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size2 / 2} cy={size2 / 2} r={r} fill="none" stroke="#1e2329" strokeWidth={14} />
            <circle
              cx={size2 / 2}
              cy={size2 / 2}
              r={r}
              fill="none"
              stroke="#34d399"
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - (score / 100) * circ}
            />
          </svg>
          <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "white", fontSize: 64, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>{score}</span>
            <span style={{ color: "#8b949e", fontSize: 20, marginTop: 4 }}>Match score</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
