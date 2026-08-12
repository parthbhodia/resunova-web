"use client";

/**
 * "What you've changed" — the receipt for every edit the tailor made.
 *
 * The field report was blunt: "make sure you add it normally and can easily
 * track back all the changes you added." Before this, an applied fix left a
 * green queue row and a recoloured preview line, and nothing else. You could
 * not list what had changed, and the only way back was a full reset on the next
 * scan — so a single regretted rewrite cost you every other one too.
 *
 * Each row shows the line before, the line now, the words that were added, and
 * an Undo. It names every requirement riding on that bullet, because undo
 * reverts the BULLET (see tailorChangeLog.ts) and a row that hid that would be
 * quietly destroying work the user thought was independent.
 */

import React, { useState } from "react";
import { FS, FW } from "@/lib/typography";
import { addedWords, type ResumeChange } from "@/lib/tailorChangeLog";

export function TailorChangeLog({
  changes,
  onUndo,
  onSee,
}: {
  changes: readonly ResumeChange[];
  /** Revert this bullet to its original text. */
  onUndo: (change: ResumeChange) => void;
  /** Scroll the preview to the changed line. */
  onSee?: (change: ResumeChange) => void;
}) {
  const [openIds, setOpenIds] = useState<ReadonlySet<number>>(() => new Set());
  const [confirmId, setConfirmId] = useState<number | null>(null);
  if (changes.length === 0) return null;

  const toggle = (idx: number) =>
    setOpenIds((cur) => {
      const next = new Set(cur);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

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
          Every edit that will be in the file you download. Undo any of them.
        </p>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {changes.map((c) => {
          const open = openIds.has(c.bulletIndex);
          const added = addedWords(c.original, c.applied);
          const confirming = confirmId === c.bulletIndex;
          return (
            <li
              key={c.bulletIndex}
              data-testid="change-row"
              style={{ borderTop: "1px solid var(--border)", padding: "11px 16px" }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: FS.small,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: open ? "normal" : "nowrap",
                    }}
                  >
                    {c.applied}
                  </div>
                  {/* The requirements this covers. Named on the collapsed row
                      too: it is what makes the Undo below legible. */}
                  {c.requirements.length > 0 ? (
                    <div style={{ marginTop: 3, fontSize: FS.caption, color: "var(--muted)" }}>
                      Covers {c.requirements.join(" · ")}
                    </div>
                  ) : (
                    <div style={{ marginTop: 3, fontSize: FS.caption, color: "var(--muted)" }}>
                      Edited directly
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button type="button" style={QUIET_BTN} onClick={() => toggle(c.bulletIndex)}>
                    {open ? "Hide" : "What changed"}
                  </button>
                  {onSee ? (
                    <button type="button" style={QUIET_BTN} onClick={() => onSee(c)}>
                      See it
                    </button>
                  ) : null}
                </div>
              </div>

              {open ? (
                <div style={{ marginTop: 9 }}>
                  <Line label="Before" text={c.original} muted />
                  <Line label="Now" text={c.applied} />
                  {added.length > 0 ? (
                    <div style={{ marginTop: 7, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: FS.caption, color: "var(--muted)" }}>Added</span>
                      {added.slice(0, 12).map((w) => (
                        <span
                          key={w}
                          style={{
                            fontSize: FS.caption,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "var(--green-bg, rgba(22,163,74,0.12))",
                            color: "var(--green-ink, #16a34a)",
                          }}
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {confirming ? (
                      <>
                        {/* Named consequence, not "Are you sure?". When two
                            requirements share the bullet, undoing costs both,
                            and the user cannot know that unless we say it. */}
                        <span style={{ fontSize: FS.caption, color: "var(--text)" }}>
                          {c.requirements.length > 1
                            ? `Puts the original line back and reopens all ${c.requirements.length} requirements.`
                            : "Puts the original line back."}
                        </span>
                        <button
                          type="button"
                          style={{ ...QUIET_BTN, color: "var(--red-ink, #dc2626)", fontWeight: FW.semibold }}
                          onClick={() => { setConfirmId(null); onUndo(c); }}
                        >
                          Undo it
                        </button>
                        <button type="button" style={QUIET_BTN} onClick={() => setConfirmId(null)}>
                          Keep it
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        style={QUIET_BTN}
                        onClick={() => setConfirmId(c.bulletIndex)}
                      >
                        Undo this change
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Line({ label, text, muted }: { label: string; text: string; muted?: boolean }) {
  return (
    <div style={{ marginTop: 5 }}>
      <div style={{ fontSize: FS.caption, color: "var(--muted)", marginBottom: 1 }}>{label}</div>
      <div
        style={{
          fontSize: FS.small,
          lineHeight: 1.5,
          color: muted ? "var(--muted)" : "var(--text)",
          textDecoration: muted ? "line-through" : undefined,
        }}
      >
        {text || <em>(this line was added, not rewritten)</em>}
      </div>
    </div>
  );
}

const QUIET_BTN: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "transparent",
  borderRadius: 8,
  padding: "3px 9px",
  fontSize: FS.caption,
  color: "var(--text)",
  cursor: "pointer",
};
