"use client";

/**
 * The standard answers every job application asks for: work authorization,
 * visa sponsorship, and the voluntary self-identification questions.
 *
 * Before this existed there was nowhere in the app to set them. The only editor
 * was an "Application Details" card in ProfileDashboard.tsx, which is imported
 * nowhere, and the live Career profile ledger only renders once a résumé has
 * been uploaded. So this card sits outside that ledger and is always on screen.
 *
 * Writes through the caller's setter, so ProfilePage's existing debounced
 * autosave persists it to `user_profiles`. No second write path.
 *
 * An unanswered question is a real state, not a missing field: whatever reads
 * these answers leaves a blank one for the person rather than guessing, so the
 * copy says so and every answer can be cleared again.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { HubCard, SectionHeader } from "./profileMui";
import { FS, FW } from "@/lib/typography";
import type { ProfileFormState } from "@/lib/profileStorage";
import {
  APPLICATION_ANSWER_QUESTIONS,
  answeredCount,
  type ApplicationAnswerQuestion,
} from "@/lib/applicationAnswers";

export type AnswersSaveState = "loading" | "saving" | "unsaved" | "saved";

const SAVE_COPY: Record<AnswersSaveState, string> = {
  loading: "Loading your answers…",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  saved: "Saved automatically",
};

type Props = {
  value: ProfileFormState;
  onChange: (next: ProfileFormState) => void;
  saveState: AnswersSaveState;
};

export default function ApplicationAnswers({ value, onChange, saveState }: Props) {
  // Editing before the saved profile has loaded would be overwritten by it.
  const disabled = saveState === "loading";
  const eligibility = APPLICATION_ANSWER_QUESTIONS.filter((q) => q.group === "eligibility");
  const voluntary = APPLICATION_ANSWER_QUESTIONS.filter((q) => q.group === "voluntary");
  const answered = answeredCount(value);

  const set = (q: ApplicationAnswerQuestion, next: string) => onChange({ ...value, [q.key]: next });

  return (
    <HubCard interactive={false}>
      <style>{CSS}</style>
      <SectionHeader
        icon={<ShieldCheck size={18} />}
        title="Application answers"
        subtitle="Reused on every job application. Anything you leave blank stays blank."
      />
      <Box sx={{ px: { xs: 2.25, sm: 3 }, py: 3, display: "grid", gap: 3.5 }}>
        <Group title="Application autofill details" help="Used to pre-fill matching fields on supported application forms. Review every answer before submitting.">
          <div className="aa-profile-fields">
            <TextField
              label="Preferred first name"
              value={value.preferredName}
              onChange={(event) => onChange({ ...value, preferredName: event.target.value })}
              autoComplete="given-name"
              disabled={disabled}
              fullWidth
              size="small"
            />
            <TextField
              label="Country"
              value={value.country}
              onChange={(event) => onChange({ ...value, country: event.target.value })}
              autoComplete="country-name"
              placeholder="e.g. United States"
              disabled={disabled}
              fullWidth
              size="small"
            />
          </div>
        </Group>

        <Group title="Work eligibility">
          {eligibility.map((q) => (
            <Question key={q.key} q={q} value={value[q.key]} disabled={disabled} onSet={(v) => set(q, v)} />
          ))}
        </Group>

        <Group
          title="Voluntary self-identification"
          help="Optional. Employers ask these for equal opportunity reporting, and “Decline to state” is always a valid answer."
        >
          {voluntary.map((q) => (
            <Question key={q.key} q={q} value={value[q.key]} disabled={disabled} onSet={(v) => set(q, v)} />
          ))}
        </Group>

        <div className="aa-foot">
          <span className="aa-count">
            {answered} of {APPLICATION_ANSWER_QUESTIONS.length} answered
          </span>
          <span className="aa-saved" role="status" aria-live="polite">
            {SAVE_COPY[saveState]}
          </span>
        </div>
      </Box>
    </HubCard>
  );
}

function Group({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div>
        <h3 className="aa-group-title">{title}</h3>
        {help ? <p className="aa-help">{help}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Question({
  q,
  value,
  disabled,
  onSet,
}: {
  q: ApplicationAnswerQuestion;
  value: string;
  disabled: boolean;
  onSet: (v: string) => void;
}) {
  const labelId = `aa-label-${q.key}`;
  const known = q.options.includes(value);
  // A value saved before these options existed would show nothing selected,
  // which reads as "unanswered" while the old text is still being used.
  const stray = value && !known ? value : "";
  return (
    <div className="aa-q" role="radiogroup" aria-labelledby={labelId}>
      <div id={labelId} className="aa-q-label">{q.label}</div>
      <div className="aa-row">
        {q.options.map((opt) => (
          <label key={opt} className="aa-opt">
            <input
              type="radio"
              className="aa-radio"
              name={`aa-${q.key}`}
              value={opt}
              checked={value === opt}
              disabled={disabled}
              onChange={() => onSet(opt)}
            />
            <span className="aa-chip">{opt}</span>
          </label>
        ))}
        {value ? (
          <button
            type="button"
            className="aa-clear"
            disabled={disabled}
            aria-label={`Clear your answer to: ${q.label}`}
            onClick={() => onSet("")}
          >
            Clear
          </button>
        ) : null}
      </div>
      {stray ? <div className="aa-stray">Saved as “{stray}”. Pick an option to replace it.</div> : null}
    </div>
  );
}

const CSS = `
  .aa-group-title { margin: 0; font-size: ${FS.bodyLg}px; font-weight: ${FW.bold}; color: var(--text); }
  .aa-profile-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .aa-help { margin: 4px 0 0; font-size: ${FS.small}px; color: var(--muted); max-width: 62ch; line-height: 1.5; }
  .aa-q { display: grid; gap: 8px; }
  .aa-q-label { font-size: ${FS.body}px; font-weight: ${FW.semibold}; color: var(--text); }
  .aa-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .aa-opt { position: relative; display: inline-flex; cursor: pointer; }
  .aa-radio {
    position: absolute; inset: 0; width: 100%; height: 100%; margin: 0;
    opacity: 0; cursor: pointer;
  }
  .aa-chip {
    display: inline-flex; align-items: center; min-height: 36px;
    font-size: ${FS.small}px; padding: 6px 14px; border-radius: 999px;
    border: 1px solid var(--border); background: transparent; color: var(--muted);
  }
  .aa-opt:hover .aa-chip { color: var(--text); border-color: var(--muted); }
  .aa-radio:checked + .aa-chip {
    border-color: var(--accent); color: var(--accent-ink); background: var(--accent-bg);
    font-weight: ${FW.semibold};
  }
  .aa-radio:focus-visible + .aa-chip { outline: 2px solid var(--accent); outline-offset: 2px; }
  .aa-radio:disabled + .aa-chip { opacity: 0.55; }
  .aa-opt:has(.aa-radio:disabled) { cursor: not-allowed; }
  .aa-clear {
    font: inherit; font-size: ${FS.small}px; color: var(--muted); cursor: pointer;
    padding: 6px 8px; border: 0; background: none; border-radius: 6px;
    text-decoration: underline; text-underline-offset: 3px;
  }
  .aa-clear:hover:not(:disabled) { color: var(--text); }
  .aa-clear:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .aa-stray { font-size: ${FS.small}px; color: var(--amber-ink, var(--muted)); }
  .aa-foot {
    display: flex; flex-wrap: wrap; gap: 8px 16px; justify-content: space-between;
    padding-top: 14px; border-top: 1px dotted var(--border);
    font-size: ${FS.small}px; color: var(--muted);
  }
  .aa-saved { color: var(--muted); }
  @media (prefers-reduced-motion: no-preference) {
    .aa-chip { transition: border-color var(--md-duration-short, 150ms) var(--md-easing-standard, ease), background-color var(--md-duration-short, 150ms) var(--md-easing-standard, ease), color var(--md-duration-short, 150ms) var(--md-easing-standard, ease); }
  }
  @media (max-width: 600px) { .aa-profile-fields { grid-template-columns: 1fr; } }
`;
