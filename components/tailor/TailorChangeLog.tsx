"use client";

/**
 * "What you've changed" — the receipt for every edit the tailor made.
 *
 * Redesigned per the founder's "this can be a better UI UX presented"
 * (mock: public/mockups/tailor-v9-changelog.html). The old panel led every
 * row with the rewritten sentence, so nine truncated lines that all start
 * alike stacked into a wall, the actual information ("Covers Docker") sat in
 * a caption, and every row carried two resting buttons. The hierarchy is now
 * flipped: a row's identity is WHAT THE CHANGE DID — the requirement it
 * covers plus the words it added, visible without a click — and the sentence
 * it landed in is the caption. One affordance per collapsed row: the row
 * itself opens; See-it and the two-step Undo live inside the open row.
 *
 * Undo still reverts the BULLET (see tailorChangeLog.ts) and the confirm
 * still names every requirement riding on it — a row that hid that would be
 * quietly destroying work the user thought was independent.
 */

import React, { useState } from "react";
import { FS, FW } from "@/lib/typography";
import { addedWords, markAddedTokens, type ResumeChange } from "@/lib/tailorChangeLog";

/** Chips shown at rest: the added words, minus any that just repeat the row's
 *  own title (a "Docker" chip beside a "Docker" title is noise), capped. */
export function restingChips(change: ResumeChange, title: string): string[] {
  const t = title.trim().toLowerCase();
  return addedWords(change.original, change.applied).filter(
    (w) => w.trim().toLowerCase() !== t,
  );
}

const CHIP_CAP = 3;

function rowTitle(change: ResumeChange): string {
  if (change.kind === "skill") return change.applied;
  if (change.requirements.length > 0) return change.requirements.join(" & ");
  return "You rewrote a line";
}

