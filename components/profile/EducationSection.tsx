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

export default function EducationSection({ initialData }: { initialData?: ExtractedProfileState }) {
  const edus = initialData?.education && initialData.education.length > 0 
    ? initialData.education 
    : [{ institution: "", degree: "", dates: "" }];

  return (
    <div>
      {edus.map((edu, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: 16 }}>
          <input style={inputStyle()} placeholder="School (e.g. State University)" defaultValue={edu.institution} />
          <input style={inputStyle()} placeholder="Degree (e.g. B.S. Computer Science)" defaultValue={edu.degree} />
          <input style={inputStyle()} placeholder="Graduation Year (e.g. 2025)" defaultValue={edu.dates} />
          <input style={inputStyle()} placeholder="GPA (optional)" />
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
        + Add another institution
      </button>
    </div>
  );
}
