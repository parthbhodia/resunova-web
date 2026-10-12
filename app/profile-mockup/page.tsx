"use client";

import type { CSSProperties, ReactNode, SVGProps } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";

type TabKey = "usage" | "referrals" | "billing" | "alerts" | "integrations";

const surfaceCard: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
};

const iconSvgProps: SVGProps<SVGSVGElement> = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...surfaceCard, ...style }}>{children}</div>;
}

function TabIcon({ kind, active }: { kind: TabKey; active: boolean }) {
  const color = active ? "#2563eb" : "#6b7280";

  return (
    <span style={{ color, display: "inline-flex" }}>
      {kind === "usage" ? (
        <svg {...iconSvgProps}>
          <path d="M4 19h16" />
          <path d="M7 15V9" />
          <path d="M12 15V5" />
          <path d="M17 15v-3" />
        </svg>
      ) : null}
      {kind === "referrals" ? (
        <svg {...iconSvgProps}>
          <rect x="4" y="7" width="16" height="13" rx="2" />
          <path d="M12 7V5" />
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </svg>
      ) : null}
      {kind === "billing" ? (
        <svg {...iconSvgProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
      ) : null}
      {kind === "alerts" ? (
        <svg {...iconSvgProps}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10.7 21a2 2 0 0 0 2.6 0" />
        </svg>
      ) : null}
      {kind === "integrations" ? (
        <svg {...iconSvgProps}>
          <path d="M12 2v6" />
          <path d="M9 5h6" />
          <path d="M5 10v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4" />
        </svg>
      ) : null}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "24px 24px 20px",
        borderBottom: "1px solid rgba(15,23,42,0.07)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #5b5ce6, #3b82f6)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 10px 18px rgba(59,130,246,0.22)",
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.4, color: "#1f2937" }}>{title}</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "blue" | "red";
}) {
  const tones: Record<NonNullable<typeof tone>, CSSProperties> = {
    neutral: { background: "#f3f4f6", color: "#6b7280" },
    green: { background: "#dcfce7", color: "#15803d" },
    amber: { background: "#fef3c7", color: "#b45309" },
    blue: { background: "#dbeafe", color: "#2563eb" },
    red: { background: "#fee2e2", color: "#dc2626" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.01em",
        ...tones[tone],
      }}
    >
      {children}
    </span>
  );
}

function UsageBar({ segments, color }: { segments: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <span
          key={index}
          style={{
            width: 32,
            height: 5,
            borderRadius: 999,
            background: index < segments ? color : "#e5e7eb",
          }}
        />
      ))}
    </div>
  );
}

function UsageRow({
  title,
  subtitle,
  value,
  meta,
  badge,
  badgeTone,
  barColor,
  barSegments = 0,
  muted,
}: {
  title: string;
  subtitle: string;
  value: string;
  meta?: string;
  badge?: string;
  badgeTone?: "neutral" | "green" | "amber" | "blue" | "red";
  barColor?: string;
  barSegments?: number;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px minmax(0,1fr) auto",
        gap: 14,
        alignItems: "center",
        padding: "18px 12px",
        borderTop: "1px solid rgba(15,23,42,0.05)",
        opacity: muted ? 0.56 : 1,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: "#f3f4f6",
          color: "#6b7280",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg {...iconSvgProps} width={16} height={16}>
          <path d="M12 2v6" />
          <path d="M9 5h6" />
          <path d="m15.4 10.6 4.2 4.2" />
          <path d="m8.6 13.4-4.2 4.2" />
        </svg>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1f2937" }}>{title}</div>
          {badge ? <StatusPill tone={badgeTone}>{badge}</StatusPill> : null}
        </div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: "#6b7280" }}>{subtitle}</div>
        {meta ? <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>{meta}</div> : null}
      </div>
      <div style={{ minWidth: 120, textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#374151" }}>{value}</div>
        {barColor ? <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}><UsageBar segments={barSegments} color={barColor} /></div> : null}
      </div>
    </div>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.3, color: accent ? "#2563eb" : "#111827" }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 14, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function FeatureItem({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: muted ? "#9ca3af" : "#4b5563" }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: muted ? "#f3f4f6" : "#dcfce7",
          color: muted ? "#cbd5e1" : "#22c55e",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <svg {...iconSvgProps} width={11} height={11}>
          {muted ? <path d="M6 6h.01" /> : <path d="m5 9 2 2 5-5" />}
        </svg>
      </span>
      <span style={{ fontSize: 14 }}>{children}</span>
    </div>
  );
}

