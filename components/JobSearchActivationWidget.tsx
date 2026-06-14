"use client";

/**
 * Inline prompt shown once after a successful analyze, when the user hasn't set
 * target roles yet. Captures roles (chip select) + location, saves to profile,
 * and fires onActivated() so the parent can show the jobs feed count.
 *
 * Shown only to signed-in users with an empty `roles` profile field.
 * Dismissed permanently (localStorage) when saved OR skipped.
 */

import { useState } from "react";
import { loadProfile, saveProfile } from "@/lib/profileStorage";
import { upsertUserProfile } from "@/lib/supabase";

const DISMISSED_KEY = "rn_job_activation_dismissed_v1";

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
}
function setDismissed() {
  try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* ignore */ }
}

/** Suggested role chips — drawn from common early-career tech roles. */
const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Full-Stack Engineer",
  "Data Engineer",
  "Data Scientist",
  "ML Engineer",
  "DevOps / SRE",
  "Product Manager",
  "Platform Engineer",
  "iOS / Android Engineer",
  "QA Engineer",
];

const LOCATION_SUGGESTIONS = [
  "Remote",
  "New York, NY",
  "San Francisco, CA",
  "Seattle, WA",
  "Austin, TX",
  "Boston, MA",
  "Chicago, IL",
  "Washington, DC",
];

export default function JobSearchActivationWidget({
  onActivated,
  onSkip,
}: {
  /** Called after profile is saved — parent should refresh jobs count. */
  onActivated: (roles: string, locations: string) => void;
  onSkip: () => void;
}) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleRole = (r: string) =>
    setSelectedRoles(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r],
    );

  const addCustomRole = () => {
    const v = customRole.trim();
    if (!v || selectedRoles.includes(v)) { setCustomRole(""); return; }
    setSelectedRoles(prev => [...prev, v]);
    setCustomRole("");
  };

  const handleSave = async () => {
    const rolesStr = selectedRoles.join(", ");
    const locStr = location.trim();
    if (!rolesStr) return;

    setSaving(true);
    try {
      const current = loadProfile();
      const next = { ...current, roles: rolesStr, locations: locStr || current.locations };
      saveProfile(next);
      await upsertUserProfile(next);
      setDismissed();
      onActivated(rolesStr, locStr);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setDismissed();
    onSkip();
  };

  const canSave = selectedRoles.length > 0;

  return (
    <div
      style={{
        margin: "0 0 16px",
        borderRadius: 14,
        border: "1.5px solid rgba(47,129,247,0.25)",
        background: "var(--surface)",
        boxShadow: "0 2px 12px rgba(47,129,247,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px 10px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1.2 }}>🎯</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", letterSpacing: -0.3, marginBottom: 2 }}>
            Find jobs matching your résumé
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            Tell us what you&apos;re targeting — we&apos;ll rank your job feed by match score.
          </div>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Skip"
          style={{
            marginLeft: "auto", flexShrink: 0, background: "none", border: "none",
            color: "var(--dim)", fontSize: 18, cursor: "pointer", lineHeight: 1,
            padding: "0 2px",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "14px 18px 18px" }}>
        {/* Step 1: Role chips */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
            Roles you&apos;re targeting
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ROLE_SUGGESTIONS.map(r => {
              const active = selectedRoles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 20,
                    border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "rgba(47,129,247,0.1)" : "var(--surface2)",
                    color: active ? "var(--accent)" : "var(--text)",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.1s",
                  }}
                >
                  {active ? "✓ " : ""}{r}
                </button>
              );
            })}
            {/* Selected custom roles */}
            {selectedRoles.filter(r => !ROLE_SUGGESTIONS.includes(r)).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                style={{
                  padding: "5px 11px", borderRadius: 20,
                  border: "1.5px solid var(--accent)",
                  background: "rgba(47,129,247,0.1)",
                  color: "var(--accent)", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ✓ {r}
              </button>
            ))}
          </div>

          {/* Custom role input */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              type="text"
              value={customRole}
              onChange={e => setCustomRole(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomRole(); } }}
              placeholder="Other role…"
              style={{
                flex: 1, padding: "6px 10px", borderRadius: 8, fontSize: 12,
                border: "1px solid var(--border)", background: "var(--surface2)",
                color: "var(--text)", fontFamily: "inherit", outline: "none",
              }}
            />
            <button
              type="button"
              onClick={addCustomRole}
              disabled={!customRole.trim()}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "none",
                background: customRole.trim() ? "var(--accent)" : "var(--surface2)",
                color: customRole.trim() ? "#fff" : "var(--dim)",
                fontSize: 12, fontWeight: 600, cursor: customRole.trim() ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Step 2: Location */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
            Location preference
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {LOCATION_SUGGESTIONS.map(loc => {
              const active = location === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(active ? "" : loc)}
                  style={{
                    padding: "5px 11px", borderRadius: 20,
                    border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "rgba(47,129,247,0.1)" : "var(--surface2)",
                    color: active ? "var(--accent)" : "var(--text)",
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {loc}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Or type a city, state…"
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 12,
              border: "1px solid var(--border)", background: "var(--surface2)",
              color: "var(--text)", fontFamily: "inherit", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={!canSave || saving}
            style={{
              flex: 1, padding: "11px 18px", borderRadius: 10,
              border: "none",
              background: canSave ? "var(--accent)" : "var(--surface2)",
              color: canSave ? "#fff" : "var(--dim)",
              fontSize: 13.5, fontWeight: 700, cursor: canSave ? "pointer" : "default",
              fontFamily: "inherit", letterSpacing: -0.2,
              boxShadow: canSave ? "0 4px 16px rgba(47,129,247,0.3)" : "none",
            }}
          >
            {saving ? "Saving…" : "Show me matching jobs →"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              padding: "11px 14px", borderRadius: 10,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--muted)", fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Skip
          </button>
        </div>

        {!canSave && (
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, textAlign: "center" }}>
            Select at least one role to continue
          </div>
        )}
      </div>
    </div>
  );
}

/** Returns true if the activation widget should be shown (signed-in, roles empty, not dismissed). */
export function shouldShowJobActivation(): boolean {
  if (typeof window === "undefined") return false;
  if (isDismissed()) return false;
  try {
    const profile = loadProfile();
    return !profile.roles.trim();
  } catch {
    return false;
  }
}
