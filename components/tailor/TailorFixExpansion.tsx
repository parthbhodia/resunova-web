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
import {
  claimSentence,
  draftFactFromSuggestion,
  factDiffersFromDraft,
  FACT_FIELD_MAX,
  type ConfirmedFact,
} from "@/lib/tailorConfirmFacts";
import {
  educationAlreadyPresent,
  educationDraftFromRequirement,
  educationDraftToEntry,
  isEducationDraftValid,
} from "@/lib/educationEntry";
import type {
  StructuredResume,
  StructuredResumeEducation,
} from "@/store/resumeAnalyzeStore";

/** One suggestion in the canonical /api/suggest-gap-fix shape. */
export interface FixSuggestion {
  id: string;
  /** Section label ("Work Experience"). NOT the employer — see
   *  draftFactFromSuggestion for why that distinction bit once already. */
  section: string;
  /** The company/context the targeted bullet sits under. Optional: the model
   *  does not always fill it, and an absent employer is better than a wrong
   *  one in a sentence the user is asked to vouch for. */
  employer?: string;
  original: string;
  suggested: string;
  reason: string;
  priority: string;
}

export type FixExpansionState =
  | { phase: "loading" }
  | { phase: "ready"; suggestions: FixSuggestion[] }
  | { phase: "info" } // contextual "What's this?" explainer
  | { phase: "credential" } // degree/licence: belongs in Education, not a bullet
  | { phase: "error"; message: string };

const label: React.CSSProperties = {
  fontSize: FS.micro,
  fontWeight: FW.bold,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "var(--muted)",
  marginBottom: 3,
};

/**
 * A numbered step heading.
 *
 * The confirm flow is two or three screens deep inside one row, and an
 * unnumbered eyebrow gives no sense of where you are or how much is left — the
 * mockup numbers them for exactly that reason. The badge carries the number so
 * the label stays a label.
 */
function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ ...label, display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
      <span
        aria-hidden
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          display: "inline-grid",
          placeItems: "center",
          background: "var(--accent)",
          color: "var(--on-fill, #fff)",
          fontSize: FS.micro,
          fontWeight: FW.extrabold,
          letterSpacing: 0,
          flex: "none",
        }}
      >
        {n}
      </span>
      {children}
    </div>
  );
}

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
  color: "var(--on-fill, #fff)",
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
          background: "var(--green-bg, rgba(5,150,105,0.12))",
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

/** One labelled text input for the credential form. */
function FieldInput({
  label: text,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 3 }}>
      <span style={{ fontSize: FS.small, color: "var(--muted)", fontWeight: FW.semibold }}>{text}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "7px 9px",
          borderRadius: 7,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: FS.small,
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

