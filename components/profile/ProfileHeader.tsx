"use client";

import React from "react";

export default function ProfileHeader() {
  return (
    <div
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-card)",
        padding: 22,
        textAlign: "center",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Jane Doe</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Frontend Engineer · San Francisco, CA</div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--surface2)", overflow: "hidden", marginBottom: 8 }}>
        <div style={{ width: "85%", height: "100%", background: "var(--green)", borderRadius: 99 }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--dim)" }}>Profile strength · 85%</div>
    </div>
  );
}
