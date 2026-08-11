"use client";

/**
 * Career Profile, organised by how often each fact CHANGES.
 *
 * The incumbent page grouped by résumé anatomy — contact, summary, skills,
 * experience — which is the shape of a document, not the shape of the work.
 * Two thirds of it duplicated data a scan already extracted, and the two
 * fields that actually steer the product (target roles, locations) sat at the
 * same rank as six optional demographic questions.
 *
 * This groups by cadence instead: Set once · Each season · Every scan. The
 * promise a first-time user needs is not "you are 40% complete", it is "most
 * of this you will never touch again", and cadence is the only axis that can
 * make that promise structurally rather than in a sentence.
 *
 * Drop-in for ProfileDashboard: identical props, so ProfilePage owns all
 * persistence exactly as before.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check, Lock, Target, RefreshCw, ChevronDown, Plus, ArrowRight,
} from "lucide-react";
import { ExtractedProfileState } from "../../lib/resumeExtractorService";
import { type ProfileFormState, EMPTY_PROFILE } from "../../lib/profileStorage";

export type EditSection =
  | "header" | "contact" | "summary" | "skills" | "experience" | "education"
  | "projects" | "jobPrefs" | "tailoringDefaults" | "eeo" | null;

type Props = {
  extractedData: ExtractedProfileState;
  tailorDefaults?: ProfileFormState;
  status?: string;
  onUpdateData?: (next: ExtractedProfileState) => void;
  onUpdateTailorDefaults?: (next: ProfileFormState) => void;
  editSection?: EditSection;
  onOpenEdit?: (s: EditSection) => void;
  onCloseEdit?: () => void;
};

/* ── cadence model ───────────────────────────────────────────────
   Each band owns its own completeness because each answers a different
   question: "have I finished with this forever", "is this still what I
   want", "is this current". One page-level percentage would flatten three
   unrelated questions into a number that answers none of them.          */

const EEO_KEYS = [
  "eeoWorkUs", "eeoSponsor", "eeoDisability", "eeoVeteran", "eeoGender", "eeoLgbtq",
] as const;

/** The four optional questions, as distinct from work-auth and sponsorship. */
const DEMOGRAPHIC_KEYS = ["eeoDisability", "eeoVeteran", "eeoGender", "eeoLgbtq"] as const;

