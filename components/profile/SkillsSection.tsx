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

export default function SkillsSection({ initialData }: { initialData?: ExtractedProfileState }) {
  const defaultSkills = initialData?.skills?.join(", ") || "";
  
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        List your top skills, programming languages, and tools. Separate them by commas.
      </p>
      <textarea
        style={{
          ...inputStyle(),
          minHeight: 100,
          resize: "vertical",
        }}
        placeholder="e.g. Python, React, Next.js, Project Management, Graphic Design"
        defaultValue={defaultSkills}
      />
    </div>
  );
}
