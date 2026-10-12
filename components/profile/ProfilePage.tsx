"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import ResumeUpload from "./ResumeUpload";
import TargetsEditor from "./TargetsEditor";
import { ExtractedProfileState, INITIAL_EXTRACTED_PROFILE } from "../../lib/resumeExtractorService";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Briefcase,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Folder,
  GraduationCap,
  LogOut,
  Mail,
  Plug,
  Settings,
  Shield,
  Target,
  Upload,
  Users,
} from "lucide-react";
import {
  loadExtractedProfile,
  saveExtractedProfile,
  loadProfile,
  saveProfile,
  mergeProfilePreferEmpty,
  tailorContactHintsFromExtracted,
  type ProfileFormState,
  EMPTY_PROFILE,
} from "../../lib/profileStorage";
import { fetchExtractedProfile, upsertExtractedProfile, fetchUserProfile, upsertUserProfile, getSupabaseClient } from "../../lib/supabase";
import { signOutAndReturnHome } from "@/lib/authSignOut";
import UsageLimitsCard from "@/components/account/UsageLimitsCard";
import PlanBillingCard from "@/components/PlanBillingCard";
import { IntegrationsPanel, JobAlertsPanel, ReferralsPanel } from "@/components/profile/ProfileHubPanels";

type TabKey = "usage" | "referrals" | "billing" | "alerts" | "integrations";

const cardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
};

