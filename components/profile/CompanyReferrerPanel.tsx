"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  REFERRAL_REQUEST_STATUS_LABELS,
  REFERRAL_REQUEST_STATUS_TONES,
  REFERRAL_REQUEST_STATUSES,
  REFERRER_LIMITS,
  deleteReferralRequest,
  fetchMyReferralRequests,
  fetchMyReferrerProfile,
  openRequestCount,
  referralRequestPipeline,
  referralRequestsThisMonth,
  referrerInitials,
  referrerPublicPath,
  safeHttpUrl,
  signedReferralResumeUrl,
  updateReferralRequestStatus,
  upsertMyReferrerProfile,
  type CompanyReferralRequest,
  type CompanyReferrer,
  type ReferralRequestStatus,
} from "@/lib/companyReferrers";
import {
  onReferralInboxRefresh,
  persistLastSeenReferral,
  setReferralInboxOpen,
} from "@/lib/productNotices";
import { FeedbackToastCard } from "@/components/FeedbackToastCard";
import { ReferrerName } from "@/components/refer/ReferrerName";
import { SentReferralsCard } from "@/components/profile/SentReferralsCard";

const cardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#f8fafc",
  padding: "12px 14px",
  fontSize: 14,
  color: "#111827",
  fontFamily: "inherit",
};

const pillTones: Record<"neutral" | "green" | "amber" | "blue" | "red", CSSProperties> = {
  neutral: { background: "#f3f4f6", color: "#6b7280" },
  green: { background: "#dcfce7", color: "#15803d" },
  amber: { background: "#fef3c7", color: "#b45309" },
  blue: { background: "#dbeafe", color: "#2563eb" },
  red: { background: "#fee2e2", color: "#dc2626" },
};

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...cardStyle, ...style }}>{children}</div>;
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof pillTones }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800, ...pillTones[tone] }}>
      {children}
    </span>
  );
}

