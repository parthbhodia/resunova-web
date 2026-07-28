"use client";

import React from "react";

export default function ProfileCompletion() {
  return (
    <div
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-card)",
        padding: "20px 22px 22px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.35, color: "var(--text)" }}>AI Recommendations</h2>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.08,
            color: "var(--amber)",
            background: "var(--amber-bg)",
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          Action Needed
        </span>
      </div>
      
      <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
        <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
          <span style={{ color: "var(--amber)" }}>•</span>
          <div>
            <strong>Add a Portfolio Link:</strong> You mentioned projects but don't have a portfolio link yet. Adding one increases recruiter engagement.
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
          <span style={{ color: "var(--amber)" }}>•</span>
          <div>
            <strong>Expand Latest Role:</strong> Your most recent experience could use more bullet points quantifying your impact.
          </div>
        </li>
      </ul>
    </div>
  );
}
