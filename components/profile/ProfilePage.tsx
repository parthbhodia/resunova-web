"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, type ReactElement, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
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
import ResumeUpload from "./ResumeUpload";
import TargetsEditor from "./TargetsEditor";
import {
  HubCard,
  ProfileGrid,
  SectionHeader,
  StatusChip,
  profilePageSx,
} from "./profileMui";
import { ExtractedProfileState, INITIAL_EXTRACTED_PROFILE } from "../../lib/resumeExtractorService";
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
import { ScanUsageWidget } from "@/components/ScanUsageWidget";
import PlanBillingCard from "@/components/PlanBillingCard";
import { IntegrationsPanel, JobAlertsPanel, ReferralsPanel } from "@/components/profile/ProfileHubPanels";
import { subscribeReferralAlerts } from "@/lib/productNotices";
import { filledButtonSx, outlineButtonSx } from "@/components/mui/cssVars";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { FS, FW, LH } from "@/lib/typography";

const TAB_KEYS = ["usage", "career-profile", "referrals", "billing", "alerts", "integrations"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function tabFromParam(value: string | null): TabKey {
  return TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : "usage";
}

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
  const [ledgerOpen, setLedgerOpen] = useState<Record<string, boolean>>({ experience: true });

  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = tabFromParam(searchParams.get("tab"));
  const [referralUnread, setReferralUnread] = useState(0);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [pendingCareerScroll, setPendingCareerScroll] = useState<string | null>(null);

  useEffect(() => subscribeReferralAlerts((snap) => setReferralUnread(snap.unread)), []);

  const selectTab = useCallback((next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "usage") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `/profile?${query}` : "/profile", { scroll: false });
  }, [router, searchParams]);

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

  const scrollToCareerMemory = useCallback((section?: string) => {
    const target = section
      ? document.querySelector(`[data-section="${section}"]`)
      : document.getElementById("career-memory-editor");
    if (tab !== "career-profile") {
      setPendingCareerScroll(section ?? "career-memory-editor");
      selectTab("career-profile");
      return;
    }
    target?.scrollIntoView({ behavior: "smooth", block: section ? "center" : "start" });
  }, [selectTab, tab]);

  useEffect(() => {
    if (tab !== "career-profile" || !pendingCareerScroll) return;
    const frame = window.requestAnimationFrame(() => {
      const target = pendingCareerScroll === "career-memory-editor"
        ? document.getElementById(pendingCareerScroll)
        : document.querySelector(`[data-section="${pendingCareerScroll}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: pendingCareerScroll === "career-memory-editor" ? "start" : "center" });
      setPendingCareerScroll(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingCareerScroll, tab]);

  const reviewExperience = useCallback(() => {
    setLedgerOpen((prev) => ({ ...prev, experience: true }));
    requestAnimationFrame(() => {
      document.querySelector("[data-section='experience']")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const onSignOut = useCallback(() => {
    if (signingOut) return;
    if (typeof window !== "undefined" && !window.confirm("Sign out of Resunova on this device?")) return;
    setSigningOut(true);
    void signOutAndReturnHome();
  }, [signingOut]);

  const tabs: Array<{ key: TabKey; label: string; icon: ReactElement }> = [
    { key: "usage", label: "Usage", icon: <BarChart3 size={16} /> },
    { key: "career-profile", label: "Career profile", icon: <FileText size={16} /> },
    { key: "referrals", label: "Referrals", icon: <Users size={16} /> },
    { key: "billing", label: "Billing", icon: <CreditCard size={16} /> },
    { key: "alerts", label: "Job alerts", icon: <Bell size={16} /> },
    { key: "integrations", label: "Integrations", icon: <Plug size={16} /> },
  ];

  const panel = useMemo(() => {
    if (tab === "usage") {
      return (
        <ProfileGrid>
          <ScanUsageWidget mode="light" />
          <HubCard>
            <SectionHeader
              icon={<ClipboardList size={18} />}
              title="Application profile"
              subtitle="How complete your reusable application data is."
              action={
                <Button type="button" variant="text" onClick={() => scrollToCareerMemory()} sx={{ flexShrink: 0 }}>
                  Edit profile
                </Button>
              }
            />
            <Box sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                <Metric value={`${completionStats.percent}%`} label="Complete" accent />
                <Metric value={`${extractedData.experience?.length ?? 0}`} label="Work entries" />
                <Metric value={`${extractedData.skills?.length ?? 0}`} label="Skills saved" />
              </Stack>
              <Typography sx={{ mt: 2, fontSize: FS.bodyLg, lineHeight: LH.normal, color: "text.secondary", maxWidth: "65ch" }}>
                Your saved experience, skills, and preferences help Resunova prepare applications. Manage those details in Career profile.
              </Typography>
            </Box>
          </HubCard>
        </ProfileGrid>
      );
    }

    if (tab === "referrals") {
      return (
        <Stack spacing={2.25}>
          <ScanUsageWidget mode="light" />
          <ReferralsPanel
            displayName={displayName}
            title={extractedData.role || extractedData.headline || ""}
            linkedin={extractedData.linkedin || tailorDefaults.linkedin}
          />
        </Stack>
      );
    }

    if (tab === "billing") {
      return (
        <ProfileGrid>
          <PlanBillingCard mode="light" />
          <HubCard>
            <SectionHeader
              icon={<Shield size={18} />}
              title="Profile value"
              subtitle="What your saved profile unlocks."
            />
            <Stack spacing={1.5} sx={{ p: 3 }}>
              <FeatureRow>Reuse approved resume facts across new applications</FeatureRow>
              <FeatureRow>Keep target roles and location preferences in one place</FeatureRow>
              <FeatureRow>Update your resume once, then rescore and tailor faster</FeatureRow>
            </Stack>
          </HubCard>
        </ProfileGrid>
      );
    }

    if (tab === "alerts") {
      return (
        <JobAlertsPanel
          roles={tailorDefaults.roles}
          locations={tailorDefaults.locations}
          onEditTargets={() => {
            setEditingTargets(true);
            setLedgerOpen((prev) => ({ ...prev, "target-roles": true }));
            scrollToCareerMemory("target-roles");
          }}
        />
      );
    }

    if (tab === "career-profile") return null;

    return (
      <IntegrationsPanel
        extracted={extractedData}
        tailorDefaults={tailorDefaults}
        accountEmail={accountEmail}
        onChangeLinks={({ linkedin, github, portfolio }) => {
          setExtractedData((prev) => ({ ...prev, linkedin, github, portfolio }));
          setTailorDefaults((prev) => ({ ...prev, linkedin, portfolio }));
        }}
        onOpenCareerProfile={scrollToCareerMemory}
      />
    );
  }, [tab, completionStats.percent, extractedData, tailorDefaults, accountEmail, displayName, scrollToCareerMemory]);

  return (
    <MuiThemeRegistry mode="light">
      <Box sx={profilePageSx}>
        <Box sx={{ maxWidth: 1080, mx: "auto", px: { xs: 2, sm: 2.5 }, pt: { xs: 2.75, sm: 3.5 }, pb: 10 }}>
          <Box component="header" sx={{ mb: 0.5 }}>
            <Typography
              component="h1"
              sx={{ m: 0, fontSize: { xs: FS.h1, sm: FS.display }, lineHeight: LH.tight, letterSpacing: "-0.04em", fontWeight: FW.extrabold, color: "text.primary", textWrap: "balance" }}
            >
              Your account profile hub
            </Typography>
            <Typography sx={{ mt: 1.5, maxWidth: "65ch", fontSize: FS.subhead, lineHeight: LH.normal, color: "text.secondary" }}>
              A cleaner account home for your plan, profile completeness, usage, and the editable Career Memory that powers applications across Resunova.
            </Typography>
          </Box>

          <Stack spacing={2.25} sx={{ mt: 3 }}>
            <HubCard>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2.25}
                sx={{ alignItems: { sm: "center" }, p: 3 }}
              >
                <Avatar
                  aria-hidden
                  sx={{
                    width: 72,
                    height: 72,
                    fontSize: FS.display,
                    fontWeight: FW.bold,
                    bgcolor: "text.secondary",
                    color: "background.paper",
                  }}
                >
                  {initial}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography component="h2" sx={{ m: 0, fontSize: FS.h3, fontWeight: FW.extrabold, letterSpacing: "-0.02em" }}>
                    {displayName}
                  </Typography>
                  <Typography sx={{ mt: 0.75, fontSize: FS.bodyLg, color: "text.secondary", wordBreak: "break-word" }}>
                    {accountEmail || extractedData.email || "Signed in account"}
                  </Typography>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", flexWrap: "wrap", mt: 1.25 }}>
                    <StatusChip tone="green">Profile hub live</StatusChip>
                    {hasData ? <StatusChip tone="blue">Career Memory saved</StatusChip> : <StatusChip tone="amber">Needs resume upload</StatusChip>}
                  </Stack>
                </Box>
                <Button
                  type="button"
                  variant="outlined"
                  color="error"
                  onClick={onSignOut}
                  disabled={signingOut}
                  startIcon={<LogOut size={16} />}
                  sx={outlineButtonSx}
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </Button>
              </Stack>
            </HubCard>

            <HubCard>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ alignItems: { sm: "center" }, p: 2.25 }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "var(--md-shape-md)",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "var(--accent-bg)",
                    color: "var(--accent-ink)",
                    flexShrink: 0,
                  }}
                >
                  <ClipboardList size={24} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", flexWrap: "wrap", mb: 0.75 }}>
                    <Typography sx={{ fontSize: FS.title, fontWeight: FW.extrabold, color: "text.primary" }}>
                      Application profile
                    </Typography>
                    <StatusChip tone={completionStats.percent >= 75 ? "green" : "amber"}>
                      {completionStats.percent >= 75 ? "Ready" : "Incomplete"}
                    </StatusChip>
                  </Stack>
                  <Typography sx={{ fontSize: FS.subhead, lineHeight: LH.snug, color: "text.secondary" }}>
                    {profileSubtitle}
                  </Typography>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", flexWrap: "wrap", mt: 1.25 }}>
                    <StatusChip>{completionStats.completed}/{completionStats.total} profile fields filled</StatusChip>
                    {summaryItems ? <StatusChip>{summaryItems}</StatusChip> : null}
                  </Stack>
                </Box>
                <Button
                  type="button"
                  variant="contained"
                  onClick={() => scrollToCareerMemory()}
                  sx={filledButtonSx}
                >
                  {hasData ? "Edit profile" : "Complete profile"}
                </Button>
              </Stack>
            </HubCard>
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, next: TabKey) => selectTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Profile sections"
            sx={{
              mt: 2.5,
              mb: 2.25,
              borderBottom: "1px solid",
              borderColor: "divider",
              minHeight: 48,
            }}
          >
            {tabs.map((item) => (
              <Tab
                key={item.key}
                value={item.key}
                icon={item.icon}
                iconPosition="start"
                aria-label={item.key === "referrals" && referralUnread > 0 ? `Referrals, ${referralUnread} new` : undefined}
                label={
                  item.key === "referrals" && referralUnread > 0 ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      {item.label}
                      <Chip
                        size="small"
                        label={referralUnread > 99 ? "99+" : referralUnread}
                        sx={{
                          height: 18,
                          minWidth: 18,
                          fontSize: FS.caption,
                          fontWeight: FW.extrabold,
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                      />
                    </Stack>
                  ) : item.label
                }
              />
            ))}
          </Tabs>

          {panel}

          {tab === "career-profile" ? (
            <Box id="career-memory-editor" sx={{ mt: 3.25, scrollMarginTop: 16 }}>
            <HubCard interactive={false}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between", px: { xs: 2.25, sm: 3 }, pt: 3 }}
              >
                <Box>
                  <Typography component="h2" sx={{ m: 0, fontSize: FS.h2, fontWeight: FW.extrabold, letterSpacing: "-0.03em" }}>
                    Your career profile
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: FS.small,
                    color: !anySaving && !anyDirty ? "var(--green-ink)" : "text.secondary",
                    fontWeight: !anySaving && !anyDirty ? FW.bold : FW.normal,
                  }}
                >
                  {anySaving ? "Saving changes..." : anyDirty ? "Unsaved changes" : "All changes saved"}
                </Typography>
              </Stack>
              <Typography sx={{ px: { xs: 2.25, sm: 3 }, pt: 1, pb: 2.5, fontSize: FS.bodyLg, color: "text.secondary", lineHeight: LH.normal, maxWidth: "65ch" }}>
                Review the facts extracted from your résumé and update the details Resunova reuses when preparing applications.
              </Typography>

              {hasData ? (
                <>
                  <FactReviewStrip data={extractedData} onReview={reviewExperience} />

                  <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    <LedgerSection
                      title="Experience"
                      count={summaryItems || undefined}
                      label="Resume"
                      icon={<Briefcase size={14} />}
                      open={ledgerOpen.experience ?? true}
                      onOpenChange={(next) => setLedgerOpen((prev) => ({ ...prev, experience: next }))}
                    >
                      {extractedData.experience?.length ? (
                        extractedData.experience.map((exp, i) => (
                          <LedgerEntry
                            key={i}
                            title={`${exp.role}${exp.company ? `, ${exp.company}` : ""}`}
                            body={exp.description || (exp.bullets?.length > 0 ? exp.bullets.slice(0, 2).join(" · ") : undefined)}
                            date={exp.dates || ""}
                          />
                        ))
                      ) : (
                        <Typography sx={{ color: "text.secondary", fontSize: FS.body, m: 0 }}>No experience added yet.</Typography>
                      )}
                      <InlineActions note="Source: resume" action="Edit experience" />
                    </LedgerSection>

                    <LedgerSection
                      title="Education"
                      count={extractedData.education?.length ? `${extractedData.education.length} school${extractedData.education.length !== 1 ? "s" : ""}` : undefined}
                      label="Resume"
                      icon={<GraduationCap size={14} />}
                      open={ledgerOpen.education ?? false}
                      onOpenChange={(next) => setLedgerOpen((prev) => ({ ...prev, education: next }))}
                    >
                      {extractedData.education?.length ? (
                        extractedData.education.map((edu, i) => (
                          <LedgerEntry key={i} title={edu.degree || "Degree"} body={edu.institution} date={edu.dates || ""} />
                        ))
                      ) : (
                        <Typography sx={{ color: "text.secondary", fontSize: FS.body, m: 0 }}>No education added yet.</Typography>
                      )}
                      <InlineActions note="Source: resume" action="Edit education" />
                    </LedgerSection>

                    <LedgerSection
                      title="Skills"
                      count={extractedData.skills?.length ? `${extractedData.skills.length} skills` : undefined}
                      label="Resume"
                      icon={<Settings size={14} />}
                      open={ledgerOpen.skills ?? false}
                      onOpenChange={(next) => setLedgerOpen((prev) => ({ ...prev, skills: next }))}
                    >
                      {extractedData.skills?.length ? (
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", pt: 0.25 }}>
                          {extractedData.skills.map((skill, i) => (
                            <Chip key={i} size="small" label={skill} variant="outlined" />
                          ))}
                        </Stack>
                      ) : (
                        <Typography sx={{ color: "text.secondary", fontSize: FS.body, m: 0 }}>No skills added yet.</Typography>
                      )}
                      <InlineActions note="Source: resume" action="Edit skills" />
                    </LedgerSection>

                    <LedgerSection
                      title="Projects"
                      count={extractedData.projects?.length ? `${extractedData.projects.length} projects` : undefined}
                      label="Resume"
                      icon={<Folder size={14} />}
                      open={ledgerOpen.projects ?? false}
                      onOpenChange={(next) => setLedgerOpen((prev) => ({ ...prev, projects: next }))}
                    >
                      {extractedData.projects?.length ? (
                        extractedData.projects.map((proj, i) => (
                          <LedgerEntry
                            key={i}
                            title={proj.name}
                            body={
                              proj.description
                              || (proj.tech ? proj.tech : undefined)
                              || (proj.bullets?.length > 0 ? proj.bullets.slice(0, 2).join(" · ") : undefined)
                            }
                          />
                        ))
                      ) : (
                        <Typography sx={{ color: "text.secondary", fontSize: FS.body, m: 0 }}>No projects added yet.</Typography>
                      )}
                      <InlineActions note="Source: resume" action="Edit projects" />
                    </LedgerSection>

                    <LedgerSection
                      title="Summary"
                      label="Resume"
                      icon={<FileText size={14} />}
                      open={ledgerOpen.summary ?? false}
                      onOpenChange={(next) => setLedgerOpen((prev) => ({ ...prev, summary: next }))}
                    >
                      {extractedData.summary ? (
                        <Typography sx={{ m: 0, fontSize: FS.body, lineHeight: LH.normal, color: "text.primary" }}>{extractedData.summary}</Typography>
                      ) : (
                        <Typography sx={{ color: "text.secondary", fontSize: FS.body, m: 0 }}>No summary written yet.</Typography>
                      )}
                      <InlineActions note="Source: resume" action="Edit summary" />
                    </LedgerSection>

                    <LedgerSection
                      title="Contact"
                      label="Resume"
                      icon={<Mail size={14} />}
                      open={ledgerOpen.contact ?? false}
                      onOpenChange={(next) => setLedgerOpen((prev) => ({ ...prev, contact: next }))}
                    >
                      <LedgerEntry title="Email" body={extractedData.email || accountEmail || "Not set"} first />
                      <LedgerEntry title="Phone" body={extractedData.phone || "Not set"} />
                      <LedgerEntry title="Location" body={extractedData.location || "Not set"} />
                      <LedgerEntry
                        title="Links"
                        body={[
                          extractedData.linkedin ? "LinkedIn" : null,
                          extractedData.github ? "GitHub" : null,
                          extractedData.portfolio ? "Portfolio" : null,
                        ].filter(Boolean).join(", ") || "No links saved"}
                      />
                    </LedgerSection>

                    <LedgerSection
                      title="Target roles"
                      label="You"
                      icon={<Target size={14} />}
                      open={ledgerOpen["target-roles"] ?? false}
                      onOpenChange={(next) => setLedgerOpen((prev) => ({ ...prev, "target-roles": next }))}
                    >
                      {editingTargets ? (
                        <TargetsEditor
                          value={tailorDefaults}
                          onChange={setTailorDefaults}
                          onDone={() => setEditingTargets(false)}
                        />
                      ) : (
                        <>
                          <Typography sx={{ m: 0, fontSize: FS.body, color: "text.secondary" }}>
                            {tailorDefaults.roles || "No target roles set, so Jobs is ranking every role in the corpus."}
                          </Typography>
                          {tailorDefaults.locations ? (
                            <Typography sx={{ mt: 0.5, fontSize: FS.body, color: "text.secondary" }}>{tailorDefaults.locations}</Typography>
                          ) : null}
                          <InlineActions
                            note="Source: your preferences"
                            action={tailorDefaults.roles ? "Edit target roles" : "Set target roles"}
                            onAction={() => setEditingTargets(true)}
                          />
                        </>
                      )}
                    </LedgerSection>

                    <LedgerSection
                      title="Application defaults"
                      label="You"
                      icon={<Shield size={14} />}
                      open={ledgerOpen["application-defaults"] ?? false}
                      onOpenChange={(next) => setLedgerOpen((prev) => ({ ...prev, "application-defaults": next }))}
                    >
                      <LedgerEntry
                        first
                        title="Preferred tone"
                        body={
                          tailorDefaults.tone === "confident"
                            ? "Confident & concise"
                            : tailorDefaults.tone === "formal"
                              ? "Formal"
                              : tailorDefaults.tone === "friendly"
                                ? "Friendly"
                                : "Not set"
                        }
                      />
                      {tailorDefaults.portfolio ? (
                        <LedgerEntry title="Portfolio" body={tailorDefaults.portfolio} />
                      ) : null}
                    </LedgerSection>
                  </Box>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", px: { xs: 2.25, sm: 3 }, py: 3, borderTop: "1px solid", borderColor: "divider" }}
                  >
                    <Typography sx={{ fontSize: FS.small, color: "text.secondary" }}>
                      {anySaving ? "Saving changes..." : anyDirty ? "Unsaved changes" : "Changes save to your Career Memory automatically."}
                    </Typography>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<Upload size={14} />}
                      onClick={() => setUploadStatus("idle")}
                      sx={outlineButtonSx}
                    >
                      Update from resume
                    </Button>
                  </Stack>
                </>
              ) : (
                <Box sx={{ p: 3 }}>
                  <ResumeUpload
                    status={uploadStatus}
                    onExtractionStart={handleExtractionStart}
                    onExtractionComplete={handleExtractionComplete}
                    onAcceptAll={handleAcceptAll}
                  />
                  <Stack id="cm-upload-privacy" direction="row" spacing={1} sx={{ alignItems: "flex-start", maxWidth: 520, mx: "auto", mt: 2, color: "text.secondary", fontSize: FS.small, lineHeight: LH.normal }}>
                    <Shield size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Your resume stays private. We reuse only the career facts you approve, so future applications start with accurate context.</span>
                  </Stack>
                </Box>
              )}
            </HubCard>
            </Box>
          ) : null}
        </Box>

        <Toast />
      </Box>
    </MuiThemeRegistry>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 140,
        textAlign: "center",
        p: 2.25,
        borderRadius: "var(--md-shape-md)",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Typography
        sx={{
          fontSize: FS.display,
          fontWeight: FW.extrabold,
          letterSpacing: "-0.04em",
          color: accent ? "primary.main" : "text.primary",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: FS.bodyLg, color: "text.secondary" }}>{label}</Typography>
    </Box>
  );
}

function FeatureRow({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
      <Box
        aria-hidden
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "var(--green-bg)",
          color: "var(--green-ink)",
          flexShrink: 0,
        }}
      >
        <Shield size={11} />
      </Box>
      <Typography sx={{ fontSize: FS.bodyLg, color: "text.secondary" }}>{children}</Typography>
    </Stack>
  );
}

function LedgerSection({
  title,
  count,
  label,
  icon,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  count?: string;
  label: string;
  icon?: ReactNode;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: ReactNode;
}) {
  const key = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <Accordion
      disableGutters
      elevation={0}
      square
      expanded={open}
      onChange={(_, next) => onOpenChange(next)}
      data-section={key}
      sx={{
        bgcolor: "transparent",
        "&:before": { display: "none" },
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ChevronRight size={16} />}
        sx={{
          minHeight: 56,
          px: { xs: 2.25, sm: 3 },
          "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": { transform: "rotate(90deg)" },
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", width: "100%", pr: 1 }}>
          <Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              {icon ? <Box sx={{ color: "text.secondary", display: "grid" }}>{icon}</Box> : null}
              <Typography sx={{ fontSize: FS.subhead, fontWeight: FW.bold }}>{title}</Typography>
            </Stack>
            {count ? <Typography sx={{ display: "block", mt: 0.25, color: "text.secondary", fontSize: FS.caption }}>{count}</Typography> : null}
          </Box>
          <Typography sx={{ color: "text.secondary", fontSize: FS.micro, fontWeight: FW.extrabold, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {label}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2.25, sm: 3 }, pb: 2.75, pt: 0, pl: { xs: 5.25, sm: 6.5 } }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

function LedgerEntry({
  title,
  body,
  date,
  first,
}: {
  title: string;
  body?: string;
  date?: string;
  first?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "minmax(0,1fr) auto" },
        gap: { xs: 0.5, sm: "6px 16px" },
        py: 1.5,
        borderTop: first ? 0 : "1px dotted",
        borderColor: "divider",
        "&:first-of-type": { pt: first ? 0 : 0.25, borderTop: first ? 0 : undefined },
      }}
    >
      <Box>
        <Typography component="h4" sx={{ m: 0, fontSize: FS.body, fontWeight: FW.bold }}>{title}</Typography>
        {body ? <Typography sx={{ mt: 0.25, color: "text.secondary", fontSize: FS.small, lineHeight: LH.snug }}>{body}</Typography> : null}
      </Box>
      {date ? <Typography sx={{ color: "text.secondary", fontSize: FS.caption, whiteSpace: "nowrap" }}>{date}</Typography> : null}
    </Box>
  );
}

function InlineActions({
  note,
  action,
  onAction,
}: {
  note: string;
  action: string;
  onAction?: () => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", justifyContent: "space-between", mt: 1.5, pt: 1.25, borderTop: "1px dotted", borderColor: "divider" }}
    >
      <Typography sx={{ color: "text.secondary", fontSize: FS.micro }}>{note}</Typography>
      <Button type="button" variant="text" onClick={onAction} sx={{ minHeight: 44, fontSize: FS.small, fontWeight: FW.bold }}>
        {action}
      </Button>
    </Stack>
  );
}

function FactReviewStrip({ data, onReview }: { data: ExtractedProfileState; onReview: () => void }) {
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
    <Alert
      severity="warning"
      icon={<AlertCircle size={16} />}
      action={
        <Button color="inherit" size="small" onClick={onReview} sx={{ fontWeight: FW.bold }}>
          Review now
        </Button>
      }
      sx={{ mx: { xs: 2.25, sm: 3 }, mb: 2.25 }}
    >
      <strong>{issues.length} fact{issues.length !== 1 ? "s" : ""} to review</strong> from your latest resume.
    </Alert>
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

  return (
    <Snackbar
      open={show}
      onClose={() => setShow(false)}
      autoHideDuration={2200}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      message={msg}
    />
  );
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
