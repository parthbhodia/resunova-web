"use client";

import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogoFull } from "@/components/BrandLogo";
import {
  REFERRER_LIMITS,
  clip,
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
      <style>{`
        @media (max-width: 680px) {
          .rn-refer-steps { grid-template-columns: minmax(0, 1fr) !important; }
          .rn-refer-two { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>
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
        <span style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", background: "var(--accent-bg)", color: "var(--accent-ink)", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 700 }}>Referrals</span>
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

/**
 * A labelled field.
 *
 * ⚠️ Placeholder-as-label disappears the moment you type, so you cannot check
 * your own form before sending it — and on this page two of the fields are the
 * ones the employee judges you on. `aria-label` covered screen readers and
 * left sighted users with five identical grey boxes.
 */
function Field({
  label,
  hint,
  hintId,
  children,
}: {
  label: string;
  hint?: string;
  /**
   * ⚠️ THE HINT LIVES OUTSIDE THE <label>, and a test is what found that out.
   * The first draft wrapped label + input + hint in one `<label>`, which makes
   * the hint part of the field's ACCESSIBLE NAME — a screen reader announced
   * "LinkedIn or résumé link Optional, but it is what they will actually
   * open." as the name of the box. A hint is a description, so it gets an id
   * and the caller points `aria-describedby` at it.
   */
  hintId?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 5 }}>
          {label}
        </span>
        {children}
      </label>
      {hint ? (
        <p id={hintId} style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.55, color: "var(--dim)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * What happens after you press send.
 *
 * ⚠️ THE MECHANISM IS THE REASSURANCE. Nobody fills in a form for a stranger
 * without knowing who reads it, and the unspoken question on this page is
 * whether this is an application or a favour. It is a favour — the employee
 * decides — and saying so is both the honest frame and the credible one. All
 * three steps describe what the shipped code actually does.
 */
function Steps({ steps }: { steps: Array<{ title: string; body: string }> }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))`,
        gap: 1,
        background: "var(--border)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
      className="rn-refer-steps"
    >
      {steps.map((step, i) => (
        <div key={step.title} style={{ background: "var(--surface)", padding: "16px 18px 18px" }}>
          <span
            aria-hidden
            style={{
              display: "grid",
              placeItems: "center",
              width: 22,
              height: 22,
              borderRadius: 999,
              background: "var(--accent-bg)",
              color: "var(--accent-ink)",
              fontSize: 11,
              fontWeight: 800,
              marginBottom: 9,
            }}
          >
            {i + 1}
          </span>
          <b style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            {step.title}
          </b>
          <span style={{ fontSize: 12, lineHeight: 1.55, color: "var(--muted)" }}>{step.body}</span>
        </div>
      ))}
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

  /**
   * ⚠️ THE TAB TITLE ONLY, and that limit is the point. This is a static
   * export and the slug is a query param, so the prerendered `<title>` is the
   * same generic string for every referrer and a crawler or link-unfurler
   * never runs this. Setting it client-side helps a person with eight tabs
   * open; it does NOT make a shared link preview as this person. Doing that
   * needs a server render, which GitHub Pages cannot give us.
   */
  useEffect(() => {
    const previous = document.title;
    document.title = `${referrer.displayName} can refer at ${referrer.company} · Resunova`;
    return () => {
      document.title = previous;
    };
  }, [referrer.displayName, referrer.company]);

  return (
    <div style={{ marginTop: 28, display: "grid", gap: 18 }}>
      <div>
        {/* Names the destination, so a shared link does not open on a generic
            page. The eyebrow carries the company; the headline carries the
            person, which is the only thing here that makes the form worth
            filling in. The shipped version led with "EMPLOYEE REFERRAL" and
            buried "Ask for a referral at {company}" as a card's third line. */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--accent-bg)",
            color: "var(--accent-ink)",
            borderRadius: 999,
            padding: "5px 11px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Referral · {referrer.company}
        </span>
        <h1
          style={{
            margin: "14px 0 0",
            fontSize: 30,
            lineHeight: 1.16,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            textWrap: "balance",
          }}
        >
          {referrer.displayName} can refer at {referrer.company}.
        </h1>
        {/* ⚠️ "They decide" appears here AND as step 2, deliberately. It is the
            answer to the question this page does not ask out loud: is this an
            application or a favour? */}
        <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.65, color: "var(--muted)", maxWidth: "52ch" }}>
          They opened their desk, so this ask goes straight to them. They decide whether to submit you.
        </p>
      </div>
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
              {[referrer.title, referrer.bio || "They signed up to refer candidates at this company."]
                .map((part) => (part || "").trim())
                .filter(Boolean)
                .join(". ")}
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
        <>
          <div style={{ ...cardStyle, padding: 26, display: "grid", gap: 14 }}>
            <div className="rn-refer-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Your name">
                <input placeholder="Alex Mensah" maxLength={REFERRER_LIMITS.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldStyle} />
              </Field>
              <Field label="Your email">
                <input type="email" placeholder="you@example.com" maxLength={REFERRER_LIMITS.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={fieldStyle} />
              </Field>
            </div>
            <Field label="Role you want">
              <input placeholder={`e.g. Senior Engineer at ${referrer.company}`} maxLength={REFERRER_LIMITS.role} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={fieldStyle} />
            </Field>
            {/* Both hints are true of what the employee actually does, and
                neither is a statistic we cannot source. */}
            <Field label="LinkedIn or résumé link" hint="Optional, but it is what they will actually open." hintId="rn-refer-link-hint">
              <input aria-describedby="rn-refer-link-hint" placeholder="https://linkedin.com/in/…" maxLength={REFERRER_LIMITS.url} value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} style={fieldStyle} />
            </Field>
            <Field label="Why this role, in three lines" hint="They read this before anything else. Specific beats polished." hintId="rn-refer-pitch-hint">
              <textarea
                aria-describedby="rn-refer-pitch-hint"
                placeholder="What you have shipped that is close to this work, and why this team."
                maxLength={REFERRER_LIMITS.notes}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                style={{ ...fieldStyle, resize: "vertical" }}
              />
            </Field>
            {error ? <p role="alert" style={{ margin: 0, color: "var(--red-ink)", fontSize: 13 }}>{error}</p> : null}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={saving}
                style={{
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-fill)",
                  borderRadius: 10,
                  padding: "13px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Sending…" : `Send to ${clip(referrer.displayName, 28)}`}
              </button>
              <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                Goes only to them. You can track it on your profile.
              </span>
            </div>
          </div>

          <Steps
            steps={[
              {
                title: "You send it",
                body: `It appears in ${referrer.displayName}'s inbox. Nobody else at ${referrer.company} sees it.`,
              },
              {
                title: "They review",
                body: "They may mark it reviewing while they look, or decline — both are honest answers.",
              },
              {
                title: "Referred",
                body: "If they submit you internally they mark it referred, and your profile shows that.",
              },
            ]}
          />

          {/* Kept verbatim from the shipped page: it is the one claim on here
              that bounds what the product does, and it must not be softened. */}
          <p style={{ margin: 0, fontSize: 12, color: "var(--dim)", lineHeight: 1.6 }}>
            Resunova never writes into {referrer.company}&apos;s applicant system. A referral is one person
            choosing to vouch for another.
          </p>
        </>
      )}
    </div>
  );
}
