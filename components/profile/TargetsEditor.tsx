"use client";

/**
 * Edit target roles, locations and tone.
 *
 * These three steer real machinery: `roles` and `locations` decide what the
 * Jobs feed ranks, and `tone` is read by Tailor. Until this existed there was
 * no way to change any of them after onboarding — the only editor was
 * ProfileDashboard.tsx, which is imported nowhere, and the two live writers
 * (FirstRunWizard, JobSearchActivationWidget) each fire once. A user whose
 * search moved on had a feed pointed permanently at their first answer, and
 * the "Edit target roles" button on this page had no onClick at all.
 *
 * Writes through the caller's setter so ProfilePage's existing debounced
 * autosave persists it. No second write path.
 */

import React, { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { FS, FW } from "@/lib/typography";
import type { ProfileFormState } from "@/lib/profileStorage";

const ROLE_SUGGESTIONS = [
  "Software Engineer", "Data Analyst", "Product Manager", "Business Analyst",
  "Designer", "Marketing", "Sales", "Nurse",
];

const TONES: { value: string; label: string }[] = [
  { value: "confident", label: "Confident & concise" },
  { value: "formal", label: "Formal" },
  { value: "friendly", label: "Friendly" },
];

export function splitList(v: string): string[] {
  return (v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function joinList(items: string[]): string {
  return items.join(", ");
}

/** Add without duplicating, case-insensitively, preserving the typed casing. */
export function addUnique(items: string[], next: string): string[] {
  const v = next.trim();
  if (!v) return items;
  const seen = items.some((i) => i.toLowerCase() === v.toLowerCase());
  return seen ? items : [...items, v];
}

type Props = {
  value: ProfileFormState;
  onChange: (next: ProfileFormState) => void;
  onDone?: () => void;
};

export default function TargetsEditor({ value, onChange, onDone }: Props) {
  const roles = splitList(value.roles);
  const locations = splitList(value.locations);
  const [roleDraft, setRoleDraft] = useState("");
  const [locDraft, setLocDraft] = useState("");

  const setRoles = (next: string[]) => onChange({ ...value, roles: joinList(next) });
  const setLocations = (next: string[]) => onChange({ ...value, locations: joinList(next) });

  const unusedSuggestions = ROLE_SUGGESTIONS.filter(
    (s) => !roles.some((r) => r.toLowerCase() === s.toLowerCase()),
  ).slice(0, 4);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <style>{CSS}</style>

      <Field
        label="Target roles"
        help="Jobs ranks openings against these. With none set it ranks everything."
      >
        <ChipSet items={roles} onRemove={(i) => setRoles(roles.filter((_, n) => n !== i))} />
        <AddRow
          value={roleDraft}
          onValue={setRoleDraft}
          placeholder="e.g. Software Engineer"
          ariaLabel="Add a target role"
          addLabel="Add role"
          onAdd={() => { setRoles(addUnique(roles, roleDraft)); setRoleDraft(""); }}
        />
        {unusedSuggestions.length > 0 && (
          <div className="te-suggest">
            {unusedSuggestions.map((s) => (
              <button key={s} type="button" className="te-chip-add" onClick={() => setRoles(addUnique(roles, s))}>
                <Plus size={12} aria-hidden /> {s}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field
        label="Target locations"
        help="Leave empty to see every US metro."
      >
        <ChipSet items={locations} onRemove={(i) => setLocations(locations.filter((_, n) => n !== i))} />
        <AddRow
          value={locDraft}
          onValue={setLocDraft}
          placeholder="e.g. Baltimore, MD or Remote"
          ariaLabel="Add a target location"
          addLabel="Add location"
          onAdd={() => { setLocations(addUnique(locations, locDraft)); setLocDraft(""); }}
        />
      </Field>

      <Field label="Résumé tone" help="Used when Tailor rewrites your bullets.">
        <div className="te-suggest" role="radiogroup" aria-label="Résumé tone">
          {TONES.map((t) => {
            const on = value.tone === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                className={on ? "te-tone te-tone-on" : "te-tone"}
                onClick={() => onChange({ ...value, tone: t.value })}
              >
                {on && <Check size={12} aria-hidden />}
                {t.label}
              </button>
            );
          })}
        </div>
      </Field>

      {onDone && (
        <div>
          <button type="button" className="te-done" onClick={onDone}>Done</button>
          <span className="te-saved">Saved automatically</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>
        <div style={{ fontSize: FS.body, fontWeight: FW.semibold, color: "var(--text)" }}>{label}</div>
        <div style={{ fontSize: FS.small, color: "var(--muted)", marginTop: 2 }}>{help}</div>
      </div>
      {children}
    </div>
  );
}

function ChipSet({ items, onRemove }: { items: string[]; onRemove: (i: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="te-suggest">
      {items.map((it, i) => (
        <span key={`${it}-${i}`} className="te-chip">
          {it}
          <button type="button" aria-label={`Remove ${it}`} onClick={() => onRemove(i)}>
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}

function AddRow({
  value, onValue, onAdd, placeholder, ariaLabel, addLabel,
}: {
  value: string; onValue: (v: string) => void; onAdd: () => void;
  placeholder: string; ariaLabel: string; addLabel: string;
}) {
  return (
    <div className="te-add">
      <input
        className="te-input"
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => onValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
      />
      <button type="button" className="te-btn" aria-label={addLabel} onClick={onAdd} disabled={!value.trim()}>
        Add
      </button>
    </div>
  );
}

const CSS = `
  .te-suggest { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .te-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: ${FS.small}px; padding: 4px 6px 4px 10px; border-radius: 999px;
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
  }
  .te-chip button {
    display: inline-flex; align-items: center; border: 0; background: none;
    padding: 2px; margin: 0; cursor: pointer; color: var(--muted); border-radius: 999px;
  }
  .te-chip button:hover { color: var(--text); background: var(--border); }
  .te-chip button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  .te-chip-add {
    display: inline-flex; align-items: center; gap: 4px;
    font: inherit; font-size: ${FS.small}px; color: var(--muted); cursor: pointer;
    padding: 4px 10px; border-radius: 999px;
    border: 1px dashed var(--border); background: transparent;
  }
  .te-chip-add:hover { color: var(--accent); border-color: var(--accent); }
  .te-chip-add:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .te-add { display: flex; gap: 8px; }
  .te-input {
    flex: 1; min-width: 0; font: inherit; font-size: ${FS.bodyLg}px;
    padding: 8px 12px; border-radius: 8px; color: var(--text);
    border: 1px solid var(--border); background: var(--surface2);
  }
  .te-input:focus-visible { outline: 2px solid var(--accent); outline-offset: -1px; }
  .te-input::placeholder { color: var(--dim); }

  .te-btn {
    font: inherit; font-size: ${FS.small}px; font-weight: ${FW.semibold};
    padding: 8px 14px; border-radius: 8px; cursor: pointer;
    border: 1px solid var(--border); background: var(--surface2); color: var(--text);
  }
  .te-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .te-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .te-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .te-tone {
    display: inline-flex; align-items: center; gap: 5px;
    font: inherit; font-size: ${FS.small}px; cursor: pointer;
    padding: 5px 12px; border-radius: 999px;
    border: 1px solid var(--border); background: transparent; color: var(--muted);
  }
  .te-tone:hover { color: var(--text); }
  .te-tone-on { border-color: var(--accent); color: var(--accent); background: var(--accent-bg, transparent); }
  .te-tone:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .te-done {
    font: inherit; font-size: ${FS.small}px; font-weight: ${FW.semibold};
    padding: 7px 16px; border-radius: 8px; cursor: pointer;
    border: 0; background: var(--accent); color: #fff;
  }
  .te-done:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .te-saved { font-size: ${FS.caption}px; color: var(--dim); margin-left: 10px; }
`;
