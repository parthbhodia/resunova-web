"use client";

/**
 * Root page — routes between top-level views via query params.
 *
 *   /                            -> analyze (default)
 *   /?view=builder&flow=tailor -> JD tailor workflow (legacy flow=template redirects to /template-builder)
 *   /?view=library               -> library grid (+ optional right detail panel when resume=<f>)
 *   /?view=profile&prefill=1     -> Profile page + optional session prefill from Analyze / template flow
 *   /?view=jobs                  -> jobs (placeholder for now)
 *   /?view=cover-letter          -> cover letter builder (+ optional ?cl=<id> to reopen saved)
 *   /?view=builder&flow=tailor&base=<folder> -> builder with folder pre-loaded
 *
 * Query params instead of dynamic routes because GH Pages serves the
 * `output: "export"` build, which can't enumerate runtime-minted IDs.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell, { useAppView } from "@/components/AppShell";
import ResumeBuilder from "@/components/ResumeBuilder";
import ContentSourcePicker from "@/components/ContentSourcePicker";
import ManualResumeForm from "@/components/ManualResumeForm";
import ResumeLibrary from "@/components/ResumeLibrary";
import AnalyzeResume from "@/components/AnalyzeResume";
import ProfilePage from "@/components/ProfilePage";
import AccountSettingsPage from "@/components/AccountSettingsPage";
import AdvisorDashboard from "@/components/AdvisorDashboard";
import JobsFeed from "@/components/JobsFeed";
import JobDetail from "@/components/JobDetail";
import MoreMatchesPanel from "@/components/MoreMatchesPanel";
import { useIsDesktop } from "@/hooks/use-mobile";
import ApplicationTracker from "@/components/ApplicationTracker";
import CoverLetterBuilder from "@/components/CoverLetterBuilder";
import HomeDashboard from "@/components/HomeDashboard";

export default function HomePageClient() {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell>
        <RouterView />
      </AppShell>
    </Suspense>
  );
}

/** Fills AppShell main (flex) without growing the document — children handle their own scroll areas. */
function ViewFill({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: "1 1 0%",
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function ScrollPane({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children}
    </div>
  );
}

function RouterView() {
  const params = useSearchParams();
  const router = useRouter();
  const rawView = (params?.get("view") || "home").toLowerCase();
  const view = useAppView();
  const base = (params?.get("base") || "").trim();
  const flow = (params?.get("flow") || "tailor").toLowerCase();
  /** Legacy `flow=scratch` matched tailor; normalize URL so bookmarks still work. */
  const scratchNormalizedRef = useRef(false);
  useEffect(() => {
    if (view !== "builder" || flow !== "scratch") return;
    if (scratchNormalizedRef.current) return;
    scratchNormalizedRef.current = true;
    const q = new URLSearchParams(params?.toString() ?? "");
    q.set("flow", "tailor");
    router.replace(`/?${q.toString()}`);
  }, [view, flow, router, params]);

  /** Legacy gallery `flow=template` — Template Builder replaced ResumeTemplateStudio. */
  const templateRedirectRef = useRef(false);
  useEffect(() => {
    if (view !== "builder" || flow !== "template") return;
    if (templateRedirectRef.current) return;
    templateRedirectRef.current = true;
    router.replace("/template-builder/");
  }, [view, flow, router]);

  if (view === "home") {
    return (
      <ViewFill>
        <ScrollPane>
          <HomeDashboard />
        </ScrollPane>
      </ViewFill>
    );
  }
  if (view === "library") {
    return (
      <ViewFill>
        <ResumeLibrary />
      </ViewFill>
    );
  }
  if (view === "profile") {
    const prefill = (params?.get("prefill") || "").trim() === "1";
    return (
      <ViewFill>
        <ScrollPane>
          <ProfilePage prefill={prefill} />
        </ScrollPane>
      </ViewFill>
    );
  }
  if (view === "account") {
    return (
      <ViewFill>
        <ScrollPane>
          <AccountSettingsPage />
        </ScrollPane>
      </ViewFill>
    );
  }
  if (view === "jobs") {
    const jobId = (params?.get("job") || "").trim();
    return (
      <ViewFill>
        <ScrollPane>
          <JobsView selectedJobId={jobId} />
        </ScrollPane>
      </ViewFill>
    );
  }
  if (view === "cover-letter") {
    return (
      <ViewFill>
        <CoverLetterBuilder />
      </ViewFill>
    );
  }
  // These views are not in useAppView()'s allowlist so must be checked against
  // rawView before the view === "analyze" fallback swallows them.
  if (rawView === "content-source") {
    return (
      <ViewFill>
        <ContentSourcePicker />
      </ViewFill>
    );
  }
  if (rawView === "manual-form") {
    return (
      <ViewFill>
        <ManualResumeForm />
      </ViewFill>
    );
  }
  if (view === "advisor") {
    return (
      <ViewFill>
        <ScrollPane>
          <AdvisorDashboard />
        </ScrollPane>
      </ViewFill>
    );
  }
  if (view === "analyze") {
    return (
      <ViewFill>
        <AnalyzeResume />
      </ViewFill>
    );
  }
  if (view === "builder" && flow === "template") {
    return null;
  }
  // key ensures remount when base folder or builder workflow changes
  const builderKeyFlow = flow === "scratch" ? "tailor" : flow;
  return (
    <ViewFill>
      <ResumeBuilder
        key={`builder-${base}-${builderKeyFlow}`}
        initialBaseFolder={base || null}
      />
    </ViewFill>
  );
}

function ShellSkeleton() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        width: 22, height: 22, border: "2px solid var(--surface2)", borderTopColor: "var(--accent)",
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

/**
 * Jobs routing/layout:
 *  - No job selected → the tabbed feed shell (Recommended / My Applications).
 *  - A job selected on a narrow screen → full-page detail (the list is a
 *    separate screen, LinkedIn-mobile style).
 *  - A job selected on a wide screen (≥1024px) → split view: a compact list
 *    rail on the left, the selected job's detail pinned on the right.
 */
function JobsView({ selectedJobId }: { selectedJobId: string }) {
  const isDesktop = useIsDesktop();

  if (!selectedJobId) return <JobsTabShell />;
  if (!isDesktop) return <JobDetail jobId={selectedJobId} />;

  return (
    <div
      style={{
        // Fill the whole content area — no maxWidth cap (it left a large empty
        // band on the right on wide monitors). Feed stays a fixed 420px rail;
        // the detail column flexes to take all remaining width.
        width: "100%",
        padding: "20px 20px 56px",
        display: "flex",
        gap: 24,
        alignItems: "flex-start",
      }}
    >
      {/* Google-style wider list rail (~40%, clamped) so more of the feed is in
          view; the detail still fills the remaining ~60% (2-col, auto-collapses). */}
      <div style={{ flex: "0 0 clamp(360px, 40%, 560px)", minWidth: 0 }}>
        <JobsFeed selectedJobId={selectedJobId} variant="list" />
      </div>
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          maxHeight: "calc(100dvh - 88px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <JobDetail jobId={selectedJobId} embedded />
        <MoreMatchesPanel currentJobId={selectedJobId} />
      </div>
    </div>
  );
}

type JobsTab = "recommended" | "tracker";

function JobsTabShell() {
  const [tab, setTab] = useState<JobsTab>("recommended");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const tabs: { key: JobsTab; label: string }[] = [
    { key: "recommended", label: "Recommended" },
    { key: "tracker", label: "My Applications" },
  ];

  useEffect(() => {
    const sb = getSupabaseClient();
    let active = true;
    sb.auth.getSession().then(({ data }) => { if (active) setSignedIn(!!data.session); });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  // Signed-out (or while auth is still resolving): no tabs — JobsFeed renders
  // the focused sign-in hero, and "My Applications" is meaningless without an
  // account. Tabs appear only once we've confirmed a session.
  if (signedIn !== true) return <JobsFeed />;

  return (
    <div style={{ width: "100%" }}>
      {/* Tab bar */}
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "20px 20px 0",
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--surface2)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              fontSize: 13.5,
              fontWeight: tab === t.key ? 600 : 400,
              padding: "7px 14px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              color: tab === t.key ? "var(--text)" : "var(--muted)",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "recommended" ? <JobsFeed /> : <ApplicationTracker />}
    </div>
  );
}

function PlaceholderPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 28px", textAlign: "center" }}>
      <div style={{ fontSize: 30, marginBottom: 14 }}>🚧</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 8 }}>{title}</h1>
      <p style={{ fontSize: 13, color: "var(--dim)", letterSpacing: -0.1, lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  );
}