export function TailorFixExpansion({
  item,
  state,
  applying,
  onApply,
  onIgnore,
  onTryFix,
  onRewriteWithFacts,
  scoreFix,
  onAddEducation,
  structuredResume,
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
  /** Re-run the rewrite grounded in what the user says they actually did.
   *  Absent ⇒ the confirm step does not render and behaviour is unchanged. */
  onRewriteWithFacts?: (fact: ConfirmedFact) => void;
  /** Write a credential into the résumé's Education section. Absent ⇒ the form
   *  degrades to instructions, so a caller that cannot write still explains. */
  onAddEducation?: (entry: StructuredResumeEducation) => Promise<void> | void;
  /** Only used to warn about a duplicate entry. */
  structuredResume?: StructuredResume | null;
  /** Recount the deterministic match with this one rewrite applied. */
  scoreFix?: (original: string, suggested: string) => Promise<{ before: number; after: number } | null>;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState(0);
  const [editText, setEditText] = useState<string | null>(null);
  /**
   * Recount, stamped with the suggestion it describes.
   *
   * The key is what makes a late response safe: picking version B and seeing
   * version A's number is the quiet wrongness this line exists to remove, and
   * comparing keys at render time handles it without clearing state
   * synchronously inside the effect.
   */
  const [delta, setDelta] = useState<{ key: string; before: number; after: number } | null>(null);

  /** null = not correcting; an object = the correction form is open. */
  const [correction, setCorrection] = useState<ConfirmedFact | null>(null);
  /** The user has agreed with (or corrected) the claim for this expansion. */
  const [confirmed, setConfirmed] = useState(false);
  // Credential form. Seeded from the requirement so the common case is
  // confirm-and-save; keyed on item.id so switching rows never carries one
  // row's typed school onto another's degree.
  const [eduDraft, setEduDraft] = useState(() => educationDraftFromRequirement(item.name));
  const [eduSaving, setEduSaving] = useState(false);
  // No reseed logic here on purpose: the caller keys this component on the row
  // id, so switching rows remounts it and the initializer above runs fresh.
  // The alternatives are both worse -- an effect paints one frame of the
  // previous row's draft, and a render-phase ref write is what the
  // react-hooks/refs rule exists to stop.
  const eduValid = isEducationDraftValid(eduDraft);
  const eduDuplicate =
    eduValid && structuredResume
      ? educationAlreadyPresent(structuredResume, educationDraftToEntry(eduDraft))
      : false;

  const suggestions = state.phase === "ready" ? state.suggestions : [];
  const current = suggestions[Math.min(chosen, Math.max(0, suggestions.length - 1))];

  /**
   * Recount whenever the chosen suggestion changes.
   *
   * Guarded so a late response from a previously-selected version cannot land
   * under a different one — picking version B and seeing version A's number is
   * exactly the kind of quiet wrongness this line exists to remove.
   */
  React.useEffect(() => {
    if (!scoreFix || !current?.original || !current?.suggested) return;
    const key = `${current.original}\u0000${current.suggested}`;
    let live = true;
    void scoreFix(current.original, current.suggested)
      .then((r) => { if (live && r) setDelta({ key, ...r }); })
      .catch(() => { /* a missing line is honest; a wrong one is not */ });
    return () => { live = false; };
  }, [scoreFix, current?.original, current?.suggested]);

  /** Only render a recount that belongs to what is on screen right now. */
  const shownDelta =
    delta && current && delta.key === `${current.original}\u0000${current.suggested}`
      ? delta
      : null;
  const draft = draftFactFromSuggestion(current);
  // The confirm step only appears when there is a real résumé bullet to quote.
  // Asking someone to vouch for a sentence we invented would be the opposite of
  // the point.
  const needsConfirm = Boolean(onRewriteWithFacts) && !confirmed && draft !== null;

  return (
    <div style={card} data-testid="fix-expansion">
      {state.phase === "loading" ? (
        <Skeleton />
      ) : state.phase === "error" ? (
        <div>
          <div style={label}>Something went wrong</div>
          <p style={{ margin: "2px 0 10px", fontSize: FS.small, color: "var(--text)" }}>{state.message}</p>
          <div style={{ display: "flex", gap: 8 }}>
            {/* A failure with no retry is a dead end wearing an apology. This
                phase covers transient causes — a provider hiccup, a filtered
                batch — and a second pass genuinely can succeed, so the way to
                try again has to be here, not back at the row's Fix button. */}
            {onTryFix ? (
              <button type="button" style={{ ...primaryBtn, background: "var(--accent)" }} onClick={onTryFix}>
                Try again
              </button>
            ) : null}
            <button type="button" style={ghostBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      ) : state.phase === "credential" ? (
        <div>
          <div style={label}>Add this to your education</div>
          <p style={{ margin: "2px 0 10px", fontSize: FS.small, lineHeight: 1.55, color: "var(--text)" }}>
            Your résumé already shows this — the scanner just isn&rsquo;t reading it in the
            posting&rsquo;s words. No rewrite of a work bullet can evidence a degree, so this goes
            in your Education section instead.
          </p>
          <p style={{ margin: "0 0 12px", fontSize: FS.small, lineHeight: 1.55, color: "var(--amber-ink, #b45309)" }}>
            Only add a credential you can actually prove. A degree is among the first things an
            employer verifies, so if you don&rsquo;t hold it, leave it off.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <FieldInput label="Degree" value={eduDraft.degree} placeholder="Master&rsquo;s"
              onChange={(v) => setEduDraft({ ...eduDraft, degree: v })} />
            <FieldInput label="Field of study" value={eduDraft.field} placeholder="Computer Science"
              onChange={(v) => setEduDraft({ ...eduDraft, field: v })} />
            <FieldInput label="School" value={eduDraft.institution} placeholder="University name"
              onChange={(v) => setEduDraft({ ...eduDraft, institution: v })} />
            <FieldInput label="Year" value={eduDraft.year} placeholder="2024 (or Expected 2026)"
              onChange={(v) => setEduDraft({ ...eduDraft, year: v })} />
          </div>
          {eduDuplicate ? (
            <p style={{ margin: "0 0 10px", fontSize: FS.small, color: "var(--muted)" }}>
              This looks like it&rsquo;s already in your Education. You can still add it.
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              style={{ ...primaryBtn, opacity: eduValid && !eduSaving ? 1 : 0.5,
                cursor: eduValid && !eduSaving ? "pointer" : "not-allowed" }}
              disabled={!eduValid || eduSaving}
              onClick={async () => {
                if (!eduValid || !onAddEducation) return;
                setEduSaving(true);
                try {
                  await onAddEducation(educationDraftToEntry(eduDraft));
                  onClose();
                } finally {
                  setEduSaving(false);
                }
              }}
            >
              {eduSaving ? "Adding…" : "Add to my résumé"}
            </button>
            <button type="button" style={ghostBtn} onClick={onIgnore}>Ignore</button>
          </div>
          {!onAddEducation ? (
            <p style={{ margin: "8px 0 0", fontSize: FS.small, color: "var(--muted)" }}>
              Add it in your Education section, written the way the posting does:{" "}
              <strong>&ldquo;{item.name}&rdquo;</strong>.
            </p>
          ) : null}
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
          {/* An empty result is OUR shortfall until something proves otherwise.
           *
           * This used to read "Nothing honest to write — your résumé doesn't
           * have work this can be written from." That is a verdict about the
           * candidate, and the thing that usually produced it was not the
           * candidate: production logs show the model writing usable rewrites
           * and our validators dropping every one (`all_filtered`), and a
           * single model pass coming back empty (`none_proposed`) is one
           * sample, not a finding. Telling a paying user their experience
           * cannot support a requirement because our filter over-fired is the
           * exact dishonesty the honesty pipeline exists to prevent — pointed
           * at the user instead of at the model.
           *
           * So the copy owns the failure, and the primary action is another
           * attempt. "We won't pad your résumé" keeps the one true claim the
           * old copy was reaching for: whatever happened, the answer is never
           * stuffing. */}
          <div style={label}>We couldn&rsquo;t write this one</div>
          <p style={{ margin: "2px 0 10px", fontSize: FS.small, lineHeight: 1.55, color: "var(--text)" }}>
            That&rsquo;s a miss on our side, not a verdict on your experience — we only suggest
            wording we can trace to your résumé, and this pass didn&rsquo;t produce one that
            qualifies. Try again, or if you&rsquo;ve done this work, add it in your own words.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {onTryFix ? (
              <button type="button" style={{ ...primaryBtn, background: "var(--accent)" }} onClick={onTryFix}>
                Try again
              </button>
            ) : null}
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
      ) : needsConfirm && draft ? (
        /* Step one: agree with a sentence, or correct it. The default path is
           one click and no typing, because the sentence is read out of the
           résumé rather than written for the user. */
        <div>
          <StepLabel n={1}>Check this is true</StepLabel>
          <blockquote
            style={{
              margin: "4px 0 0",
              padding: "9px 11px",
              borderLeft: "3px solid var(--green-ink, #16a34a)",
              background: "var(--green-bg, rgba(5,150,105,0.12))",
              borderRadius: "0 8px 8px 0",
              fontSize: FS.body,
              lineHeight: 1.55,
              color: "var(--text)",
            }}
          >
            {claimSentence(correction ?? draft)}
            <span style={{ display: "block", marginTop: 5, fontSize: FS.caption, color: "var(--muted)" }}>
              Read from your résumé. Nothing here was invented, and only what you
              confirm gets used.
            </span>
          </blockquote>

          {correction ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {([
                ["where", "Where did you do this?", false],
                ["what", "What did you do?", true],
                ["outcome", "What changed? (optional, a number lands harder)", false],
              ] as const).map(([key, lbl, required]) => (
                <label key={key} style={{ display: "block", fontSize: FS.caption, color: "var(--muted)" }}>
                  {lbl}
                  <textarea
                    value={correction[key]}
                    maxLength={FACT_FIELD_MAX}
                    rows={key === "where" ? 1 : 2}
                    required={required}
                    onChange={(e) => setCorrection({ ...correction, [key]: e.target.value })}
                    style={{
                      display: "block", width: "100%", marginTop: 3, font: "inherit",
                      fontSize: FS.small, lineHeight: 1.5, color: "var(--text)",
                      background: "var(--card)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: 7, resize: "vertical", boxSizing: "border-box",
                    }}
                  />
                </label>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={primaryBtn}
              onClick={() => {
                // Only spend a call when the user actually changed something.
                // Agreeing with a sentence read out of the résumé tells the
                // model nothing it did not already have.
                if (correction && onRewriteWithFacts && factDiffersFromDraft(draft, correction)) {
                  onRewriteWithFacts(correction);
                }
                setConfirmed(true);
                setCorrection(null);
              }}
            >
              {correction ? "Use this and rewrite" : "Yes, that's right"}
            </button>
            {correction ? (
              <button type="button" style={ghostBtn} onClick={() => setCorrection(null)}>
                Back
              </button>
            ) : (
              <button type="button" style={ghostBtn} onClick={() => setCorrection({ ...draft })}>
                Not quite, let me correct it
              </button>
            )}
            <button type="button" style={ghostBtn} onClick={onIgnore}>Skip for now</button>
          </div>
        </div>
      ) : current ? (
        <div>
          <StepLabel n={2}>Your bullet</StepLabel>
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
                  background: sel ? "var(--accent-bg, rgba(9,105,218,0.11))" : "var(--card)",
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
          {/* What this specific rewrite does to the number, before committing.
           *
           * Applying used to be a leap: the row went green, the scoreboard
           * moved later, and nothing connected the two — so a fix that changed
           * nothing looked identical to one that mattered. This is a recount
           * of exactly this text through the same endpoint the scoreboard
           * uses, which is why it can say "no change" and be believed.
           *
           * It renders nothing while loading and nothing on failure. A missing
           * line is honest; a stale or invented one is not, and this sits
           * directly above the button that writes to someone's résumé. */}
          {shownDelta ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
              <span style={{ fontSize: FS.small, fontWeight: FW.bold, color: "var(--text)" }}>
                {shownDelta.before}%{" "}
                <span aria-hidden style={{ color: "var(--muted)" }}>→</span>{" "}
                <span
                  style={{
                    color:
                      shownDelta.after > shownDelta.before
                        ? "var(--green-ink, #16a34a)"
                        : shownDelta.after < shownDelta.before
                          ? "var(--red-ink, #b42318)"
                          : "var(--muted)",
                  }}
                >
                  {shownDelta.after}%
                </span>
              </span>
              <span style={{ fontSize: FS.caption, color: "var(--muted)" }}>
                {shownDelta.after === shownDelta.before
                  // Saying so out loud beats an unexplained equal pair. A
                  // rewrite can be worth applying for a human reader and move
                  // the keyword match not at all, and pretending otherwise is
                  // how the scoreboard lost trust in the first place.
                  ? "keyword recount · no change to the match"
                  : "keyword recount · free, not an estimate"}
              </span>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              style={{ ...primaryBtn, opacity: applying ? 0.6 : 1 }}
              disabled={applying}
              onClick={() => onApply(current, null)}
            >
              {applying ? "Adding…" : "Add to résumé"}
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
