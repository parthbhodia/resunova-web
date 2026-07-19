"use client";

/**
 * VersionEditor — the "edit without rescan" surface. Renders a résumé version's
 * structured data as an editable WYSIWYG preview; edits autosave in place via
 * updateVersion (a real UPDATE, no scan). Opens as a tab inside /my-resumes.
 * The version switcher + Scan/Tailor/Duplicate live in its header.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { updateVersion, type ResumeVersion, type ResumeVersionGroup } from "@/lib/resumeVersions";
import { VersionSwitcher } from "./VersionSwitcher";

/* clone so edits never mutate the prop */
function cloneStructured(s: StructuredResume | null): StructuredResume {
  const empty: StructuredResume = {
    full_name: "", headline: "", location: "", email: "", phone: "", linkedin: "", github: "",
    summary: "", skills: [], experience: [], education: [], projects: [], extra_sections: [],
  };
  if (!s) return empty;
  return JSON.parse(JSON.stringify({ ...empty, ...s }));
}

/* an inline-editable text node that commits its text on blur */
function Editable({
  value,
  onCommit,
  style,
  placeholder,
  as = "span",
}: {
  value: string;
  onCommit: (next: string) => void;
  style?: CSSProperties;
  placeholder?: string;
  as?: "span" | "div" | "h1";
}) {
  const props = {
    contentEditable: true,
    suppressContentEditableWarning: true,
    "data-placeholder": placeholder,
    className: "ve-editable",
    style: { outline: "none", ...style } as CSSProperties,
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const next = (e.currentTarget.textContent ?? "").trim();
      if (next !== value) onCommit(next);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (as !== "div" && e.key === "Enter") {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    children: value,
  };
  if (as === "h1") return <h1 {...props} />;
  if (as === "div") return <div {...props} />;
  return <span {...props} />;
}

const sectionTitle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "var(--accent)",
  borderBottom: "2px solid var(--accent)",
  paddingBottom: 3,
  margin: "18px 0 8px",
};

export interface VersionEditorHandlers {
  onSwitch: (v: ResumeVersion) => void;
  onNewVersion: () => void;
  /** Score the current draft in place; returns the new overall score (or a reason). */
  onScore: (structured: StructuredResume) => Promise<{ score: number | null; limited?: boolean; needsAuth?: boolean; error?: string }>;
  onTailor: (v: ResumeVersion) => void;
  onDuplicate: (v: ResumeVersion) => void;
}