export function TailorChangeLog({
  changes,
  onUndo,
  onSee,
}: {
  changes: readonly ResumeChange[];
  /** Revert this change (bullet back to original, or skill removed). */
  onUndo: (change: ResumeChange) => void;
  /** Scroll the preview to the changed line. */
  onSee?: (change: ResumeChange) => void;
}) {
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  if (changes.length === 0) return null;

  const toggle = (key: string) =>
    setOpenKeys((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // The tailor's work first, the user's own edits under their own small label
  // — but only when both classes exist; a label over the whole list labels
  // nothing.
  const tailorRows = changes.filter((c) => c.kind !== "edit");
  const editRows = changes.filter((c) => c.kind === "edit");
  const showEditLabel = editRows.length > 0 && tailorRows.length > 0;

  const renderRow = (c: ResumeChange) => {
    const open = openKeys.has(c.key);
    const confirming = confirmKey === c.key;
    const title = rowTitle(c);
    const chips = c.kind === "skill" ? [] : restingChips(c, title);
    const snippet =
      c.kind === "skill"
        ? "added to your Skills section"
        : c.original
          ? `in "${c.original}"`
          : `a new line: "${c.applied}"`;
    return (
      <li key={c.key} data-testid="change-row" style={{ borderTop: "1px solid var(--border)" }}>
        {/* The whole row is the toggle — the one resting affordance. */}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => toggle(c.key)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            border: "none",
            background: open ? "var(--surface-2, rgba(127,127,127,0.06))" : "transparent",
            padding: "10px 16px 8px",
            cursor: "pointer",
            color: "var(--text)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span
              aria-hidden
              style={{
                width: 17,
                height: 17,
                borderRadius: "50%",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: FW.extrabold,
                background:
                  c.kind === "edit"
                    ? "var(--surface-2, rgba(127,127,127,0.10))"
                    : "var(--green-bg, rgba(22,163,74,0.12))",
                color: c.kind === "edit" ? "var(--muted)" : "var(--green-ink, #16a34a)",
              }}
            >
              {c.kind === "edit" ? "✎" : "✓"}
            </span>
            <span
              style={{
                fontSize: FS.small,
                fontWeight: c.kind === "edit" ? FW.semibold : FW.bold,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </span>
            {chips.length > 0 ? (
              <span style={{ display: "flex", gap: 5, overflow: "hidden", flexShrink: 1 }}>
                {chips.slice(0, CHIP_CAP).map((w) => (
                  <span key={w} data-testid="added-chip" style={ADDED_CHIP}>
                    {w}
                  </span>
                ))}
                {chips.length > CHIP_CAP ? (
                  <span style={{ ...ADDED_CHIP, background: "none", border: "1px dashed var(--border)", color: "var(--muted)" }}>
                    +{chips.length - CHIP_CAP} more
                  </span>
                ) : null}
              </span>
            ) : null}
            <span aria-hidden style={{ marginLeft: "auto", color: "var(--muted)", fontSize: FS.caption, flexShrink: 0 }}>
              {open ? "▴" : "▾"}
            </span>
          </span>
          <span
            style={{
              display: "block",
              margin: "4px 0 0 26px",
              fontSize: FS.caption,
              color: "var(--muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {snippet}
          </span>
        </button>

        {open ? (
          <div style={{ padding: "0 16px 11px 42px", background: "var(--surface-2, rgba(127,127,127,0.06))" }}>
            {c.kind === "skill" ? (
              <p style={{ margin: 0, fontSize: FS.small, color: "var(--text)" }}>
                Added <strong>{c.applied}</strong> to your Skills section.
              </p>
            ) : (
              <>
                <div style={{ fontSize: FS.caption, color: "var(--muted)", marginBottom: 2 }}>Now reads</div>
                <div style={{ fontSize: FS.small, lineHeight: 1.55 }}>
                  {markAddedTokens(c.original, c.applied).map((tk, i) => (
                    <React.Fragment key={i}>
                      {i > 0 ? " " : null}
                      {tk.added ? (
                        <mark
                          style={{
                            background: "var(--green-bg, rgba(22,163,74,0.12))",
                            color: "var(--green-ink, #16a34a)",
                            fontWeight: FW.bold,
                            borderRadius: 3,
                            padding: "0 2px",
                          }}
                        >
                          {tk.text}
                        </mark>
                      ) : (
                        tk.text
                      )}
                    </React.Fragment>
                  ))}
                </div>
                {c.original ? (
                  <div
                    style={{
                      marginTop: 7,
                      fontSize: FS.small,
                      lineHeight: 1.5,
                      color: "var(--muted)",
                      textDecoration: "line-through",
                    }}
                  >
                    {c.original}
                  </div>
                ) : (
                  <div style={{ marginTop: 7, fontSize: FS.caption, color: "var(--muted)" }}>
                    <em>This line was added, not rewritten.</em>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {/* No See-it on a skills row: the preview resolver only finds
                  bullets, and a link that scrolls nowhere is a dead click. */}
              {onSee && c.kind !== "skill" ? (
                <button
                  type="button"
                  style={{ ...QUIET_BTN, border: "none", color: "var(--accent-ink, var(--accent))", fontWeight: FW.semibold, padding: 0 }}
                  onClick={() => onSee(c)}
                >
                  See it in your résumé →
                </button>
              ) : null}
              {confirming ? (
                <>
                  {/* Named consequence, not "Are you sure?". When two
                      requirements share the bullet, undoing costs both, and
                      the user cannot know that unless we say it. */}
                  <span style={{ fontSize: FS.caption, color: "var(--text)" }}>
                    {c.kind === "skill"
                      ? "Removes it from your Skills section and reopens the requirement."
                      : c.requirements.length > 1
                        ? `Puts the original line back and reopens all ${c.requirements.length} requirements.`
                        : "Puts the original line back."}
                  </span>
                  <button
                    type="button"
                    style={{ ...QUIET_BTN, color: "var(--red-ink, #dc2626)", fontWeight: FW.semibold }}
                    onClick={() => { setConfirmKey(null); onUndo(c); }}
                  >
                    Undo it
                  </button>
                  <button type="button" style={QUIET_BTN} onClick={() => setConfirmKey(null)}>
                    Keep it
                  </button>
                </>
              ) : (
                <button type="button" style={QUIET_BTN} onClick={() => setConfirmKey(c.key)}>
                  Undo this change
                </button>
              )}
            </div>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div
      data-testid="change-log"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "var(--card)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "13px 16px 11px", borderBottom: "1px solid var(--border)" }}>
        {/* Counted, so the heading is a fact rather than a label. */}
        <div style={{ fontSize: FS.bodyLg, fontWeight: FW.extrabold }}>
          {changes.length} change{changes.length === 1 ? "" : "s"} to your résumé
        </div>
        <p style={{ margin: "3px 0 0", fontSize: FS.small, color: "var(--muted)" }}>
          Each one is in the file you download. Open a row to compare or undo it.
        </p>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {tailorRows.map(renderRow)}
        {showEditLabel ? (
          <li
            style={{
              padding: "10px 16px 4px",
              fontSize: FS.caption,
              fontWeight: FW.bold,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            Your own edits
          </li>
        ) : null}
        {editRows.map(renderRow)}
      </ul>
    </div>
  );
}

const ADDED_CHIP: React.CSSProperties = {
  fontSize: FS.caption,
  fontWeight: FW.semibold,
  padding: "1px 7px",
  borderRadius: 999,
  background: "var(--green-bg, rgba(22,163,74,0.12))",
  color: "var(--green-ink, #16a34a)",
  whiteSpace: "nowrap",
};

const QUIET_BTN: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "transparent",
  borderRadius: 8,
  padding: "3px 9px",
  fontSize: FS.caption,
  color: "var(--text)",
  cursor: "pointer",
};
