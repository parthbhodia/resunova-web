import type { ReactNode } from "react";

/**
 * Faithful, theme-aware reproductions of Resunova's real product UI
 * (ScoreRing, MatchBreakdownCards gap rows, keyword matching, bullet
 * rewrites). Rendered inline so they inherit the blog's CSS variables and
 * look correct in both light and dark mode. Used as "product screenshots"
 * inside blog articles.
 */

/* ── App chrome so the visuals read as real product screenshots ───────── */
export function ProductFrame({
  label,
  ariaLabel,
  children,
}: {
  label: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }} aria-hidden>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f87171" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e3b341" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#34d399" }} />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--dim)",
            letterSpacing: -0.1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ color: "var(--accent)", fontWeight: 800 }}>Resunova</span>
          <span aria-hidden>·</span>
          {label}
        </span>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

/* ── Static ScoreRing (matches components/ScoreRing.tsx) ───────────────── */
function StaticRing({ score, size = 104 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const color = score >= 75 ? "var(--green)" : score >= 55 ? "var(--yellow)" : "var(--red)";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }} aria-hidden>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
        />
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <div style={{ lineHeight: 1 }}>
          <span style={{ fontSize: 27, fontWeight: 700, letterSpacing: -1.5, color }}>{score}</span>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>/100</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>Match score</div>
      </div>
    </div>
  );
}

/* ── 1. Match score result header ─────────────────────────────────────── */
export function MatchScoreShot() {
  const stats = [
    { label: "Keywords present", value: "31 / 36", color: "var(--green)" },
    { label: "Required terms hit", value: "12 / 14", color: "var(--green)" },
    { label: "Gaps to fix", value: "2", color: "var(--yellow)" },
  ];
  return (
    <ProductFrame label="Match report" ariaLabel="Resunova match report showing an 87 out of 100 match score against a job description, with 31 of 36 keywords present and 2 gaps to fix.">
      <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
        <StaticRing score={87} />
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "var(--green-bg)", color: "var(--green)", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            ● Strong match — interview-ready
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

/* ── 2. Gap analysis rows (matches MatchBreakdownCards) ────────────────── */
function WeightChip({ w }: { w: "High" | "Med" | "Low" }) {
  const map = {
    High: { bg: "rgba(245, 158, 11, 0.14)", color: "var(--orange)" },
    Med: { bg: "var(--yellow-bg)", color: "var(--yellow)" },
    Low: { bg: "var(--surface3)", color: "var(--muted)" },
  } as const;
  const c = map[w];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: c.bg, color: c.color }}>
      {w}
    </span>
  );
}

function GapRow({
  name,
  weight,
  score,
  fixed,
  action,
}: {
  name: string;
  weight: "High" | "Med" | "Low";
  score: number;
  fixed?: boolean;
  action?: boolean;
}) {
  const sc = score >= 7.5 ? "var(--green)" : score >= 5.5 ? "var(--yellow)" : "var(--red)";
  const weak = score <= 5;
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${fixed ? "rgba(52,211,153,0.35)" : weak ? "rgba(248,113,113,0.22)" : "var(--border)"}`,
        background: fixed ? "rgba(52,211,153,0.04)" : weak ? "rgba(248,113,113,0.04)" : "var(--surface2)",
        padding: "11px 13px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: -0.3 }}>{name}</span>
          {fixed && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(52,211,153,0.18)", color: "var(--green-ink, #34d399)" }}>
              ✓ Fixed
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <WeightChip w={weight} />
          <span style={{ fontSize: 14, fontWeight: 700, color: sc, minWidth: 36 }}>{score}/10</span>
          <div style={{ width: 52, height: 4, borderRadius: 2, background: "rgba(148,163,184,0.35)", overflow: "hidden" }} aria-hidden>
            <div style={{ width: `${score * 10}%`, height: "100%", background: sc }} />
          </div>
        </div>
      </div>
      {action && !fixed ? (
        <div style={{ marginTop: 9 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 11px",
              borderRadius: 7,
              border: "1px solid rgba(59,130,246,0.4)",
              background: "rgba(59,130,246,0.1)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Fix this gap →
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function GapAnalysisShot() {
  return (
    <ProductFrame
      label="Gap analysis"
      ariaLabel="Resunova gap analysis: Technical skills scores 9 out of 10, Data pipeline / ETL is marked fixed, Cloud infrastructure scores 7 out of 10, and Stakeholder management scores 4 out of 10 with a Fix this gap button."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <GapRow name="Technical skills (Python, SQL)" weight="High" score={9} />
        <GapRow name="Data pipeline / ETL" weight="High" score={8} fixed />
        <GapRow name="Cloud infrastructure (AWS)" weight="Med" score={7} />
        <GapRow name="Stakeholder management" weight="High" score={4} action />
      </div>
    </ProductFrame>
  );
}

/* ── 3. Keyword match chips ────────────────────────────────────────────── */
function Chip({ text, kind }: { text: string; kind: "hit" | "miss" }) {
  const hit = kind === "hit";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${hit ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"}`,
        background: hit ? "var(--green-bg)" : "var(--red-bg)",
        color: hit ? "var(--green-ink, #34d399)" : "var(--red-ink, #f87171)",
      }}
    >
      <span aria-hidden style={{ fontSize: 11 }}>{hit ? "✓" : "+"}</span>
      {text}
    </span>
  );
}

export function KeywordMatchShot() {
  const hits = ["Python", "SQL", "Airflow", "ETL pipeline", "A/B testing", "roadmap", "stakeholder"];
  const misses = ["Kubernetes", "Terraform", "SLA"];
  return (
    <ProductFrame
      label="Keyword match"
      ariaLabel="Resunova keyword match: seven matched keywords including Python, SQL and Airflow, and three keywords missing from the resume — Kubernetes, Terraform and SLA."
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--green)", marginBottom: 9 }}>
          Matched in your resume
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {hits.map((t) => (
            <Chip key={t} text={t} kind="hit" />
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--red)", marginBottom: 9 }}>
          Missing — add these
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {misses.map((t) => (
            <Chip key={t} text={t} kind="miss" />
          ))}
        </div>
      </div>
    </ProductFrame>
  );
}

/* ── 4. Bullet rewrite before / after ─────────────────────────────────── */
export function BulletRewriteShot() {
  return (
    <ProductFrame
      label="Bullet rewrite"
      ariaLabel="Resunova bullet rewrite turning the weak line 'Responsible for managing the data pipeline' into a strong, quantified bullet about redesigning an ETL pipeline in Python and Airflow."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            borderRadius: 10,
            border: "1px solid rgba(248,113,113,0.25)",
            background: "var(--red-bg)",
            padding: "11px 13px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--red)", marginBottom: 5 }}>
            Before
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
            Responsible for managing the data pipeline.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", color: "var(--accent)", fontSize: 13, fontWeight: 700 }} aria-hidden>
          ↓ Rewritten for this role
        </div>
        <div
          style={{
            borderRadius: 10,
            border: "1px solid rgba(52,211,153,0.3)",
            background: "var(--green-bg)",
            padding: "11px 13px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--green)", marginBottom: 5 }}>
            After
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text)", lineHeight: 1.5, fontWeight: 500 }}>
            Redesigned ETL pipeline in <strong>Python/Airflow</strong>, cutting data latency from{" "}
            <strong>4 hours to 15 minutes</strong> and unblocking <strong>5 downstream ML teams</strong>.
          </p>
        </div>
      </div>
    </ProductFrame>
  );
}