export function VersionEditor({
  version,
  groups,
  handlers,
  demo = false,
}: {
  version: ResumeVersion;
  groups: ResumeVersionGroup[];
  handlers: VersionEditorHandlers;
  /** demo mode skips the Supabase autosave (for the seeded preview route). */
  demo?: boolean;
}) {
  const [draft, setDraft] = useState<StructuredResume>(() => cloneStructured(version.structured));
  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const [scoring, setScoring] = useState(false);
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  const runScore = useCallback(async () => {
    setScoring(true);
    setScoreMsg(null);
    try {
      const r = await handlers.onScore(draft);
      if (r.needsAuth) setScoreMsg("Sign in to score this résumé.");
      else if (r.limited) setScoreMsg("Daily scan limit reached — try again tomorrow.");
      else if (r.error) setScoreMsg(r.error);
      else if (r.score != null) setScoreMsg(`Scored ${r.score}/100`);
    } catch {
      setScoreMsg("Couldn't score — try again.");
    } finally {
      setScoring(false);
    }
  }, [handlers, draft]);

  // reset the draft when the active version changes
  useEffect(() => {
    setDraft(cloneStructured(version.structured));
    setStatus("idle");
  }, [version.id, version.structured]);

  const scheduleSave = useCallback(
    (next: StructuredResume) => {
      setStatus("dirty");
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        if (demo) {
          setStatus("saved");
          return;
        }
        setStatus("saving");
        try {
          await updateVersion(version.id, { structured: next });
          setStatus("saved");
        } catch {
          setStatus("dirty");
        }
      }, 900);
    },
    [version.id, demo],
  );

  const patch = useCallback(
    (mut: (d: StructuredResume) => void) => {
      setDraft((prev) => {
        const next = cloneStructured(prev);
        mut(next);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  /* list mutators (experience|projects bullets + section entries) */
  const addBullet = (kind: "experience" | "projects", ei: number) =>
    patch((d) => { d[kind][ei].bullets.push(""); });
  const removeBullet = (kind: "experience" | "projects", ei: number, bi: number) =>
    patch((d) => { d[kind][ei].bullets.splice(bi, 1); });
  const moveBullet = (kind: "experience" | "projects", ei: number, bi: number, dir: -1 | 1) =>
    patch((d) => {
      const arr = d[kind][ei].bullets;
      const j = bi + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[bi], arr[j]] = [arr[j], arr[bi]];
    });
  const addExperience = () =>
    patch((d) => { d.experience.push({ company: "", role: "", dates: "", location: "", bullets: [""] }); });
  const addProject = () =>
    patch((d) => { d.projects.push({ name: "", tech: "", bullets: [""] }); });
  const addEducation = () =>
    patch((d) => { d.education.push({ institution: "", degree: "", dates: "", location: "", bullets: [] }); });
  const addSkillGroup = () =>
    patch((d) => { d.skills.push({ category: "New group", items: [] }); });

  const contact = [draft.email, draft.phone, draft.location, draft.linkedin].filter(Boolean);

  const statusLabel =
    status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "dirty" ? "Editing…" : "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "18px 20px 72px", width: "100%" }}>
      {/* header: switcher + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <VersionSwitcher groups={groups} activeId={version.id} onSelect={handlers.onSwitch} onNewVersion={handlers.onNewVersion} />
        <span style={{ fontSize: 12, color: "var(--dim)", minWidth: 58, fontVariantNumeric: "tabular-nums" }}>{statusLabel}</span>
        {scoreMsg ? <span style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 560 }}>{scoreMsg}</span> : null}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button style={btnAccent} onClick={runScore} disabled={scoring}>{scoring ? "Scoring…" : "Scan & score"}</button>
          <button style={btn} onClick={() => handlers.onTailor(version)}>Tailor to a job</button>
          <button style={btn} onClick={() => handlers.onDuplicate(version)}>Duplicate</button>
        </div>
      </div>

      {/* the editable paper */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "34px 40px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        <Editable
          as="h1"
          value={draft.full_name}
          placeholder="Your name"
          onCommit={(v) => patch((d) => { d.full_name = v; })}
          style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.4 }}
        />
        <Editable
          value={draft.headline}
          placeholder="Headline / target role"
          onCommit={(v) => patch((d) => { d.headline = v; })}
          style={{ display: "block", fontSize: 14, color: "var(--muted)", marginTop: 2 }}
        />
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(["email", "phone", "location", "linkedin"] as const).map((k, i) => (
            <span key={k} style={{ display: "inline-flex", gap: 8 }}>
              {i > 0 && contact.length > 1 ? <span aria-hidden>·</span> : null}
              <Editable
                value={String(draft[k] ?? "")}
                placeholder={k}
                onCommit={(v) => patch((d) => { (d as unknown as Record<string, unknown>)[k] = v; })}
              />
            </span>
          ))}
        </div>

        {draft.summary || true ? (
          <>
            <div style={sectionTitle}>Summary</div>
            <Editable
              as="div"
              value={draft.summary}
              placeholder="A short professional summary…"
              onCommit={(v) => patch((d) => { d.summary = v; })}
              style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text)" }}
            />
          </>
        ) : null}

        {draft.experience.length ? <div style={sectionTitle}>Experience</div> : null}
        {draft.experience.map((exp, ei) => (
          <div key={ei} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>
                <Editable value={exp.role} placeholder="Role" onCommit={(v) => patch((d) => { d.experience[ei].role = v; })} />
                {" · "}
                <Editable value={exp.company} placeholder="Company" onCommit={(v) => patch((d) => { d.experience[ei].company = v; })} />
              </span>
              <span style={{ color: "var(--dim)", fontSize: 12, whiteSpace: "nowrap" }}>
                <Editable value={exp.dates} placeholder="Dates" onCommit={(v) => patch((d) => { d.experience[ei].dates = v; })} />
              </span>
            </div>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {exp.bullets.map((b, bi) => (
                <li key={bi} className="ve-bullet" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 3, display: "flex", alignItems: "flex-start" }}>
                  <Editable
                    as="div"
                    value={b}
                    placeholder="Bullet…"
                    style={{ flex: 1 }}
                    onCommit={(v) => patch((d) => {
                      if (v) d.experience[ei].bullets[bi] = v;
                      else d.experience[ei].bullets.splice(bi, 1);
                    })}
                  />
                  <BulletCtls
                    onUp={() => moveBullet("experience", ei, bi, -1)}
                    onDown={() => moveBullet("experience", ei, bi, 1)}
                    onRemove={() => removeBullet("experience", ei, bi)}
                  />
                </li>
              ))}
            </ul>
            <button style={addBtn} onClick={() => addBullet("experience", ei)}>＋ Add bullet</button>
          </div>
        ))}

        {draft.projects.length ? <div style={sectionTitle}>Projects</div> : null}
        {draft.projects.map((p, pi) => (
          <div key={pi} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>
              <Editable value={p.name} placeholder="Project" onCommit={(v) => patch((d) => { d.projects[pi].name = v; })} />
              {p.tech ? (
                <span style={{ color: "var(--dim)", fontWeight: 400 }}>
                  {" · "}
                  <Editable value={p.tech} placeholder="Tech" onCommit={(v) => patch((d) => { d.projects[pi].tech = v; })} />
                </span>
              ) : null}
            </div>
            <ul style={{ margin: "5px 0 0", paddingLeft: 18 }}>
              {p.bullets.map((b, bi) => (
                <li key={bi} className="ve-bullet" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 3, display: "flex", alignItems: "flex-start" }}>
                  <Editable as="div" value={b} style={{ flex: 1 }} onCommit={(v) => patch((d) => {
                    if (v) d.projects[pi].bullets[bi] = v; else d.projects[pi].bullets.splice(bi, 1);
                  })} />
                  <BulletCtls
                    onUp={() => moveBullet("projects", pi, bi, -1)}
                    onDown={() => moveBullet("projects", pi, bi, 1)}
                    onRemove={() => removeBullet("projects", pi, bi)}
                  />
                </li>
              ))}
            </ul>
            <button style={addBtn} onClick={() => addBullet("projects", pi)}>＋ Add bullet</button>
          </div>
        ))}

        {draft.education.length ? <div style={sectionTitle}>Education</div> : null}
        {draft.education.map((ed, edi) => (
          <div key={edi} style={{ fontSize: 13.5, display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <span>
              <span style={{ fontWeight: 600 }}>
                <Editable value={ed.institution} placeholder="Institution" onCommit={(v) => patch((d) => { d.education[edi].institution = v; })} />
              </span>
              {" — "}
              <Editable value={ed.degree} placeholder="Degree" onCommit={(v) => patch((d) => { d.education[edi].degree = v; })} />
            </span>
            <span style={{ color: "var(--dim)", fontSize: 12, whiteSpace: "nowrap" }}>
              <Editable value={ed.dates} placeholder="Dates" onCommit={(v) => patch((d) => { d.education[edi].dates = v; })} />
            </span>
          </div>
        ))}

        {draft.skills.length ? <div style={sectionTitle}>Skills</div> : null}
        {draft.skills.map((s, si) => (
          <div key={si} style={{ fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>{s.category}: </span>
            <Editable
              value={s.items.join(", ")}
              placeholder="skill, skill, …"
              onCommit={(v) => patch((d) => { d.skills[si].items = v.split(",").map((x) => x.trim()).filter(Boolean); })}
            />
          </div>
        ))}

        {/* grow any section */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 22, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
          <button style={addBtn} onClick={addExperience}>＋ Experience</button>
          <button style={addBtn} onClick={addProject}>＋ Project</button>
          <button style={addBtn} onClick={addEducation}>＋ Education</button>
          <button style={addBtn} onClick={addSkillGroup}>＋ Skill group</button>
        </div>
      </div>

      <style>{`
        .ve-editable:empty:before { content: attr(data-placeholder); color: var(--dim); opacity: 0.7; }
        .ve-editable:focus { background: var(--accent-bg); border-radius: 3px; box-shadow: 0 0 0 2px var(--accent-bg); }
        .ve-bullet-ctls { opacity: 0; transition: opacity .12s ease; }
        .ve-bullet:hover .ve-bullet-ctls, .ve-bullet:focus-within .ve-bullet-ctls { opacity: 1; }
        .ve-bullet-ctls button:hover { background: var(--surface-2, rgba(128,128,128,0.14)); }
      `}</style>
    </div>
  );
}

const btn: CSSProperties = {
  fontSize: 12.5,
  color: "var(--text)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  borderRadius: 8,
  padding: "7px 12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const btnAccent: CSSProperties = {
  ...btn,
  color: "#06131f",
  background: "var(--accent)",
  border: "none",
  fontWeight: 580,
};

const ctlBtn: CSSProperties = {
  border: "none",
  background: "none",
  color: "var(--dim)",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
  padding: "2px 4px",
  borderRadius: 4,
};
const addBtn: CSSProperties = {
  border: "1px dashed var(--border-h)",
  background: "none",
  color: "var(--accent)",
  cursor: "pointer",
  fontSize: 12,
  borderRadius: 7,
  padding: "4px 10px",
  marginTop: 6,
};

/* per-bullet reorder/remove controls (subtle, hover-highlighted) */
function BulletCtls({
  onUp,
  onDown,
  onRemove,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <span className="ve-bullet-ctls" style={{ display: "inline-flex", gap: 2, marginLeft: 8, verticalAlign: "middle" }}>
      <button type="button" style={ctlBtn} title="Move up" aria-label="Move bullet up" onClick={onUp}>↑</button>
      <button type="button" style={ctlBtn} title="Move down" aria-label="Move bullet down" onClick={onDown}>↓</button>
      <button type="button" style={{ ...ctlBtn, color: "var(--red)" }} title="Remove" aria-label="Remove bullet" onClick={onRemove}>✕</button>
    </span>
  );
}
