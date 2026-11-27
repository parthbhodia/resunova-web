"use client";

/**
 * Announcements, for the admin dashboard: write one, see exactly what people
 * will see, publish it, end it.
 *
 * What it does to the app: a published announcement is stored in Supabase
 * (through resunova-api, admin-only) and every signed-in person sees it in the
 * notification bell and as a one-time card the next time they open the app. One
 * at a time: if several are live, the next appears after the first is dismissed.
 * Nothing is emailed.
 *
 * The preview is the real toast card, so what is shown here is what ships.
 */

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { AdminChartCard } from "@/components/admin/charts";
import { FeedbackToastCard } from "@/components/FeedbackToastCard";
import { Button } from "@/components/ui/button";
import { ANNOUNCEMENT_LIMITS } from "@/lib/announcements";
import {
  EMPTY_DRAFT,
  LINK_PRESETS,
  draftErrors,
  endAnnouncement,
  listAnnouncements,
  publishAnnouncement,
  type AdminAnnouncement,
  type AnnouncementStatus,
  type Draft,
  type FieldErrors,
} from "@/lib/adminAnnouncements";

// Survives the RouterView unmount that drops every ?view= page, so coming back
// shows the last list at once while a refresh runs.
let _cache: AdminAnnouncement[] | null = null;

const inputStyle: CSSProperties = {
  width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px",
  fontSize: 14, fontFamily: "inherit", background: "var(--surface)", color: "var(--text)",
};
const labelStyle: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 };
const hintStyle: CSSProperties = { fontSize: 12, color: "var(--muted)", margin: "4px 0 0" };
const errorStyle: CSSProperties = { fontSize: 12, color: "var(--red-ink)", margin: "4px 0 0" };

const BADGE: Record<AnnouncementStatus, { label: string; bg: string; fg: string }> = {
  live: { label: "Live", bg: "var(--green-bg)", fg: "var(--green-ink)" },
  scheduled: { label: "Scheduled", bg: "var(--amber-bg)", fg: "var(--amber-ink)" },
  ended: { label: "Ended", bg: "var(--surface2)", fg: "var(--muted)" },
};

function when(iso: string | null): string {
  const ms = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(ms)) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
}

function windowText(item: AdminAnnouncement): string {
  const start = when(item.startsAt);
  const end = when(item.endsAt);
  if (item.status === "scheduled") return end ? `Starts ${start}, ends ${end}` : `Starts ${start}`;
  if (item.status === "ended") return end ? `Ran until ${end}` : "Ended";
  return end ? `Live since ${start}, ends ${end}` : `Live since ${start}`;
}

function Counter({ value, max }: { value: string; max: number }) {
  const length = value.replace(/\s+/g, " ").trim().length;
  return <span style={{ float: "right", fontWeight: 400, color: length > max ? "var(--red-ink)" : "var(--muted)" }}>{length}/{max}</span>;
}

