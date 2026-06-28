import React, { useState, useCallback } from "react";
import { useCoverLetterStore } from "@/store/coverLetterStore";
import { CL_TEMPLATES } from "./types";
import { apiUrl } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";
import { useSupabaseSignedIn } from "@/hooks/useSupabaseSignedIn";
import SignInToUseAi from "./SignInToUseAi";

const inputBase: React.CSSProperties = {
  width: "100%", padding: "8px 11px", borderRadius: 6,
  border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)",
  fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  transition: "border-color 0.15s",
};

const textareaBase: React.CSSProperties = {
  ...inputBase, resize: "vertical", minHeight: 84, lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4,
};

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: half ? "1 1 0" : "none", marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function countWords(s: string) { return s.trim().split(/\s+/).filter(Boolean).length; }

interface AITextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  field: "opening" | "whyCompany" | "whyFit" | "closing";
  context: { role?: string; company?: string };
  onEnhanced: (text: string) => void;
  /** null = auth state still loading, false = signed out, true = signed in. */
  signedIn: boolean | null;
  signingIn: boolean;
  onSignIn: () => void;
}

function AITextarea({ field, context, onEnhanced, value, style, signedIn, signingIn, onSignIn, ...rest }: AITextareaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoVal, setUndoVal] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const wordCount = countWords(String(value ?? ""));
  const showBtn = wordCount >= 3;

  const enhance = useCallback(async () => {
    // Account-only feature: don't fire a doomed request for signed-out users —
    // surface the sign-in prompt instead of a cryptic 401. (Except in development mode)
    if (signedIn === false && process.env.NODE_ENV !== "development") { setError(null); setShowSignIn(true); return; }
    setLoading(true); setError(null); setShowSignIn(false);
    try {
      const db = getSupabaseClient();
      const { data: { session } } = await db.auth.getSession();
      if (!session?.access_token) { setShowSignIn(true); return; }

      const res = await fetch(apiUrl("/api/cl-enhance"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: String(value ?? ""), field, context }),
      });
      // Session expired / rejected by the backend → prompt to sign in again.
      if (res.status === 401 || res.status === 403) { setShowSignIn(true); return; }
      const data = await res.json();
      if (!res.ok || !data.enhanced) throw new Error(data.error || "AI error");
      setUndoVal(String(value ?? ""));
      onEnhanced(data.enhanced);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [value, field, context, onEnhanced, signedIn]);

  const undo = useCallback(() => {
    if (undoVal !== null) { onEnhanced(undoVal); setUndoVal(null); }
  }, [undoVal, onEnhanced]);

  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={value}
        style={{ ...textareaBase, ...style as React.CSSProperties, paddingBottom: showBtn ? 36 : undefined }}
        {...rest}
      />
      {showBtn && (
        <div style={{ position: "absolute", bottom: 7, right: 8, display: "flex", gap: 5, alignItems: "center" }}>
          {error && <span style={{ fontSize: 10, color: "var(--red)" }}>{error}</span>}
          {undoVal !== null && !loading && (
            <button type="button" onClick={undo} style={{ fontSize: 10, color: "var(--muted)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 5, padding: "3px 7px", cursor: "pointer" }}>↩ Undo</button>
          )}
          <button
            type="button"
            onClick={enhance}
            disabled={loading}
            title={signedIn === false && process.env.NODE_ENV !== "development" ? "Sign in to use AI Enhance" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: loading ? "var(--muted)" : "#fff", background: loading ? "var(--surface2)" : "var(--accent)", border: "none", borderRadius: 5, padding: "4px 9px", cursor: loading ? "not-allowed" : "pointer", }}
          >
            {loading ? "Enhancing…" : <>✦ AI Enhance{signedIn === false && process.env.NODE_ENV !== "development" && <span aria-hidden="true" style={{ opacity: 0.85 }}>🔒</span>}</>}
          </button>
        </div>
      )}
      {showSignIn && (
        <div style={{ position: "absolute", bottom: 44, right: 8, zIndex: 20 }}>
          <SignInToUseAi
            variant="popover"
            signingIn={signingIn}
            onSignIn={onSignIn}
            onDismiss={() => setShowSignIn(false)}
            title="Sign in to use AI Enhance"
            subtitle="Polish your wording with AI — free with a Google account."
          />
        </div>
      )}
    </div>
  );
}

