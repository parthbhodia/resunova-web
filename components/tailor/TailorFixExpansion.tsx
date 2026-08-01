"use client";

/**
 * The inline one-by-one fix flow: the queue row expands in place, no
 * navigation, no side panel. Patterned after what the category leaders do
 * (Jobscan Power Edit: pick between versions, one-click accept; Teal: Ignore
 * is a first-class action) with none of the old AI narration — every word on
 * screen is about the resume, not the model.
 *
 * Presentational + local choice state only. The caller owns the fetch (this
 * component just renders its phases) and the apply.
 */

import React, { useState } from "react";
import { FS, FW } from "@/lib/typography";
import { gapFixAppendDelta } from "@/lib/gapFixAppendDelta";
import type { QueueItem } from "@/lib/tailorWorkQueue";

/** One suggestion in the canonical /api/suggest-gap-fix shape. */
export interface FixSuggestion {
  id: string;
  section: string;
  original: string;
  suggested: string;
  reason: string;
  priority: string;
}

export type FixExpansionState =
  | { phase: "loading" }
  | { phase: "ready"; suggestions: FixSuggestion[] }
  | { phase: "info" } // contextual "What's this?" explainer
  | { phase: "error"; message: string };

const label: React.CSSProperties = {
  fontSize: FS.micro,
  fontWeight: FW.bold,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "var(--muted)",
  marginBottom: 3,
};

const card: React.CSSProperties = {
  margin: "0 8px 10px 30px",
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--surface, var(--bg))",
  padding: 12,
};

const ghostBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: FS.body,
  fontWeight: FW.semibold,
  color: "var(--text)",
  padding: "7px 12px",
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "var(--green-ink, #16a34a)",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  fontSize: FS.body,
  fontWeight: FW.bold,
  padding: "7px 16px",
  cursor: "pointer",
};

function Skeleton() {
  return (
    <div>
      <div style={label}>Writing suggestions…</div>
      {["92%", "78%", "55%"].map((w) => (
        <div key={w} className="rn-fix-skel" style={{ width: w }} />
      ))}
    </div>
  );
}

/** Suggested text with the added words highlighted when it is a clean append. */
function SuggestedText({ s }: { s: FixSuggestion }) {
  const delta = gapFixAppendDelta(s.original, s.suggested);
  if (delta.kind !== "append") return <>{s.suggested}</>;
  return (
    <>
      {s.suggested.slice(0, delta.addedStart)}
      <mark
        style={{
          background: "var(--green-soft, rgba(22,163,74,0.14))",
          color: "inherit",
          borderRadius: 5,
          padding: "0 3px",
          fontWeight: FW.semibold,
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        }}
      >
        {s.suggested.slice(delta.addedStart, delta.addedEnd)}
      </mark>
      {s.suggested.slice(delta.addedEnd)}
    </>
  );
}

