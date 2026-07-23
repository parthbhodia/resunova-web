"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/utils";
import { AdminChartCard } from "./charts";

/**
 * Admin-only utility: fire a one-off test email through Resend via the
 * backend's admin-gated POST /api/admin/send-test-email. Uses the signed-in
 * admin's session token (getAuthHeaders), so there's no token juggling — one
 * click sends. Recipient is optional; empty ⇒ the backend sends to the
 * requesting admin's own account email.
 */
export default function SendTestEmailCard({
  getAuthHeaders,
}: {
  getAuthHeaders: () => Promise<Record<string, string>>;
}) {
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function send() {
    setStatus("sending");
    setMsg("");
    try {
      const headers = { ...(await getAuthHeaders()), "Content-Type": "application/json" };
      const body = to.trim() ? { to: to.trim() } : {};
      const resp = await fetch(apiUrl("/api/admin/send-test-email"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const json = (await resp.json().catch(() => ({}))) as {
        sent?: boolean;
        to?: string;
        error?: string;
      };
      if (resp.ok && json.sent) {
        setStatus("ok");
        setMsg(`Sent to ${json.to}`);
      } else {
        setStatus("err");
        setMsg(
          json.error === "resend_not_configured"
            ? "Resend isn't configured (RESEND_API_KEY unset on the API)."
            : json.error || `Send failed (HTTP ${resp.status}).`,
        );
      }
    } catch (e) {
      setStatus("err");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <AdminChartCard
      title="Send test email"
      cap="Fires the “your job role matches this company” email through Resend. Leave blank to send to your own admin address."
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="recipient (optional)"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          style={{ flex: "1 1 220px", minWidth: 0 }}
        />
        <Button onClick={send} disabled={status === "sending"} size="sm">
          {status === "sending" ? "Sending…" : "Send test email"}
        </Button>
      </div>
      {status !== "idle" && status !== "sending" && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: status === "ok" ? "var(--green-ink)" : "var(--destructive)",
          }}
        >
          {status === "ok" ? "✓ " : "✕ "}
          {msg}
        </div>
      )}
    </AdminChartCard>
  );
}
