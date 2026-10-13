"use client";

/**
 * What happened to the tools a fix brought in.
 *
 * A bullet that names Terraform and a Skills section that does not is the
 * kind of gap a scanner counts against you and a recruiter reads as sloppy.
 * When a fix, a rewrite with the user's facts, or a line they typed carries a
 * tool, the page files it under the right Skills group and says so here. With
 * no Skills section to file into, it offers to create one with those tools in
 * it rather than deciding on the user's behalf.
 */

import React from "react";
import { FS, FW } from "@/lib/typography";

export type SkillsFollowUp =
  | { kind: "added"; groups: Array<{ category: string; tools: string[] }> }
  | { kind: "offer"; tools: string[] };

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function TailorSkillsFollowUp({
  notice,
  onCreateSection,
  onDismiss,
}: {
  notice: SkillsFollowUp | null;
  /** Create a Skills section holding these tools. */
  onCreateSection: (tools: string[]) => void;
  onDismiss: () => void;
}) {
  if (!notice) return null;
  const wrap: React.CSSProperties = {
    margin: "12px 12px 0",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface, var(--bg))",
    fontSize: FS.small,
    lineHeight: 1.5,
    color: "var(--text)",
  };
  const quiet: React.CSSProperties = {
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: FS.small,
    fontWeight: FW.semibold,
    color: "var(--text)",
    padding: "7px 12px",
    minHeight: 40,
    cursor: "pointer",
  };

  if (notice.kind === "added") {
    return (
      <div role="status" style={wrap} data-testid="skills-follow-up">
        {notice.groups.map((g) => (
          <div key={g.category}>
            Added <strong>{joinList(g.tools)}</strong> to <strong>{g.category}</strong> in your Skills.
          </div>
        ))}
        <button type="button" style={{ ...quiet, marginTop: 8 }} onClick={onDismiss}>
          Got it
        </button>
      </div>
    );
  }

  return (
    <div role="status" style={wrap} data-testid="skills-follow-up">
      <div>
        Your résumé has no Skills section. <strong>{joinList(notice.tools)}</strong>{" "}
        {notice.tools.length === 1 ? "now appears" : "now appear"} in a bullet but nowhere a scanner
        lists skills. Want one?
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          style={{
            ...quiet,
            background: "var(--accent)",
            color: "var(--on-fill, #fff)",
            border: 0,
            fontWeight: FW.bold,
          }}
          onClick={() => onCreateSection(notice.tools)}
        >
          Add a Skills section
        </button>
        <button type="button" style={quiet} onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
