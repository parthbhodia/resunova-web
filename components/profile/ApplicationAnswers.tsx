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
import type { ExtractedProfileState } from "@/lib/resumeExtractorService";
import {
  APPLICATION_ANSWER_QUESTIONS,
  answeredCount,
  isTypableYearsExperience,
  yearsExperienceProblem,
  type ApplicationAnswerQuestion,
} from "@/lib/applicationAnswers";

export type AnswersSaveState = "loading" | "saving" | "unsaved" | "saved";

const SAVE_COPY: Record<AnswersSaveState, string> = {
  loading: "Loading your answers…",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  saved: "Saved automatically",
};

/** Where each typed contact field is saved, what it is called, and which résumé value it overrides. */
const CONTACT_FIELDS: {
  key: "typedName" | "typedEmail" | "typedPhone" | "typedLinkedin" | "typedGithub" | "typedPortfolio";
  label: string;
  resumeKey: "name" | "email" | "phone" | "linkedin" | "github" | "portfolio";
}[] = [
  { key: "typedName", label: "Full name", resumeKey: "name" },
  { key: "typedEmail", label: "Email", resumeKey: "email" },
  { key: "typedPhone", label: "Phone", resumeKey: "phone" },
  { key: "typedLinkedin", label: "LinkedIn", resumeKey: "linkedin" },
  { key: "typedGithub", label: "GitHub", resumeKey: "github" },
  { key: "typedPortfolio", label: "Portfolio or website", resumeKey: "portfolio" },
];

type Props = {
  value: ProfileFormState;
  onChange: (next: ProfileFormState) => void;
  saveState: AnswersSaveState;
  /** What the uploaded résumé says, shown as the placeholder of each contact box. */
  resume?: Partial<Pick<ExtractedProfileState, "name" | "email" | "phone" | "linkedin" | "github" | "portfolio">>;
  /** The sign-in address, the placeholder for Email when the résumé has none. */
  accountEmail?: string;
};