function splitList(v: string): string[] {
  return (v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export default function CadenceProfile({
  extractedData,
  tailorDefaults = EMPTY_PROFILE,
  onOpenEdit,
}: Props) {
  const roles = useMemo(() => splitList(tailorDefaults.roles), [tailorDefaults.roles]);
  const locations = useMemo(() => splitList(tailorDefaults.locations), [tailorDefaults.locations]);

  const answered = (k: (typeof EEO_KEYS)[number]) => Boolean(String(tailorDefaults[k] ?? "").trim());
  const eeoAnswered = EEO_KEYS.filter(answered).length;
  // Counted directly rather than as `eeoAnswered - 2`: that arithmetic is
  // only correct when work-auth and sponsorship happen to be answered too,
  // and reports "1 of 4" for someone who answered three demographics alone.
  const demographicsAnswered = DEMOGRAPHIC_KEYS.filter(answered).length;
  const setOnceDone = eeoAnswered === EEO_KEYS.length;

  const recordCount =
    (extractedData?.experience?.length ?? 0) +
    (extractedData?.education?.length ?? 0) +
    (extractedData?.projects?.length ?? 0);

  // The "sealed" band collapses once finished — the page's one authored
  // moment, and the visual form of the promise "we won't ask again".
  //
  // Tracks the REOPEN, not the open state. Seeding `useState(!setOnceDone)`
  // froze the answer at mount, and the profile loads asynchronously: the
  // first render always sees EMPTY_PROFILE, so the band never sealed once
  // the real data arrived. Deriving it means the seal follows the data.
  const [reopened, setReopened] = useState(false);
  const sealed = setOnceDone && !reopened;

  const nextAction = !roles.length
    ? { label: "Add a target role", why: "Jobs is ranking every role in the corpus until you do.", go: "jobPrefs" as EditSection }
    : !setOnceDone
      ? { label: "Answer the application questions", why: `${EEO_KEYS.length - eeoAnswered} left, then never again.`, go: "eeo" as EditSection }
      : !locations.length
        ? { label: "Add target locations", why: "Right now the feed spans every US metro.", go: "jobPrefs" as EditSection }
        : null;

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      <header style={S.head}>
        <h1 style={S.h1}>Your profile</h1>
        <p style={S.lede}>
          What your résumé can&rsquo;t say: where you&rsquo;re aiming, and the answers every
          application asks for. Your work history comes from your last scan.
        </p>

        {nextAction ? (
          <button type="button" className="rn-next" onClick={() => onOpenEdit?.(nextAction.go)}>
            <span style={S.nextLabel}>{nextAction.label}</span>
            <span style={S.nextWhy}>{nextAction.why}</span>
            <ArrowRight size={16} aria-hidden style={{ flex: "none" }} />
          </button>
        ) : (
          <p style={S.allSet}>
            <Check size={15} aria-hidden style={{ color: "var(--good, #17803d)" }} />
            Everything that steers your results is set.
          </p>
        )}
      </header>

      {/* ── SET ONCE ───────────────────────────────────────────── */}
      <section style={S.band} aria-labelledby="band-once">
        <div style={S.bandHead}>
          <div style={S.bandTitle}>
            <Lock size={15} aria-hidden style={S.bandIcon} />
            <h2 id="band-once" style={S.h2}>Set once</h2>
          </div>
          <p style={S.promise}>Answer these once. We fill them in on every application after that.</p>
          <span style={setOnceDone ? S.stateDone : S.stateOpen}>
            {setOnceDone ? "Done" : `${eeoAnswered} of ${EEO_KEYS.length}`}
          </span>
        </div>

        {sealed ? (
          <button type="button" className="rn-sealed" onClick={() => setReopened(true)}>
            <Check size={15} aria-hidden style={{ color: "var(--good, #17803d)", flex: "none" }} />
            <span>Answered. We won&rsquo;t ask again.</span>
            <ChevronDown size={15} aria-hidden style={{ marginLeft: "auto", opacity: 0.6 }} />
          </button>
        ) : (
          <div className="rn-rows">
            <Row k="US work authorization" v={tailorDefaults.eeoWorkUs} onEdit={() => onOpenEdit?.("eeo")} />
            <Row k="Needs sponsorship" v={tailorDefaults.eeoSponsor} onEdit={() => onOpenEdit?.("eeo")} />
            <Row
              k="Demographics"
              v={
                demographicsAnswered
                  ? `${demographicsAnswered} of 4 answered · always optional`
                  : ""
              }
              placeholder="Optional on every application"
              onEdit={() => onOpenEdit?.("eeo")}
            />
          </div>
        )}
      </section>

      {/* ── EACH SEASON ────────────────────────────────────────── */}
      <section style={S.band} aria-labelledby="band-season">
        <div style={S.bandHead}>
          <div style={S.bandTitle}>
            <Target size={15} aria-hidden style={S.bandIcon} />
            <h2 id="band-season" style={S.h2}>Each season</h2>
          </div>
          <p style={S.promise}>Change these when your search changes. They decide what Jobs shows you.</p>
        </div>

        <div className="rn-rows">
          <ChipRow
            k="Target roles"
            items={roles}
            empty="No target yet · Jobs is ranking every role"
            onAdd={() => onOpenEdit?.("jobPrefs")}
          />
          <ChipRow
            k="Locations"
            items={locations}
            empty="Not set · the feed spans every US metro"
            onAdd={() => onOpenEdit?.("jobPrefs")}
          />
          <Row
            k="Résumé tone"
            v={tailorDefaults.tone}
            placeholder="Confident & concise"
            onEdit={() => onOpenEdit?.("tailoringDefaults")}
          />
        </div>
      </section>

      {/* ── EVERY SCAN ─────────────────────────────────────────── */}
      <section style={S.band} aria-labelledby="band-scan">
        <div style={S.bandHead}>
          <div style={S.bandTitle}>
            <RefreshCw size={15} aria-hidden style={S.bandIcon} />
            <h2 id="band-scan" style={S.h2}>Every scan</h2>
          </div>
          <p style={S.promise}>Your work history, read from your last upload. You never type this.</p>
        </div>

        {recordCount > 0 ? (
          <div className="rn-rows">
            {(extractedData.experience ?? []).slice(0, 3).map((e, i) => (
              <div key={`x${i}`} style={S.entry}>
                <span style={S.entryTitle}>{e.role || "Role"}{e.company ? ` · ${e.company}` : ""}</span>
                <span style={S.entryMeta}>{e.dates || ""}</span>
              </div>
            ))}
            {(extractedData.education ?? []).slice(0, 2).map((e, i) => (
              <div key={`e${i}`} style={S.entry}>
                <span style={S.entryTitle}>{e.degree || "Education"}{e.institution ? ` · ${e.institution}` : ""}</span>
                <span style={S.entryMeta}>{e.dates || ""}</span>
              </div>
            ))}
            <div style={S.entry}>
              <span style={S.entryTitle}>Skills</span>
              <span style={S.entryMeta}>
                {(extractedData.skills ?? []).length} listed
              </span>
            </div>
          </div>
        ) : (
          <div style={S.emptyScan}>
            <p style={S.emptyText}>
              Nothing here yet. A résumé scan fills this in, and it&rsquo;s faster and more accurate
              than typing it.
            </p>
            <Link href="/?view=analyze" className="rn-cta">Scan a résumé</Link>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────── */

function Row({
  k, v, placeholder, onEdit,
}: { k: string; v?: string; placeholder?: string; onEdit: () => void }) {
  const filled = Boolean((v ?? "").trim());
  return (
    <div style={S.row}>
      <span style={S.rowK}>{k}</span>
      <span style={filled ? S.rowV : S.rowEmpty}>
        {filled ? v : placeholder ?? "Not set"}
      </span>
      <button type="button" className="rn-edit" onClick={onEdit}>
        {filled ? "Edit" : "Add"}
      </button>
    </div>
  );
}

function ChipRow({
  k, items, empty, onAdd,
}: { k: string; items: string[]; empty: string; onAdd: () => void }) {
  return (
    <div style={S.row}>
      <span style={S.rowK}>{k}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {items.length ? (
          <span style={S.chips}>
            {items.map((it) => (
              <span key={it} style={S.chip}>{it}</span>
            ))}
            <button type="button" className="rn-chip-add" onClick={onAdd}>
              <Plus size={12} aria-hidden /> add
            </button>
          </span>
        ) : (
          <span style={S.rowEmpty}>{empty}</span>
        )}
      </span>
      {!items.length && (
        <button type="button" className="rn-edit" onClick={onAdd}>Add</button>
      )}
    </div>
  );
}

/* ── style ───────────────────────────────────────────────────────
   Inline objects match the convention of the surrounding profile
   components; interactive states live in the stylesheet below because
   inline styles cannot express :hover or :focus-visible.              */

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, margin: "0 auto", padding: "36px 20px 96px", width: "100%" },
  head: { marginBottom: 34 },
  h1: { fontSize: 24, fontWeight: 780, letterSpacing: -0.7, margin: "0 0 10px", color: "var(--text)" },
  lede: { fontSize: 14, lineHeight: 1.62, color: "var(--muted)", margin: "0 0 20px", maxWidth: "62ch" },
  nextLabel: { fontWeight: 650, fontSize: 14, color: "var(--text)" },
  nextWhy: { fontSize: 12, color: "var(--muted)", flex: 1 },
  allSet: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)", margin: 0 },

  band: {
    border: "1px solid var(--border)", borderRadius: 12,
    background: "var(--surface, var(--bg))", marginBottom: 18, overflow: "hidden",
  },
  bandHead: { padding: "16px 18px 14px", display: "grid", gap: 4, position: "relative" },
  bandTitle: { display: "flex", alignItems: "center", gap: 8 },
  bandIcon: { color: "var(--dim)", flex: "none" },
  h2: { fontSize: 16, fontWeight: 700, letterSpacing: -0.2, margin: 0, color: "var(--text)" },
  promise: { fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: "58ch", lineHeight: 1.55 },
  stateDone: {
    position: "absolute", top: 16, right: 18, fontSize: 11, fontWeight: 650,
    color: "var(--good, #17803d)",
  },
  stateOpen: {
    position: "absolute", top: 16, right: 18, fontSize: 11, fontWeight: 650,
    color: "var(--muted)", fontVariantNumeric: "tabular-nums",
  },

  row: {
    display: "flex", gap: 14, alignItems: "baseline",
    padding: "11px 18px", borderTop: "1px solid var(--border)",
  },
  rowK: { fontSize: 12, color: "var(--dim)", width: 150, flex: "none" },
  rowV: { fontSize: 14, color: "var(--text)", flex: 1, minWidth: 0 },
  rowEmpty: { fontSize: 13, color: "var(--muted)", flex: 1, minWidth: 0, fontStyle: "italic" },

  chips: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
  chip: {
    fontSize: 12, padding: "3px 10px", borderRadius: 999,
    background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)",
  },

  entry: {
    display: "flex", gap: 14, alignItems: "baseline", justifyContent: "space-between",
    padding: "11px 18px", borderTop: "1px solid var(--border)",
  },
  entryTitle: { fontSize: 14, color: "var(--text)", fontWeight: 550, minWidth: 0 },
  entryMeta: { fontSize: 12, color: "var(--dim)", flex: "none", fontVariantNumeric: "tabular-nums" },

  emptyScan: {
    padding: "18px", borderTop: "1px solid var(--border)",
    display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
  },
  emptyText: { fontSize: 13, color: "var(--muted)", margin: 0, flex: 1, minWidth: "24ch", lineHeight: 1.55 },
};

const CSS = `
  /* Browser surfaces the design still owns. */
  .rn-rows ::selection { background: color-mix(in srgb, var(--accent) 26%, transparent); }

  .rn-next {
    display: flex; align-items: center; gap: 12px; width: 100%;
    text-align: left; font: inherit; cursor: pointer;
    padding: 12px 14px; border-radius: 10px;
    border: 1px solid var(--border); background: var(--surface2);
    transition: border-color .18s cubic-bezier(.2,.7,.3,1), transform .18s cubic-bezier(.2,.7,.3,1);
  }
  .rn-next:hover { border-color: var(--accent); transform: translateY(-1px); }
  .rn-next:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* The one authored moment: the sealed band settling shut. */
  .rn-sealed {
    display: flex; align-items: center; gap: 9px; width: 100%;
    font: inherit; font-size: 13px; color: var(--muted); cursor: pointer;
    padding: 12px 18px; border: 0; border-top: 1px solid var(--border);
    background: transparent; text-align: left;
    animation: rnSeal .42s cubic-bezier(.16,1,.3,1);
  }
  .rn-sealed:hover { color: var(--text); }
  .rn-sealed:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  @keyframes rnSeal {
    from { opacity: 0; clip-path: inset(0 0 100% 0); }
    to   { opacity: 1; clip-path: inset(0 0 0 0); }
  }

  .rn-edit {
    font: inherit; font-size: 12px; font-weight: 620; color: var(--accent);
    background: none; border: 0; padding: 0; cursor: pointer; flex: none;
  }
  .rn-edit:hover { text-decoration: underline; text-underline-offset: 3px; }
  .rn-edit:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }

  .rn-chip-add {
    display: inline-flex; align-items: center; gap: 4px;
    font: inherit; font-size: 12px; color: var(--muted); cursor: pointer;
    padding: 3px 10px; border-radius: 999px;
    border: 1px dashed var(--border); background: transparent;
  }
  .rn-chip-add:hover { color: var(--accent); border-color: var(--accent); }
  .rn-chip-add:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .rn-cta {
    font-size: 13px; font-weight: 640; color: #fff; background: var(--accent);
    padding: 8px 14px; border-radius: 8px; text-decoration: none; flex: none;
  }
  .rn-cta:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .rn-next, .rn-sealed { transition: none; animation: none; }
  }
`;
