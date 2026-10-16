"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/profileSettingsUi";
import { apiFetch } from "@/lib/apiClient";

export type ExtensionSession = {
  id: string;
  createdAt: string | null;
  lastSeenAt: string | null;
  expiresAt: string | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; sessions: ExtensionSession[] };

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** One line per session: when it was connected, last used, and when it ends. */
export function describeSession(s: ExtensionSession): string {
  const parts: string[] = [];
  const connected = formatDate(s.createdAt);
  const seen = formatDate(s.lastSeenAt);
  const expires = formatDate(s.expiresAt);
  if (connected) parts.push(`Connected ${connected}`);
  if (seen) parts.push(`last active ${seen}`);
  if (expires) parts.push(`expires ${expires}`);
  return parts.join(" · ") || "Connected";
}

const buttonStyle = {
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
  flexShrink: 0,
} as const;

/** Lists the Chrome extension sessions on this account and lets the user end
 * them. Disconnecting here works even when the extension itself is gone (a
 * lost laptop, an uninstalled browser), which the extension's own popup
 * cannot do. */
export default function ConnectedExtensionsCard() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const resp = await apiFetch("/api/extension/sessions");
      if (!resp.ok) throw new Error(String(resp.status));
      const body = (await resp.json()) as { sessions?: ExtensionSession[] };
      setState({ kind: "ready", sessions: Array.isArray(body.sessions) ? body.sessions : [] });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = useCallback(
    async (target: string | "all") => {
      setBusy(target);
      setActionError(false);
      try {
        const path =
          target === "all"
            ? "/api/extension/revoke-all"
            : `/api/extension/sessions/${encodeURIComponent(target)}/revoke`;
        const resp = await apiFetch(path, { method: "POST" });
        // 404 means it is already gone, which is the outcome the user asked for.
        if (!resp.ok && resp.status !== 404) throw new Error(String(resp.status));
        setState((prev) =>
          prev.kind !== "ready"
            ? prev
            : {
                kind: "ready",
                sessions: target === "all" ? [] : prev.sessions.filter((s) => s.id !== target),
              },
        );
      } catch {
        setActionError(true);
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  return (
    <Card title="Connected extensions">
      {state.kind === "loading" && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Checking…</p>
      )}

      {state.kind === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            Couldn&apos;t load your connected extensions.
          </p>
          <button type="button" style={buttonStyle} onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {state.kind === "ready" && state.sessions.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>
          No extension is connected to this account.{" "}
          <Link href="/extension" style={{ color: "var(--accent-ink, var(--accent))", fontWeight: 600, textDecoration: "none" }}>
            Get the Chrome extension
          </Link>
        </p>
      )}

      {state.kind === "ready" && state.sessions.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 8px" }}>
            Each connection signs in for up to 90 days, then asks you to reconnect. Changing your
            password or signing out disconnects all of them.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {state.sessions.map((s, i) => (
              <li
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 0",
                  borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Chrome extension</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{describeSession(s)}</div>
                </div>
                <button
                  type="button"
                  style={buttonStyle}
                  disabled={busy !== null}
                  aria-label={`Disconnect extension, ${describeSession(s)}`}
                  onClick={() => void disconnect(s.id)}
                >
                  {busy === s.id ? "Disconnecting…" : "Disconnect"}
                </button>
              </li>
            ))}
          </ul>
          {state.sessions.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                style={buttonStyle}
                disabled={busy !== null}
                onClick={() => void disconnect("all")}
              >
                {busy === "all" ? "Disconnecting…" : "Disconnect all"}
              </button>
            </div>
          )}
        </>
      )}

      {actionError && (
        <p role="alert" style={{ fontSize: 12, color: "var(--red-ink, var(--red))", margin: "8px 0 0" }}>
          Couldn&apos;t disconnect. Try again.
        </p>
      )}
    </Card>
  );
}
