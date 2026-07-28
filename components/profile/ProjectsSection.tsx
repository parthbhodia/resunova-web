"use client";

import React from "react";

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    fontSize: 13,
    padding: "10px 12px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--text)",
    outline: "none",
    fontFamily: "inherit",
    letterSpacing: -0.15,
  };
}

import { ExtractedProfileState } from "../../lib/resumeExtractorService";

export default function ProjectsSection({ initialData }: { initialData?: ExtractedProfileState }) {
  const projs = initialData?.projects && initialData.projects.length > 0
    ? initialData.projects
    : [{ name: "", tech: "", bullets: [] }];

  return (
    <div>
      {projs.map((proj, i) => (
        <div key={i} style={{ marginBottom: 20, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: 12 }}>
            <input style={inputStyle()} placeholder="Project Name" defaultValue={proj.name} />
            <input style={inputStyle()} placeholder="Technologies Used" defaultValue={proj.tech} />
          </div>
          <textarea
            style={{ ...inputStyle(), minHeight: 80, resize: "vertical" }}
            placeholder="Briefly describe the project"
            defaultValue={proj.bullets?.join("\n")}
          />
        </div>
      ))}
      <button
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "8px 12px",
          background: "transparent",
          border: "1px dashed var(--border)",
          color: "var(--accent)",
          borderRadius: "var(--radius)",
          cursor: "pointer",
        }}
      >
        + Add another project
      </button>
    </div>
  );
}