function UsageContent() {
  return (
    <Card>
      <SectionHeader
        icon={
          <svg {...iconSvgProps}>
            <path d="M4 19h16" />
            <path d="M7 15V9" />
            <path d="M12 15V5" />
            <path d="M17 15v-3" />
          </svg>
        }
        title="Usage & Limits"
        subtitle="One-time limits. Super Apply credits come with your plan."
        action={
          <button
            style={{
              border: "none",
              background: "#22c55e",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 16px",
              fontWeight: 800,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            Upgrade to Pro
          </button>
        }
      />

      <div style={{ padding: "0 20px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 8px 10px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: "#9ca3af",
          }}
        >
          <span>PLATFORM</span>
          <span>resunova.io</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }} className="profile-mock-grid-two">
          <div>
            <UsageRow
              title="Super Apply"
              subtitle="Applications sent to the hiring team from your own Gmail. One credit per job."
              meta="3-40 credits with every plan"
              badge="PRO"
              badgeTone="green"
              value=""
            />
            <UsageRow
              title="ATS Checks"
              subtitle="Base resume and ATS analysis. Re-score and tailor copies do not count here."
              badge="OVER LIMIT"
              badgeTone="red"
              value="4 / 1"
              barColor="#ef4444"
              barSegments={3}
            />
            <UsageRow
              title="Job Tailored Resumes"
              subtitle="Copies of a base resume rewritten for one job description."
              badge="OVER LIMIT"
              badgeTone="red"
              value="3 / 2"
              barColor="#ef4444"
              barSegments={3}
            />
          </div>

          <div>
            <UsageRow
              title="ATS Fixes"
              subtitle="AI rewrites applied from the ATS results page. One per parameter you fix."
              value="0 / 3"
              barColor="#d1d5db"
              barSegments={0}
            />
            <UsageRow
              title="Job Tailored Fixes"
              subtitle="AI rewrites applied on the tailor page. Qualifications and keywords combined."
              badge="Unlimited"
              badgeTone="blue"
              value=""
            />
            <UsageRow
              title="Ask for Referrals"
              subtitle="Outreach messages drafted for you, ready to send from the extension."
              value="0 / 2"
              barColor="#d1d5db"
              barSegments={0}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReferralContent() {
  return (
    <Card style={{ overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #0f62f0 100%)", color: "#fff", padding: "30px 28px 28px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.24em", textTransform: "uppercase", opacity: 0.84, marginBottom: 18 }}>Refer & earn</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }} className="profile-mock-grid-two">
          <div>
            <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: -2.2, lineHeight: 0.9 }}>20%</div>
            <div style={{ marginTop: 10, fontSize: 15, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85 }}>off for your friend</div>
          </div>
          <div style={{ borderLeft: "1px dashed rgba(255,255,255,0.38)", paddingLeft: 28 }}>
            <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: -2.2, lineHeight: 0.9 }}>+7</div>
            <div style={{ marginTop: 10, fontSize: 15, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85 }}>days of Pro for you</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
          <div style={{ border: "1px dashed rgba(255,255,255,0.55)", borderRadius: 12, padding: "14px 16px", fontWeight: 800, letterSpacing: "0.22em", minWidth: 164, textAlign: "center" }}>W8MPDJ</div>
          <button style={{ border: "none", borderRadius: 12, padding: "14px 18px", background: "#ffffff", color: "#2563eb", fontWeight: 800 }}>Copy referral link</button>
        </div>
        <div style={{ marginTop: 14, fontSize: 14, opacity: 0.9 }}>They buy any monthly Pro plan and your 7 days activate instantly. No card needed.</div>
      </div>

      <div style={{ padding: "18px 22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 20, borderBottom: "1px solid rgba(15,23,42,0.08)", flexWrap: "wrap" }}>
          <Metric value="0" label="Total referred" />
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(15,23,42,0.08)" }} />
          <Metric value="0" label="On Pro" />
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(15,23,42,0.08)" }} />
          <Metric value="0" label="Pro days earned" accent />
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 10 }}>Your referral link</div>
          <div style={{ display: "flex", gap: 10 }} className="profile-mock-stack-mobile">
            <div
              style={{
                flex: 1,
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,0.08)",
                background: "#f8fafc",
                padding: "14px 16px",
                color: "#6b7280",
              }}
            >
              https://resunova.io/?ref=W8MPDJ
            </div>
            <button style={{ border: "none", borderRadius: 12, background: "#2563eb", color: "#fff", padding: "14px 18px", fontWeight: 800 }}>Copy</button>
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
            The 20% discount and 7-day reward apply to monthly Pro plans only. Mock values shown for layout review.
          </p>
        </div>
      </div>
    </Card>
  );
}

