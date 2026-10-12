"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { EmailPreferencesCard, TailoringModeCard } from "@/components/accountSettingsCards";
import { fetchJobFilters, type SavedFilter } from "@/lib/jobFiltersApi";
import {
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUSES,
  createReferralContact,
  deleteReferralContact,
  fetchReferralContacts,
  referralPipeline,
  updateReferralContactStatus,
  type ReferralContact,
  type ReferralStatus,
} from "@/lib/referralContacts";
import { apiFetch } from "@/lib/apiClient";
import { signInWithGoogle } from "@/lib/anonScan";
import { getSupabaseClient } from "@/lib/supabase";
import type { ExtractedProfileState } from "@/lib/resumeExtractorService";
import type { ProfileFormState } from "@/lib/profileStorage";

const cardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
};

function HubCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...cardStyle, ...style }}>{children}</div>;
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
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
        padding: "24px 24px 18px",
        borderBottom: "1px solid rgba(15,23,42,0.07)",
      }}
    >
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.4, color: "#1f2937" }}>{title}</div>
        <div style={{ marginTop: 2, fontSize: 14, color: "#6b7280" }}>{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "linear-gradient(135deg, #3b82f6, #4f46e5)",
        color: "#fff",
        borderRadius: 12,
        padding: "12px 16px",
        fontSize: 13,
        fontWeight: 800,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Link>
  );
}

function QuietButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
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
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

type ApplicationRow = {
  id: string;
  company: string | null;
  title: string | null;
  status: string;
};

function describeSavedFilter(filter: SavedFilter): string {
  const parts = [
    filter.filters.search,
    filter.filters.locationText,
    filter.filters.workModels?.join(", "),
    filter.filters.seniorities?.join(", "),
    filter.filters.empType && filter.filters.empType !== "any" ? filter.filters.empType : "",
  ].filter(Boolean);
  return parts.join(" · ") || "Saved Jobs filter set";
}