export default function ApplicationAnswers({ value, onChange, saveState, resume, accountEmail }: Props) {
  // Editing before the saved profile has loaded would be overwritten by it.
  const disabled = saveState === "loading";
  const eligibility = APPLICATION_ANSWER_QUESTIONS.filter((q) => q.group === "eligibility");
  const voluntary = APPLICATION_ANSWER_QUESTIONS.filter((q) => q.group === "voluntary");
  const communication = APPLICATION_ANSWER_QUESTIONS.filter((q) => q.group === "communication");
  const answered = answeredCount(value);
  const dobProblem = birthDateProblem(value.dateOfBirth);
  const yearsProblem = yearsExperienceProblem(value.yearsExperience);

  const set = (q: ApplicationAnswerQuestion, next: string) => onChange({ ...value, [q.key]: next });

  return (
    <HubCard interactive={false}>
      <style>{CSS}</style>
      <SectionHeader
        icon={<ShieldCheck size={18} />}
        title="Application answers"
        subtitle="Reused on every job application. Anything you leave blank stays blank."
      />
      <Box className="aa-card" sx={{ px: { xs: 2.25, sm: 3 }, py: 3, display: "grid", gap: 3.5 }}>
        <Group
          title="Contact details"
          help="What you type here is used on applications instead of what your résumé says. Leave a box blank to use the résumé’s."
        >
          <div className="aa-profile-fields">
            {CONTACT_FIELDS.map((f) => {
              const fromResume = (resume?.[f.resumeKey] ?? "").trim() || (f.key === "typedEmail" ? accountEmail ?? "" : "");
              return (
                <TextField
                  key={f.key}
                  label={f.label}
                  value={value[f.key]}
                  onChange={(event) => onChange({ ...value, [f.key]: event.target.value })}
                  // Off, so a browser's saved profile cannot fill these and have the page autosave it.
                  autoComplete="off"
                  placeholder={fromResume || "From your résumé"}
                  disabled={disabled}
                  fullWidth
                  size="small"
                />
              );
            })}
          </div>
        </Group>

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
            <TextField
              label="City and state"
              value={value.currentLocation}
              onChange={(event) => onChange({ ...value, currentLocation: event.target.value })}
              autoComplete="off"
              placeholder="e.g. Baltimore, MD"
              helperText="Written as City, State. Used for “where do you live” questions."
              disabled={disabled}
              fullWidth
              size="small"
            />
            <TextField
              label="Years of professional experience"
              value={value.yearsExperience ?? ""}
              onChange={(event) => {
                // Letters, a second dot and anything over 60 never get in; a clear always does.
                if (isTypableYearsExperience(event.target.value)) onChange({ ...value, yearsExperience: event.target.value });
              }}
              autoComplete="off"
              placeholder="e.g. 6 or 5.5"
              error={yearsProblem !== ""}
              helperText={yearsProblem || "Used when an application asks how many years you have worked. Leave it blank to skip."}
              disabled={disabled}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
          </div>
        </Group>

        <Group
          title="Date of birth"
          help="Only filled when an application asks for it. It is never read from your résumé and never shown to the AI that drafts answers. Leave it blank and it stays blank."
        >
          <div className="aa-profile-fields">
            <TextField
              label="Date of birth"
              type="date"
              value={value.dateOfBirth ?? ""}
              onChange={(event) => onChange({ ...value, dateOfBirth: event.target.value })}
              // Off, so a browser's saved birthday cannot be written and autosaved unseen.
              autoComplete="off"
              error={dobProblem !== ""}
              helperText={dobProblem || undefined}
              disabled={disabled}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: DOB_MIN } }}
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
          {voluntary.map((q) =>
            q.control === "select" ? (
              <SelectQuestion key={q.key} q={q} value={value[q.key]} disabled={disabled} onSet={(v) => set(q, v)} />
            ) : (
              <Question key={q.key} q={q} value={value[q.key]} disabled={disabled} onSet={(v) => set(q, v)} />
            ),
          )}
        </Group>

        <Group
          title="Messages from employers"
          help="Used only when an application asks. This is a consent you give, so it is never chosen for you, and a blank one stays blank."
        >
          {communication.map((q) => (
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

/** The earliest date the extension will use; the API drops anything before it. */
const DOB_MIN = "1900-01-01";

/**
 * Why a typed date will not be used, or "" when it is fine. The API refuses a date
 * that is not a real past one, so this says so rather than letting it save quietly
 * and then do nothing. It is computed at render, not stored: "today" moves.
 */
export function birthDateProblem(raw: string | null | undefined, now: Date = new Date()): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < DOB_MIN || v > today) return "That date will not be used. Enter a real date in the past.";
  return "";
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

/**
 * A question with too many long options to be chips (race and ethnicity): a native
 * dropdown, with a blank first option as the way back to "unanswered". Native on
 * purpose, so the person's own browser handles a long list and a phone shows its
 * usual picker.
 */
function SelectQuestion({
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
  const stray = value && !known ? value : "";
  return (
    <div className="aa-q">
      <div id={labelId} className="aa-q-label">{q.label}</div>
      <TextField
        select
        value={known ? value : ""}
        onChange={(event) => onSet(event.target.value)}
        autoComplete="off"
        disabled={disabled}
        fullWidth
        size="small"
        slotProps={{
          select: { native: true },
          htmlInput: { "aria-labelledby": labelId, name: `aa-${q.key}` },
        }}
      >
        <option value="">Leave blank</option>
        {q.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </TextField>
      {stray ? <div className="aa-stray">Saved as “{stray}”. Pick an option to replace it.</div> : null}
    </div>
  );
}

const CSS = `
  /* MUI declares its inputs content-box inside @layer mui, and this app's global reset
     (* { box-sizing: border-box }) is unlayered, so it wins over any layered rule. Without this,
     every field is squashed to one line of text and a dropdown's value is clipped to nothing. */
  .aa-card .MuiInputBase-input { box-sizing: content-box; }
  /* MUI's small helper text is 10.5px, under the legibility floor. */
  .aa-card .MuiFormHelperText-root { font-size: ${FS.small}px; margin-left: 0; }
  .aa-group-title { margin: 0; font-size: ${FS.bodyLg}px; font-weight: ${FW.bold}; color: var(--text); }
  .aa-profile-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .aa-help { margin: 4px 0 0; font-size: ${FS.small}px; color: var(--muted); max-width: 62ch; line-height: 1.5; text-wrap: pretty; }
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
