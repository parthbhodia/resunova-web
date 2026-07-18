"use client";

/**
 * Seeded visual preview of the "My Résumés" version home — design reference only
 * (no backend/auth). Open /versions-preview to screenshot or review the layout.
 * The live surface is /my-resumes (MyResumes.tsx, wired to lib/resumeVersions.ts).
 */

import { useState } from "react";
import { MyResumesView, NewVersionModal } from "@/components/versions/MyResumesView";
import { VersionSwitcher } from "@/components/versions/VersionSwitcher";
import type { ResumeVersion, ResumeVersionGroup } from "@/lib/resumeVersions";

const base = (over: Partial<ResumeVersion>): ResumeVersion => ({
  id: Math.random().toString(36).slice(2),
  name: "Résumé",
  rootId: "r",
  parentId: null,
  version: 1,
  structured: null,
  extractedText: null,
  origin: "upload",
  sourcePdfUrl: null,
  jdText: null,
  jdCompany: null,
  jdTitle: null,
  lastScore: null,
  lastScoreSource: null,
  isDefault: false,
  createdAt: "2026-07-12T00:00:00Z",
  updatedAt: "2026-07-17T06:00:00Z",
  ...over,
});

const DEMO: ResumeVersionGroup[] = [
  {
    root: "pm",
    versions: [
      base({ id: "pm3", rootId: "pm", version: 3, name: "Product Manager résumé", isDefault: true, origin: "tailor", jdCompany: "Stripe", jdTitle: "Senior PM", lastScore: 84, updatedAt: "2026-07-17T07:10:00Z" }),
      base({ id: "pm2", rootId: "pm", version: 2, name: "Product Manager résumé", origin: "duplicate", jdCompany: "Notion", jdTitle: "PM", lastScore: 79, updatedAt: "2026-07-16T09:00:00Z" }),
      base({ id: "pm1", rootId: "pm", version: 1, name: "Product Manager résumé", origin: "upload", lastScore: 71, updatedAt: "2026-07-12T00:00:00Z" }),
    ],
  },
  {
    root: "da",
    versions: [
      base({ id: "da2", rootId: "da", version: 2, name: "Data Analyst résumé", origin: "tailor", jdCompany: "Airbnb", jdTitle: "Data Analyst", lastScore: 76, updatedAt: "2026-07-15T12:00:00Z" }),
      base({ id: "da1", rootId: "da", version: 1, name: "Data Analyst résumé", origin: "profile", lastScore: 68, updatedAt: "2026-07-14T00:00:00Z" }),
    ],
  },
];

export default function VersionsPreview() {
  const [open, setOpen] = useState(false);
  const noop = () => {};
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Simulated Analyze/Tailor top bar to preview where the switcher mounts */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--dim)", fontFamily: "var(--font-mono, monospace)" }}>Analyze ›</span>
        <VersionSwitcher
          groups={DEMO}
          activeId="pm3"
          onSelect={noop}
          onNewVersion={() => setOpen(true)}
        />
      </div>
      <MyResumesView
        groups={DEMO}
        handlers={{
          onNewVersion: () => setOpen(true),
          onOpenAnalyze: noop,
          onTailor: noop,
          onDuplicate: noop,
          onSetDefault: noop,
        }}
      />
      <NewVersionModal open={open} onClose={() => setOpen(false)} onChoose={() => setOpen(false)} canDuplicate />
    </div>
  );
}
