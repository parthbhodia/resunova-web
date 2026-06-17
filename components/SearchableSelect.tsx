"use client";

/**
 * SearchableSelect — a lightweight type-ahead combobox.
 *
 * A free-text input that opens a suggestion list as the user types. The parent
 * owns the query string and the (already-filtered) item list; this component
 * owns open/focus/highlight state, outside-click + Escape close, and keyboard
 * nav (↑/↓/Enter). Selecting an item calls onSelect; the user can also keep
 * typing free text (no forced choice). Inline-styled with CSS vars so it themes
 * with the rest of the Jobs UI (no shadcn Command/Popover in this repo).
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type SelectItem = {
  key: string;
  label: string;
  sub?: string;
  icon?: ReactNode;
};

export default function SearchableSelect({
  value,
  onChange,
  onSelect,
  items,
  placeholder,
  autoFocus,
  leadingIcon,
  emptyHint,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: SelectItem) => void;
  /** Already filtered + ranked by the parent (e.g. matchRoleSuggestions). */
  items: SelectItem[];
  placeholder?: string;
  autoFocus?: boolean;
  leadingIcon?: ReactNode;
  /** Shown under the input when the list is empty but the user has typed. */
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keep the highlighted index in range as the list changes.
  useEffect(() => { setHighlight(0); }, [value]);

  const pick = (item: SelectItem) => {
    onSelect(item);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      if (open && items[highlight]) { e.preventDefault(); pick(items[highlight]); }
    }
  };

  const showList = open && items.length > 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        {leadingIcon && (
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "inline-flex", color: "var(--dim)", pointerEvents: "none" }}>
            {leadingIcon}
          </span>
        )}
        <input
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          style={{
            width: "100%", boxSizing: "border-box", fontSize: 14,
            padding: leadingIcon ? "11px 12px 11px 36px" : "11px 12px",
            borderRadius: 9, border: `1.5px solid ${value.trim() ? "var(--accent)" : "var(--surface2)"}`,
            background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", outline: "none",
          }}
        />
      </div>

      {showList && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60,
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)", padding: 4, maxHeight: 268, overflowY: "auto",
          } as CSSProperties}
        >
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(item)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: i === highlight ? "var(--accent-bg, rgba(47,129,247,0.10))" : "transparent",
              }}
            >
              {item.icon && <span style={{ display: "inline-flex", flexShrink: 0, color: i === highlight ? "var(--accent)" : "var(--dim)" }}>{item.icon}</span>}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: i === highlight ? 600 : 500, color: i === highlight ? "var(--accent)" : "var(--text)" }}>
                  {item.label}
                </span>
                {item.sub && (
                  <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{item.sub}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && items.length === 0 && value.trim() && emptyHint && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", padding: "12px 14px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
          {emptyHint}
        </div>
      )}
    </div>
  );
}
