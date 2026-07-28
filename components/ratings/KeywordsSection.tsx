"use client";

import { useCallback, useMemo, useState } from "react";
import { isGapAddressed } from "@/lib/tailorGapFix";
import type { AddressedGapAction, KeywordsRating, ContextualKeyword } from "@/lib/types";

type Props = {
  keywords: KeywordsRating;
  onFixKeyword?: (keyword: string) => void;
  fixingKeyword?: string | null;
  addressedGaps?: ReadonlySet<string>;
  addressedGapActions?: readonly AddressedGapAction[];
  /** Write the selected bare skills straight into the résumé's Skills section. */
  onAddSkills?: (keywords: string[], category: string) => void;
  /** Categories the résumé already uses; the picker defaults to the first. */
  skillCategories?: string[];
  addSkillsBusy?: boolean;
  /** One batched rewrite pass for several contextual gaps, instead of one call each. */
  onFixKeywords?: (keywords: string[]) => void;
};

const checkboxStyle = (checked: boolean): React.CSSProperties => ({
  width: 17,
  height: 17,
  borderRadius: 5,
  flexShrink: 0,
  border: checked ? "none" : "1.5px solid var(--border)",
  background: checked ? "#6366f1" : "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
});

function SelectBox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label}
      onClick={onToggle} style={checkboxStyle(checked)}>
      {checked && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
    </button>
  );
}

function SelectAllToggle({
  group, selectedCount, onChange,
}: {
  group: string[];
  selectedCount: number;
  onChange: (group: string[], on: boolean) => void;
}) {
  const allOn = group.length > 0 && selectedCount === group.length;
  return (
    <button
      type="button"
      onClick={() => onChange(group, !allOn)}
      style={{
        fontFamily: "inherit", fontSize: 12, fontWeight: 600,
        color: "#818cf8", background: "none", border: "none",
        cursor: "pointer", padding: 0, whiteSpace: "nowrap",
      }}
    >
      {allOn ? "Clear all" : "Select all"}
    </button>
  );
}

function MissingKeywordRow({
  kw, selected, onToggle, onFixKeyword, isFixing, fixDisabled, showFix,
}: {
  kw: string;
  selected: boolean;
  onToggle: () => void;
  onFixKeyword?: (keyword: string) => void;
  isFixing: boolean;
  fixDisabled: boolean;
  showFix: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: selected ? "1.5px solid rgba(99,102,241,0.45)" : "1px solid var(--border)",
        background: selected ? "rgba(99,102,241,0.04)" : "var(--surface)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <SelectBox checked={selected} label={`Select ${kw}`} onToggle={onToggle} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", flex: 1 }}>{kw}</span>

      {showFix && onFixKeyword && (
        <button
          type="button"
          disabled={fixDisabled}
          onClick={() => onFixKeyword(kw)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
            padding: "5px 12px", borderRadius: 7,
            border: "1px solid rgba(99,102,241,0.4)",
            background: isFixing ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
            color: "#818cf8",
            fontSize: 12, fontWeight: 600, fontFamily: "inherit",
            cursor: fixDisabled ? "not-allowed" : "pointer",
            opacity: fixDisabled && !isFixing ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {isFixing ? (
            <>
              <svg width="11" height="11" viewBox="0 0 18 18" fill="none"
                style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} aria-hidden>
                <circle cx="9" cy="9" r="7" stroke="rgba(99,102,241,0.3)" strokeWidth="2.5" />
                <path d="M9 2a7 7 0 017 7" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Getting fixes…
            </>
          ) : "⚡ Fix with AI"}
        </button>
      )}
    </div>
  );
}