function Avatar({ name, size = 64 }: { name: string; size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #516b7b, #3f5563)",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {referrerInitials(name)}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        background: "linear-gradient(135deg, #3b82f6, #4f46e5)",
        color: "#fff",
        borderRadius: 12,
        padding: "12px 16px",
        fontWeight: 800,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

type ReferrerForm = {
  displayName: string;
  company: string;
  title: string;
  linkedin: string;
  bio: string;
  openToRefer: boolean;
};

function ReferrerFields({
  form,
  onChange,
}: {
  form: ReferrerForm;
  onChange: (next: ReferrerForm) => void;
}) {
  return (
    <>
      <input aria-label="Your name" placeholder="e.g. Jordan Lee" maxLength={REFERRER_LIMITS.name} value={form.displayName} onChange={(e) => onChange({ ...form, displayName: e.target.value })} style={fieldStyle} />
      <input aria-label="Company you work at" placeholder="e.g. Stripe" maxLength={REFERRER_LIMITS.company} value={form.company} onChange={(e) => onChange({ ...form, company: e.target.value })} style={fieldStyle} />
      <input aria-label="Your title" placeholder="e.g. Software Engineer" maxLength={REFERRER_LIMITS.title} value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} style={fieldStyle} />
      <input aria-label="LinkedIn URL" placeholder="https://linkedin.com/in/your-name" maxLength={REFERRER_LIMITS.url} value={form.linkedin} onChange={(e) => onChange({ ...form, linkedin: e.target.value })} style={fieldStyle} />
      <input
        aria-label="Roles you can refer for"
        placeholder="e.g. Backend, new grad, intern"
        maxLength={REFERRER_LIMITS.bio}
        value={form.bio}
        onChange={(e) => onChange({ ...form, bio: e.target.value })}
        style={{ ...fieldStyle, gridColumn: "1 / -1" }}
      />
    </>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "1px solid rgba(15,23,42,0.10)",
        background: "#fff",
        color: "#2563eb",
        borderRadius: 12,
        padding: "12px 16px",
        fontWeight: 800,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function CompanyReferrerPanel({
  displayName,
  title,
  linkedin,
}: {
  displayName: string;
  title: string;
  linkedin: string;
}) {
  const [profile, setProfile] = useState<CompanyReferrer | null>(null);
  const [requests, setRequests] = useState<CompanyReferralRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; description: string; variant: "success" | "error" } | null>(null);
  const [form, setForm] = useState({
    displayName,
    company: "",
    title,
    linkedin,
    bio: "",
    openToRefer: true,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await fetchMyReferrerProfile();
      if (cancelled) return;
      setProfile(next);
      if (next) {
        setForm({
          displayName: next.displayName,
          company: next.company,
          title: next.title,
          linkedin: next.linkedin ?? "",
          bio: next.bio ?? "",
          openToRefer: next.openToRefer,
        });
        const loaded = await fetchMyReferralRequests(next.id);
        if (loaded) setRequests(loaded);
      } else {
        setForm((prev) => ({
          ...prev,
          displayName: displayName || prev.displayName,
          title: title || prev.title,
          linkedin: linkedin || prev.linkedin,
        }));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [displayName, linkedin, title]);

  useEffect(() => {
    setReferralInboxOpen(true);
    return () => setReferralInboxOpen(false);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    void persistLastSeenReferral();
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    return onReferralInboxRefresh(() => {
      void fetchMyReferralRequests(profile.id).then((loaded) => {
        if (loaded) setRequests(loaded);
      });
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    const creating = !profile;
    const saved = await upsertMyReferrerProfile(form);
    setSaving(false);
    if (!saved) {
      const message = "Could not save. Add your name, company, and title.";
      setError(message);
      setToast({ title: "Could not save", description: message, variant: "error" });
      return;
    }
    setProfile(saved);
    setToast(creating
      ? { title: "You're signed up to refer", description: "Your referral link is ready to share.", variant: "success" }
      : { title: "Profile saved", description: "Your referrer details are updated.", variant: "success" });
  }, [form, profile]);

  const onToggleOpen = useCallback(async () => {
    if (!profile) return;
    setPausing(true);
    setError(null);
    const nextOpen = !profile.openToRefer;
    const saved = await upsertMyReferrerProfile({
      displayName: profile.displayName,
      company: profile.company,
      title: profile.title,
      linkedin: profile.linkedin ?? "",
      bio: profile.bio ?? "",
      openToRefer: nextOpen,
    });
    setPausing(false);
    if (!saved) {
      const message = "Could not update request availability.";
      setError(message);
      setToast({ title: "Could not update", description: message, variant: "error" });
      return;
    }
    setForm((prev) => ({ ...prev, openToRefer: nextOpen }));
    setProfile(saved);
    setToast(nextOpen
      ? { title: "Requests are open", description: "People can ask you for a referral again.", variant: "success" }
      : { title: "Requests paused", description: "Your link will not accept requests until you reopen it.", variant: "success" });
  }, [profile]);

  const shareUrl = profile
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${referrerPublicPath(profile.slug)}`
    : "";

  const onCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy the link. Copy it from the field instead.");
    }
  }, [shareUrl]);

  const removeRequest = useCallback(async (row: CompanyReferralRequest) => {
    setRequests((prev) => prev.filter((item) => item.id !== row.id));
    const ok = await deleteReferralRequest(row.id);
    if (!ok) {
      setRequests((prev) => [row, ...prev]);
      setError("Could not remove that request.");
    }
  }, []);

  const incoming = useMemo(() => requests.filter((row) => row.source === "request"), [requests]);
  const month = useMemo(() => referralRequestPipeline(referralRequestsThisMonth(requests)), [requests]);
  const openCount = useMemo(() => openRequestCount(requests), [requests]);
  const shownName = profile?.displayName || form.displayName || displayName || "Your profile";

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <style>{`
        @media (max-width: 900px) {
          .refer-desk-grid { grid-template-columns: 1fr !important; }
          .refer-desk-top { grid-template-columns: 1fr !important; }
          .refer-desk-stack { flex-direction: column; }
        }
      `}</style>

      <Card>
        <div style={{ padding: 26, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }} className="refer-desk-top">
          <Avatar name={shownName} />
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                <ReferrerName name={shownName} count={profile ? (profile.referredCount ?? 0) : null} />
              </div>
              {loading ? (
                <Pill>Loading</Pill>
              ) : profile ? (
                <Pill tone={profile.openToRefer ? "green" : "neutral"}>{profile.openToRefer ? "Open" : "Paused"}</Pill>
              ) : (
                <Pill>Not signed up</Pill>
              )}
            </div>
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
              {loading
                ? "Loading your referrer profile..."
                : profile
                  ? `${profile.title} at ${profile.company}`
                  : "Not signed up as a referrer yet"}
            </div>
            {profile?.bio ? (
              <div style={{ marginTop: 6, fontSize: 13, color: "#4b5563" }}>Can refer for {profile.bio}</div>
            ) : null}
          </div>
          {profile ? (
            <GhostButton onClick={() => void onToggleOpen()} disabled={pausing}>
              {pausing ? "Saving..." : profile.openToRefer ? "Pause requests" : "Open requests"}
            </GhostButton>
          ) : null}
        </div>
      </Card>

      {loading ? null : profile ? (
        <>
          <Card>
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Your referral link</div>
              <div style={{ display: "flex", gap: 10 }} className="refer-desk-stack">
                <input readOnly value={shareUrl} aria-label="Referral link" style={{ ...fieldStyle, flex: 1 }} />
                <PrimaryButton onClick={() => void onCopy()}>{copied ? "Copied" : "Copy link"}</PrimaryButton>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9ca3af" }}>
                Share this privately. Candidates land on a one-page ask form, not your full profile.
              </p>
            </div>
          </Card>

          <Card>
            <div style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="refer-desk-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Referrer profile</div>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>One company per account. Update this if you change jobs. The public link stays the same.</p>
              </div>
              <ReferrerFields form={form} onChange={setForm} />
              <div style={{ gridColumn: "1 / -1" }}>
                <PrimaryButton onClick={() => void onSave()} disabled={saving}>
                  {saving ? "Saving..." : "Save referrer profile"}
                </PrimaryButton>
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 18 }} className="refer-desk-grid">
            <Card>
              <div style={{ padding: "22px 22px 8px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>Incoming requests</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: "#6b7280" }}>
                    People asking you to refer them at {profile.company}.
                  </div>
                </div>
                <Pill tone={openCount > 0 ? "amber" : "neutral"}>{openCount} open</Pill>
              </div>
              <div style={{ padding: 22, display: "grid", gap: 12 }}>
                {incoming.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>No requests yet. Share your link to start receiving them.</p>
                ) : incoming.map((row) => (
                  <RequestCard
                    key={row.id}
                    row={row}
                    onStatus={async (status) => {
                      const previous = row.status;
                      setRequests((prev) => prev.map((item) => (item.id === row.id ? { ...item, status } : item)));
                      const ok = await updateReferralRequestStatus(row.id, status);
                      if (!ok) {
                        setRequests((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: previous } : item)));
                        setError("Could not update that request status.");
                      }
                    }}
                    onRemove={() => void removeRequest(row)}
                  />
                ))}
              </div>
            </Card>

            <div style={{ display: "grid", gap: 18 }}>
              <Card>
                <div style={{ padding: 22 }}>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>This month</div>
                  <div style={{ display: "flex", marginTop: 18 }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 800 }}>{month.requested + month.reviewing}</div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Requested</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb" }}>{month.referred}</div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Referred</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <div style={{ padding: "28px 28px 22px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#2563eb" }}>I can refer</div>
            <h2 style={{ margin: "10px 0 0", fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>Sign up to refer candidates at your company</h2>
            <p style={{ margin: "10px 0 0", maxWidth: 560, color: "#6b7280", lineHeight: 1.6 }}>
              Publish that you work there. Share a private link. People can ask you for a referral, and you decide who to submit.
            </p>
          </div>
          <div style={{ padding: "0 28px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="refer-desk-grid">
            <ReferrerFields form={form} onChange={setForm} />
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <PrimaryButton onClick={() => void onSave()} disabled={saving}>
                {saving ? "Saving..." : "Sign up as a referrer"}
              </PrimaryButton>
              <Link href="/refer" style={{ color: "#2563eb", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                Find employees who can refer
              </Link>
            </div>
          </div>
        </Card>
      )}

      <SentReferralsCard />

      {error ? <p role="alert" style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>{error}</p> : null}
      {toast ? (
        <FeedbackToastCard
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          role={toast.variant === "error" ? "alert" : "status"}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

function RequestCard({
  row,
  onStatus,
  onRemove,
}: {
  row: CompanyReferralRequest;
  onStatus: (status: ReferralRequestStatus) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const linkedinHref = safeHttpUrl(row.candidateLinkedin);
  const openResume = async () => {
    if (!row.resumePdfPath) return;
    const url = await signedReferralResumeUrl(row.resumePdfPath);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <div style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, padding: 16, background: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800 }}>{row.candidateName}</div>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6b7280" }}>
            {row.role}{row.candidateEmail ? ` · ${row.candidateEmail}` : ""}
          </div>
        </div>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          {row.lastNudgedAt ? <Pill tone="amber">{(row.nudgeCount ?? 0) > 1 ? `Nudged ${row.nudgeCount}` : "Nudged"}</Pill> : null}
          <Pill tone={REFERRAL_REQUEST_STATUS_TONES[row.status]}>{REFERRAL_REQUEST_STATUS_LABELS[row.status]}</Pill>
        </span>
      </div>
      {row.notes ? <p style={{ margin: "10px 0 0", fontSize: 13, color: "#4b5563", lineHeight: 1.55 }}>{row.notes}</p> : null}
      {(linkedinHref || row.resumePdfPath) ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
          {linkedinHref ? (
            <a href={linkedinHref} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              LinkedIn
            </a>
          ) : null}
          {row.resumePdfPath ? (
            <button
              type="button"
              onClick={() => void openResume()}
              style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}
            >
              Open resume PDF
            </button>
          ) : null}
        </div>
      ) : null}
      <label style={{ display: "block", marginTop: 12 }}>
        <select
          aria-label={`Status for ${row.candidateName}`}
          value={row.status}
          onChange={(e) => onStatus(e.target.value as ReferralRequestStatus)}
          style={{ ...fieldStyle, width: "auto", padding: "8px 10px" }}
        >
          {REFERRAL_REQUEST_STATUSES.map((status) => (
            <option key={status} value={status}>{REFERRAL_REQUEST_STATUS_LABELS[status]}</option>
          ))}
        </select>
      </label>
      <RemoveRequestButton onRemove={onRemove} />
    </div>
  );
}

function RemoveRequestButton({ onRemove }: { onRemove: () => void | Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{ marginTop: 8, border: "none", background: "none", color: "#9ca3af", fontWeight: 700, cursor: "pointer", padding: 0 }}
      >
        Remove
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
      <button
        type="button"
        onClick={() => { setConfirming(false); void onRemove(); }}
        style={{ border: "none", background: "none", color: "#dc2626", fontWeight: 800, cursor: "pointer", padding: 0 }}
      >
        Confirm remove
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        style={{ border: "none", background: "none", color: "#6b7280", fontWeight: 700, cursor: "pointer", padding: 0 }}
      >
        Keep
      </button>
    </div>
  );
}
