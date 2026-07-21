"use client";

/**
 * Presentational "My Résumés" version home (Phase 1 of the résumé-versions plan).
 * Pure view — takes grouped versions + handlers as props, owns no data fetching.
 * The container (MyResumes.tsx) wires it to lib/resumeVersions.ts; the seeded
 * /versions-preview route renders it with demo data for visual review.
 */

import { useState, type CSSProperties } from "react";
import type { ResumeVersion, ResumeVersionGroup, VersionOrigin } from "@/lib/resumeVersions";
import type { LibraryItem } from "@/lib/supabase";

/* ── small pieces ───────────────────────────────────────────────── */

function scoreTone(score: number | null): { c: string; label: string } {
  if (score == null) return { c: "var(--dim)", label: "—" };
  if (score >= 80) return { c: "var(--green)", label: String(score) };
  if (score >= 65) return { c: "var(--amber)", label: String(score) };
  return { c: "var(--red)", label: String(score) };
}

function ScoreRing({ score, size = 44 }: { score: number | null; size?: number }) {
  const { c, label } = scoreTone(score);
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const inset = Math.round(size * 0.1);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        flex: "none",
        display: "grid",
        placeItems: "center",
        background: `conic-gradient(${c} ${pct}%, var(--surface-2, rgba(128,128,128,0.14)) 0)`,
      }}
      aria-label={score == null ? "Not scored" : `Score ${score}`}
    >
      <div
        style={{
          position: "absolute",
          inset,
          borderRadius: "50%",
          background: "var(--surface)",
        }}
      />
      <b
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: size * 0.3,
          fontWeight: 600,
          color: c,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {label}
      </b>
    </div>
  );
}

const ORIGIN_LABEL: Record<VersionOrigin, string> = {
  upload: "uploaded",
  duplicate: "duplicated",
  profile: "from Career Profile",
  tailor: "tailored",
  manual: "edited",
};

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── button styles ──────────────────────────────────────────────── */

const primaryBtn: CSSProperties = {
  fontSize: 13.5,
  fontWeight: 580,
  color: "#06131f",
  background: "var(--accent)",
  border: "none",
  borderRadius: 9,
  padding: "9px 15px",
  display: "inline-flex",
  gap: 7,
  alignItems: "center",
  cursor: "pointer",
};
const miniBtn: CSSProperties = {
  fontSize: 12.5,
  color: "var(--text)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  borderRadius: 7,
  padding: "6px 11px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const miniAccent: CSSProperties = {
  ...miniBtn,
  color: "var(--accent)",
  borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
};

/* ── the view ───────────────────────────────────────────────────── */

export interface VersionActionHandlers {
  onNewVersion: () => void;
  /** Open a version in the Editor tab (edit without re-scanning). */
  onOpen: (v: ResumeVersion) => void;
  onTailor: (v: ResumeVersion) => void;
  onDuplicate: (v: ResumeVersion) => void;
  onSetDefault: (v: ResumeVersion) => void;
  onDelete?: (v: ResumeVersion) => void;
  onRename?: (v: ResumeVersion) => void;
}