export function TailorFixExpansion({
  item,
  state,
  applying,
  onApply,
  onIgnore,
  onTryFix,
  onClose,
}: {
  item: QueueItem;
  state: FixExpansionState;
  /** An apply is in flight — disable the buttons rather than double-submit. */
  applying?: boolean;
  onApply: (suggestion: FixSuggestion, editedText: string | null) => void;
  onIgnore: () => void;
  /** Contextual info card: run the normal fix flow anyway. */
  onTryFix?: () => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState(0);
  const [editText, setEditText] = useState<string | null>(null);

  const suggestions = state.phase === "ready" ? state.suggestions : [];
  const current = suggestions[Math.min(chosen, Math.max(0, suggestions.length - 1))];

  return (
    <div style={card} data-testid="fix-expansion">
      {state.phase === "loading" ? (
        <Skeleton />
      ) : state.phase === "error" ? (
        <div>
          <div style={label}>Something went wrong</div>
          <p style={{ margin: "2px 0 10px", fontSize: FS.small, color: "var(--text)" }}>{state.message}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={ghostBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      ) : state.phase === "info" ? (
        <div>
          <div style={label}>Worth knowing</div>
          <p style={{ margin: "2px 0 10px", fontSize: FS.small, lineHeight: 1.55, color: "var(--text)" }}>
            &ldquo;{item.name}&rdquo; describes the employer&rsquo;s business, not a skill you&rsquo;d
            list. Forcing it into a bullet reads as keyword stuffing. If you&rsquo;ve genuinely worked
            in that area, a fix can weave it in honestly; otherwise it&rsquo;s safe to ignore.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {onTryFix ? (
              <button
                type="button"
                style={{ ...primaryBtn, background: "var(--accent)" }}
                onClick={onTryFix}
              >
                Try a fix
              </button>
            ) : null}
            <button type="button" style={ghostBtn} onClick={onIgnore}>Ignore</button>
          </div>
        </div>
      ) : suggestions.length === 0 ? (
        <div>
          <div style={label}>Nothing honest to write</div>
          <p style={{ margin: "2px 0 10px", fontSize: FS.small, color: "var(--text)" }}>
            Your resume doesn&rsquo;t have work this can be written from. Better to leave it out than
            stretch the truth.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={ghostBtn} onClick={onIgnore}>Ignore</button>
            <button type="button" style={ghostBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      ) : editText !== null && current ? (
        <div>
          <div style={label}>Your version</div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            aria-label="Edit the suggestion"
            style={{
              width: "100%",
              minHeight: 74,
              font: `inherit`,
              fontSize: FS.small,
              lineHeight: 1.5,
              color: "var(--text)",
              background: "var(--card)",
              border: "1px solid var(--accent)",
              borderRadius: 8,
              padding: 8,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              style={{ ...primaryBtn, opacity: applying ? 0.6 : 1 }}
              disabled={applying}
              onClick={() => onApply(current, editText)}
            >
              {applying ? "Adding…" : "Add your version"}
            </button>
            <button type="button" style={ghostBtn} onClick={() => setEditText(null)}>Back</button>
          </div>
        </div>
      ) : current ? (
        <div>
          <div style={label}>Your bullet</div>
          <div style={{ fontSize: FS.small, color: "var(--muted)", lineHeight: 1.5 }}>{current.original}</div>
          <div style={{ ...label, marginTop: 10 }}>
            {suggestions.length > 1 ? "Pick a version" : "Suggested"}
          </div>
          {suggestions.map((s, i) => {
            const sel = i === Math.min(chosen, suggestions.length - 1);
            return (
              <div
                key={s.id || i}
                role={suggestions.length > 1 ? "radio" : undefined}
                aria-checked={suggestions.length > 1 ? sel : undefined}
                tabIndex={suggestions.length > 1 ? 0 : undefined}
                onClick={() => setChosen(i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setChosen(i); }}
                style={{
                  border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 9,
                  background: sel ? "var(--accent-soft, rgba(37,99,235,0.08))" : "var(--card)",
                  padding: "9px 11px",
                  marginTop: 8,
                  cursor: suggestions.length > 1 ? "pointer" : "default",
                  fontSize: FS.body,
                  lineHeight: 1.55,
                }}
              >
                {suggestions.length > 1 ? (
                  <span
                    style={{
                      display: "block",
                      fontSize: FS.micro,
                      fontWeight: FW.bold,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: sel ? "var(--accent)" : "var(--muted)",
                      marginBottom: 3,
                    }}
                  >
                    {s.section || `Option ${i + 1}`}
                  </span>
                ) : null}
                <SuggestedText s={s} />
              </div>
            );
          })}
          {current.reason ? (
            <div style={{ fontSize: FS.caption, color: "var(--muted)", marginTop: 9 }}>
              ↳ {current.reason}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              style={{ ...primaryBtn, opacity: applying ? 0.6 : 1 }}
              disabled={applying}
              onClick={() => onApply(current, null)}
            >
              {applying ? "Adding…" : "Add to resume"}
            </button>
            <button
              type="button"
              style={ghostBtn}
              disabled={applying}
              onClick={() => setEditText(current.suggested)}
            >
              Edit first
            </button>
            <button type="button" style={ghostBtn} disabled={applying} onClick={onIgnore}>
              Ignore
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        .rn-fix-skel {
          height: 12px; border-radius: 6px; margin: 6px 0;
          background: linear-gradient(90deg,
            var(--surface-2, rgba(127,127,127,0.12)) 25%,
            var(--border) 50%,
            var(--surface-2, rgba(127,127,127,0.12)) 75%);
          background-size: 200% 100%;
          animation: rnFixShim 1.1s linear infinite;
        }
        @keyframes rnFixShim { to { background-position: -200% 0; } }
        @media (prefers-reduced-motion: reduce) { .rn-fix-skel { animation: none; } }
      `}</style>
    </div>
  );
}
