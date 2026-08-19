import type { CSSProperties } from "react";
import type { RoleSkill } from "@/lib/roleResumeData";

type Props = {
  example: { summary: string; bullets: string[]; score: number };
  topSkills: RoleSkill[];
  label: string;
  /** Optional max-width for the thumbnail container. Defaults to 220. */
  maxWidth?: number;
};

/**
 * Miniature resume-page preview (server component, CSS-only).
 * Renders at letter proportions (8.5:11) with tiny text meant to show
 * document structure, not be fully readable at card size.
 */
export default function ResumeExampleThumbnail({ example, topSkills, label, maxWidth = 220 }: Props) {
  const container: CSSProperties = {
    aspectRatio: "8.5 / 11",
    maxWidth,
    width: "100%",
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: 6,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    padding: "6% 7%",
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    color: "#1a1a1a",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: "4%",
  };

  const nameStyle: CSSProperties = {
    fontSize: "clamp(7px, 1.1cqi, 12px)",
    fontWeight: 700,
    letterSpacing: -0.3,
    textAlign: "center",
    lineHeight: 1.2,
    margin: 0,
  };

  const contactLine: CSSProperties = {
    fontSize: "clamp(4px, 0.6cqi, 7px)",
    color: "#888",
    textAlign: "center",
    lineHeight: 1.3,
    margin: 0,
  };

  const sectionHeading: CSSProperties = {
    fontSize: "clamp(5px, 0.7cqi, 8px)",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    borderBottom: "0.5px solid #ccc",
    paddingBottom: "2%",
    margin: 0,
    lineHeight: 1.3,
  };

  const bodyText: CSSProperties = {
    fontSize: "clamp(3.5px, 0.55cqi, 6.5px)",
    lineHeight: 1.45,
    margin: 0,
    color: "#333",
  };

  const bulletStyle: CSSProperties = {
    ...bodyText,
    paddingLeft: "3%",
    position: "relative",
  };

  const skillPill: CSSProperties = {
    display: "inline-block",
    fontSize: "clamp(3px, 0.45cqi, 5.5px)",
    background: "#f0f0f0",
    borderRadius: 2,
    padding: "1px 3px",
    lineHeight: 1.3,
    color: "#444",
  };

  return (
    <div style={container} aria-hidden="true">
      {/* Header: name + contact */}
      <div>
        <p style={nameStyle}>Sample Candidate</p>
        <p style={contactLine}>candidate@example.com | (555) 000-0000 | City, ST</p>
      </div>

      {/* Summary */}
      <div>
        <p style={sectionHeading}>Summary</p>
        <p style={bodyText}>
          {example.summary.length > 140 ? example.summary.slice(0, 137) + "..." : example.summary}
        </p>
      </div>

      {/* Experience */}
      <div>
        <p style={sectionHeading}>Experience</p>
        <p style={{ ...bodyText, fontWeight: 600, marginBottom: "1%" }}>{label}</p>
        {example.bullets.map((b, i) => (
          <p key={i} style={bulletStyle}>
            {"- "}
            {b.length > 100 ? b.slice(0, 97) + "..." : b}
          </p>
        ))}
      </div>

      {/* Skills */}
      <div>
        <p style={sectionHeading}>Skills</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {topSkills.slice(0, 6).map((s) => (
            <span key={s.name} style={skillPill}>
              {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