export function KeywordsSection({
  keywords,
  onFixKeyword,
  fixingKeyword,
  addressedGaps,
  addressedGapActions,
  onAddSkills,
  skillCategories,
  addSkillsBusy = false,
  onFixKeywords,
}: Props) {
  const addressed = addressedGaps ?? new Set<string>();
  const dsFound: string[] = keywords.direct_skills?.found ?? keywords.found ?? [];
  const dsMissing: string[] = (keywords.direct_skills?.missing ?? keywords.missing ?? []).filter(
    (kw) => !isGapAddressed(kw, addressed),
  );
  const ctxFound: ContextualKeyword[] = keywords.contextual?.found ?? [];
  const ctxMissing: string[] = (keywords.contextual?.missing ?? []).filter(
    (kw) => !isGapAddressed(kw, addressed),
  );

  const totalFound = dsFound.length + ctxFound.length;
  const totalMissing = dsMissing.length + ctxMissing.length;

  // Selection is keyed by keyword text, so a keyword leaving the missing list
  // after it is applied drops out of the selection on its own.
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const categories = skillCategories?.length ? skillCategories : ["Skills"];
  const [category, setCategory] = useState<string>(categories[0]);
  const activeCategory = categories.includes(category) ? category : categories[0];

  const toggle = useCallback((kw: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  }, []);

  const setGroup = useCallback((group: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const kw of group) {
        if (on) next.add(kw);
        else next.delete(kw);
      }
      return next;
    });
  }, []);

  const selectedDs = useMemo(() => dsMissing.filter((kw) => selected.has(kw)), [dsMissing, selected]);
  const selectedCtx = useMemo(() => ctxMissing.filter((kw) => selected.has(kw)), [ctxMissing, selected]);
  const fixBusy = !!fixingKeyword || addSkillsBusy;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Big summary chips ──────────────────────────────── */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, padding: "18px 20px", borderRadius: 12, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--green, #34d399)", letterSpacing: -1.5, lineHeight: 1 }}>{totalFound}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green, #34d399)", letterSpacing: 0.3, marginTop: 4 }}>✓ FOUND</div>
        </div>
        <div style={{ flex: 1, padding: "18px 20px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#f87171", letterSpacing: -1.5, lineHeight: 1 }}>{totalMissing}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", letterSpacing: 0.3, marginTop: 4 }}>✕ MISSING</div>
        </div>
      </div>

      {/* ── Missing Direct Skills ─────────────────────────── */}
      {dsMissing.length > 0 && (
        <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(248,113,113,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "#f87171", fontWeight: 700 }}>✕</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Missing Direct Skills ({dsMissing.length})
            </span>
            <div style={{ flex: 1 }} />
            <SelectAllToggle
              group={dsMissing}
              selectedCount={selectedDs.length}
              onChange={setGroup}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dsMissing.map((kw) => (
              <MissingKeywordRow
                key={kw}
                kw={kw}
                selected={selected.has(kw)}
                onToggle={() => toggle(kw)}
                onFixKeyword={onFixKeyword}
                isFixing={fixingKeyword === kw}
                fixDisabled={fixBusy}
                showFix={!isGapAddressed(kw, addressed, addressedGapActions)}
              />
            ))}
          </div>

          {/* These are bare technology names, so the honest fix is the skills
              list, not a bullet rewrite — a plain insert with no LLM and no
              bullet to collide on. Unchecked by default: adding a skill is a
              claim about the candidate, not a formatting change. */}
          {onAddSkills && (
            <div style={{
              marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            }}>
              <label htmlFor="kw-skill-category" style={{ fontSize: 12, color: "var(--muted)" }}>
                Add to
              </label>
              <select
                id="kw-skill-category"
                value={activeCategory}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                  padding: "5px 8px", borderRadius: 7,
                  border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
                }}
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                type="button"
                disabled={selectedDs.length === 0 || fixBusy}
                onClick={() => onAddSkills(selectedDs, activeCategory)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  cursor: selectedDs.length === 0 || fixBusy ? "not-allowed" : "pointer",
                  opacity: selectedDs.length === 0 || fixBusy ? 0.55 : 1,
                }}
              >
                {addSkillsBusy ? "Adding…" : `Add ${selectedDs.length || ""} to skills`.replace("  ", " ")}
              </button>
              <span style={{ fontSize: 11, color: "var(--dim)", flexBasis: "100%", lineHeight: 1.5 }}>
                Only add skills you can back up in an interview.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Missing Contextual Keywords ───────────────────── */}
      {ctxMissing.length > 0 && (
        <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(248,113,113,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "#f87171", fontWeight: 700 }}>✕</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Missing Contextual Keywords ({ctxMissing.length})
            </span>
            <div style={{ flex: 1 }} />
            <SelectAllToggle
              group={ctxMissing}
              selectedCount={selectedCtx.length}
              onChange={setGroup}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ctxMissing.map((kw) => (
              <MissingKeywordRow
                key={kw}
                kw={kw}
                selected={selected.has(kw)}
                onToggle={() => toggle(kw)}
                onFixKeyword={onFixKeyword}
                isFixing={fixingKeyword === kw}
                fixDisabled={fixBusy}
                showFix={!isGapAddressed(kw, addressed, addressedGapActions)}
              />
            ))}
          </div>

          {/* Phrases, not skills — these need a real bullet rewrite. One batched
              pass beats N sequential ones: each round otherwise re-reads the
              pristine résumé and overwrites the previous round's clause. */}
          {onFixKeywords && (
            <div style={{
              marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            }}>
              <button
                type="button"
                disabled={selectedCtx.length === 0 || fixBusy}
                onClick={() => onFixKeywords(selectedCtx)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  cursor: selectedCtx.length === 0 || fixBusy ? "not-allowed" : "pointer",
                  opacity: selectedCtx.length === 0 || fixBusy ? 0.55 : 1,
                }}
              >
                {`⚡ Fix ${selectedCtx.length || ""} with AI`.replace("  ", " ")}
              </button>
              <span style={{ fontSize: 11, color: "var(--dim)" }}>
                Covers the selected gaps in one pass.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Found Direct Skills ───────────────────────────── */}
      {dsFound.length > 0 && (
        <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(52,211,153,0.2)", background: "var(--surface2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "var(--green, #34d399)", fontWeight: 700 }}>✓</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Found Direct Skills ({dsFound.length})</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {dsFound.map((kw, i) => (
              <span key={i} style={{ padding: "5px 11px", borderRadius: 7, border: "1.5px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.07)", fontSize: 11, fontWeight: 800, color: "var(--green, #34d399)", letterSpacing: 0.5, textTransform: "uppercase" }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Found Contextual Keywords ─────────────────────── */}
      {ctxFound.length > 0 && (
        <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(52,211,153,0.2)", background: "var(--surface2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "var(--green, #34d399)", fontWeight: 700 }}>✓</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Found Contextual Keywords ({ctxFound.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {ctxFound.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(52,211,153,0.15)", background: "var(--surface)" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>&ldquo;{item.keyword}&rdquo;</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green, #34d399)", background: "rgba(52,211,153,0.1)", borderRadius: 5, padding: "2px 8px", flexShrink: 0, marginLeft: 8 }}>
                  {item.count} {item.count === 1 ? "match" : "matches"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