export default function ProfilePage() {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "extracting" | "review" | "completed">("idle");
  const [extractedData, setExtractedData] = useState<ExtractedProfileState>(INITIAL_EXTRACTED_PROFILE);
  const [baseline, setBaseline] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  const [tailorDefaults, setTailorDefaults] = useState<ProfileFormState>(EMPTY_PROFILE);
  const [tdBaseline, setTdBaseline] = useState<string>("");
  const [tdSaving, setTdSaving] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);
  const tdSaveTimerRef = useRef<number | null>(null);

  const [tab, setTab] = useState<TabKey>("usage");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const dirty = typeof window !== "undefined" && baseline !== "" && baseline !== JSON.stringify(extractedData);
  const tdDirty = typeof window !== "undefined" && tdBaseline !== "" && tdBaseline !== JSON.stringify(tailorDefaults);
  const anyDirty = dirty || tdDirty;
  const anySaving = saving || tdSaving;

  useEffect(() => {
    let mounted = true;

    async function init() {
      const [dbProfile, dbDefaults, authResult] = await Promise.all([
        fetchExtractedProfile(),
        fetchUserProfile(),
        getSupabaseClient().auth.getUser().catch(() => ({ data: { user: null } })),
      ]);

      const localProfile = loadExtractedProfile();
      const localDefaults = loadProfile();
      const initial = dbProfile || localProfile;
      const initialDefaults = dbDefaults || localDefaults;

      if (!mounted) return;

      setExtractedData(initial);
      setBaseline(JSON.stringify(initial));
      setTailorDefaults(initialDefaults);
      setTdBaseline(JSON.stringify(initialDefaults));
      setAccountEmail(authResult.data.user?.email ?? initial.email ?? null);

      if (initial.name || (initial.skills && initial.skills.length > 0) || (initial.experience && initial.experience.length > 0)) {
        setUploadStatus("completed");
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    const snap = { ...extractedData };
    try {
      saveExtractedProfile(snap);
      await upsertExtractedProfile(snap);
      setBaseline(JSON.stringify(snap));
    } catch (e) {
      console.warn("Save failed", e);
    } finally {
      setSaving(false);
    }
  }, [extractedData]);

  const saveTailorDefaults = useCallback(async () => {
    setTdSaving(true);
    const snap = { ...tailorDefaults };
    try {
      saveProfile(snap);
      await upsertUserProfile(snap);
      setTdBaseline(JSON.stringify(snap));
    } catch (e) {
      console.warn("Tailor-defaults save failed", e);
    } finally {
      setTdSaving(false);
    }
  }, [tailorDefaults]);

  useEffect(() => {
    if (!dirty || saving) return;
    if (typeof window === "undefined") return;
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void save();
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [extractedData, dirty, saving, save]);

  useEffect(() => {
    if (!tdDirty || tdSaving) return;
    if (typeof window === "undefined") return;
    if (tdSaveTimerRef.current) window.clearTimeout(tdSaveTimerRef.current);
    tdSaveTimerRef.current = window.setTimeout(() => {
      tdSaveTimerRef.current = null;
      void saveTailorDefaults();
    }, 1500);
    return () => {
      if (tdSaveTimerRef.current) {
        window.clearTimeout(tdSaveTimerRef.current);
        tdSaveTimerRef.current = null;
      }
    };
  }, [tailorDefaults, tdDirty, tdSaving, saveTailorDefaults]);

  useEffect(() => {
    if (!anyDirty || typeof window === "undefined") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const handleExtractionStart = () => setUploadStatus("extracting");
  const handleExtractionComplete = () => setUploadStatus("review");
  const handleAcceptAll = (data: ExtractedProfileState) => {
    setExtractedData(data);
    setUploadStatus("completed");
    setTailorDefaults((prev) => mergeProfilePreferEmpty(prev, tailorContactHintsFromExtracted(data)).next);
  };

  const hasData = uploadStatus === "completed" && (extractedData.name || extractedData.experience?.length > 0 || extractedData.skills?.length > 0);
  const experienceSummary = extractedData.experience?.length ? `${extractedData.experience.length} role${extractedData.experience.length !== 1 ? "s" : ""}` : "";
  const totalYears = getApproxYears(extractedData);
  const summaryItems = [experienceSummary, totalYears].filter(Boolean).join(" / ");

  const completionStats = useMemo(() => {
    const checks = [
      !!extractedData.name,
      !!(accountEmail || extractedData.email),
      !!extractedData.phone,
      !!(extractedData.role || extractedData.headline),
      !!extractedData.location,
      !!extractedData.summary,
      !!extractedData.experience?.length,
      !!extractedData.education?.length,
      !!extractedData.skills?.length,
    ];
    const completed = checks.filter(Boolean).length;
    const total = checks.length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }, [accountEmail, extractedData]);

  const displayName = extractedData.name || (accountEmail ? accountEmail.split("@")[0] : "Your profile");
  const initial = (displayName || "?").charAt(0).toUpperCase();
  const profileSubtitle = extractedData.role || extractedData.headline || "Add your experience and preferences once, then reuse them everywhere.";

  const scrollToCareerMemory = useCallback(() => {
    const el = document.getElementById("career-memory-editor");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const onSignOut = useCallback(() => {
    if (signingOut) return;
    if (typeof window !== "undefined" && !window.confirm("Sign out of Resunova on this device?")) return;
    setSigningOut(true);
    void signOutAndReturnHome();
  }, [signingOut]);

  const tabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
    { key: "usage", label: "Usage", icon: <BarChart3 size={16} /> },
    { key: "referrals", label: "Referrals", icon: <Users size={16} /> },
    { key: "billing", label: "Billing", icon: <CreditCard size={16} /> },
    { key: "alerts", label: "Job alerts", icon: <Bell size={16} /> },
    { key: "integrations", label: "Integrations", icon: <Plug size={16} /> },
  ];

  const panel = useMemo(() => {
    if (tab === "usage") {
      return (
        <div className="profile-real-grid">
          <UsageLimitsCard />
          <HubCard>
            <SectionHeader
              icon={<ClipboardList size={18} />}
              title="Application profile"
              subtitle="How complete your reusable application data is."
            />
            <div className="profile-real-card-body">
              <div className="profile-real-metrics">
                <Metric value={`${completionStats.percent}%`} label="Complete" accent />
                <Metric value={`${extractedData.experience?.length ?? 0}`} label="Work entries" />
                <Metric value={`${extractedData.skills?.length ?? 0}`} label="Skills saved" />
              </div>
              <div className="profile-real-note">
                The application profile and Career Memory editor below stay in sync. Update it once and Resunova can reuse it across jobs, tailoring, and autofill flows.
              </div>
            </div>
          </HubCard>
        </div>
      );
    }

    if (tab === "referrals") {
      return <ReferralsPanel targetRoles={tailorDefaults.roles} />;
    }

    if (tab === "billing") {
      return (
        <div className="profile-real-grid">
          <PlanBillingCard />
          <HubCard>
            <SectionHeader
              icon={<Shield size={18} />}
              title="Profile value"
              subtitle="What your saved profile unlocks."
            />
            <div className="profile-real-feature-list">
              <FeatureRow>Reuse approved resume facts across new applications</FeatureRow>
              <FeatureRow>Keep target roles and location preferences in one place</FeatureRow>
              <FeatureRow>Update your resume once, then rescore and tailor faster</FeatureRow>
            </div>
          </HubCard>
        </div>
      );
    }

    if (tab === "alerts") {
      return (
        <JobAlertsPanel
          roles={tailorDefaults.roles}
          locations={tailorDefaults.locations}
          onEditTargets={() => {
            setEditingTargets(true);
            scrollToCareerMemory();
          }}
        />
      );
    }

    return (
      <IntegrationsPanel
        extracted={extractedData}
        tailorDefaults={tailorDefaults}
        accountEmail={accountEmail}
        onEditProfile={scrollToCareerMemory}
      />
    );
  }, [tab, completionStats.percent, extractedData, tailorDefaults, accountEmail, scrollToCareerMemory]);

  return (
    <div className="profile-real-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .profile-real-page { min-height: 100vh; background: #f8fafc; color: #111827; }
        .profile-real-shell { max-width: 1080px; margin: 0 auto; padding: 28px 20px 80px; }
        .profile-real-eyebrow { margin: 0 0 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #2563eb; }
        .profile-real-title { margin: 0; font-size: clamp(30px, 5vw, 38px); line-height: 1.05; letter-spacing: -1.1px; font-weight: 800; color: #111827; }
        .profile-real-subtitle { margin: 12px 0 0; max-width: 620px; font-size: 15px; line-height: 1.65; color: #6b7280; }
        .profile-real-card { border-radius: 18px; border: 1px solid rgba(15,23,42,0.08); background: #ffffff; box-shadow: 0 8px 30px rgba(15,23,42,0.05); }
        .profile-real-card-body { padding: 24px; }
        .profile-real-top-grid { display: grid; gap: 18px; margin-top: 22px; }
        .profile-real-summary-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 18px; align-items: center; padding: 24px; }
        .profile-real-avatar { width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #516b7b, #3f5563); color: #fff; font-size: 36px; font-weight: 700; box-shadow: 0 12px 24px rgba(15,23,42,0.14); }
        .profile-real-name { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.4px; color: #111827; }
        .profile-real-email { margin-top: 6px; font-size: 14px; color: #6b7280; word-break: break-word; }
        .profile-real-kicker { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
        .profile-real-signout { border: 1px solid #fecaca; background: #fff; color: #ef4444; border-radius: 12px; padding: 12px 18px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
        .profile-real-signout:disabled { opacity: 0.6; cursor: not-allowed; }
        .profile-real-profile-card { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 16px; align-items: center; padding: 18px; }
        .profile-real-profile-icon { width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; background: #eaf1ff; color: #2563eb; }
        .profile-real-profile-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
        .profile-real-profile-copy { font-size: 15px; line-height: 1.55; color: #6b7280; }
        .profile-real-primary-btn { border: none; background: linear-gradient(135deg, #3b82f6, #4f46e5); color: #fff; border-radius: 12px; padding: 14px 20px; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 12px 24px rgba(59,130,246,0.18); white-space: nowrap; }
        .profile-real-tabs { display: flex; gap: 28px; align-items: center; border-bottom: 1px solid rgba(15,23,42,0.08); margin: 20px 0 18px; overflow-x: auto; padding: 0 4px; }
        .profile-real-tab { appearance: none; border: none; background: transparent; border-bottom: 2px solid transparent; color: #6b7280; font-size: 15px; font-weight: 700; padding: 14px 0 13px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; }
        .profile-real-tab.is-active { border-bottom-color: #2563eb; color: #2563eb; }
        .profile-real-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .profile-real-section-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 24px 20px; border-bottom: 1px solid rgba(15,23,42,0.07); }
        .profile-real-section-main { display: flex; align-items: center; gap: 14px; }
        .profile-real-section-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(135deg, #5b5ce6, #3b82f6); color: #fff; box-shadow: 0 10px 18px rgba(59,130,246,0.22); }
        .profile-real-section-title { font-size: 17px; font-weight: 800; letter-spacing: -0.4px; color: #1f2937; }
        .profile-real-section-subtitle { margin-top: 2px; font-size: 14px; color: #6b7280; }
        .profile-real-metrics { display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap; }
        .profile-real-metric { flex: 1; min-width: 140px; text-align: center; padding: 18px; border-radius: 14px; border: 1px solid rgba(15,23,42,0.08); background: #f8fafc; }
        .profile-real-metric-value { font-size: 40px; font-weight: 800; letter-spacing: -1.2px; color: #111827; }
        .profile-real-metric-value.accent { color: #2563eb; }
        .profile-real-metric-label { margin-top: 4px; font-size: 14px; color: #6b7280; }
        .profile-real-note { margin-top: 16px; font-size: 14px; line-height: 1.65; color: #6b7280; }
        .profile-real-referral-hero { padding: 28px; background: linear-gradient(135deg, #3b82f6 0%, #0f62f0 100%); color: #fff; display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
        .profile-real-referral-label { font-size: 12px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.86; }
        .profile-real-referral-title { margin-top: 14px; font-size: 30px; line-height: 1.05; letter-spacing: -1px; font-weight: 800; }
        .profile-real-referral-copy { margin: 14px 0 0; max-width: 640px; font-size: 15px; line-height: 1.65; opacity: 0.92; }
        .profile-real-feature-list { display: flex; flex-direction: column; gap: 12px; padding: 24px; }
        .profile-real-feature-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #4b5563; }
        .profile-real-feature-dot { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: #dcfce7; color: #22c55e; flex-shrink: 0; }
        .profile-real-link-btn { border: none; background: none; color: #2563eb; font-size: 14px; font-weight: 700; padding: 0; cursor: pointer; margin-top: 14px; }
        .profile-real-editor-wrap { margin-top: 26px; }
        .profile-real-editor-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 24px 0; flex-wrap: wrap; }
        .profile-real-editor-copy { padding: 0 24px 20px; font-size: 14px; color: #6b7280; line-height: 1.65; }
        .profile-real-save-state { font-size: 12px; color: #6b7280; }
        .profile-real-save-state.saved { color: #16a34a; font-weight: 700; }
        .profile-real-attention { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 24px 18px; padding: 10px 12px; background: rgba(210,153,34,0.08); color: #9a6700; border: 1px solid rgba(210,153,34,0.3); border-left: 3px solid #d29922; border-radius: 8px; font-size: 13px; }
        .profile-real-attention-body { display: flex; align-items: center; gap: 8px; }
        .profile-real-text-btn { flex-shrink: 0; padding: 2px 0; background: none; border: 0; border-bottom: 1px solid currentColor; color: #2563eb; cursor: pointer; font-size: 12px; font-weight: 700; }
        .profile-real-ledger { border-top: 1px solid rgba(15,23,42,0.08); }
        .profile-real-section { border-bottom: 1px solid rgba(15,23,42,0.08); }
        .profile-real-section:last-child { border-bottom: 0; }
        .profile-real-section summary { display: grid; min-height: 58px; grid-template-columns: 20px minmax(0,1fr) auto; align-items: center; gap: 8px; cursor: pointer; list-style: none; user-select: none; padding: 0 24px; }
        .profile-real-section summary::-webkit-details-marker { display: none; }
        .profile-real-chevron { display: grid; width: 18px; height: 18px; place-items: center; color: #2563eb; transition: transform 0.16s ease; }
        .profile-real-section[open] .profile-real-chevron { transform: rotate(90deg); }
        .profile-real-section-title-row { display: inline-flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700; color: #111827; }
        .profile-real-section-count { display: block; margin-top: 2px; color: #6b7280; font-size: 11px; }
        .profile-real-section-label { color: #9ca3af; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
        .profile-real-detail-body { padding: 0 24px 22px 52px; }
        .profile-real-entry { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 6px 16px; padding: 12px 0; border-top: 1px dotted rgba(15,23,42,0.12); }
        .profile-real-entry:first-child { padding-top: 2px; border-top: 0; }
        .profile-real-entry h4 { margin: 0; font-size: 13px; font-weight: 700; color: #111827; }
        .profile-real-entry p { margin: 2px 0 0; color: #6b7280; font-size: 12px; line-height: 1.5; }
        .profile-real-entry-date { color: #9ca3af; font-size: 11px; white-space: nowrap; }
        .profile-real-tag-list { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 2px; }
        .profile-real-tag { padding: 6px 10px; background: #f8fafc; color: #111827; border: 1px solid rgba(15,23,42,0.08); border-radius: 999px; font-size: 12px; }
        .profile-real-inline-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding-top: 10px; border-top: 1px dotted rgba(15,23,42,0.12); }
        .profile-real-source-note { color: #9ca3af; font-size: 10px; }
        .profile-real-editor-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 24px 24px; flex-wrap: wrap; border-top: 1px solid rgba(15,23,42,0.08); }
        .profile-real-privacy { display: flex; max-width: 520px; align-items: flex-start; gap: 8px; margin: 16px auto 0; color: #6b7280; text-align: left; font-size: 12px; line-height: 1.6; }
        .profile-real-privacy svg { flex-shrink: 0; width: 13px; height: 13px; margin-top: 2px; }
        .profile-real-toast { position: fixed; right: 20px; bottom: 20px; z-index: 30; padding: 8px 12px; background: #fff; color: #111827; border: 1px solid rgba(15,23,42,0.08); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); font-size: 12px; opacity: 0; transform: translateY(6px); pointer-events: none; transition: opacity 0.18s, transform 0.18s; }
        .profile-real-toast.show { opacity: 1; transform: translateY(0); }
        @media (max-width: 900px) {
          .profile-real-grid { grid-template-columns: 1fr; }
          .profile-real-summary-row, .profile-real-profile-card { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .profile-real-shell { padding: 22px 16px 80px; }
          .profile-real-section summary { padding: 0 18px; min-height: 54px; }
          .profile-real-detail-body { padding: 0 18px 20px 42px; }
          .profile-real-entry { grid-template-columns: 1fr; }
          .profile-real-entry-date { grid-row: 2; }
          .profile-real-editor-header, .profile-real-editor-copy, .profile-real-editor-actions { padding-left: 18px; padding-right: 18px; }
          .profile-real-attention { margin-left: 18px; margin-right: 18px; }
          .profile-real-referral-hero { padding: 22px; }
        }
      ` }} />

      <div className="profile-real-shell">
        <header>
          <p className="profile-real-eyebrow">Profile</p>
          <h1 className="profile-real-title">Your account profile hub</h1>
          <p className="profile-real-subtitle">
            A cleaner account home for your plan, profile completeness, usage, and the editable Career Memory that powers applications across Resunova.
          </p>
        </header>

        <div className="profile-real-top-grid">
          <HubCard>
            <div className="profile-real-summary-row">
              <div className="profile-real-avatar" aria-hidden>{initial}</div>
              <div>
                <h2 className="profile-real-name">{displayName}</h2>
                <div className="profile-real-email">{accountEmail || extractedData.email || "Signed in account"}</div>
                <div className="profile-real-kicker">
                  <StatusPill tone="green">Profile hub live</StatusPill>
                  {hasData ? <StatusPill tone="blue">Career Memory saved</StatusPill> : <StatusPill tone="amber">Needs resume upload</StatusPill>}
                </div>
              </div>
              <button type="button" className="profile-real-signout" onClick={onSignOut} disabled={signingOut}>
                <LogOut size={16} />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </HubCard>

          <HubCard>
            <div className="profile-real-profile-card">
              <div className="profile-real-profile-icon">
                <ClipboardList size={24} />
              </div>
              <div>
                <div className="profile-real-profile-title">
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>Application profile</div>
                  <StatusPill tone={completionStats.percent >= 75 ? "green" : "amber"}>
                    {completionStats.percent >= 75 ? "Ready" : "Incomplete"}
                  </StatusPill>
                </div>
                <div className="profile-real-profile-copy">
                  {profileSubtitle}
                </div>
                <div className="profile-real-kicker">
                  <StatusPill tone="neutral">{completionStats.completed}/{completionStats.total} profile fields filled</StatusPill>
                  {summaryItems ? <StatusPill tone="neutral">{summaryItems}</StatusPill> : null}
                </div>
              </div>
              <button type="button" className="profile-real-primary-btn" onClick={scrollToCareerMemory}>
                {hasData ? "Edit profile" : "Complete profile"}
              </button>
            </div>
          </HubCard>
        </div>

        <div className="profile-real-tabs" role="tablist" aria-label="Profile sections">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`profile-real-tab${active ? " is-active" : ""}`}
                onClick={() => setTab(item.key)}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        {panel}

        <div className="profile-real-editor-wrap" id="career-memory-editor">
          <HubCard>
            <div className="profile-real-editor-header">
              <div>
                <div className="profile-real-eyebrow" style={{ marginBottom: 6 }}>Career memory</div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.8, color: "#111827" }}>Resume-backed profile editor</h2>
              </div>
              <div className={`profile-real-save-state${!anySaving && !anyDirty ? " saved" : ""}`}>
                {anySaving ? "Saving changes..." : anyDirty ? "Unsaved changes" : "All changes saved"}
              </div>
            </div>
            <p className="profile-real-editor-copy">
              This keeps the existing upload, review, and auto-save flow intact while the route adopts the new account-hub design.
            </p>

            {hasData ? (
              <>
                <FactReviewStrip data={extractedData} />

                <div className="profile-real-ledger">
                  <LedgerSection
                    title="Experience"
                    count={summaryItems || undefined}
                    label="Resume"
                    icon={<Briefcase size={14} />}
                    defaultOpen
                  >
                    {extractedData.experience?.length ? (
                      extractedData.experience.map((exp, i) => (
                        <div className="profile-real-entry" key={i}>
                          <div>
                            <h4>{exp.role}{exp.company ? `, ${exp.company}` : ""}</h4>
                            {exp.description ? <p>{exp.description}</p> : null}
                            {exp.bullets?.length > 0 && !exp.description ? <p>{exp.bullets.slice(0, 2).join(" • ")}</p> : null}
                          </div>
                          <span className="profile-real-entry-date">{exp.dates || ""}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>No experience added yet.</p>
                    )}
                    <div className="profile-real-inline-actions">
                      <span className="profile-real-source-note">Source: resume</span>
                      <button className="profile-real-text-btn" type="button">Edit experience</button>
                    </div>
                  </LedgerSection>

                  <LedgerSection
                    title="Education"
                    count={extractedData.education?.length ? `${extractedData.education.length} school${extractedData.education.length !== 1 ? "s" : ""}` : undefined}
                    label="Resume"
                    icon={<GraduationCap size={14} />}
                  >
                    {extractedData.education?.length ? (
                      extractedData.education.map((edu, i) => (
                        <div className="profile-real-entry" key={i}>
                          <div>
                            <h4>{edu.degree || "Degree"}</h4>
                            <p>{edu.institution}</p>
                          </div>
                          <span className="profile-real-entry-date">{edu.dates || ""}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>No education added yet.</p>
                    )}
                    <div className="profile-real-inline-actions">
                      <span className="profile-real-source-note">Source: resume</span>
                      <button className="profile-real-text-btn" type="button">Edit education</button>
                    </div>
                  </LedgerSection>

                  <LedgerSection
                    title="Skills"
                    count={extractedData.skills?.length ? `${extractedData.skills.length} skills` : undefined}
                    label="Resume"
                    icon={<Settings size={14} />}
                  >
                    {extractedData.skills?.length ? (
                      <div className="profile-real-tag-list">
                        {extractedData.skills.map((skill, i) => (
                          <span className="profile-real-tag" key={i}>{skill}</span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>No skills added yet.</p>
                    )}
                    <div className="profile-real-inline-actions">
                      <span className="profile-real-source-note">Source: resume</span>
                      <button className="profile-real-text-btn" type="button">Edit skills</button>
                    </div>
                  </LedgerSection>

                  <LedgerSection
                    title="Projects"
                    count={extractedData.projects?.length ? `${extractedData.projects.length} projects` : undefined}
                    label="Resume"
                    icon={<Folder size={14} />}
                  >
                    {extractedData.projects?.length ? (
                      extractedData.projects.map((proj, i) => (
                        <div className="profile-real-entry" key={i}>
                          <div>
                            <h4>{proj.name}</h4>
                            {proj.description ? <p>{proj.description}</p> : null}
                            {proj.tech ? <p style={{ fontStyle: "italic" }}>{proj.tech}</p> : null}
                            {!proj.description && proj.bullets?.length > 0 ? <p>{proj.bullets.slice(0, 2).join(" • ")}</p> : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>No projects added yet.</p>
                    )}
                    <div className="profile-real-inline-actions">
                      <span className="profile-real-source-note">Source: resume</span>
                      <button className="profile-real-text-btn" type="button">Edit projects</button>
                    </div>
                  </LedgerSection>

                  <LedgerSection
                    title="Summary"
                    label="Resume"
                    icon={<FileText size={14} />}
                  >
                    {extractedData.summary ? (
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#111827" }}>{extractedData.summary}</p>
                    ) : (
                      <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>No summary written yet.</p>
                    )}
                    <div className="profile-real-inline-actions">
                      <span className="profile-real-source-note">Source: resume</span>
                      <button className="profile-real-text-btn" type="button">Edit summary</button>
                    </div>
                  </LedgerSection>

                  <LedgerSection
                    title="Contact"
                    label="Resume"
                    icon={<Mail size={14} />}
                  >
                    <div className="profile-real-entry" style={{ borderTop: 0, paddingTop: 0 }}>
                      <div>
                        <h4>Email</h4>
                        <p>{extractedData.email || accountEmail || "Not set"}</p>
                      </div>
                    </div>
                    <div className="profile-real-entry">
                      <div>
                        <h4>Phone</h4>
                        <p>{extractedData.phone || "Not set"}</p>
                      </div>
                    </div>
                    <div className="profile-real-entry">
                      <div>
                        <h4>Location</h4>
                        <p>{extractedData.location || "Not set"}</p>
                      </div>
                    </div>
                    <div className="profile-real-entry">
                      <div>
                        <h4>Links</h4>
                        <p>
                          {[
                            extractedData.linkedin ? "LinkedIn" : null,
                            extractedData.github ? "GitHub" : null,
                            extractedData.portfolio ? "Portfolio" : null,
                          ].filter(Boolean).join(", ") || "No links saved"}
                        </p>
                      </div>
                    </div>
                  </LedgerSection>

                  <LedgerSection
                    title="Target roles"
                    label="You"
                    icon={<Target size={14} />}
                  >
                    {editingTargets ? (
                      <TargetsEditor
                        value={tailorDefaults}
                        onChange={setTailorDefaults}
                        onDone={() => setEditingTargets(false)}
                      />
                    ) : (
                      <>
                        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                          {tailorDefaults.roles || "No target roles set, so Jobs is ranking every role in the corpus."}
                        </p>
                        {tailorDefaults.locations ? (
                          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>{tailorDefaults.locations}</p>
                        ) : null}
                        <div className="profile-real-inline-actions">
                          <span className="profile-real-source-note">Source: your preferences</span>
                          <button className="profile-real-text-btn" type="button" onClick={() => setEditingTargets(true)}>
                            {tailorDefaults.roles ? "Edit target roles" : "Set target roles"}
                          </button>
                        </div>
                      </>
                    )}
                  </LedgerSection>

                  <LedgerSection
                    title="Application defaults"
                    label="You"
                    icon={<Shield size={14} />}
                  >
                    <div className="profile-real-entry" style={{ borderTop: 0, paddingTop: 0 }}>
                      <div>
                        <h4>Preferred tone</h4>
                        <p>
                          {tailorDefaults.tone === "confident"
                            ? "Confident & concise"
                            : tailorDefaults.tone === "formal"
                              ? "Formal"
                              : tailorDefaults.tone === "friendly"
                                ? "Friendly"
                                : "Not set"}
                        </p>
                      </div>
                    </div>
                    {tailorDefaults.portfolio ? (
                      <div className="profile-real-entry">
                        <div>
                          <h4>Portfolio</h4>
                          <p>{tailorDefaults.portfolio}</p>
                        </div>
                      </div>
                    ) : null}
                  </LedgerSection>
                </div>

                <div className="profile-real-editor-actions">
                  <span className="profile-real-save-state">
                    {anySaving ? "Saving changes..." : anyDirty ? "Unsaved changes" : "Changes save to your Career Memory automatically."}
                  </span>
                  <button type="button" className="profile-real-signout" style={{ borderColor: "rgba(37,99,235,0.14)", color: "#2563eb" }} onClick={() => setUploadStatus("idle")}>
                    <Upload size={14} />
                    Update from resume
                  </button>
                </div>
              </>
            ) : (
              <div className="profile-real-card-body">
                <ResumeUpload
                  status={uploadStatus}
                  onExtractionStart={handleExtractionStart}
                  onExtractionComplete={handleExtractionComplete}
                  onAcceptAll={handleAcceptAll}
                />
                <div className="profile-real-privacy" id="cm-upload-privacy">
                  <Shield size={13} />
                  <span>Your resume stays private. We reuse only the career facts you approve, so future applications start with accurate context.</span>
                </div>
              </div>
            )}
          </HubCard>
        </div>
      </div>

      <Toast />
    </div>
  );
}

function HubCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="profile-real-card" style={{ ...cardStyle, ...style }}>{children}</div>;
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="profile-real-section-header">
      <div className="profile-real-section-main">
        <div className="profile-real-section-icon">{icon}</div>
        <div>
          <div className="profile-real-section-title">{title}</div>
          <div className="profile-real-section-subtitle">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "blue" }) {
  const styles: Record<NonNullable<typeof tone>, CSSProperties> = {
    neutral: { background: "#f3f4f6", color: "#6b7280" },
    green: { background: "#dcfce7", color: "#15803d" },
    amber: { background: "#fef3c7", color: "#b45309" },
    blue: { background: "#dbeafe", color: "#2563eb" },
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
        ...styles[tone],
      }}
    >
      {children}
    </span>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="profile-real-metric">
      <div className={`profile-real-metric-value${accent ? " accent" : ""}`}>{value}</div>
      <div className="profile-real-metric-label">{label}</div>
    </div>
  );
}

function FeatureRow({ children }: { children: ReactNode }) {
  return (
    <div className="profile-real-feature-row">
      <span className="profile-real-feature-dot">
        <Shield size={11} />
      </span>
      <span>{children}</span>
    </div>
  );
}

function LedgerSection({
  title,
  count,
  label,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: string;
  label: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="profile-real-section" data-section={title.toLowerCase().replace(/\s+/g, "-")} open={defaultOpen}>
      <summary>
        <span className="profile-real-chevron"><ChevronRight size={14} /></span>
        <span>
          <span className="profile-real-section-title-row">
            {icon ? <span style={{ color: "#6b7280" }}>{icon}</span> : null}
            {title}
          </span>
          {count ? <span className="profile-real-section-count">{count}</span> : null}
        </span>
        <span className="profile-real-section-label">{label}</span>
      </summary>
      <div className="profile-real-detail-body">{children}</div>
    </details>
  );
}

function FactReviewStrip({ data }: { data: ExtractedProfileState }) {
  const issues: string[] = [];

  if (data.experience?.length) {
    for (const exp of data.experience) {
      if (!exp.dates || /present/i.test(exp.dates)) {
        if (!exp.dates || exp.dates.split(/\s*[-–]\s*/).length < 2) {
          issues.push(`${exp.role || "A role"} needs date review`);
        }
      }
    }
  }

  if (data.summary && data.summary.length < 80) {
    issues.push("Summary is very short");
  }

  if (issues.length === 0) return null;

  return (
    <div className="profile-real-attention" role="status">
      <div className="profile-real-attention-body">
        <AlertCircle size={16} />
        <span><strong>{issues.length} fact{issues.length !== 1 ? "s" : ""} to review</strong> from your latest resume.</span>
      </div>
      <button
        className="profile-real-text-btn"
        type="button"
        onClick={() => {
          const el = document.querySelector(".profile-real-section[data-section='experience']") as HTMLDetailsElement | null;
          if (el) {
            el.open = true;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
      >
        Review now
      </button>
    </div>
  );
}

function Toast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      setMsg(e.detail);
      setShow(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setShow(false), 2200);
    };
    window.addEventListener("cm:toast" as string, handler as EventListener);
    return () => window.removeEventListener("cm:toast" as string, handler as EventListener);
  }, []);

  return <div className={`profile-real-toast${show ? " show" : ""}`} role="status" aria-live="polite">{msg}</div>;
}

function getApproxYears(data: ExtractedProfileState): string {
  if (!data.experience?.length) return "";
  let earliest = new Date().getFullYear();
  let latest = 0;
  for (const exp of data.experience) {
    const startMatch = exp.dates?.match(/(\d{4})/);
    if (startMatch) {
      const year = parseInt(startMatch[1], 10);
      if (year < earliest) earliest = year;
    }
    const endMatch = exp.dates?.match(/(\d{4})\s*$/);
    if (endMatch) {
      const year = parseInt(endMatch[1], 10);
      if (year > latest) latest = year;
    }
  }
  return latest >= earliest ? `${latest - earliest} years` : "";
}
