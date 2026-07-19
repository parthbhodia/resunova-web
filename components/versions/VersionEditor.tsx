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
  onScan: (v: ResumeVersion) => void;
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
  const saveTimer = useRef<number | null>(null);

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

  const contact = [draft.email, draft.phone, draft.location, draft.linkedin].filter(Boolean);

  const statusLabel =
    status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "dirty" ? "Editing…" : "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "18px 20px 72px", width: "100%" }}>
      {/* header: switcher + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <VersionSwitcher groups={groups} activeId={version.id} onSelect={handlers.onSwitch} onNewVersion={handlers.onNewVersion} />
        <span style={{ fontSize: 12, color: "var(--dim)", minWidth: 58, fontVariantNumeric: "tabular-nums" }}>{statusLabel}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button style={btnAccent} onClick={() => handlers.onScan(version)}>Scan &amp; score</button>
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
                <li key={bi} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 3 }}>
                  <Editable
                    as="div"
                    value={b}
                    placeholder="Bullet…"
                    onCommit={(v) => patch((d) => {
                      if (v) d.experience[ei].bullets[bi] = v;
                      else d.experience[ei].bullets.splice(bi, 1);
                    })}
                  />
                </li>
              ))}
            </ul>
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
                <li key={bi} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 3 }}>
                  <Editable as="div" value={b} onCommit={(v) => patch((d) => {
                    if (v) d.projects[pi].bullets[bi] = v; else d.projects[pi].bullets.splice(bi, 1);
                  })} />
                </li>
              ))}
            </ul>
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
      </div>

      <style>{`
        .ve-editable:empty:before { content: attr(data-placeholder); color: var(--dim); opacity: 0.7; }
        .ve-editable:focus { background: var(--accent-bg); border-radius: 3px; box-shadow: 0 0 0 2px var(--accent-bg); }
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
