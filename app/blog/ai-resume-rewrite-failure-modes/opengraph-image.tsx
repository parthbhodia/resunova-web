import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Five Things AI Gets Wrong When It Rewrites Your Resume · Resunova";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card carries the post's clearest example: a rewrite that reads better and
 * silently dropped three metrics. No headline stat, because the post's findings
 * are qualitative failure modes rather than a measured rate, and the blog index
 * treats a fabricated number as worse than an empty slot.
 */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d1117 0%, #161b22 60%, #0d1117 100%)",
          fontFamily: "sans-serif",
          padding: "0 80px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(248,81,73,0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
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
            fontSize: 58,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1.8,
            margin: "0 0 30px",
            maxWidth: 900,
          }}
        >
          Five Things AI Gets Wrong When It Rewrites Your Resume
        </p>

        {/* The dropped-metric example, which is the most costly failure in the post */}
        <div style={{ display: "flex", gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              borderRadius: 14,
              border: "1px solid rgba(63,185,80,0.35)",
              background: "rgba(63,185,80,0.07)",
              padding: "16px 18px",
            }}
          >
            <span style={{ color: "#3fb950", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              YOUR BULLET
            </span>
            <span style={{ color: "#e6edf3", fontSize: 20, lineHeight: 1.45 }}>
              cutting cart abandonment 34% and adding $2.1M across 40,000 users
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              borderRadius: 14,
              border: "1px solid rgba(248,81,73,0.4)",
              background: "rgba(248,81,73,0.08)",
              padding: "16px 18px",
            }}
          >
            <span style={{ color: "#f85149", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              WHAT CAME BACK
            </span>
            <span style={{ color: "#e6edf3", fontSize: 20, lineHeight: 1.45 }}>
              delivering a substantial lift in conversion and revenue
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
