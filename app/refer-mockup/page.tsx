"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";

type ScreenKey = "empty" | "live" | "ask" | "search";

const card: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
};

const field: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#f8fafc",
  padding: "12px 14px",
  fontSize: 14,
  color: "#111827",
};

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "blue" | "red" }) {
  const tones = {
    neutral: { background: "#f3f4f6", color: "#6b7280" },
    green: { background: "#dcfce7", color: "#15803d" },
    amber: { background: "#fef3c7", color: "#b45309" },
    blue: { background: "#dbeafe", color: "#2563eb" },
    red: { background: "#fee2e2", color: "#dc2626" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800, ...tones[tone] }}>
      {children}
    </span>
  );
}

function Primary({ children }: { children: ReactNode }) {
  return (
    <button type="button" style={{ border: "none", background: "linear-gradient(135deg, #3b82f6, #4f46e5)", color: "#fff", borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 14 }}>
      {children}
    </button>
  );
}

function Ghost({ children }: { children: ReactNode }) {
  return (
    <button type="button" style={{ border: "1px solid rgba(15,23,42,0.10)", background: "#fff", color: "#2563eb", borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 14 }}>
      {children}
    </button>
  );
}

function ScreenEmpty() {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={card}>
        <div style={{ padding: 26, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }} className="refer-mock-top">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #516b7b, #3f5563)", color: "#fff", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700 }}>P</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Parth Bhodia</div>
            <div style={{ marginTop: 4, color: "#6b7280", fontSize: 14 }}>Not signed up as a referrer yet</div>
          </div>
          <Pill tone="neutral">Paused</Pill>
        </div>
      </div>

      <div style={card}>
        <div style={{ padding: "28px 28px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#2563eb" }}>I can refer</div>
          <h2 style={{ margin: "10px 0 0", fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>Sign up to refer candidates at your company</h2>
          <p style={{ margin: "10px 0 0", maxWidth: 560, color: "#6b7280", lineHeight: 1.6 }}>
            Publish that you work there. Share a private link. People can ask you for a referral, and you decide who to submit.
          </p>
        </div>
        <div style={{ padding: "0 28px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="refer-mock-grid">
          <input readOnly value="Parth Bhodia" aria-label="Your name" style={field} />
          <input readOnly value="Acme" aria-label="Company" style={field} />
          <input readOnly value="Software Engineer" aria-label="Title" style={field} />
          <input readOnly value="linkedin.com/in/parth" aria-label="LinkedIn" style={field} />
          <input readOnly value="Backend, intern, and new-grad roles" aria-label="Roles I can refer for" style={{ ...field, gridColumn: "1 / -1" }} />
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Primary>Sign up as a referrer</Primary>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Mock action. No save in this preview.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestCard({
  name,
  role,
  note,
  status,
  tone,
}: {
  name: string;
  role: string;
  note: string;
  status: string;
  tone: "amber" | "blue" | "green";
}) {
  return (
    <div style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, padding: 16, background: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800 }}>{name}</div>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6b7280" }}>{role}</div>
        </div>
        <Pill tone={tone}>{status}</Pill>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 13, color: "#4b5563", lineHeight: 1.55 }}>{note}</p>
    </div>
  );
}

function ScreenLive() {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={card}>
        <div style={{ padding: 26, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }} className="refer-mock-top">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #516b7b, #3f5563)", color: "#fff", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700 }}>P</div>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>Parth Bhodia</div>
              <Pill tone="green">Open</Pill>
              <Pill tone="blue">Work email unverified</Pill>
            </div>
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>Software Engineer at Acme</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#4b5563" }}>Can refer for Backend, intern, and new-grad roles</div>
          </div>
          <Ghost>Pause requests</Ghost>
        </div>
      </div>

      <div style={card}>
        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Your referral link</div>
          <div style={{ display: "flex", gap: 10 }} className="refer-mock-stack">
            <div style={{ ...field, color: "#6b7280", flex: 1 }}>https://resunova.io/refer/?s=parth-at-acme</div>
            <Primary>Copy link</Primary>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9ca3af" }}>Share this privately. Candidates land on a one-page ask form, not your full profile.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 18 }} className="refer-mock-grid">
        <div style={card}>
          <div style={{ padding: "22px 22px 8px", display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Incoming requests</div>
              <div style={{ marginTop: 4, fontSize: 14, color: "#6b7280" }}>People asking you to refer them at Acme.</div>
            </div>
            <Pill tone="amber">3 open</Pill>
          </div>
          <div style={{ padding: 22, display: "grid", gap: 12 }}>
            <RequestCard name="Alex Kim" role="Backend Engineer" status="Requested" tone="amber" note="Applied last week. 4 years of Python/Django, wants an intro to the platform team." />
            <RequestCard name="Maya Shah" role="New grad SWE" status="Reviewing" tone="blue" note="UMBC 2026. Shared a GitHub with two internships. Asking if you can submit this week." />
            <RequestCard name="Jordan Lee" role="Intern, Summer 2027" status="Referred" tone="green" note="You already submitted this one on Monday." />
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={card}>
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>This month</div>
              <div style={{ display: "flex", marginTop: 18 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>3</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Requested</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb" }}>1</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Referred</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>2</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Slots left</div>
                </div>
              </div>
            </div>
          </div>
          <div style={card}>
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>I already referred someone</div>
              <p style={{ margin: "6px 0 14px", fontSize: 14, color: "#6b7280" }}>Log a candidate you submitted outside this page.</p>
              <div style={{ display: "grid", gap: 10 }}>
                <input readOnly value="" placeholder="Candidate name" style={field} />
                <input readOnly value="" placeholder="Role" style={field} />
                <Ghost>Log referral</Ghost>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenAsk() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "grid", gap: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#2563eb" }}>Employee referral</div>
      <div style={card}>
        <div style={{ padding: 26, display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #516b7b, #3f5563)", color: "#fff", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700 }}>P</div>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Ask Parth Bhodia for a referral at Acme</div>
              <Pill tone="green">Open</Pill>
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: "#6b7280" }}>Software Engineer. Backend, intern, and new-grad roles.</div>
          </div>
        </div>
      </div>
      <div style={card}>
        <div style={{ padding: 26, display: "grid", gap: 10 }}>
          <input readOnly placeholder="Your name" style={field} />
          <input readOnly placeholder="Your email" style={field} />
          <input readOnly placeholder="Role you want" style={field} />
          <input readOnly placeholder="LinkedIn or resume URL" style={field} />
          <textarea readOnly placeholder="3-line pitch: why this role, and why this company" rows={4} style={{ ...field, resize: "vertical" }} />
          <Primary>Ask for a referral</Primary>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>Parth sees this in their inbox. Resunova does not submit the referral into Acme&apos;s ATS for them.</p>
        </div>
      </div>
    </div>
  );
}

function ScreenSearch() {
  const people = [
    { name: "Parth Bhodia", title: "Software Engineer", roles: "Backend, intern, new-grad", open: true },
    { name: "Riley Chen", title: "Staff Engineer", roles: "Infrastructure and platform", open: true },
    { name: "Sam Ortiz", title: "Recruiter", roles: "All engineering roles", open: false },
  ];
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#2563eb" }}>Find a referrer</div>
        <h2 style={{ margin: "10px 0 0", fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>Employees at Acme who can refer</h2>
        <p style={{ margin: "10px 0 0", color: "#6b7280", maxWidth: 560, lineHeight: 1.6 }}>Search a company, then ask someone who has signed up. This is also what a job page can show: &quot;2 employees at Acme are open to referrals.&quot;</p>
      </div>
      <input readOnly value="Acme" aria-label="Company search" style={{ ...field, maxWidth: 420 }} />
      <div style={{ display: "grid", gap: 12 }}>
        {people.map((person) => (
          <div key={person.name} style={{ ...card, padding: 20, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center", opacity: person.open ? 1 : 0.55 }} className="refer-mock-top">
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e2e8f0", color: "#334155", display: "grid", placeItems: "center", fontWeight: 800 }}>{person.name[0]}</div>
            <div>
              <div style={{ fontWeight: 800 }}>{person.name}</div>
              <div style={{ marginTop: 3, fontSize: 13, color: "#6b7280" }}>{person.title} at Acme · {person.roles}</div>
            </div>
            {person.open ? <Primary>Ask for a referral</Primary> : <Pill>Paused</Pill>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReferMockupPage() {
  const [screen, setScreen] = useState<ScreenKey>("empty");
  const screens: Array<{ key: ScreenKey; label: string; hint: string }> = [
    { key: "empty", label: "1. Empty", hint: "Employee not signed up" },
    { key: "live", label: "2. Live inbox", hint: "Link + 3 requests" },
    { key: "ask", label: "3. Public ask", hint: "Candidate form" },
    { key: "search", label: "4. Find referrer", hint: "Company directory" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#111827" }}>
      <style>{`
        @media (max-width: 900px) {
          .refer-mock-grid { grid-template-columns: 1fr !important; }
          .refer-mock-top { grid-template-columns: 1fr !important; }
          .refer-mock-stack { flex-direction: column; }
        }
      `}</style>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#2563eb" }}>Mockup</div>
            <h1 style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 800, letterSpacing: -1.1 }}>Company referral desk</h1>
            <p style={{ margin: "10px 0 0", color: "#6b7280", maxWidth: 620, lineHeight: 1.6 }}>
              Employees sign up to refer candidates at their company. Candidates ask through a private link or a company search. No invite rewards in this product.
            </p>
          </div>
          <Link href="/profile-mockup" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>Profile mockup</Link>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {screens.map((item) => {
            const active = screen === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setScreen(item.key)}
                style={{
                  border: active ? "1px solid #2563eb" : "1px solid rgba(15,23,42,0.08)",
                  background: active ? "#eff6ff" : "#fff",
                  color: active ? "#2563eb" : "#4b5563",
                  borderRadius: 999,
                  padding: "10px 14px",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {item.label}
                <span style={{ marginLeft: 8, fontWeight: 600, opacity: 0.7 }}>{item.hint}</span>
              </button>
            );
          })}
        </div>

        {screen === "empty" ? <ScreenEmpty /> : null}
        {screen === "live" ? <ScreenLive /> : null}
        {screen === "ask" ? <ScreenAsk /> : null}
        {screen === "search" ? <ScreenSearch /> : null}
      </div>
    </div>
  );
}