export function MyResumesView({
  groups,
  handlers,
  busyId,
  legacyItems,
  onOpenLegacy,
}: {
  groups: ResumeVersionGroup[];
  handlers: VersionActionHandlers;
  busyId?: string | null;
  /** Existing Library items (scans / uploads / tailored / drafts) shown below
   *  the versions list so /my-resumes is the one home for every résumé. */
  legacyItems?: LibraryItem[];
  onOpenLegacy?: (item: LibraryItem) => void;
}) {
  const totalVersions = groups.reduce((n, g) => n + g.versions.length, 0);
  const hasDefault = groups.some((g) => g.versions.some((v) => v.isDefault));

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 72px", width: "100%" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 680, letterSpacing: -0.3 }}>My Résumés</h1>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
            {groups.length} {groups.length === 1 ? "résumé" : "résumés"} · {totalVersions}{" "}
            {totalVersions === 1 ? "version" : "versions"}
            {hasDefault ? " · 1 default" : ""}
          </div>
        </div>
        <button style={primaryBtn} onClick={handlers.onNewVersion}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span> New version
        </button>
      </header>

      {groups.length === 0 && !(legacyItems && legacyItems.length) ? (
        <EmptyState onNewVersion={handlers.onNewVersion} />
      ) : groups.length > 0 ? (
        <div style={{ display: "grid", gap: 16 }}>
          {groups.map((g) => (
            <ResumeCard key={g.root} group={g} handlers={handlers} busyId={busyId} />
          ))}
        </div>
      ) : null}

      {legacyItems && legacyItems.length > 0 ? (
        <section style={{ marginTop: groups.length > 0 ? 34 : 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 650, letterSpacing: -0.2 }}>From your history</h2>
            <span style={{ fontSize: 12, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{legacyItems.length}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 14 }}>
            Scans, uploads, tailored résumés and drafts you already have. Open one to view or continue it.
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {legacyItems.map((item) => (
              <HistoryRow key={item.key} item={item} onOpen={() => onOpenLegacy?.(item)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const HISTORY_KIND: Record<LibraryItem["kind"], { label: string; tone: string; bg: string }> = {
  analyzed: { label: "Analyzed", tone: "var(--accent)", bg: "var(--accent-bg)" },
  tailored: { label: "Tailored", tone: "var(--green)", bg: "var(--green-bg)" },
  builder: { label: "Draft", tone: "var(--amber)", bg: "var(--amber-bg)" },
  cover_letter: { label: "Cover letter", tone: "var(--dim)", bg: "var(--surface-2)" },
};

function HistoryRow({ item, onOpen }: { item: LibraryItem; onOpen: () => void }) {
  const k = HISTORY_KIND[item.kind];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--surface)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: k.tone,
          background: k.bg,
          padding: "4px 8px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          flex: "none",
        }}
      >
        {k.label}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 560, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.subtitle}
          {item.createdAt ? ` · ${relTime(item.createdAt)}` : ""}
        </div>
      </div>
      {item.score != null ? (
        <span style={{ fontSize: 12.5, fontWeight: 600, color: scoreTone(item.score).c, fontVariantNumeric: "tabular-nums", flex: "none" }}>
          {item.score}
        </span>
      ) : null}
      <button style={miniBtn} onClick={onOpen}>Open</button>
    </div>
  );
}

function EmptyState({ onNewVersion }: { onNewVersion: () => void }) {
  return (
    <div
      style={{
        border: "1px dashed var(--border-h)",
        borderRadius: 14,
        padding: "48px 24px",
        textAlign: "center",
        background: "var(--surface)",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600 }}>No résumés yet</div>
      <div style={{ fontSize: 13, color: "var(--dim)", margin: "6px auto 18px", maxWidth: 380 }}>
        Create your first version — import a file, start from your Career Profile, or duplicate later.
        You can edit it and tailor it to a job without re-scanning.
      </div>
      <button style={primaryBtn} onClick={onNewVersion}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span> New version
      </button>
    </div>
  );
}

function ResumeCard({
  group,
  handlers,
  busyId,
}: {
  group: ResumeVersionGroup;
  handlers: VersionActionHandlers;
  busyId?: string | null;
}) {
  const head = group.versions[0];
  const rest = group.versions;
  return (
    <article
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 17px" }}>
        <ScoreRing score={head.lastScore} size={46} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 620, display: "flex", alignItems: "center", gap: 9 }}>
            {head.isDefault ? <span style={{ color: "var(--amber)" }} aria-label="Default">★</span> : null}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{head.name}</span>
            {head.isDefault ? (
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "var(--amber-ink)",
                  border: "1px solid color-mix(in srgb, var(--amber) 40%, transparent)",
                  background: "var(--amber-bg)",
                  borderRadius: 5,
                  padding: "2px 6px",
                }}
              >
                Default
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>
            {group.versions.length} {group.versions.length === 1 ? "version" : "versions"} · edited{" "}
            {relTime(head.updatedAt)} · {ORIGIN_LABEL[head.origin] ?? head.origin}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={miniAccent} onClick={() => handlers.onOpen(head)}>
            Edit
          </button>
          <button style={miniBtn} onClick={() => handlers.onTailor(head)}>
            Tailor to a job
          </button>
          <button style={miniBtn} onClick={() => handlers.onDuplicate(head)} disabled={busyId === head.id}>
            {busyId === head.id ? "…" : "Duplicate"}
          </button>
          {!head.isDefault ? (
            <button style={miniBtn} onClick={() => handlers.onSetDefault(head)} title="Make this the résumé the Jobs feed ranks against">
              Use as my résumé
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }}>
        {rest.map((v, i) => (
          <LineageRow key={v.id} v={v} first={i === 0} isBase={i === rest.length - 1} handlers={handlers} />
        ))}
      </div>
    </article>
  );
}

