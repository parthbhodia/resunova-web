"use client";

import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogoFull } from "@/components/BrandLogo";
import {
  REFERRER_LIMITS,
  createReferralRequest,
  fetchReferrerBySlug,
  referrerInitials,
  safeHttpUrl,
  searchOpenReferrers,
  type CompanyReferrer,
} from "@/lib/companyReferrers";
import { ReferrerName } from "@/components/refer/ReferrerName";
import { useSignInDialog } from "@/components/SignInDialog";
import { getSupabaseClient } from "@/lib/supabase";

const cardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-card)",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface2)",
  padding: "12px 14px",
  fontSize: 14,
  color: "var(--text)",
  fontFamily: "inherit",
};

function Pill({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "neutral" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 800,
        background: tone === "green" ? "var(--green-bg)" : "var(--surface2)",
        color: tone === "green" ? "var(--green-ink)" : "var(--muted)",
      }}
    >
      {children}
    </span>
  );
}

export default function ReferPublicPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "var(--muted)" }}>Loading referral page…</div>}>
      <ReferPageInner />
    </Suspense>
  );
}

function ReferPageInner() {
  const params = useSearchParams();
  const slug = (params?.get("s") ?? "").trim();
  const [referrer, setReferrer] = useState<CompanyReferrer | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetchReferrerBySlug(slug).then((next) => {
      if (cancelled) return;
      setReferrer(next);
      setMissing(!next);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <Link href="/" aria-label="Resunova home" style={{ display: "inline-flex", textDecoration: "none", color: "inherit" }}>
          <LogoFull markSize={28} />
        </Link>
        {loading ? (
          <p style={{ marginTop: 28, color: "var(--muted)" }}>Loading…</p>
        ) : slug && missing ? (
          <div style={{ marginTop: 28 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>This referral link is not active.</h1>
            <p style={{ marginTop: 10, color: "var(--muted)", lineHeight: 1.6 }}>The employee may have turned off requests, or the link is wrong.</p>
            <FindReferrer />
          </div>
        ) : referrer ? (
          <ReferrerRequestForm referrer={referrer} />
        ) : (
          <FindReferrer />
        )}
      </div>
    </div>
  );
}

function FindReferrer() {
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<{ q: string; rows: CompanyReferrer[] } | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchOpenReferrers(q).then((next) => {
        if (cancelled) return;
        setFetched({ q, rows: next });
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);
  const q = query.trim();
  const searching = q.length >= 2;
  const loading = searching && fetched?.q !== q;
  const results = searching && fetched?.q === q ? fetched.rows : [];

  return (
    <div style={{ marginTop: 28, display: "grid", gap: 18 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent-ink)" }}>Find a referrer</div>
        <h1 style={{ margin: "10px 0 0", fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>Ask an employee for a referral</h1>
        <p style={{ marginTop: 10, color: "var(--muted)", lineHeight: 1.6, maxWidth: 560 }}>
          Search a company to find people who have signed up to refer candidates. If you work somewhere, publish your own profile from Profile, then Referrals.
        </p>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Company name"
        aria-label="Company name"
        style={{ ...fieldStyle, maxWidth: 420 }}
      />
      <div style={{ display: "grid", gap: 12 }}>
        {searching && loading ? <p style={{ color: "var(--muted)" }}>Searching…</p> : null}
        {searching && !loading && results.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No open referrers for that company yet.</p>
        ) : null}
        {(searching ? results : []).map((row) => (
          <Link
            key={row.id}
            href={`/refer/?s=${encodeURIComponent(row.slug)}`}
            style={{ ...cardStyle, padding: 20, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center", textDecoration: "none", color: "inherit" }}
          >
            <div
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--surface3)",
                color: "var(--text)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              {referrerInitials(row.displayName)}
            </div>
            <div>
              <div style={{ fontWeight: 800 }}>
                <ReferrerName name={row.displayName} count={row.referredCount ?? 0} />
              </div>
              <div style={{ marginTop: 3, fontSize: 13, color: "var(--muted)" }}>
                {row.title} at {row.company}{row.bio ? ` · ${row.bio}` : ""}
              </div>
            </div>
            <span style={{ border: "none", background: "var(--accent)", color: "var(--on-fill)", borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 14 }}>
              Ask for a referral
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ReferrerRequestForm({ referrer }: { referrer: CompanyReferrer }) {
  const { openSignIn } = useSignInDialog();
  const [form, setForm] = useState({ name: "", email: "", linkedin: "", role: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSaving(true);
    setError(null);
    let signedIn = false;
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      signedIn = !!session?.user;
    } catch {
      signedIn = false;
    }
    if (!signedIn) {
      setSaving(false);
      openSignIn({ ask: "referral_ask" });
      return;
    }
    const stillOpen = await fetchReferrerBySlug(referrer.slug);
    if (!stillOpen) {
      setSaving(false);
      setError("This referral link is not active.");
      return;
    }
    const { request, error: writeError } = await createReferralRequest({
      referrerId: referrer.id,
      candidateName: form.name,
      candidateEmail: form.email,
      candidateLinkedin: form.linkedin,
      role: form.role,
      notes: form.notes,
      source: "request",
    });
    setSaving(false);
    if (!request) {
      setError(writeError ?? "Could not send this request. Add your name, a valid email, and the role you want.");
      return;
    }
    setDone(true);
  };
  const linkedinHref = safeHttpUrl(referrer.linkedin);

  return (
    <div style={{ marginTop: 28, display: "grid", gap: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent-ink)" }}>Employee referral</div>
      <div style={cardStyle}>
        <div style={{ padding: 26, display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}>
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--surface3)",
              color: "var(--text)",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {referrerInitials(referrer.displayName)}
          </div>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                <ReferrerName name={referrer.displayName} count={referrer.referredCount ?? 0} />
              </div>
              <Pill>Open</Pill>
            </div>
            <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700 }}>
              Ask for a referral at {referrer.company}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: "var(--muted)" }}>
              {referrer.title}{referrer.bio ? `. ${referrer.bio}` : ". They signed up to refer candidates at this company."}
            </div>
            {linkedinHref ? (
              <a href={linkedinHref} style={{ color: "var(--accent-ink)", fontWeight: 700, fontSize: 14 }} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {done ? (
        <div style={{ ...cardStyle, padding: 26 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Request sent</div>
          <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
            {referrer.displayName} will see this on their Referrals tab and can mark it referred if they submit you.
            Track it on your profile.
          </p>
          <Link href="/profile?tab=referrals" style={{ display: "inline-block", marginTop: 12, color: "var(--accent-ink)", fontWeight: 800, textDecoration: "none" }}>
            View your requests
          </Link>
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 26, display: "grid", gap: 10 }}>
          <input aria-label="Your name" placeholder="Your name" maxLength={REFERRER_LIMITS.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldStyle} />
          <input aria-label="Your email" type="email" placeholder="Your email" maxLength={REFERRER_LIMITS.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={fieldStyle} />
          <input aria-label="Role you want" placeholder="Role you want" maxLength={REFERRER_LIMITS.role} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={fieldStyle} />
          <input aria-label="LinkedIn or resume URL" placeholder="LinkedIn or resume URL" maxLength={REFERRER_LIMITS.url} value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} style={fieldStyle} />
          <textarea
            aria-label="Note to the referrer"
            placeholder="3-line pitch: why this role, and why this company"
            maxLength={REFERRER_LIMITS.notes}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={4}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
          {error ? <p role="alert" style={{ margin: 0, color: "var(--red-ink)", fontSize: 13 }}>{error}</p> : null}
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={saving}
            style={{
              border: "none",
              background: "var(--accent)",
              color: "var(--on-fill)",
              borderRadius: 12,
              padding: "14px 16px",
              fontWeight: 800,
            }}
          >
            {saving ? "Sending..." : "Ask for a referral"}
          </button>
          <p style={{ margin: 0, fontSize: 12, color: "var(--dim)", lineHeight: 1.6 }}>
            Sign in to send this. {referrer.displayName} sees it in their inbox. Resunova does not submit the referral into {referrer.company}&apos;s ATS for them.
          </p>
        </div>
      )}
    </div>
  );
}
