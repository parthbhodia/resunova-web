"use client";

/**
 * ApplicationTracker — "My Applications" tracker tab under /?view=jobs.
 *
 * Reads/writes via:
 *   GET  /api/applications
 *   POST /api/applications
 *   PATCH /api/applications/{id}
 *   DELETE /api/applications/{id}
 *
 * All mutations are optimistic with rollback on error.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiUrl } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "archived";

type Application = {
  id: string;
  postingId: string | null;
  company: string | null;
  title: string | null;
  url: string | null;
  location: string | null;
  source: string | null;
  status: AppStatus;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  saved: number;
  applied: number;
  interviewing: number;
  offer: number;
  rejected: number;
  archived: number;
  total: number;
};

type TrackerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "unauthenticated" }
  | { status: "ready"; applications: Application[]; stats: Stats };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_ORDER: AppStatus[] = ["saved", "applied", "interviewing", "offer", "rejected"];
const STATUS_LABELS: Record<AppStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Archived",
};
const STATUS_OPTIONS: AppStatus[] = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bearerHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function emptyStats(): Stats {
  return { saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0, archived: 0, total: 0 };
}

function recomputeStats(applications: Application[]): Stats {
  const s = emptyStats();
  for (const a of applications) {
    s.total++;
    if (a.status in s) (s as Record<string, number>)[a.status]++;
  }
  return s;
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 12.5,
    padding: "5px 12px",
    borderRadius: 999,
    border: "1px solid " + (active ? "var(--accent)" : "var(--surface2)"),
    background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
    color: active ? "var(--accent)" : "var(--muted)",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
  };
}

// ---------------------------------------------------------------------------
// Add-application form
// ---------------------------------------------------------------------------

type AddFormProps = {
  onAdd: (app: Application) => void;
  onCancel: () => void;
};

function AddApplicationForm({ onAdd, onCancel }: AddFormProps) {
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<AppStatus>("saved");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() && !title.trim()) {
      setError("Enter at least a company or job title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const headers = await bearerHeaders();
      const resp = await fetch(apiUrl("/api/applications"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          company: company.trim() || null,
          title: title.trim() || null,
          url: url.trim() || null,
          location: location.trim() || null,
          status,
          notes: notes.trim() || null,
          source: "manual",
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      onAdd(data.application as Application);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add application.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 13,
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--surface2)",
    background: "var(--bg)",
    color: "var(--text)",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 600,
    color: "var(--muted)",
    display: "block",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <Card style={{ marginBottom: 20 }}>
      <CardContent style={{ padding: "20px 20px 18px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 14px" }}>Add application</p>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
            <div>
              <label style={labelStyle}>Company</label>
              <input
                style={inputStyle}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Stripe"
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Job title</label>
              <input
                style={inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div>
              <label style={labelStyle}>URL</label>
              <input
                style={inputStyle}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Posting link (optional)"
                type="url"
              />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                style={inputStyle}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, New York"
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={{ ...inputStyle }}
                value={status}
                onChange={(e) => setStatus(e.target.value as AppStatus)}
              >
                {STATUS_OPTIONS.filter((s) => s !== "archived").map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <input
                style={inputStyle}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Quick note (optional)"
              />
            </div>
          </div>
          {error && (
            <p style={{ fontSize: 12.5, color: "var(--red-ink, #dc2626)", margin: "10px 0 0" }}>{error}</p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Single application card
// ---------------------------------------------------------------------------

type AppCardProps = {
  app: Application;
  onStatusChange: (id: string, status: AppStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
};

function AppCard({ app, onStatusChange, onNotesChange, onDelete }: AppCardProps) {
  const [notes, setNotes] = useState(app.notes ?? "");
  const notesRef = useRef(app.notes ?? "");

  // Keep notes in sync if parent replaces the app (e.g. rollback)
  useEffect(() => {
    setNotes(app.notes ?? "");
    notesRef.current = app.notes ?? "";
  }, [app.notes]);

  const handleNotesBlur = () => {
    if (notes === notesRef.current) return; // no change
    notesRef.current = notes;
    onNotesChange(app.id, notes);
  };

  const displayDate = app.appliedAt ?? app.updatedAt ?? app.createdAt;
  const relDate = formatRelativeDate(displayDate);

  const selectStyle: React.CSSProperties = {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid var(--surface2)",
    background: "var(--bg)",
    color: "var(--text)",
    cursor: "pointer",
    outline: "none",
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 12.5,
    padding: "6px 9px",
    borderRadius: 7,
    border: "1px solid var(--surface2)",
    background: "var(--bg)",
    color: "var(--text)",
    resize: "none",
    outline: "none",
    lineHeight: 1.5,
    boxSizing: "border-box",
    minHeight: 52,
    fontFamily: "inherit",
  };

  return (
    <Card>
      <CardContent style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Main info */}
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                {app.company || "Unknown company"}
              </span>
              {app.title && (
                <>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>·</span>
                  <span style={{ fontSize: 13.5, color: "var(--text)" }}>{app.title}</span>
                </>
              )}
              {app.url && (
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11.5, color: "var(--accent)", textDecoration: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  ↗ View posting
                </a>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
              {app.location && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{app.location}</span>
              )}
              {relDate && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>· {relDate}</span>
              )}
            </div>
          </div>

          {/* Status select + delete */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <select
              value={app.status}
              onChange={(e) => onStatusChange(app.id, e.target.value as AppStatus)}
              style={selectStyle}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              title="Remove application"
              onClick={() => onDelete(app.id)}
              style={{
                fontSize: 14,
                color: "var(--muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 5,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: 10 }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Notes (save-on-blur)…"
            style={textareaStyle}
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stats strip
// ---------------------------------------------------------------------------

function StatsStrip({ stats }: { stats: Stats }) {
  const items: { label: string; value: number; color?: string }[] = [
    { label: "Total", value: stats.total },
    { label: "Saved", value: stats.saved },
    { label: "Applied", value: stats.applied },
    {
      label: "Interviewing",
      value: stats.interviewing,
      color: stats.interviewing > 0 ? "var(--amber-ink)" : undefined,
    },
    {
      label: "Offer",
      value: stats.offer,
      color: stats.offer > 0 ? "var(--green-ink)" : undefined,
    },
    {
      label: "Rejected",
      value: stats.rejected,
      color: stats.rejected > 0 ? "var(--muted)" : undefined,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 20,
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: "var(--surface2)",
            borderRadius: 10,
            padding: "10px 16px",
            minWidth: 72,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: item.color ?? "var(--text)",
              lineHeight: 1,
            }}
          >
            {item.value}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontWeight: 500 }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ApplicationTracker() {
  const [state, setState] = useState<TrackerState>({ status: "loading" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeGroup, setActiveGroup] = useState<AppStatus | "all">("all");

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const loadApplications = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setState({ status: "unauthenticated" });
        return;
      }
      const headers: Record<string, string> = {
        Authorization: `Bearer ${session.access_token}`,
      };
      const resp = await fetch(apiUrl("/api/applications"), { headers });
      if (resp.status === 401) {
        setState({ status: "unauthenticated" });
        return;
      }
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const applications: Application[] = Array.isArray(data?.applications) ? data.applications : [];
      const stats: Stats = data?.stats ?? recomputeStats(applications);
      setState({ status: "ready", applications, stats });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load applications",
      });
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  // ------------------------------------------------------------------
  // Mutations (optimistic)
  // ------------------------------------------------------------------

  const handleStatusChange = useCallback(async (id: string, newStatus: AppStatus) => {
    if (state.status !== "ready") return;

    // Optimistic update
    const prev = state.applications;
    const updated = prev.map((a) =>
      a.id === id ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a
    );
    const newStats = recomputeStats(updated);
    setState({ status: "ready", applications: updated, stats: newStats });

    try {
      const headers = await bearerHeaders();
      const resp = await fetch(apiUrl(`/api/applications/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch {
      // Rollback
      setState({ status: "ready", applications: prev, stats: recomputeStats(prev) });
    }
  }, [state]);

  const handleNotesChange = useCallback(async (id: string, notes: string) => {
    if (state.status !== "ready") return;

    const prev = state.applications;
    const updated = prev.map((a) =>
      a.id === id ? { ...a, notes: notes || null, updatedAt: new Date().toISOString() } : a
    );
    setState({ status: "ready", applications: updated, stats: state.stats });

    try {
      const headers = await bearerHeaders();
      const resp = await fetch(apiUrl(`/api/applications/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ notes: notes || null }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch {
      setState({ status: "ready", applications: prev, stats: state.stats });
    }
  }, [state]);

  const handleDelete = useCallback(async (id: string) => {
    if (state.status !== "ready") return;
    if (!window.confirm("Remove this application from your tracker?")) return;

    const prev = state.applications;
    const updated = prev.filter((a) => a.id !== id);
    const newStats = recomputeStats(updated);
    setState({ status: "ready", applications: updated, stats: newStats });

    try {
      const headers = await bearerHeaders();
      const resp = await fetch(apiUrl(`/api/applications/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch {
      setState({ status: "ready", applications: prev, stats: recomputeStats(prev) });
    }
  }, [state]);

  const handleAdd = useCallback((app: Application) => {
    if (state.status !== "ready") {
      // Shouldn't happen, but handle gracefully
      setState({ status: "ready", applications: [app], stats: recomputeStats([app]) });
      setShowAddForm(false);
      return;
    }
    const updated = [app, ...state.applications];
    setState({ status: "ready", applications: updated, stats: recomputeStats(updated) });
    setShowAddForm(false);
  }, [state]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (state.status === "loading") {
    return (
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 64px", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[96px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "unauthenticated") {
    return (
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 64px", width: "100%" }}>
        <Card>
          <CardContent style={{ padding: "40px 28px", textAlign: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>Sign in to use the tracker</h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "10px auto 0", maxWidth: 420 }}>
              Your application tracker is saved to your account — sign in to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 64px", width: "100%" }}>
        <Card>
          <CardContent style={{ padding: "32px 28px", textAlign: "center" }}>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 14px" }}>
              Couldn&apos;t load applications: {state.message}
            </p>
            <Button variant="outline" onClick={() => void loadApplications()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { applications, stats } = state;

  // Group filter chips — only show Archived group chip if there are any archived
  const groupChips: Array<AppStatus | "all"> = ["all", ...STATUS_ORDER];
  if (stats.archived > 0) groupChips.push("archived");

  // Filter + group
  const filtered = activeGroup === "all" ? applications : applications.filter((a) => a.status === activeGroup);
  const groups: Partial<Record<AppStatus, Application[]>> = {};
  for (const status of STATUS_ORDER) {
    const inGroup = filtered.filter((a) => a.status === status);
    if (inGroup.length > 0) groups[status] = inGroup;
  }
  if (stats.archived > 0 && (activeGroup === "all" || activeGroup === "archived")) {
    const archived = filtered.filter((a) => a.status === "archived");
    if (archived.length > 0) groups["archived"] = archived;
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 64px", width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>My Applications</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
            Track every job you&apos;ve applied to — status, notes, and outcomes in one place.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" size="sm" onClick={() => void loadApplications()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Cancel" : "+ Add application"}
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <StatsStrip stats={stats} />

      {/* Add form */}
      {showAddForm && (
        <AddApplicationForm
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Group filter chips */}
      {applications.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {groupChips.map((g) => {
            const count =
              g === "all"
                ? stats.total
                : (stats as Record<string, number>)[g] ?? 0;
            const label = g === "all" ? "All" : STATUS_LABELS[g];
            return (
              <button
                key={g}
                type="button"
                onClick={() => setActiveGroup(g)}
                style={chipStyle(activeGroup === g)}
              >
                {label}
                {count > 0 && (
                  <span
                    style={{
                      marginLeft: 5,
                      fontSize: 11,
                      fontWeight: 700,
                      background: activeGroup === g
                        ? "color-mix(in srgb, var(--accent) 20%, transparent)"
                        : "var(--surface2)",
                      borderRadius: 999,
                      padding: "1px 6px",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {applications.length === 0 && !showAddForm && (
        <Card>
          <CardContent style={{ padding: "44px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>
              No applications tracked yet
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 auto 18px", maxWidth: 440 }}>
              Apply to jobs from the Recommended tab and they&apos;ll appear here, or add one manually.
            </p>
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              + Add application
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped application list */}
      {(Object.entries(groups) as [AppStatus, Application[]][]).map(([groupStatus, apps]) => (
        <div key={groupStatus} style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <StatusDot status={groupStatus} />
            {STATUS_LABELS[groupStatus]}
            <span
              style={{
                fontWeight: 600,
                fontSize: 11,
                background: "var(--surface2)",
                borderRadius: 999,
                padding: "1px 7px",
                color: "var(--muted)",
              }}
            >
              {apps.length}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {apps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onStatusChange={(id, s) => void handleStatusChange(id, s)}
                onNotesChange={(id, n) => void handleNotesChange(id, n)}
                onDelete={(id) => void handleDelete(id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: AppStatus }) {
  const color =
    status === "offer"
      ? "var(--green-ink)"
      : status === "interviewing"
      ? "var(--amber-ink)"
      : status === "rejected" || status === "archived"
      ? "var(--muted)"
      : "var(--accent)";
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}
