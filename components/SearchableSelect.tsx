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
 *
 * The suggestion menu renders into a portal (document.body) and is positioned
 * `fixed` against the input's bounding box, so it escapes any clipping ancestor
 * — e.g. the wizard <Card>'s `overflow-hidden` rounded-corner clip, which would
 * otherwise cut the dropdown off at the card's bottom edge.
 */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Track the input's viewport box while open so the portaled menu can be
  // positioned `fixed` directly beneath it (re-measured on scroll/resize).
  useIsoLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.bottom, width: r.width });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true); // capture: catch scroll in any ancestor
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  // Close on outside click — the menu lives in a portal, so check it too.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keep the highlighted index in range as the list changes.
  useEffect(() => { setHighlight(0); }, [value]);

  const pick = (item: SelectItem) => {
    // Sync the controlled input before onSelect so the parent always sees the
    // picked label even if it only listens to onChange.
    onChange(item.label);
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
  const showHint = open && items.length === 0 && !!value.trim() && !!emptyHint;

  // Base position for the portaled menu (viewport coords → `fixed`). Clamp the
  // list height to the space below the input so it never runs off-screen.
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const menuPos: CSSProperties = rect
    ? { position: "fixed", top: rect.top + 6, left: rect.left, width: rect.width, zIndex: 1000 }
    : { position: "fixed", left: 0, top: 0, visibility: "hidden", zIndex: 1000 };
  const listMaxH = rect ? Math.max(140, Math.min(268, viewportH - rect.top - 24)) : 268;

  const menu = showList ? (
    <div
      ref={menuRef}
      role="listbox"
      style={{
        ...menuPos,
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,0.16)", padding: 4, maxHeight: listMaxH, overflowY: "auto",
      }}
    >
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          // Keep focus on the input so the portaled menu doesn't close before
          // the click fires (classic combobox gotcha with document mousedown).
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setHighlight(i)}
          onClick={() => pick(item)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
            background: i === highlight ? "var(--accent-bg, color-mix(in srgb, var(--accent) 10%, transparent))" : "transparent",
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
  ) : showHint ? (
    <div
      ref={menuRef}
      style={{
        ...menuPos,
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,0.16)", padding: "12px 14px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5,
      }}
    >
      {emptyHint}
    </div>
  ) : null;

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

      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}