export function ReferralsPanel({ targetRoles }: { targetRoles: string }) {
  const [contacts, setContacts] = useState<ReferralContact[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nextContacts, appsResp] = await Promise.all([
          fetchReferralContacts(),
          apiFetch("/api/applications").catch(() => null),
        ]);
        if (cancelled) return;
        setContacts(nextContacts);
        if (appsResp?.ok) {
          const body = await appsResp.json().catch(() => ({}));
          const rows = Array.isArray(body?.applications) ? body.applications : [];
          setApplications(rows.map((row: ApplicationRow) => ({
            id: row.id,
            company: row.company,
            title: row.title,
            status: row.status,
          })));
        }
      } catch {
        if (!cancelled) setError("Couldn't load referral outreach.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pipeline = useMemo(() => referralPipeline(contacts), [contacts]);
  const trackedCompanies = useMemo(
    () => new Set(contacts.map((c) => c.company.trim().toLowerCase()).filter(Boolean)),
    [contacts],
  );
  const askNext = applications
    .filter((app) => app.company && !trackedCompanies.has(app.company.trim().toLowerCase()))
    .slice(0, 5);

  const onAdd = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const created = await createReferralContact({
      contactName: name,
      company,
      contactTitle: title,
    });
    setSaving(false);
    if (!created) {
      setError("Couldn't save this contact. Add a name and company, then try again.");
      return;
    }
    setContacts((prev) => [created, ...prev]);
    setName("");
    setCompany("");
    setTitle("");
  }, [company, name, saving, title]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <HubCard style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "28px",
            background: "linear-gradient(135deg, #3b82f6 0%, #0f62f0 100%)",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.86 }}>
            Find an insider
          </div>
          <div style={{ marginTop: 12, fontSize: 28, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.08 }}>
            Track the people you are asking for referrals.
          </div>
          <p style={{ margin: "12px 0 0", maxWidth: 640, fontSize: 15, lineHeight: 1.65, opacity: 0.92 }}>
            {targetRoles
              ? `Your target roles: ${targetRoles}. Keep outreach next to the companies you are already applying to.`
              : "Save a contact for each company, then update status as you hear back. This is the same referral tracker Jobs uses."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, padding: "18px 22px", borderBottom: "1px solid rgba(15,23,42,0.08)", flexWrap: "wrap" }}>
          {REFERRAL_STATUSES.filter((status) => status !== "declined").map((status) => (
            <div key={status} style={{ minWidth: 110, flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: status === "referred" ? "#2563eb" : "#111827" }}>
                {loading ? "—" : pipeline[status]}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: "#6b7280" }}>{REFERRAL_STATUS_LABELS[status]}</div>
            </div>
          ))}
        </div>
      </HubCard>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }} className="profile-real-grid">
        <HubCard>
          <SectionHeader
            title="Outreach list"
            subtitle="People you are contacting for a referral."
          />
          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="profile-real-grid">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contact name"
                aria-label="Contact name"
                style={fieldStyle}
              />
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
                aria-label="Company"
                style={fieldStyle}
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                aria-label="Title"
                style={{ ...fieldStyle, gridColumn: "1 / -1" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <QuietButton onClick={() => void onAdd()} disabled={saving || !name.trim() || !company.trim()}>
                {saving ? "Saving..." : "Add contact"}
              </QuietButton>
              <PrimaryLink href="/?view=jobs">Open Jobs</PrimaryLink>
            </div>
            {error ? <p role="alert" style={{ margin: "12px 0 0", fontSize: 13, color: "#dc2626" }}>{error}</p> : null}

            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {loading ? (
                <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Loading outreach...</p>
              ) : contacts.length === 0 ? (
                <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                  No referral contacts yet. Add someone you can ask, or start from a company in My Applications.
                </p>
              ) : contacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "12px 0",
                    borderTop: "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{contact.contactName}</div>
                    <div style={{ marginTop: 2, fontSize: 13, color: "#6b7280" }}>
                      {[contact.contactTitle, contact.company].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <label>
                    <select
                      aria-label={`Status for ${contact.contactName}`}
                      value={contact.status}
                      onChange={(e) => {
                        const status = e.target.value as ReferralStatus;
                        setContacts((prev) => prev.map((row) => (row.id === contact.id ? { ...row, status } : row)));
                        void updateReferralContactStatus(contact.id, status);
                      }}
                      style={{ ...fieldStyle, width: "auto", padding: "8px 10px" }}
                    >
                      {REFERRAL_STATUSES.map((status) => (
                        <option key={status} value={status}>{REFERRAL_STATUS_LABELS[status]}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setContacts((prev) => prev.filter((row) => row.id !== contact.id));
                      void deleteReferralContact(contact.id);
                    }}
                    style={{ border: "none", background: "none", color: "#9ca3af", fontWeight: 700, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </HubCard>

        <HubCard>
          <SectionHeader
            title="Ask next"
            subtitle="Companies in your tracker that do not have a referral contact yet."
          />
          <div style={{ padding: 20 }}>
            {askNext.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                When you save or apply to a job, those companies show up here so you can add an insider.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {askNext.map((app) => (
                  <div key={app.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{app.company}</div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>{app.title || app.status}</div>
                    </div>
                    <QuietButton
                      onClick={() => {
                        setCompany(app.company ?? "");
                        if (!name) setName("");
                      }}
                    >
                      Use company
                    </QuietButton>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <Link href="/?view=jobs" style={{ color: "#2563eb", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                Open My Applications
              </Link>
            </div>
          </div>
        </HubCard>
      </div>
    </div>
  );
}

const fieldStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#f8fafc",
  padding: "12px 14px",
  fontSize: 14,
  color: "#111827",
  fontFamily: "inherit",
};

export function JobAlertsPanel({
  roles,
  locations,
  onEditTargets,
}: {
  roles: string;
  locations: string;
  onEditTargets: () => void;
}) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchJobFilters()
      .then((next) => { if (!cancelled) setFilters(next); })
      .catch(() => { if (!cancelled) setFilters([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="profile-real-grid">
        <HubCard>
          <SectionHeader
            title="Saved Jobs filters"
            subtitle="These are the same filter sets you save on the Jobs board."
            action={<PrimaryLink href="/?view=jobs">Open Jobs</PrimaryLink>}
          />
          <div style={{ padding: 20 }}>
            {loading ? (
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Loading saved filters...</p>
            ) : filters.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                No saved filters yet. Set work model, location, and seniority on Jobs, then save the set to reuse it here.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filters.map((filter) => (
                  <Link
                    key={filter.id}
                    href="/?view=jobs"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, padding: "14px 16px", background: "#f8fafc" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{filter.name}</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>{describeSavedFilter(filter)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </HubCard>

        <HubCard>
          <SectionHeader
            title="Match preferences"
            subtitle="Jobs ranks against these roles and locations."
          />
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#6b7280", letterSpacing: "0.04em", textTransform: "uppercase" }}>Target roles</div>
            <div style={{ marginTop: 6, fontSize: 15, color: "#111827", lineHeight: 1.55 }}>
              {roles || "No target roles set, so Jobs ranks every role in the corpus."}
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 800, color: "#6b7280", letterSpacing: "0.04em", textTransform: "uppercase" }}>Locations</div>
            <div style={{ marginTop: 6, fontSize: 15, color: "#111827", lineHeight: 1.55 }}>
              {locations || "No preferred locations saved."}
            </div>
            <button
              type="button"
              onClick={onEditTargets}
              style={{ marginTop: 16, border: "none", background: "none", color: "#2563eb", fontWeight: 800, cursor: "pointer", padding: 0 }}
            >
              Edit target roles
            </button>
          </div>
        </HubCard>
      </div>

      <EmailPreferencesCard />
    </div>
  );
}

function identityProviders(user: { identities?: Array<{ provider?: string }>; app_metadata?: { provider?: string; providers?: string[] } } | null): string[] {
  const fromIdentities = (user?.identities ?? []).map((item) => item.provider).filter(Boolean) as string[];
  const fromMeta = [
    user?.app_metadata?.provider,
    ...(user?.app_metadata?.providers ?? []),
  ].filter(Boolean) as string[];
  return Array.from(new Set([...fromIdentities, ...fromMeta]));
}

export function IntegrationsPanel({
  extracted,
  tailorDefaults,
  accountEmail,
  onEditProfile,
}: {
  extracted: ExtractedProfileState;
  tailorDefaults: ProfileFormState;
  accountEmail: string | null;
  onEditProfile: () => void;
}) {
  const [providers, setProviders] = useState<string[]>([]);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient().auth.getUser().then(({ data }) => {
      if (!cancelled) setProviders(identityProviders(data.user ?? null));
    }).catch(() => {
      if (!cancelled) setProviders([]);
    });
    return () => { cancelled = true; };
  }, []);

  const googleConnected = providers.includes("google");
  const linkedin = extracted.linkedin || tailorDefaults.linkedin;
  const github = extracted.github;
  const portfolio = extracted.portfolio || tailorDefaults.portfolio;
  const resumeConnected = !!(extracted.name || extracted.experience?.length || extracted.skills?.length);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="profile-real-grid">
        <HubCard>
          <SectionHeader
            title="Connected accounts"
            subtitle="Sign-in and profile links Resunova can reuse."
          />
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <IntegrationRow
              title="Google"
              detail={googleConnected ? `Connected${accountEmail ? ` as ${accountEmail}` : ""}` : "Not connected"}
              connected={googleConnected}
              action={googleConnected ? null : (
                <QuietButton
                  disabled={googleBusy}
                  onClick={() => {
                    setGoogleBusy(true);
                    setGoogleError(null);
                    void signInWithGoogle().then((err) => {
                      setGoogleBusy(false);
                      if (err) setGoogleError(err);
                    });
                  }}
                >
                  {googleBusy ? "Opening Google..." : "Connect Google"}
                </QuietButton>
              )}
            />
            <IntegrationRow
              title="LinkedIn"
              detail={linkedin || "No LinkedIn URL saved on your profile"}
              connected={!!linkedin}
              action={<QuietButton onClick={onEditProfile}>{linkedin ? "Edit" : "Add"}</QuietButton>}
            />
            <IntegrationRow
              title="GitHub"
              detail={github || "No GitHub URL saved on your profile"}
              connected={!!github}
              action={<QuietButton onClick={onEditProfile}>{github ? "Edit" : "Add"}</QuietButton>}
            />
            <IntegrationRow
              title="Portfolio"
              detail={portfolio || "No portfolio URL saved"}
              connected={!!portfolio}
              action={<QuietButton onClick={onEditProfile}>{portfolio ? "Edit" : "Add"}</QuietButton>}
            />
            {googleError ? <p role="alert" style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>{googleError}</p> : null}
          </div>
        </HubCard>

        <HubCard>
          <SectionHeader
            title="Resume source"
            subtitle="Career Memory is the data Jobs, Tailor, and applications reuse."
          />
          <div style={{ padding: 20 }}>
            <IntegrationRow
              title="Career Memory"
              detail={resumeConnected ? "Resume facts saved to your account" : "Upload a resume to fill contact, experience, and skills"}
              connected={resumeConnected}
              action={<QuietButton onClick={onEditProfile}>{resumeConnected ? "Review" : "Upload resume"}</QuietButton>}
            />
            <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.6, color: "#6b7280" }}>
              There is no separate LinkedIn scrape or Gmail sync yet. Google sign-in, the URLs on your profile, and the resume you approve are the live integrations.
            </p>
          </div>
        </HubCard>
      </div>
      <TailoringModeCard />
    </div>
  );
}

function IntegrationRow({
  title,
  detail,
  connected,
  action,
}: {
  title: string;
  detail: string;
  connected: boolean;
  action: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{title}</div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              borderRadius: 999,
              padding: "3px 8px",
              background: connected ? "#dcfce7" : "#f3f4f6",
              color: connected ? "#15803d" : "#6b7280",
            }}
          >
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280", wordBreak: "break-word" }}>{detail}</div>
      </div>
      {action}
    </div>
  );
}
