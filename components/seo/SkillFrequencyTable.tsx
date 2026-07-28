import type { RoleSkill } from "@/lib/roleResumeData";

/**
 * The "skills employers ask for most" block — the proprietary-data element that
 * keeps role pages off the thin-content line (plan §3). Renders each
 * requirement concept with a frequency bar + percentage, sourced from real
 * postings for the role. Also the most AI-citable / featured-snippet-friendly
 * asset on the page.
 */
export default function SkillFrequencyTable({
  skills,
  postingsAnalyzed,
  roleLabel,
  sourceNote,
}: {
  skills: RoleSkill[];
  postingsAnalyzed: number;
  roleLabel: string;
  /** Citation override — set when the skills come from published external research. */
  sourceNote?: string;
}) {
  const formattedCount = postingsAnalyzed.toLocaleString("en-US");
  return (
    <div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {skills.map((skill) => (
          <li key={skill.name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                flex: "0 0 200px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {skill.name}
            </span>
            {skill.sharePct == null ? (
              // Genuinely top-demanded per the cited source, but that source
              // published only a ranking / combined figure, not a per-skill
              // percentage — show it honestly rather than invent one.
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "var(--dim)",
                }}
              >
                Frequently requested — no per-skill percentage published
              </span>
            ) : (
              <>
                <span
                  aria-hidden
                  style={{
                    position: "relative",
                    flex: 1,
                    height: 10,
                    borderRadius: 999,
                    background: "var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${skill.sharePct}%`,
                      borderRadius: 999,
                      background: "var(--accent)",
                    }}
                  />
                </span>
                <span style={{ flex: "0 0 44px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                  {skill.sharePct}%
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 16, fontSize: 13, color: "var(--dim)" }}>
        {sourceNote ??
          `Share of ${formattedCount} analyzed ${roleLabel} job postings requesting each skill. Source: Resunova jobs dataset, updated regularly.`}
      </p>
    </div>
  );
}