function BillingContent() {
  return (
    <Card>
      <SectionHeader
        icon={
          <svg {...iconSvgProps}>
            <path d="M12 2v4" />
            <path d="m9 5 3-3 3 3" />
            <path d="M6 12h.01" />
            <path d="M18 12h.01" />
            <path d="m7.5 15 1.5-6 3 2 3-2 1.5 6" />
          </svg>
        }
        title="Subscription & Billing"
        subtitle="You're on the Free plan."
      />
      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="profile-mock-grid-two">
        <div style={{ ...surfaceCard, boxShadow: "none", borderColor: "rgba(15,23,42,0.08)", padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Free plan</div>
            <StatusPill tone="green">Current</StatusPill>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FeatureItem>1 Base Resume</FeatureItem>
            <FeatureItem>5 Resume Score Checks / mo</FeatureItem>
            <FeatureItem muted>Job Tailored Resumes</FeatureItem>
            <FeatureItem muted>Full AI Analysis & Fixes</FeatureItem>
          </div>
          <div style={{ marginTop: 26, paddingTop: 14, borderTop: "1px solid rgba(15,23,42,0.07)", fontSize: 13, color: "#d1d5db", textAlign: "center" }}>
            Free forever · No card needed
          </div>
        </div>

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 18,
            border: "1px solid rgba(59,130,246,0.16)",
            background: "linear-gradient(180deg, rgba(59,130,246,0.10), rgba(59,130,246,0.03))",
            padding: 22,
          }}
        >
          <div style={{ position: "absolute", right: -6, top: -10, fontSize: 76, fontWeight: 800, color: "rgba(99,102,241,0.07)" }}>M</div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #5b5ce6, #3b82f6)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <svg {...iconSvgProps} width={14} height={14}>
                  <path d="m13 3-7 10h5l-1 8 7-10h-5l1-8Z" />
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Resunova Pro</div>
            </div>
            <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 16 }}>Everything you need to land more interviews.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FeatureItem>Unlimited Job Tailored Resumes</FeatureItem>
              <FeatureItem>Unlimited Resume Score Checks</FeatureItem>
              <FeatureItem>Full AI Resume Analysis & Fixes</FeatureItem>
              <FeatureItem>Priority support</FeatureItem>
            </div>
            <button
              style={{
                marginTop: 24,
                width: "100%",
                border: "none",
                borderRadius: 12,
                padding: "15px 18px",
                background: "#10b981",
                color: "#fff",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              Upgrade · from $24.99/mo
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PlaceholderContent({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <SectionHeader
        icon={
          <svg {...iconSvgProps}>
            <circle cx="12" cy="12" r="9" />
          </svg>
        }
        title={title}
        subtitle="Mock section for information architecture review."
      />
      <div style={{ padding: 24, fontSize: 15, color: "#6b7280", lineHeight: 1.7 }}>{body}</div>
    </Card>
  );
}

export default function ProfileMockupPage() {
  const [tab, setTab] = useState<TabKey>("usage");

  const panel = useMemo(() => {
    switch (tab) {
      case "usage":
        return <UsageContent />;
      case "referrals":
        return <ReferralContent />;
      case "billing":
        return <BillingContent />;
      case "alerts":
        return (
          <PlaceholderContent
            title="Job alerts"
            body="This tab can hold saved alert rules, email cadence, locations, salary filters, and role preferences."
          />
        );
      case "integrations":
        return (
          <PlaceholderContent
            title="Integrations"
            body="This tab can hold LinkedIn, Gmail, calendar, Chrome extension, and ATS sync settings once those flows are ready."
          />
        );
    }
  }, [tab]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "usage", label: "Usage" },
    { key: "referrals", label: "Referrals" },
    { key: "billing", label: "Billing" },
    { key: "alerts", label: "Job alerts" },
    { key: "integrations", label: "Integrations" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#111827" }}>
      <style>{`
        @media (max-width: 900px) {
          .profile-mock-grid-two { grid-template-columns: 1fr !important; }
          .profile-mock-stack-mobile { flex-direction: column; }
          .profile-mock-top-card { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#2563eb", marginBottom: 8 }}>Mockup</div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: -1.1, color: "#111827" }}>Account profile hub</h1>
          </div>
          <Link href="/" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>Back to app</Link>
        </div>

        <Card style={{ padding: 26, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 18, alignItems: "center" }} className="profile-mock-top-card">
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #516b7b, #3f5563)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 36,
                fontWeight: 700,
                boxShadow: "0 12px 24px rgba(15,23,42,0.14)",
              }}
            >
              P
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, color: "#111827" }}>Parth Bhodia</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6, alignItems: "center", color: "#6b7280", fontSize: 14 }}>
                <span>parthbhodia08@gmail.com</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "#4b5563", fontWeight: 600 }}>Free Plan</span>
                <StatusPill tone="green">Upgrade</StatusPill>
              </div>
            </div>
            <button
              style={{
                justifySelf: "end",
                border: "1px solid #fecaca",
                color: "#ef4444",
                background: "#ffffff",
                borderRadius: 12,
                padding: "12px 18px",
                fontWeight: 700,
              }}
            >
              Sign Out
            </button>
          </div>
        </Card>

        <Card style={{ padding: 18, marginBottom: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 16, alignItems: "center" }} className="profile-mock-top-card">
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#eaf1ff",
                color: "#2563eb",
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg {...iconSvgProps} width={24} height={24}>
                <path d="M9 12h6" />
                <path d="M9 16h6" />
                <path d="M9 8h6" />
                <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>Application profile</div>
                <StatusPill tone="amber">Incomplete</StatusPill>
              </div>
              <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.55 }}>
                The details employers ask for - contact, education, work history, skills and eligibility - so we can autofill job applications on your behalf.
              </div>
            </div>
            <button
              style={{
                justifySelf: "end",
                border: "none",
                background: "linear-gradient(135deg, #3b82f6, #4f46e5)",
                color: "#fff",
                borderRadius: 12,
                padding: "14px 20px",
                fontWeight: 800,
                boxShadow: "0 12px 24px rgba(59,130,246,0.18)",
              }}
            >
              Complete profile
            </button>
          </div>
        </Card>

        <div style={{ display: "flex", gap: 28, alignItems: "center", borderBottom: "1px solid rgba(15,23,42,0.08)", marginBottom: 20, overflowX: "auto", padding: "0 4px" }}>
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                style={{
                  appearance: "none",
                  border: "none",
                  background: "transparent",
                  borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
                  color: active ? "#2563eb" : "#6b7280",
                  fontSize: 15,
                  fontWeight: 700,
                  padding: "14px 0 13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <TabIcon kind={item.key} active={active} />
                {item.label}
              </button>
            );
          })}
        </div>

        {panel}
      </div>
    </div>
  );
}
