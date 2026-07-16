"use client";
// Manual client-only mount instead of next/dynamic(..., { ssr: false }): that
// pattern nests a second Suspense boundary (this component's) inside the page's
// own Suspense (around AppShell, needed for useSearchParams + static export) —
// on a hard/direct load, Next 16's Turbopack dev server streams the outer
// fallback but never resolves it, because the inner boundary's child never
// even attempts a server render (ssr:false skips it entirely server-side,
// unlike a normal async Suspense child that eventually flushes a result).
// Reproduced live: client-side nav to /template-builder/ worked, but a hard
// reload/direct URL hung forever on "Loading template builder...".
// This gates on `mounted` instead — the server (and first client paint, pre-
// hydration) always renders the SAME fallback synchronously, no suspending, so
// hydration never races the dynamic import; the code-split import kicks off
// in useEffect, strictly after mount.
import { useEffect, useState, type ComponentType } from "react";

export default function TemplateBuilderShell() {
  const [Client, setClient] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./TemplateBuilderClient").then((mod) => {
      if (!cancelled) setClient(() => mod.default);
    });
    return () => { cancelled = true; };
  }, []);

  if (!Client) return <TemplateBuilderShellFallback />;
  return <Client />;
}

function TemplateBuilderShellFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>
      <div style={{ width: 18, height: 18, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}
