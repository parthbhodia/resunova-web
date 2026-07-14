"use client";

import React from "react";

export default function JobsPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "16px", color: "var(--text)" }}>Find Jobs</h1>
      <p style={{ fontSize: "16px", color: "var(--muted)", marginBottom: "32px" }}>
        This page is under construction. Soon you will be able to view and search for job postings tailored to your profile here.
      </p>
      <div style={{ background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: "16px", padding: "48px" }}>
        <p style={{ color: "var(--muted)", fontWeight: "500" }}>Job board integration coming soon...</p>
      </div>
    </div>
  );
}
