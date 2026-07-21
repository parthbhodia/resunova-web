"use client";

/**
 * SnippetVideo — a self-contained, framed product-demo loop for the landing page.
 * Renders a muted, looping screen recording inside a rounded "app window" frame
 * (browser dots + resunova.io pill) that sits on any section background. Plays
 * only while on screen (IntersectionObserver) so offscreen clips don't burn CPU.
 *
 * Assets live in /public/demo/<name>.{webm,mp4,jpg} and are produced by the
 * marketing snippet pipeline. Keep the three files in sync per tool name.
 */
import { useEffect, useRef } from "react";

export default function SnippetVideo({
  name,
  alt,
  dark = false,
}: {
  /** Base filename in /public/demo (e.g. "analyze" → analyze.webm/.mp4/.jpg). */
  name: string;
  /** Accessible description of what the clip shows. */
  alt: string;
  /** Slightly lighter frame chrome for dark section backgrounds. */
  dark?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) void v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const barBg = dark ? "#0f172a" : "#0b1020";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)"}`,
          boxShadow:
            "0 34px 80px rgba(2,6,23,0.30), 0 8px 22px rgba(2,6,23,0.12)",
          background: "#0b1020",
        }}
      >
        {/* browser chrome */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 14px",
            background: barBg,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#ff5f57" }} />
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#febc2e" }} />
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#28c840" }} />
          <span style={{ marginLeft: 12, fontSize: 12, color: "#8a94ab", fontWeight: 600, letterSpacing: 0.2 }}>
            resunova.io
          </span>
        </div>
        <video
          ref={ref}
          muted
          loop
          playsInline
          preload="metadata"
          poster={`/demo/${name}.jpg`}
          aria-label={alt}
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <source src={`/demo/${name}.webm`} type="video/webm" />
          <source src={`/demo/${name}.mp4`} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