export default function CoverLetterFormPanel({ activeTab }: { activeTab: string }) {
  const store = useCoverLetterStore();
  const { data } = store;
  const { signedIn, signingIn, signIn } = useSupabaseSignedIn();
  const ai = { signedIn, signingIn, onSignIn: signIn };

  const context = { role: data.recipient.roleTitle, company: data.recipient.companyName };

  return (
    <div style={{ padding: "18px 16px 32px" }}>
      {activeTab === "recipient" && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px" }}>Recipient Details</h3>
          <Field label="Company Name">
            <input style={inputBase} value={data.recipient.companyName} onChange={e => store.setRecipient("companyName", e.target.value)} placeholder="Stripe" />
          </Field>
          <Field label="Hiring Manager Name">
            <input style={inputBase} value={data.recipient.hiringManagerName} onChange={e => store.setRecipient("hiringManagerName", e.target.value)} placeholder="Jane Doe or Hiring Manager" />
          </Field>
          <Field label="Role Title">
            <input style={inputBase} value={data.recipient.roleTitle} onChange={e => store.setRecipient("roleTitle", e.target.value)} placeholder="Software Engineer" />
          </Field>
          <Field label="Company Address">
            <input style={inputBase} value={data.recipient.companyAddress} onChange={e => store.setRecipient("companyAddress", e.target.value)} placeholder="San Francisco, CA" />
          </Field>
        </>
      )}

      {activeTab === "author" && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px" }}>About You</h3>
          <Field label="Full Name">
            <input style={inputBase} value={data.author.name} onChange={e => store.setAuthor("name", e.target.value)} placeholder="Alex Johnson" />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Email" half>
              <input style={inputBase} value={data.author.email} onChange={e => store.setAuthor("email", e.target.value)} />
            </Field>
            <Field label="Phone" half>
              <input style={inputBase} value={data.author.phone} onChange={e => store.setAuthor("phone", e.target.value)} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Location" half>
              <input style={inputBase} value={data.author.location} onChange={e => store.setAuthor("location", e.target.value)} />
            </Field>
            <Field label="LinkedIn" half>
              <input style={inputBase} value={data.author.linkedin} onChange={e => store.setAuthor("linkedin", e.target.value)} />
            </Field>
          </div>
        </>
      )}

      {activeTab === "content" && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px" }}>Letter Content</h3>
          <Field label="Opening Paragraph">
            <AITextarea {...ai} field="opening" context={context} value={data.content.openingParagraph} onChange={e => store.setContent("openingParagraph", e.target.value)} onEnhanced={v => store.setContent("openingParagraph", v)} placeholder="I am writing to express my interest in..." />
          </Field>
          <Field label="Why this company?">
            <AITextarea {...ai} field="whyCompany" context={context} value={data.content.whyCompany} onChange={e => store.setContent("whyCompany", e.target.value)} onEnhanced={v => store.setContent("whyCompany", v)} placeholder="What draws me to your company is..." />
          </Field>
          <Field label="Why are you a fit?">
            <AITextarea {...ai} field="whyFit" context={context} value={data.content.whyFit} onChange={e => store.setContent("whyFit", e.target.value)} onEnhanced={v => store.setContent("whyFit", v)} style={{ minHeight: 120 }} placeholder="My background makes me a great fit because..." />
          </Field>
          <Field label="Closing Paragraph">
            <AITextarea {...ai} field="closing" context={context} value={data.content.closingParagraph} onChange={e => store.setContent("closingParagraph", e.target.value)} onEnhanced={v => store.setContent("closingParagraph", v)} placeholder="I look forward to discussing..." />
          </Field>
        </>
      )}

      {activeTab === "style" && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px" }}>Style Settings</h3>
          <Field label="Template">
            <select style={inputBase} value={data.customization.templateId} onChange={e => store.setCustomization("templateId", e.target.value as any)}>
              {CL_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Accent Color">
            <input type="color" style={{...inputBase, padding: "2px 6px", height: 36}} value={data.customization.accentColor} onChange={e => store.setCustomization("accentColor", e.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Font" half>
              <select style={inputBase} value={data.customization.font} onChange={e => store.setCustomization("font", e.target.value as any)}>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Inter">Inter</option>
              </select>
            </Field>
            <Field label="Size" half>
              <select style={inputBase} value={data.customization.fontSize} onChange={e => store.setCustomization("fontSize", e.target.value as any)}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </Field>
          </div>
          <Field label="Date Format">
             <select style={inputBase} value={data.customization.dateFormat} onChange={e => store.setCustomization("dateFormat", e.target.value as any)}>
                <option value="long">Long (June 9, 2026)</option>
                <option value="short">Short (06/09/2026)</option>
              </select>
          </Field>
        </>
      )}
    </div>
  );
}
