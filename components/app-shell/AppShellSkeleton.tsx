/**
 * First paint of the whole app.
 *
 * Both entry points into the signed-in shell used to render a centred spinner
 * on an empty page — `AuthGate` while the Supabase session resolved, and
 * `HomePageClient`'s Suspense boundary. Between them that was the most-seen
 * loading state in the product, and the one that made the app read as
 * unfinished.
 *
 * This traces the shell that follows instead — sidebar rail, page heading, KPI
 * row, content blocks — so the layout arrives before the data and nothing
 * jumps when it lands. The rail is hidden under 768px, where the real sidebar
 * is off-canvas and drawing one would promise a column that never appears.
 */
export default function AppShellSkeleton() {
  const block = (style: React.CSSProperties): React.CSSProperties => ({
    // --surface3 rather than --surface2: at 1-step contrast the blocks were
    // barely distinguishable from the page and read as an empty screen.
    background: "var(--surface3)",
    borderRadius: 8,
    // A slow pulse is what separates "loading" from "broken". The global
    // reduced-motion guard in globals.css stops it for users who ask.
    animation: "pulse-bg 1.6s ease-in-out infinite",
    ...style,
  });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Resunova"
      style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}
    >
      <div
        className="rn-shell-skel-rail"
        style={{
          width: "var(--sidebar-w, 232px)",
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={block({ height: 26, width: 128, marginBottom: 12 })} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={block({ height: 32, opacity: 0.7 })} />
        ))}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={block({ height: 30, width: 220 })} />
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={block({ height: 84 })} />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={block({ height: 92, opacity: 0.85 })} />
        ))}
      </div>
      <span className="sr-only">Loading Resunova</span>
    </div>
  );
}
