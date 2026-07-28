import React, { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiClient";

interface AIEnhanceButtonProps {
  bullet: string;
  onEnhanced: (enhancedBullet: string) => void;
  context?: {
    jd?: string;
    role?: string;
    company?: string;
  };
}

export function AIEnhanceButton({ bullet, onEnhanced, context = {} }: AIEnhanceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhanceBullet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/rewrite-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet: bullet,
          jd: context.jd,
          role: context.role,
          company: context.company,
          rewrite: true, // Ensure we get a rewritten bullet
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.improved) {
        throw new Error(data.error || "AI enhancement failed.");
      }
      onEnhanced(data.improved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enhance bullet.");
    } finally {
      setLoading(false);
    }
  }, [bullet, onEnhanced, context]);

  // Only show button if there's substantial text to enhance
  const showButton = bullet.trim().split(/\s+/).filter(Boolean).length >= 3;

  if (!showButton) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {error && <span style={{ fontSize: 10, color: "var(--red)" }}>{error}</span>}
      <button
        type="button"
        onClick={enhanceBullet}
        disabled={loading}
        title="Enhance bullet with AI (ATS-optimized)"
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "5px 10px",
          borderRadius: 7,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          border: "none",
          background: loading ? "var(--surface3)" : "var(--accent)",
          color: "#fff",
          opacity: loading ? 0.7 : 1,
          transition: "background 0.15s, opacity 0.15s",
          flexShrink: 0,
        }}
      >
        {loading ? "Enhancing…" : "✦ AI Enhance"}
      </button>
    </div>
  );
}
