"use client";

import React from "react";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", letterSpacing: -0.2, marginBottom: 6 }}>
        {label}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 5, lineHeight: 1.45 }}>{hint}</div>}
    </label>
  );
}

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

export default function PersonalInfoSection({ initialData }: { initialData?: ExtractedProfileState }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <Field label="Full Name">
        <input style={inputStyle()} placeholder="Jane Doe" defaultValue={initialData?.name} />
      </Field>
      <Field label="Email" hint="Sign-in email; used for exports.">
        <input style={inputStyle()} placeholder="jane.doe@example.com" defaultValue={initialData?.email} />
      </Field>
      <Field label="Phone">
        <input style={inputStyle()} placeholder="+1 (555) 000-0000" defaultValue={initialData?.phone} />
      </Field>
      <Field label="LinkedIn">
        <input style={inputStyle()} placeholder="linkedin.com/in/janedoe" />
      </Field>
      <Field label="Portfolio / GitHub">
        <input style={inputStyle()} placeholder="github.com/janedoe" />
      </Field>
      <Field label="Location">
        <input style={inputStyle()} placeholder="San Francisco, CA" defaultValue={initialData?.location} />
      </Field>
    </div>
  );
}