function LineageRow({
  v,
  isBase,
  handlers,
}: {
  v: ResumeVersion;
  first: boolean;
  isBase: boolean;
  handlers: VersionActionHandlers;
}) {
  const jd = [v.jdCompany, v.jdTitle].filter(Boolean).join(" · ");
  const { c } = scoreTone(v.lastScore);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "22px auto 1fr auto auto",
        alignItems: "center",
        gap: 12,
        padding: "11px 17px",
        borderTop: "1px dashed var(--border)",
      }}
    >
      <span style={{ display: "grid", placeItems: "center" }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: isBase ? "var(--dim)" : "var(--accent)",
            boxShadow: isBase ? "0 0 0 3px var(--surface)" : "0 0 0 3px var(--accent-bg)",
          }}
        />
      </span>
      <span
        style={{
          fontSize: 12,
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
          color: "var(--accent)",
          background: "var(--accent-bg)",
          borderRadius: 5,
          padding: "2px 8px",
        }}
      >
        v{v.version}
      </span>
      <span style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {jd ? (
          <>
            <span style={{ color: "var(--accent)", fontWeight: 560 }}>{jd}</span>
            <span style={{ color: "var(--dim)" }}> · {ORIGIN_LABEL[v.origin] ?? v.origin}</span>
          </>
        ) : (
          <>
            {isBase ? "Base résumé" : v.name}
            <span style={{ color: "var(--dim)" }}> · {ORIGIN_LABEL[v.origin] ?? v.origin}</span>
          </>
        )}
      </span>
      <button
        style={{ ...miniBtn, padding: "4px 9px", fontSize: 11.5 }}
        onClick={() => handlers.onOpen(v)}
        title="Edit this version"
      >
        Edit
      </button>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: c,
          fontVariantNumeric: "tabular-nums",
          minWidth: 22,
          textAlign: "right",
        }}
      >
        {v.lastScore ?? "—"}
      </span>
    </div>
  );
}

/* ── New-version modal ──────────────────────────────────────────── */

export type NewVersionChoice = "duplicate" | "import" | "profile";

const OPT_ICON: Record<NewVersionChoice, React.ReactNode> = {
  duplicate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  ),
  import: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
};

const OPTS: { key: NewVersionChoice; title: string; desc: string; badge?: string }[] = [
  {
    key: "duplicate",
    title: "Duplicate an existing version",
    desc: "Copy any version into a fresh v-next on the same résumé — tweak it for a new job without touching the original.",
    badge: "most common",
  },
  {
    key: "import",
    title: "Import from file",
    desc: "Upload a PDF or DOCX. We extract it into a brand-new base résumé you can edit.",
  },
  {
    key: "profile",
    title: "Start from Career Profile",
    desc: "Build a base from the profile you already saved — no file needed.",
  },
];

export function NewVersionModal({
  open,
  onClose,
  onChoose,
  canDuplicate,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (choice: NewVersionChoice) => void;
  canDuplicate: boolean;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create a new version"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(1,4,9,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 1200,
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          background: "var(--surface)",
          border: "1px solid var(--border-h)",
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 12px 34px rgba(1,4,9,0.5)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 18,
            right: 20,
            background: "none",
            border: "none",
            color: "var(--dim)",
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        <div style={{ padding: "20px 22px 6px" }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 660 }}>New version</h3>
          <p style={{ margin: "6px 0 0", color: "var(--dim)", fontSize: 13.5 }}>
            Start from anything — you land on an editable résumé right away. Scoring comes after, if you want it.
          </p>
        </div>
        <div style={{ padding: "16px 22px 22px", display: "grid", gap: 11 }}>
          {OPTS.map((o) => {
            const disabled = o.key === "duplicate" && !canDuplicate;
            return (
              <button
                key={o.key}
                disabled={disabled}
                onClick={() => onChoose(o.key)}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: 15,
                  border: "1px solid var(--border)",
                  borderRadius: 11,
                  background: "var(--bg)",
                  textAlign: "left",
                  width: "100%",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: "var(--accent-bg)",
                    color: "var(--accent)",
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                  }}
                >
                  {OPT_ICON[o.key]}
                </span>
                <span>
                  <span style={{ fontSize: 14.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {o.title}
                    {o.badge ? (
                      <span style={{ fontSize: 10, color: "var(--green-ink)", fontWeight: 600 }}>{o.badge}</span>
                    ) : null}
                  </span>
                  <span style={{ display: "block", fontSize: 13, color: "var(--dim)", marginTop: 2 }}>{o.desc}</span>
                  {disabled ? (
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>
                      Create a résumé first to duplicate from it.
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* thin wrapper for the modal's local open state when a parent wants it */
export function useNewVersionModal() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
}
