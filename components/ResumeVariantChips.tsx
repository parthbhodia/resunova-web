"use client";

/**
 * Résumé variant chips — a content axis of parallel, independently-editable
 * profiles ("Default", "Judi Health") shown directly above the Analyze
 * preview. Each chip's head is the newest row of its most-recently-active
 * version lineage; clicking one restores it exactly like a history-row click.
 *
 * Phase 2 of docs/RESUME_VARIANTS_PLAN.md. Data model: resume_analyses.
 * variant_group/variant_name are written once at insert and never mutated;
 * "which variant is default" and renames are mutable user_profiles
 * preferences (lib/resumeVariants.ts) applied here at render/action time.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { groupAnalysesByVariant, IMPLICIT_VARIANT_NAME, type AnalyzeVariantGroup } from "@/lib/analyzeVersions";
import {
  displayNameForVariant,
  fetchDefaultVariantName,
  fetchVariantDisplayNames,
  saveDefaultVariantName,
  saveVariantDisplayName,
} from "@/lib/resumeVariants";
import type { AnalyzeRecord } from "@/lib/supabase";

interface Props {
  history: AnalyzeRecord[];
  activeAnalysisId: string | null;
  onRestore: (rec: AnalyzeRecord) => void | Promise<void>;
  onDuplicate: (source: AnalyzeRecord, newVariantName: string) => Promise<AnalyzeRecord | null>;
  onImportFile: (variantName: string, file: File) => void;
  onDeleteVariant: (ids: string[]) => Promise<void>;
}

export default function ResumeVariantChips({
  history,
  activeAnalysisId,
  onRestore,
  onDuplicate,
  onImportFile,
  onDeleteVariant,
}: Props) {
  const [defaultName, setDefaultName] = useState<string | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  // position: fixed with computed coordinates, not position: absolute inside
  // the chip row — the row scrolls horizontally (overflow-x: auto), which per
  // the CSS spec forces overflow-y: auto too, clipping an absolutely-
  // positioned dropdown. Same pattern already used for the bullet format
  // toolbar / AI-suggestion popup elsewhere in this codebase.
  const [menu, setMenu] = useState<{ key: string; top: number; left: number } | null>(null);
  const [renameKey, setRenameKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ copyFromKey: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void fetchDefaultVariantName().then((n) => { if (alive) setDefaultName(n); });
    void fetchVariantDisplayNames().then((m) => { if (alive) setDisplayNames(m); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    window.addEventListener("mousedown", handler, true);
    return () => window.removeEventListener("mousedown", handler, true);
  }, [menu]);

  const groups = useMemo(() => groupAnalysesByVariant(history), [history]);
  const activeGroupKey = useMemo(() => {
    if (!activeAnalysisId) return null;
    for (const g of groups) {
      for (const root of g.roots) {
        if (root.recs.some((r) => r.id === activeAnalysisId)) return g.key;
      }
    }
    return null;
  }, [groups, activeAnalysisId]);

  if (!groups.length) return null;

  const label = (g: AnalyzeVariantGroup) => displayNameForVariant(g.name, displayNames);
  const isDefault = (g: AnalyzeVariantGroup) => g.name === (defaultName ?? IMPLICIT_VARIANT_NAME);

  const handleSetDefault = async (g: AnalyzeVariantGroup) => {
    setMenu(null);
    setDefaultName(g.name); // optimistic
    await saveDefaultVariantName(g.name);
  };

  const handleRenameCommit = async (g: AnalyzeVariantGroup) => {
    const next = renameDraft.trim();
    setRenameKey(null);
    if (!next || next === label(g)) return;
    setDisplayNames((prev) => ({ ...prev, [g.name]: next })); // optimistic
    await saveVariantDisplayName(g.name, next);
  };

  const handleDelete = async (g: AnalyzeVariantGroup) => {
    setMenu(null);
    if (groups.length <= 1) return; // can't delete your only résumé
    if (!window.confirm(`Delete "${label(g)}"? This removes every saved version of this variant.`)) return;
    setBusyKey(g.key);
    const ids = g.roots.flatMap((root) => root.recs.map((r) => r.id));
    await onDeleteVariant(ids);
    setBusyKey(null);
  };

  const openMenu = (key: string, e: React.MouseEvent<HTMLElement>) => {
    if (menu?.key === key) { setMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ key, top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 196) });
  };

  const activeMenuGroup = menu ? groups.find((g) => g.key === menu.key) ?? null : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        overflowX: "auto",
        flexShrink: 0,
        background: "var(--bg)",
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.6, marginRight: 2, flexShrink: 0 }}>
        Version
      </span>
      {groups.map((g) => {
        const active = g.key === activeGroupKey;
        const def = isDefault(g);
        const renaming = renameKey === g.key;
        return (
          <div key={g.key} style={{ flexShrink: 0 }}>
            {renaming ? (
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={() => void handleRenameCommit(g)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void handleRenameCommit(g); }
                  else if (e.key === "Escape") { e.preventDefault(); setRenameKey(null); }
                }}
                style={{
                  font: "inherit", fontSize: 12.5, fontWeight: 700,
                  padding: "6px 10px", borderRadius: 100,
                  border: "1.5px solid var(--accent)", background: "var(--surface)",
                  color: "var(--text)", width: 140,
                }}
              />
            ) : (
              <button
                type="button"
                disabled={busyKey === g.key}
                onClick={() => { if (!active) void onRestore(g.roots[0].recs[0]); }}
                title={g.roots.reduce((n, r) => n + r.recs.length, 0) > 1 ? `${label(g)} — includes earlier saved versions` : label(g)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  font: "inherit", fontSize: 12.5, fontWeight: 700,
                  padding: "6px 8px 6px 12px", borderRadius: 100,
                  border: "1px solid transparent",
                  background: active ? "var(--accent)" : "var(--surface2)",
                  color: active ? "#fff" : "var(--text)",
                  cursor: active ? "default" : "pointer",
                  opacity: busyKey === g.key ? 0.5 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {def && <span aria-hidden="true" style={{ fontSize: 11 }}>★</span>}
                {label(g)}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Options for ${label(g)}`}
                  onClick={(e) => { e.stopPropagation(); openMenu(g.key, e); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); openMenu(g.key, e as unknown as React.MouseEvent<HTMLElement>); } }}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 16, height: 16, borderRadius: "50%", marginLeft: 2,
                    color: active ? "rgba(255,255,255,0.8)" : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  ⋮
                </span>
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setDialog({ copyFromKey: activeGroupKey ?? groups[0].key })}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
          font: "inherit", fontSize: 12.5, fontWeight: 700,
          padding: "6px 12px", borderRadius: 100,
          border: "1px dashed var(--border-strong, var(--border))", background: "transparent",
          color: "var(--muted)", cursor: "pointer",
        }}
      >
        + New
      </button>

      {menu && activeMenuGroup && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: menu.top, left: menu.left, zIndex: 10001,
            minWidth: 176, background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 9, boxShadow: "0 8px 20px rgba(0,0,0,0.16)", padding: 4,
          }}
        >
          <button type="button" style={menuItemStyle} onClick={() => {
            setMenu(null); setRenameDraft(label(activeMenuGroup)); setRenameKey(activeMenuGroup.key);
          }}>
            Rename
          </button>
          {!isDefault(activeMenuGroup) && (
            <button type="button" style={menuItemStyle} onClick={() => void handleSetDefault(activeMenuGroup)}>
              Set as default
            </button>
          )}
          <button type="button" style={menuItemStyle} onClick={() => { setMenu(null); setDialog({ copyFromKey: activeMenuGroup.key }); }}>
            Duplicate
          </button>
          {groups.length > 1 && (
            <button type="button" style={{ ...menuItemStyle, color: "var(--red, #ef4444)" }} onClick={() => void handleDelete(activeMenuGroup)}>
              Delete
            </button>
          )}
        </div>
      )}

      {dialog && (
        <CreateVariantDialog
          groups={groups}
          labelFor={label}
          initialCopyFromKey={dialog.copyFromKey}
          existingNames={groups.map((g) => g.name)}
          onCancel={() => setDialog(null)}
          onCreate={async (name, mode, copyFromKey, file) => {
            setDialog(null);
            if (mode === "import" && file) {
              onImportFile(name, file);
              return;
            }
            const source = groups.find((g) => g.key === copyFromKey)?.roots[0]?.recs[0];
            if (!source) return;
            await onDuplicate(source, name);
          }}
        />
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left",
  font: "inherit", fontSize: 12.5, fontWeight: 600,
  padding: "7px 10px", borderRadius: 6, border: "none",
  background: "transparent", color: "var(--text)", cursor: "pointer",
};

function CreateVariantDialog({
  groups,
  labelFor,
  initialCopyFromKey,
  existingNames,
  onCancel,
  onCreate,
}: {
  groups: AnalyzeVariantGroup[];
  labelFor: (g: AnalyzeVariantGroup) => string;
  initialCopyFromKey: string;
  existingNames: string[];
  onCancel: () => void;
  onCreate: (name: string, mode: "duplicate" | "import", copyFromKey: string, file: File | null) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"duplicate" | "import">("duplicate");
  const [copyFromKey, setCopyFromKey] = useState(initialCopyFromKey);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Give this profile a name."); return; }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError("You already have a profile with that name.");
      return;
    }
    if (mode === "import" && !file) { setError("Choose a résumé file to import."); return; }
    void onCreate(trimmed, mode, copyFromKey, file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        width: "min(460px, 100%)", background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", padding: "22px 22px 18px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "var(--text)", letterSpacing: -0.3 }}>
          New résumé profile
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
          A separate, independently-editable version — e.g. tailored toward one employer or industry.
        </p>

        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 5 }}>
          Profile name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          placeholder="e.g. Software Engineer, Healthcare"
          style={{
            width: "100%", boxSizing: "border-box", font: "inherit", fontSize: 13.5,
            padding: "9px 11px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--bg)", color: "var(--text)", marginBottom: 14,
          }}
        />

        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
          Start from
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {(["duplicate", "import"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  display: "block", width: "100%", textAlign: "left", font: "inherit",
                  border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-bg, rgba(196,121,58,0.08))" : "var(--surface)",
                  borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                    border: `4px solid ${active ? "var(--accent)" : "var(--border)"}`, background: "var(--surface)",
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    {m === "duplicate" ? "Duplicate" : "Import from file"}
                  </span>
                </span>
                <span style={{ display: "block", marginTop: 3, marginLeft: 21, fontSize: 11.5, color: "var(--muted)" }}>
                  {m === "duplicate"
                    ? "Copy all data from an existing profile — no scan used."
                    : "Extract résumé data from a PDF or .docx file."}
                </span>
              </button>
            );
          })}
        </div>

        {mode === "duplicate" ? (
          <>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 5 }}>
              Copy from
            </label>
            <select
              value={copyFromKey}
              onChange={(e) => setCopyFromKey(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", font: "inherit", fontSize: 13,
                padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--bg)", color: "var(--text)", marginBottom: 4,
              }}
            >
              {groups.map((g) => (
                <option key={g.key} value={g.key}>{labelFor(g)}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: "none" }}
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", boxSizing: "border-box", font: "inherit", fontSize: 12.5, fontWeight: 600,
                padding: "9px 11px", borderRadius: 8, border: "1px dashed var(--border-strong, var(--border))",
                background: "var(--bg)", color: file ? "var(--text)" : "var(--muted)", cursor: "pointer", textAlign: "left",
              }}
            >
              {file ? file.name : "Choose file…"}
            </button>
          </>
        )}

        {error && (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--red, #ef4444)" }}>{error}</p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onCancel} style={{
            font: "inherit", fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 8,
            border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer",
          }}>
            Cancel
          </button>
          <button type="button" onClick={submit} style={{
            font: "inherit", fontSize: 12.5, fontWeight: 700, padding: "7px 16px", borderRadius: 8,
            border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer",
          }}>
            Create profile
          </button>
        </div>
      </div>
    </div>
  );
}