export default function AnnouncementsPanel() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [attempted, setAttempted] = useState(false);
  const [serverFields, setServerFields] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [items, setItems] = useState<AdminAnnouncement[] | null>(_cache);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);

  const showList = useCallback((result: Awaited<ReturnType<typeof listAnnouncements>>) => {
    if (result.ok) {
      _cache = result.items;
      setItems(result.items);
      setLoadError(null);
    } else {
      // Keep whatever is already painted; a failed refresh must not blank the list.
      setLoadError(result.message);
    }
  }, []);

  const refresh = useCallback(async () => showList(await listAnnouncements()), [showList]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await listAnnouncements();
      if (alive) showList(result);
    })();
    return () => {
      alive = false;
    };
  }, [showList]);

  const errors = draftErrors(draft);
  const shown = (field: keyof FieldErrors) => serverFields[field] ?? (attempted ? errors[field] : undefined);

  const edit = (field: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setServerFields((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    setMessage(null);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    const result = await publishAnnouncement(draft);
    setSubmitting(false);
    if (!result.ok) {
      setServerFields(result.fields);
      setMessage({ kind: "err", text: result.message });
      return;
    }
    setDraft(EMPTY_DRAFT);
    setAttempted(false);
    setServerFields({});
    setMessage({
      kind: "ok",
      text: result.announcement.status === "scheduled"
        ? "Scheduled. It appears from the start time."
        : "Published. People see it the next time they open the app.",
    });
    await refresh();
  };

  const end = async (item: AdminAnnouncement) => {
    setEndingId(item.id);
    setMessage(null);
    const result = await endAnnouncement(item.id);
    setEndingId(null);
    if (!result.ok) setMessage({ kind: "err", text: result.message });
    await refresh();
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", maxWidth: "68ch" }}>
        Announcements show in every signed-in person&apos;s notification bell and as a one-time card
        the next time they open the app. If several are live, they appear one at a time. Nothing is emailed.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
        <AdminChartCard title="New announcement">
          <form onSubmit={submit} noValidate style={{ display: "grid", gap: 14 }}>
            <div>
              <label htmlFor="ann-title" style={labelStyle}>Title <Counter value={draft.title} max={ANNOUNCEMENT_LIMITS.title} /></label>
              <input id="ann-title" style={inputStyle} value={draft.title} onChange={(e) => edit("title", e.target.value)} />
              {shown("title") ? <p role="alert" style={errorStyle}>{shown("title")}</p> : null}
            </div>
            <div>
              <label htmlFor="ann-body" style={labelStyle}>Text <Counter value={draft.body} max={ANNOUNCEMENT_LIMITS.body} /></label>
              <textarea id="ann-body" rows={4} style={{ ...inputStyle, resize: "vertical" }} value={draft.body} onChange={(e) => edit("body", e.target.value)} />
              {shown("body") ? <p role="alert" style={errorStyle}>{shown("body")}</p> : null}
            </div>
            <div>
              <label htmlFor="ann-href" style={labelStyle}>Link</label>
              <input id="ann-href" style={inputStyle} placeholder="/?view=jobs" value={draft.href} onChange={(e) => edit("href", e.target.value)} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {LINK_PRESETS.map((preset) => (
                  <button
                    key={preset.href}
                    type="button"
                    onClick={() => edit("href", preset.href)}
                    style={{ fontSize: 12, padding: "3px 9px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {shown("href") ? <p role="alert" style={errorStyle}>{shown("href")}</p> : <p style={hintStyle}>A page inside Resunova. Full web addresses are not allowed.</p>}
            </div>
            <div>
              <label htmlFor="ann-cta" style={labelStyle}>Button label <Counter value={draft.cta} max={ANNOUNCEMENT_LIMITS.cta} /></label>
              <input id="ann-cta" style={inputStyle} placeholder="Open" value={draft.cta} onChange={(e) => edit("cta", e.target.value)} />
              {shown("cta") ? <p role="alert" style={errorStyle}>{shown("cta")}</p> : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              <div>
                <label htmlFor="ann-start" style={labelStyle}>Show from (optional)</label>
                <input id="ann-start" type="datetime-local" style={inputStyle} value={draft.startsAt} onChange={(e) => edit("startsAt", e.target.value)} />
                {shown("startsAt") ? <p role="alert" style={errorStyle}>{shown("startsAt")}</p> : <p style={hintStyle}>Blank means now.</p>}
              </div>
              <div>
                <label htmlFor="ann-end" style={labelStyle}>Stop showing on (optional)</label>
                <input id="ann-end" type="datetime-local" style={inputStyle} value={draft.endsAt} onChange={(e) => edit("endsAt", e.target.value)} />
                {shown("endsAt") ? <p role="alert" style={errorStyle}>{shown("endsAt")}</p> : <p style={hintStyle}>Blank means until you end it.</p>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Button type="submit" disabled={submitting}>{submitting ? "Publishing…" : "Publish"}</Button>
              {message ? (
                <span role={message.kind === "err" ? "alert" : "status"} style={{ fontSize: 13, color: message.kind === "err" ? "var(--red-ink)" : "var(--green-ink)" }}>
                  {message.text}
                </span>
              ) : null}
            </div>
          </form>
        </AdminChartCard>

        <AdminChartCard title="What people will see" cap="The same card people get, once, when they open the app.">
          <div style={{ maxWidth: 360 }} data-announcement-preview>
            <FeedbackToastCard
              embedded
              variant="info"
              title={draft.title.trim() || "Your title"}
              description={draft.body.trim() || "Your text appears here."}
              onDismiss={() => {}}
              secondaryAction={{ label: "Dismiss", onClick: () => {} }}
              primaryAction={{ label: draft.cta.trim() || "Open", onClick: () => {} }}
            />
          </div>
        </AdminChartCard>
      </div>

      <AdminChartCard title="Announcements" style={{ marginTop: 16 }}>
        {loadError ? <p role="alert" style={{ ...errorStyle, marginBottom: 10, fontSize: 13 }}>{loadError}</p> : null}
        {items === null && !loadError ? (
          <div style={{ height: 80, borderRadius: 10, background: "var(--surface2)", opacity: 0.6 }} />
        ) : items && items.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Nothing yet. Published announcements are listed here.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {(items ?? []).map((item) => {
              const badge = BADGE[item.status];
              return (
                <li key={item.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px", display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "1px 8px", borderRadius: 999, background: badge.bg, color: badge.fg }}>{badge.label}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>{item.body}</p>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>{item.href} · {windowText(item)}</p>
                  </div>
                  {item.status !== "ended" ? (
                    <Button type="button" variant="outline" size="sm" aria-label={`End ${item.title}`} disabled={endingId === item.id} onClick={() => void end(item)}>
                      {endingId === item.id ? "Ending…" : "End"}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </AdminChartCard>
    </div>
  );
}
