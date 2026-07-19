"use client";

/**
 * Version switcher — the dropdown that sits at the top of a résumé surface
 * (Analyze / Tailor). Shows the active version, lets you jump to any other, and
 * hosts "＋ New version". Presentational + a self-contained container variant.
 *
 * Analyze and Tailor stay separate surfaces; both read the same versions. The
 * container navigates with ?version=<id> — the surface consumes that param to
 * load the version (that consumption is wired per-surface).
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ResumeVersion, ResumeVersionGroup } from "@/lib/resumeVersions";

function scoreColor(score: number | null): string {
  if (score == null) return "var(--dim)";
  if (score >= 80) return "var(--green)";
  if (score >= 65) return "var(--amber)";
  return "var(--red)";
}

function MiniRing({ score, size = 30 }: { score: number | null; size?: number }) {
  const c = scoreColor(score);
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        flex: "none",
        display: "grid",
        placeItems: "center",
        background: `conic-gradient(${c} ${pct}%, var(--surface-2, rgba(128,128,128,0.14)) 0)`,
      }}
    >
      <div style={{ position: "absolute", inset: size * 0.11, borderRadius: "50%", background: "var(--surface)" }} />
      <b style={{ position: "relative", zIndex: 1, fontSize: size * 0.36, fontWeight: 600, color: c, fontVariantNumeric: "tabular-nums" }}>
        {score ?? "—"}
      </b>
    </div>
  );
}

const vChip: CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  color: "var(--accent)",
  background: "var(--accent-bg)",
  padding: "2px 7px",
  borderRadius: 5,
};

export interface VersionSwitcherProps {
  groups: ResumeVersionGroup[];
  activeId: string | null;
  onSelect: (v: ResumeVersion) => void;
  onNewVersion: () => void;
  /** Compact label used when no version is active yet. */
  placeholder?: string;
}

export function VersionSwitcher({ groups, activeId, onSelect, onNewVersion, placeholder = "Choose a résumé" }: VersionSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const heads = groups.map((g) => g.versions[0]).filter(Boolean);
  const active =
    (activeId ? heads.find((h) => h.id === activeId) : null) ??
    heads.find((h) => h.isDefault) ??
    heads[0] ??
    null;

  const activeJd = active ? [active.jdCompany, active.jdTitle].filter(Boolean).join(" · ") : "";

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          fontSize: 14,
          fontWeight: 560,
          color: "var(--text)",
          background: "var(--surface)",
          border: "1px solid var(--border-h)",
          borderRadius: 10,
          padding: "8px 12px",
          cursor: "pointer",
          maxWidth: 340,
        }}
      >
        {active?.isDefault ? <span style={{ color: "var(--amber)" }} aria-label="Default">★</span> : null}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active ? active.name : placeholder}
        </span>
        {active ? <span style={vChip}>v{active.version}</span> : null}
        <span style={{ color: "var(--dim)", transition: "transform .18s ease", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 380,
            maxHeight: 420,
            overflowY: "auto",
            zIndex: 60,
            background: "var(--surface)",
            border: "1px solid var(--border-h)",
            borderRadius: 12,
            boxShadow: "0 12px 34px rgba(1,4,9,0.4)",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: "var(--dim)",
              padding: "12px 15px 6px",
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
            }}
          >
            Your résumés · {heads.length}
          </div>

          {heads.map((h) => {
            const jd = [h.jdCompany, h.jdTitle].filter(Boolean).join(" · ");
            const isActive = active?.id === h.id;
            return (
              <button
                key={h.id}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSelect(h);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 15px",
                  width: "100%",
                  border: "none",
                  background: isActive ? "var(--accent-bg)" : "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <MiniRing score={h.lastScore} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 560, display: "flex", alignItems: "center", gap: 7 }}>
                    {h.isDefault ? <span style={{ color: "var(--amber)", fontSize: 12 }}>★</span> : null}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                    <span style={vChip}>v{h.version}</span>
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {jd ? <>tailored for <span style={{ color: "var(--accent)" }}>{jd}</span></> : "base résumé"}
                  </span>
                </span>
                <span style={{ fontSize: 10.5, color: "var(--dim)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}>
                  {isActive ? "current" : "switch"}
                </span>
              </button>
            );
          })}

          <div style={{ borderTop: "1px solid var(--border)", padding: 8 }}>
            <button
              onClick={() => {
                setOpen(false);
                onNewVersion();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                fontSize: 13.5,
                fontWeight: 560,
                color: "var(--accent)",
                background: "var(--accent-bg)",
                border: "1px dashed color-mix(in srgb, var(--accent) 45%, transparent)",
                borderRadius: 9,
                padding: 10,
                cursor: "pointer",
              }}
            >
              ＋ New version
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
