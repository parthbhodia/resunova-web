"use client";

/**
 * InsiderPanel — "Find an insider" referral-outreach tracker, shown on the
 * Job detail page (right column, under the match panel) and usable standalone.
 *
 * v1 is user-owned: you add the people you're asking for a referral and move
 * each through To contact → Contacted → Responded → Referred / Declined.
 * Automatic insider discovery (alumni/recruiter match) is phase 2 — it needs an
 * authenticated connections graph and would arrive as source='suggested' rows.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferral,
  deleteReferral,
  fetchReferrals,
  updateReferral,
  REFERRAL_RELATIONSHIP_LABELS,
  REFERRAL_STATUS_LABELS,
  type ReferralContact,
  type ReferralRelationship,
  type ReferralStatus,
} from "@/lib/referralsApi";

const STATUS_ORDER: ReferralStatus[] = ["to_contact", "contacted", "responded", "referred", "declined"];
const RELATIONSHIPS: ReferralRelationship[] = ["alumni", "colleague", "recruiter", "mutual", "other"];

const STATUS_INK: Record<ReferralStatus, string> = {
  to_contact: "var(--muted)",
  contacted: "var(--accent)",
  responded: "var(--amber-ink)",
  referred: "var(--green-ink)",
  declined: "var(--red-ink)",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

const AVATAR_COLORS = ["#6C5CE7", "#1D9E75", "#E17055", "#2F81F7", "#C4793A", "#A371F7"];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-xl)",
  padding: "20px 22px",
};
const labelStyle: React.CSSProperties = { fontSize: 11.5, color: "var(--muted)", marginBottom: 5, display: "block" };
const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  padding: "9px 11px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--surface2)",
  color: "var(--text)",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export default function InsiderPanel({
  postingId,
  company,
}: {
  postingId?: string;
  company?: string;
}) {
  const [contacts, setContacts] = useState<ReferralContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contactName: "",
    contactTitle: "",
    contactUrl: "",
    relationship: "alumni" as ReferralRelationship,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchReferrals(postingId);
      setContacts(res.referrals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
      setContacts([]);
    }
  }, [postingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => {
    if (!contacts) return [];
    return [...contacts].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );
  }, [contacts]);

  const referredCount = useMemo(
    () => (contacts ?? []).filter((c) => c.status === "referred").length,
    [contacts],
  );

  async function handleAdd() {
    const name = form.contactName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const created = await createReferral({
        contactName: name,
        contactTitle: form.contactTitle.trim() || undefined,
        contactUrl: form.contactUrl.trim() || undefined,
        relationship: form.relationship,
        postingId: postingId || undefined,
        company: company || undefined,
      });
      setContacts((prev) => [created, ...(prev ?? [])]);
      setForm({ contactName: "", contactTitle: "", contactUrl: "", relationship: "alumni" });
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add contact");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id: string, status: ReferralStatus) {
    const prev = contacts;
    setContacts((cs) => (cs ?? []).map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      await updateReferral(id, { status });
    } catch {
      setContacts(prev); // rollback
    }
  }

  async function handleDelete(id: string) {
    const prev = contacts;
    setContacts((cs) => (cs ?? []).filter((c) => c.id !== id));
    try {
      await deleteReferral(id);
    } catch {
      setContacts(prev);
    }
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Find an insider</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {company ? `Referrals at ${company}` : "Track your referral outreach"}
          </div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              padding: "7px 13px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Add contact
          </button>
        )}
      </div>

      {/* phase-2 discovery note */}
      <div
        style={{
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: "var(--radius)",
          background: "color-mix(in srgb, var(--accent) 9%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
          fontSize: 11.5,
          lineHeight: 1.5,
          color: "var(--muted)",
        }}
      >
        A warm referral lifts your reply rate ~4×. Auto-matching alumni &amp; recruiters is coming soon —
        for now, add the people you plan to reach out to and track each ask.
      </div>

      {/* add form */}
      {adding && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              style={inputStyle}
              autoFocus
              value={form.contactName}
              placeholder="e.g. Maya Rodriguez"
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Title</label>
              <input
                style={inputStyle}
                value={form.contactTitle}
                placeholder="Design Manager"
                onChange={(e) => setForm((f) => ({ ...f, contactTitle: e.target.value }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Relationship</label>
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={form.relationship}
                onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value as ReferralRelationship }))}
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>{REFERRAL_RELATIONSHIP_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Profile link</label>
            <input
              style={inputStyle}
              value={form.contactUrl}
              placeholder="linkedin.com/in/…"
              onChange={(e) => setForm((f) => ({ ...f, contactUrl: e.target.value }))}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => { setAdding(false); setError(null); }}
              style={{ fontSize: 12.5, padding: "8px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.contactName.trim() || saving}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: "var(--radius)",
                border: "none",
                background: "#c4793a",
                color: "#fff",
                cursor: form.contactName.trim() && !saving ? "pointer" : "not-allowed",
                opacity: form.contactName.trim() && !saving ? 1 : 0.6,
              }}
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--red-ink)" }}>{error}</div>
      )}

      {/* list */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {contacts === null && (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>Loading…</div>
        )}
        {contacts !== null && sorted.length === 0 && !adding && (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0", lineHeight: 1.6 }}>
            No contacts yet. Add someone who can refer you — an alumnus, a former colleague, or a
            recruiter at {company || "the company"}.
          </div>
        )}
        {sorted.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 12px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--surface2)",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                flexShrink: 0,
                background: avatarColor(c.contactName),
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials(c.contactName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.contactName}
                </span>
                {c.contactUrl && (
                  <a
                    href={c.contactUrl.startsWith("http") ? c.contactUrl : `https://${c.contactUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", flexShrink: 0 }}
                  >
                    ↗
                  </a>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {[c.contactTitle, REFERRAL_RELATIONSHIP_LABELS[c.relationship]].filter(Boolean).join(" · ")}
              </div>
            </div>
            <select
              value={c.status}
              onChange={(e) => void handleStatus(c.id, e.target.value as ReferralStatus)}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: "5px 6px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: STATUS_INK[c.status],
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s} style={{ color: "var(--text)" }}>{REFERRAL_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={() => void handleDelete(c.id)}
              aria-label={`Remove ${c.contactName}`}
              style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 15, padding: 2, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
