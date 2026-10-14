import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Claude Resume Prompts That Work · Resunova";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Guide post, so no headline stat to render. The visual is the thing the post
 * actually gives you: a constrained prompt. The "no invented numbers" line is
 * the differentiator versus every other prompt listicle, so it gets the card.
 */
export default function OgImage() {
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
        <div style={{ display: "flex", flexDirection: "column", width: 660 }}>
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
            <span style={{ color: "white", fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>
              Resunova
            </span>
          </div>

          <p
            style={{
              color: "white",
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: -1.6,
              margin: "0 0 20px",
            }}
          >
            Claude Resume Prompts That Work
          </p>
          <p
            style={{
              color: "#8b949e",
              fontSize: 26,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Nine copy-paste prompts, plus the four checks that catch what these models get wrong.
          </p>
        </div>

        {/* Right: a constrained prompt fragment */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 48,
            width: 380,
            borderRadius: 16,
            border: "1px solid rgba(47,129,247,0.35)",
            background: "rgba(22,27,34,0.9)",
            padding: "24px 22px",
          }}
        >
          <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
            <div style={{ width: 11, height: 11, borderRadius: 6, background: "#f85149", display: "flex" }} />
            <div style={{ width: 11, height: 11, borderRadius: 6, background: "#d29922", display: "flex" }} />
            <div style={{ width: 11, height: 11, borderRadius: 6, background: "#3fb950", display: "flex" }} />
          </div>
          <p style={{ color: "#e6edf3", fontSize: 19, lineHeight: 1.55, margin: "0 0 14px", fontWeight: 600 }}>
            Every number in the original must survive the rewrite.
          </p>
          <p style={{ color: "#e6edf3", fontSize: 19, lineHeight: 1.55, margin: "0 0 14px", fontWeight: 600 }}>
            You may not add a number I did not give you.
          </p>
          <p style={{ color: "#3fb950", fontSize: 19, lineHeight: 1.55, margin: 0, fontWeight: 600 }}>
            If you cannot improve it honestly, say so.
          </p>
        </div>
      </div>
    ),
    { ...size },
  );
}
