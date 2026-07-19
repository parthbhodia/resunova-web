"use client";

/**
 * Seeded visual preview of the "My Résumés" workspace — list tab + editor tab
 * (design reference only, no backend/auth). The live surface is /my-resumes.
 */

import { useState } from "react";
import { MyResumesView, NewVersionModal, type VersionActionHandlers } from "@/components/versions/MyResumesView";
import { VersionEditor } from "@/components/versions/VersionEditor";
import type { ResumeVersion, ResumeVersionGroup } from "@/lib/resumeVersions";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const STRUCT: StructuredResume = {
  full_name: "Jordan Rivera",
  headline: "Senior Product Manager",
  location: "San Francisco, CA",
  email: "jordan@example.com",
  phone: "(415) 555-0100",
  linkedin: "linkedin.com/in/jrivera",
  github: "",
  summary: "Product manager with 7 years shipping B2B SaaS; led 0→1 launches and pricing revamps that grew ARR.",
  skills: [
    { category: "Product", items: ["Roadmapping", "Discovery", "A/B testing", "SQL"] },
    { category: "Tools", items: ["Amplitude", "Figma", "Jira"] },
  ],
  experience: [
    { company: "Notion", role: "Senior PM", dates: "2022 – Present", location: "SF", bullets: [
      "Led the launch of a usage-based pricing tier, lifting ARR 18% in two quarters.",
      "Ran weekly discovery with 40+ customers to shape the AI roadmap.",
    ] },
    { company: "Airbnb", role: "Product Manager", dates: "2019 – 2022", location: "SF", bullets: [
      "Shipped host onboarding revamp that cut time-to-first-listing by 31%.",
    ] },
  ],
  education: [
    { institution: "UC Berkeley", degree: "B.S. Computer Science", dates: "2015 – 2019", location: "CA", bullets: [] },
  ],
  projects: [],
  extra_sections: [],
};

const base = (over: Partial<ResumeVersion>): ResumeVersion => ({
  id: Math.random().toString(36).slice(2),
  name: "Résumé", rootId: "r", parentId: null, version: 1, structured: null, extractedText: null,
  origin: "upload", sourcePdfUrl: null, jdText: null, jdCompany: null, jdTitle: null,
  lastScore: null, lastScoreSource: null, isDefault: false,
  createdAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-17T06:00:00Z", ...over,
});

const DEMO: ResumeVersionGroup[] = [
  { root: "pm", versions: [
    base({ id: "pm3", rootId: "pm", version: 3, name: "Product Manager résumé", isDefault: true, origin: "tailor", jdCompany: "Stripe", jdTitle: "Senior PM", lastScore: 84, structured: STRUCT, updatedAt: "2026-07-17T07:10:00Z" }),
    base({ id: "pm2", rootId: "pm", version: 2, name: "Product Manager résumé", origin: "duplicate", jdCompany: "Notion", jdTitle: "PM", lastScore: 79, structured: STRUCT, updatedAt: "2026-07-16T09:00:00Z" }),
    base({ id: "pm1", rootId: "pm", version: 1, name: "Product Manager résumé", origin: "upload", lastScore: 71, structured: STRUCT, updatedAt: "2026-07-12T00:00:00Z" }),
  ] },
  { root: "da", versions: [
    base({ id: "da2", rootId: "da", version: 2, name: "Data Analyst résumé", origin: "tailor", jdCompany: "Airbnb", jdTitle: "Data Analyst", lastScore: 76, structured: STRUCT, updatedAt: "2026-07-15T12:00:00Z" }),
    base({ id: "da1", rootId: "da", version: 1, name: "Data Analyst résumé", origin: "profile", lastScore: 68, structured: STRUCT, updatedAt: "2026-07-14T00:00:00Z" }),
  ] },
];

export default function VersionsPreview() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"list" | "editor">("list");
  const [editingId, setEditingId] = useState<string>("pm3");
  const noop = () => {};
  const editing = DEMO.flatMap((g) => g.versions).find((v) => v.id === editingId) ?? DEMO[0].versions[0];

  const listHandlers: VersionActionHandlers = {
    onNewVersion: () => setOpen(true),
    onOpen: (v) => { setEditingId(v.id); setTab("editor"); },
    onTailor: noop, onDuplicate: noop, onSetDefault: noop,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ display: "flex", gap: 4, padding: "10px 20px 0", borderBottom: "1px solid var(--border)", maxWidth: 900, margin: "0 auto" }}>
        <button onClick={() => setTab("list")} style={tabStyle(tab === "list")}>My Résumés</button>
        <button onClick={() => setTab("editor")} style={tabStyle(tab === "editor")}>Editing: {editing.name}</button>
      </div>

      {tab === "editor" ? (
        <VersionEditor
          version={editing}
          groups={DEMO}
          demo
          handlers={{ onSwitch: (v) => setEditingId(v.id), onNewVersion: () => setOpen(true), onScan: noop, onTailor: noop, onDuplicate: noop }}
        />
      ) : (
        <MyResumesView groups={DEMO} handlers={listHandlers} />
      )}

      <NewVersionModal open={open} onClose={() => setOpen(false)} onChoose={() => setOpen(false)} canDuplicate />
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 13.5, fontWeight: 560, color: active ? "var(--text)" : "var(--dim)",
    background: "none", border: "none", borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
    padding: "8px 14px", marginBottom: -1, cursor: "pointer",
  };
}
