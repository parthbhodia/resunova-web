import type { ReactElement } from "react";

/** Shared brand constants for generated OG images (ImageResponse can't read CSS vars). */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const ACCENT = "#0969da";
const INK = "#0b0b0b";
const MUTED = "#5f5e5a";
const BG = "#fcfcfb";
const BORDER = "#e1e0d9";

/** Branded card for a data/blog post: headline stat treatment, kicker, title. */
export function blogOgImage({
  kicker,
  title,
  stat,
}: {
  kicker: string;
  title: string;
  /** Optional big headline number, e.g. "41.4% -> 14.2%". */
  stat?: string;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 76,
        background: BG,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: ACCENT, display: "flex" }} />
        <div style={{ fontSize: 24, fontWeight: 700, color: INK, display: "flex" }}>Resunova</div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: ACCENT,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginLeft: 12,
            display: "flex",
          }}
        >
          {kicker}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {stat ? (
          <div style={{ fontSize: 84, fontWeight: 700, color: ACCENT, lineHeight: 1, marginBottom: 20, display: "flex" }}>
            {stat}
          </div>
        ) : null}
        <div style={{ fontSize: 46, fontWeight: 700, color: INK, lineHeight: 1.18, display: "flex", maxWidth: 1000 }}>
          {title}
        </div>
      </div>

      <div style={{ display: "flex", borderTop: `2px solid ${BORDER}`, paddingTop: 20 }}>
        <div style={{ fontSize: 20, color: MUTED, display: "flex" }}>resunova.io/blog</div>
      </div>
    </div>
  );
}

/** Branded card for a "Resunova vs X" comparison page. */
export function compareOgImage({ competitor, asOf }: { competitor: string; asOf: string }): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 76,
        background: BG,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: ACCENT, display: "flex" }} />
        <div style={{ fontSize: 24, fontWeight: 700, color: INK, display: "flex" }}>Resunova</div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: ACCENT,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginLeft: 12,
            display: "flex",
          }}
        >
          Comparison · {asOf}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ fontSize: 60, fontWeight: 700, color: INK, display: "flex" }}>Resunova</div>
        <div style={{ fontSize: 40, fontWeight: 500, color: MUTED, display: "flex" }}>vs</div>
        <div style={{ fontSize: 60, fontWeight: 700, color: INK, display: "flex" }}>{competitor}</div>
      </div>

      <div style={{ display: "flex", borderTop: `2px solid ${BORDER}`, paddingTop: 20 }}>
        <div style={{ fontSize: 20, color: MUTED, display: "flex" }}>Free vs. paywalled, feature by feature</div>
      </div>
    </div>
  );
}
