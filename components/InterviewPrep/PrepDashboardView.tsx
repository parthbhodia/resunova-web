"use client";

/**
 * Interview Prep — Step 4 (Preparation Dashboard).
 *
 * Final page of the MVP workflow. Shows personalized question cards built from
 * the user's resume category, selected interview type, company, role, and setup
 * preferences. All questions are mock data — no backend yet.
 *
 * Actions: Copy Questions, Regenerate (toast placeholder), Download, Save.
 * Sticky bottom action bar shows total question count + category.
 */

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Library,
  MoreHorizontal,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useInterviewPrepStore } from "@/store/interviewPrepStore";
import { apiUrl } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";
import {
  classifyResumeCategory,
  type ResumeCategory,
} from "@/lib/resumeCategoryClassify";
import { DIFFICULTY_OPTIONS } from "./practiceSetupConfig";
import { INTERVIEW_TYPES_BY_CATEGORY } from "./interviewTypeConfig";
import {
  buildQuestionSections,
} from "./dashboardMockQuestions";
import WorkflowStepper from "./WorkflowStepper";
import {
  fetchLatestPrepSession,
  fetchPrepSessionById,
  fetchStoryBank,
  deleteStory,
  type PrepQuestion,
  type PrepSessionRecord,
  type PrepStory,
} from "@/lib/supabase";
import { ScanFeedbackToast, useScanToast } from "@/components/ScanFeedbackToast";

export interface QuestionItem {
  question: string;
  reason?: string | null;
  source?: string | null;
  star_framework?: {
    situation: string;
    task: string;
    action: string;
    result: string;
    reflection: string;
  } | null;
  best_story?: {
    title: string;
    reason: string;
  } | null;
}

export interface QuestionSection {
  id: string;
  title: string;
  description: string;
  questions: QuestionItem[];
}


// ── Section icon map ─────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ReactNode> = {
  resume:     <User className="size-5" aria-hidden />,
  jd:         <BookOpen className="size-5" aria-hidden />,
  behavioral: <Briefcase className="size-5" aria-hidden />,
  company:    <Building2 className="size-5" aria-hidden />,
};

const SECTION_COLORS: Record<string, string> = {
  resume:     "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  jd:         "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  behavioral: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  company:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

// ── Main view ────────────────────────────────────────────────────────────────

export default function PrepDashboardView() {
  const router = useRouter();

  const structuredResume      = useInterviewPrepStore((s) => s.structuredResume);
  const extractedText         = useInterviewPrepStore((s) => s.extractedText);
  const jobDescription        = useInterviewPrepStore((s) => s.jobDescription);
  const resumeCategory        = useInterviewPrepStore((s) => s.resumeCategory);
  const company               = useInterviewPrepStore((s) => s.company);
  const role                  = useInterviewPrepStore((s) => s.role);
  const selectedInterviewType = useInterviewPrepStore((s) => s.selectedInterviewType);
  const difficulty            = useInterviewPrepStore((s) => s.difficulty);
  const questionCount         = useInterviewPrepStore((s) => s.questionCount);
  const selectedSources       = useInterviewPrepStore((s) => s.selectedSources);
  const selectedFocusAreas    = useInterviewPrepStore((s) => s.selectedFocusAreas);
  const storeSessionId        = useInterviewPrepStore((s) => s.sessionId);
  const jobPostingId          = useInterviewPrepStore((s) => s.jobPostingId);
  const loadedFromDb          = useInterviewPrepStore((s) => s.loadedFromDb);
  const setSessionId          = useInterviewPrepStore((s) => s.setSessionId);
  const setLoadedFromDb       = useInterviewPrepStore((s) => s.setLoadedFromDb);
  const historySessionId      = useInterviewPrepStore((s) => s.historySessionId);
  const setHistorySessionId   = useInterviewPrepStore((s) => s.setHistorySessionId);

  const category: ResumeCategory =
    (resumeCategory as ResumeCategory | null) ??
    classifyResumeCategory(structuredResume, extractedText).category;

  const allTypes = INTERVIEW_TYPES_BY_CATEGORY[category] ?? INTERVIEW_TYPES_BY_CATEGORY.General;
  const interviewTypeLabel =
    allTypes.find((t) => t.id === selectedInterviewType)?.label ?? "Mixed Interview";

  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.id === difficulty)?.label ?? "Mid Level";

  // AI-generated sections state (falls back to mock builder on error)
  const [sections, setSections] = useState<QuestionSection[]>(() =>
    buildQuestionSections(category, company, role, selectedInterviewType, questionCount).map((s) => ({
      ...s,
      questions: s.questions.map((q) => ({
        question: q,
        reason: "Standard question optimized for your background",
        source: s.id,
        star_framework: {
          situation: "Worked on key projects from the resume",
          task: "Address critical goals and meet project requirements",
          action: "Applied technical stack and coordinated with the team",
          result: "Successfully delivered the project with positive feedback",
          reflection: "Learned to handle constraints and optimize code quality"
        },
        best_story: {
          title: "Resume Project",
          reason: "Demonstrates core technical proficiency from your resume"
        }
      }))
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbBannerDismissed, setDbBannerDismissed] = useState(false);
  // Bumped whenever a generation/load completes so the Story Bank panel re-fetches
  // the (now-updated) master story bank.
  const [bankRefresh, setBankRefresh] = useState(0);
  // Real, sourced coding questions for this company (from the shared question bank).
  const [codingQuestions, setCodingQuestions] = useState<BankCodingQuestion[]>([]);
  // Whole-kit regeneration (sticky-bar "Regenerate All"). Tracked separately from
  // the page `loading` flag so the existing questions stay visible (dimmed) while
  // the new set is fetched, instead of flashing the full skeleton again.
  const [regenAll, setRegenAll] = useState(false);
  // Lightweight transient confirmation toast (no global toast system in this app).
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const notify = (msg: string) => {
    setFeedback(msg);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 3000);
  };
  useEffect(() => () => {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
  }, []);

  const { scanMeta, handleScanResponse, handleScanError, clearScanMeta } = useScanToast();

  // Map API response shape → QuestionSection[]
  const toSection = (
    id: string,
    title: string,
    description: string,
    items: QuestionItem[],
  ): QuestionSection => ({
    id,
    title,
    description,
    questions: (items ?? []).filter((item) => item && item.question),
  });

  // Section id → response key + display copy. Shared by the full build and the
  // single-section (per-card) regenerate merge so they never drift.
  const sectionDef = (
    id: string,
  ): { key: string; title: string; description: string } => {
    switch (id) {
      case "resume":
        return {
          key: "resume_questions",
          title: "Resume-Based Questions",
          description: "Generated from your projects, achievements, and experience.",
        };
      case "jd":
        return {
          key: "jd_questions",
          title: "Job Description — Role Requirements",
          description: "Generated from the role's core requirements and responsibilities.",
        };
      case "behavioral":
        return {
          key: "behavioral_questions",
          title: "Behavioral Questions",
          description: "STAR-method and leadership-focused interview preparation.",
        };
      case "company":
      default:
        return {
          key: "company_questions",
          title: company ? `${company} — Company-Specific Questions` : "Company-Specific Questions",
          description: company
            ? `Tailored to ${company}'s known interview patterns and culture.`
            : "Questions tailored to your target company's values.",
        };
    }
  };

  // Build sections from a saved kit (uses the kit's own company, not the store's).
  const buildSavedSections = (saved: PrepSessionRecord): QuestionSection[] =>
    [
      toSection("resume", "Resume-Based Questions", "Generated from your projects, achievements, and experience.", saved.questions.resume_questions),
      toSection("jd", "Job Description — Role Requirements", "Generated from the role's core requirements and responsibilities.", saved.questions.jd_questions),
      toSection("behavioral", "Behavioral Questions", "STAR-method and leadership-focused interview preparation.", saved.questions.behavioral_questions),
      toSection(
        "company",
        saved.company ? `${saved.company} — Company-Specific Questions` : "Company-Specific Questions",
        saved.company ? `Tailored to ${saved.company}'s known interview patterns and culture.` : "Questions tailored to your target company's values.",
        saved.questions.company_questions,
      ),
    ].filter((s) => s.questions.length > 0);

  const fetchQuestions = async (isRegenerate: boolean = false, onlySection?: string) => {
    // If no resume data is available (e.g. direct navigation), skip the API
    // call and keep the mock-built sections — no error shown to the user.
    const hasResume = !!(extractedText.trim() || structuredResume);
    if (!hasResume) return;

    // Only show full-page loading if it's not a background regeneration
    if (!isRegenerate) {
      setLoading(true);
    }
    setError(null);
    try {
      // Send the auth token so the backend can persist the session + questions
      // + story bank (persistence is gated on an authenticated user_id). Without
      // it, generation still returns questions but nothing is saved, so the
      // "resume your latest prep session" feature would never see this run.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch {
        // Supabase env not configured / signed out — proceed anonymously.
      }
      const res = await fetch(apiUrl("/api/generate-interview-questions"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          structured_resume: structuredResume,
          extracted_text: extractedText,
          job_description: jobDescription,
          company,
          role,
          resume_category: category,
          interview_type: selectedInterviewType ?? "mixed",
          difficulty,
          question_count: questionCount,
          sources: selectedSources,
          focus_areas: selectedFocusAreas,
          regenerate: isRegenerate,
          only_section: onlySection ?? null,
          session_id: storeSessionId,
          job_id: jobPostingId,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        handleScanResponse(data);
      } else if (res.status === 429) {
        handleScanError(data);
        throw new Error(data.error || `Server error ${res.status}`);
      } else {
        throw new Error(`Server error ${res.status}`);
      }

      setCodingQuestions(Array.isArray(data.coding_questions) ? data.coding_questions : []);

      // Capture session_id returned by the backend persistence layer
      if (data.session_id) {
        setSessionId(String(data.session_id));
        setLoadedFromDb(false);
      }

      // Per-section regenerate: replace only that card, keep the others intact.
      if (onlySection) {
        const def = sectionDef(onlySection);
        const rebuilt = toSection(onlySection, def.title, def.description, data[def.key]);
        if (rebuilt.questions.length === 0) {
          throw new Error("No questions returned for that section");
        }
        setSections((prev) => prev.map((s) => (s.id === onlySection ? rebuilt : s)));
        setBankRefresh((n) => n + 1);
        return true;
      }

      const built: QuestionSection[] = ["resume", "jd", "behavioral", "company"]
        .map((id) => {
          const def = sectionDef(id);
          return toSection(id, def.title, def.description, data[def.key]);
        })
        .filter((s) => s.questions.length > 0);

      if (built.length === 0) throw new Error("No questions returned from AI");
      setSections(built);
      // New stories were just accumulated into the bank server-side — refresh it.
      setBankRefresh((n) => n + 1);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      // Keep existing mock-built sections visible on error
      return false;
    } finally {
      if (!isRegenerate) {
        setLoading(false);
      }
    }
  };

  // On mount: pick the right source — a specific kit opened from Prep History,
  // a fresh workflow run, or (direct navigation) the last saved kit.
  useEffect(() => {
    // 1. Opened from Prep History — load that specific saved kit (one-shot).
    if (historySessionId) {
      const id = historySessionId;
      setHistorySessionId(null);
      void (async () => {
        setLoading(true);
        try {
          const saved = await fetchPrepSessionById(id);
          if (saved) {
            const built = buildSavedSections(saved);
            if (built.length > 0) {
              setSections(built);
              setSessionId(saved.id);
              setLoadedFromDb(true);
            }
          }
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    const hasResume = !!(extractedText.trim() || structuredResume);
    if (hasResume) {
      // User came through the full workflow — generate fresh
      void fetchQuestions();
    } else {
      // User navigated directly to dashboard — try loading the last saved kit
      void (async () => {
        setLoading(true);
        try {
          const saved = await fetchLatestPrepSession();
          if (saved) {
            const built = buildSavedSections(saved);
            if (built.length > 0) {
              setSections(built);
              setSessionId(saved.id);
              setLoadedFromDb(true);
            }
          }
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  // Per-section "regenerate" state
  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({});
  const triggerRegenerate = async (id: string) => {
    setRegenerating((prev) => ({ ...prev, [id]: true }));
    try {
      const ok = await fetchQuestions(true, id);
      notify(ok ? "Section regenerated" : "Couldn't regenerate — try again");
    } finally {
      setRegenerating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRegenerateAll = async () => {
    setRegenAll(true);
    try {
      const ok = await fetchQuestions(true);
      notify(ok ? "Fresh questions generated" : "Couldn't regenerate — try again");
    } finally {
      setRegenAll(false);
    }
  };

  return (
    <div className="w-full px-4 py-4 pb-6 md:px-8 md:py-8 md:pb-32">
      {/* Mobile Top Header (hidden on desktop) */}
      <header className="mb-5 flex items-center gap-3 md:hidden">
        <button
          onClick={() => router.push("/interview-prep/setup")}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted active:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent">Step 4 of 4</div>
          <h1 className="text-lg font-bold text-foreground">Prep Dashboard</h1>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1 w-4 rounded-full bg-accent" />
          <div className="h-1 w-4 rounded-full bg-accent" />
          <div className="h-1 w-4 rounded-full bg-accent" />
          <div className="h-1 w-4 rounded-full bg-accent" />
        </div>
      </header>

      {/* Header (hidden on mobile) */}
      <header className="mb-5 hidden md:block">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Your Personalized Interview Prep Kit
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground md:text-base">
          Questions generated from your resume, job description, company, role,
          and selected interview type.
        </p>
      </header>

      <div className="mb-6 hidden md:block">
        <WorkflowStepper activeStep={4} />
      </div>

      <div className="flex flex-col gap-5">
        {/* Loaded-from-DB banner */}
        {loadedFromDb && !dbBannerDismissed && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950/40">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Database className="size-4 shrink-0" aria-hidden />
              <span>
                You&apos;re reviewing a saved prep kit. Upload a new resume to generate fresh questions.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDbBannerDismissed(true)}
              className="shrink-0 rounded p-0.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Desktop summary card (Hidden on mobile) */}
        <div className="hidden md:block">
          <SummaryCard
            category={category}
            company={company}
            role={role}
            interviewTypeLabel={interviewTypeLabel}
            difficultyLabel={difficultyLabel}
          />
        </div>

        {/* Mobile summary card (Hidden on desktop) */}
        <MobileSummaryCard
          category={category}
          company={company}
          role={role}
          interviewTypeLabel={interviewTypeLabel}
          difficultyLabel={difficultyLabel}
        />

        {/* Question section cards */}
        {loading ? (
          <GeneratingState />
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-destructive/50 rounded-2xl bg-destructive/5"
          >
            <p className="text-sm font-semibold text-destructive">
              Couldn&apos;t generate your questions: {error}
            </p>
            <Button variant="outline" size="sm" onClick={() => void fetchQuestions()}>
              <RefreshCw className="size-3.5" aria-hidden />
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop View: scrolling list of sections. Dims (non-interactive)
                during a whole-kit "Regenerate All" so the old set stays readable
                while the new one loads, instead of flashing a skeleton. */}
            <div
              className={cn(
                "hidden md:grid gap-5 transition-opacity duration-200",
                regenAll && "pointer-events-none opacity-50",
              )}
              aria-busy={regenAll}
            >
              {sections.map((section, i) => (
                <QuestionCard
                  key={section.id}
                  section={section}
                  defaultExpanded={i === 0}
                  isRegenerating={!!regenerating[section.id]}
                  onRegenerate={() => triggerRegenerate(section.id)}
                />
              ))}
            </div>

            {/* Mobile View: accordion sections (same regen-dimming behavior). */}
            <div
              className={cn(
                "grid gap-4 md:hidden transition-opacity duration-200",
                regenAll && "pointer-events-none opacity-50",
              )}
              aria-busy={regenAll}
            >
              {sections.map((section, i) => (
                <MobileQuestionSectionCard
                  key={section.id}
                  section={section}
                  defaultExpanded={i === 0}
                  isRegenerating={!!regenerating[section.id]}
                  onRegenerate={() => triggerRegenerate(section.id)}
                />
              ))}
            </div>

            {/* Real coding questions reported at this company (shared question bank) */}
            <CodingBankSection questions={codingQuestions} company={company} />

            {/* Story bank — scoped to THIS résumé's prep session */}
            <StoryBankPanel refreshSignal={bankRefresh} sessionId={storeSessionId} />
          </>
        )}
      </div>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <Check className="size-4 text-accent" aria-hidden />
          {feedback}
        </div>
      ) : null}

      {scanMeta && (
        <ScanFeedbackToast
          meta={scanMeta}
          onDismiss={clearScanMeta}
        />
      )}

      {/* Unified Sticky bottom action bar (Desktop & Mobile responsive) */}
      <StickyActionBar
        totalQuestions={totalQuestions}
        category={category}
        sections={sections}
        sessionId={storeSessionId}
        regeneratingAll={regenAll}
        onNotify={notify}
        onBack={() => router.push("/interview-prep/setup")}
        onRegenerateAll={handleRegenerateAll}
        isLoading={loading}
      />
    </div>
  );
}

// ── Coding question bank (real, sourced) ──────────────────────────────────────

interface BankCodingQuestion {
  question: string;
  source: string;
  source_url: string | null;
  is_inferred: boolean;
  difficulty: string | null;
  tags: string[];
}

function difficultyStyle(d: string | null): { color: string; bg: string } {
  const x = (d || "").toLowerCase();
  if (x === "easy") return { color: "var(--green-ink)", bg: "color-mix(in srgb, var(--green-ink) 12%, transparent)" };
  if (x === "hard") return { color: "var(--red-ink)", bg: "color-mix(in srgb, var(--red-ink) 12%, transparent)" };
  return { color: "var(--amber-ink)", bg: "color-mix(in srgb, var(--amber-ink) 12%, transparent)" }; // medium/unknown
}

function CodingBankSection({ questions, company }: { questions: BankCodingQuestion[]; company: string }) {
  const [showAll, setShowAll] = useState(false);
  if (!questions.length) return null;
  const shown = showAll ? questions : questions.slice(0, 8);

  return (
    <Card className="rounded-2xl border-accent/30 bg-[var(--accent-bg)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Code2 className="size-4" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base">
              Coding questions reported at {company || "this company"}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Real LeetCode problems tagged to this company, most frequent first — not AI-generated.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {shown.map((q, i) => {
          const d = difficultyStyle(q.difficulty);
          return (
            <div key={`${q.question}-${i}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
              {q.difficulty && (
                <span className="mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: d.color, background: d.bg }}>
                  {q.difficulty}
                </span>
              )}
              <div className="min-w-0 flex-1">
                {q.source_url ? (
                  <a href={q.source_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-accent">
                    {q.question}
                    <ExternalLink className="size-3 shrink-0 opacity-60" />
                  </a>
                ) : (
                  <span className="text-sm font-medium text-foreground">{q.question}</span>
                )}
                {q.tags?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {q.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              {!q.is_inferred && (
                <Badge variant="outline" className="shrink-0 text-[10px]">Reported · LeetCode</Badge>
              )}
            </div>
          );
        })}
        {questions.length > 8 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}
            className="self-start text-xs text-muted-foreground hover:text-foreground">
            {showAll ? "Show fewer" : `Show all ${questions.length}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Generating (skeleton) state ───────────────────────────────────────────────

const GENERATING_MESSAGES = [
  "Reading your resume…",
  "Matching the role requirements…",
  "Drafting tailored questions…",
  "Building STAR answer frameworks…",
];

function GeneratingState() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return; // keep a single stable message
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % GENERATING_MESSAGES.length),
      2200,
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div role="status" aria-live="polite" className="grid gap-5">
      {/* Status strip */}
      <div className="flex items-center gap-2.5 rounded-xl border border-accent/20 bg-[var(--accent-bg)] px-4 py-3">
        <RefreshCw className="size-4 shrink-0 animate-spin text-accent" aria-hidden />
        <span className="text-sm font-medium text-foreground">
          Generating your prep kit…
        </span>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {GENERATING_MESSAGES[idx]}
        </span>
        <span className="sr-only">{GENERATING_MESSAGES[idx]}</span>
      </div>

      {/* Skeleton cards mirror the real question-card shape to avoid layout shift. */}
      {[0, 1, 2].map((n) => (
        <Card key={n} className="rounded-2xl">
          <CardHeader className="pb-0">
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            <Separator />
            {[0, 1, 2].map((q) => (
              <div
                key={q}
                className="flex gap-3 rounded-xl border border-border/40 bg-muted/20 p-4"
              >
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Story bank ───────────────────────────────────────────────────────────────

const MASTER_STORY_CAP = 10;

function StoryBankPanel({ refreshSignal, sessionId }: { refreshSignal: number; sessionId: string | null }) {
  const [stories, setStories] = useState<PrepStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Scope to the current prep session so the panel only shows THIS résumé's
      // stories. No session yet → nothing to show.
      const bank = sessionId ? await fetchStoryBank(sessionId) : [];
      if (!cancelled) {
        setStories(bank);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSignal, sessionId]);

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Remove this story from your bank?")) return;
    setDeletingId(id);
    const ok = await deleteStory(id);
    if (ok) setStories((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  // Don't show an empty panel before the first fetch resolves, or for signed-out
  // users with nothing saved (avoids a confusing empty box under dev-bypass).
  if (loading && stories.length === 0) return null;
  if (!loading && stories.length === 0) return null;

  return (
    <Card className="rounded-2xl border-accent/30 bg-[var(--accent-bg)]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Library className="size-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-base">Your Story Bank</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                STAR+R stories built from this résumé&apos;s prep — ready to answer most behavioral questions.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {stories.length} / {MASTER_STORY_CAP}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 pt-0">
        {stories.map((story) => (
          <StoryBankItem
            key={story.id}
            story={story}
            deleting={deletingId === story.id}
            onDelete={() => handleDelete(story.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function StoryBankItem({
  story,
  deleting,
  onDelete,
}: {
  story: PrepStory;
  deleting: boolean;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const star: Array<[string, string, boolean]> = [
    ["Situation", story.situation, false],
    ["Task", story.task, false],
    ["Action", story.action, false],
    ["Result", story.result, false],
    ["Reflection", story.reflection, true],
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-background/60">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">{story.title}</span>
          {story.theme && (
            <Badge variant="outline" className="ml-1 shrink-0 text-[10px]">
              {story.theme}
            </Badge>
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Remove story from bank"
          className="size-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
        >
          {deleting ? <RefreshCw className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border/50 p-4 text-xs animate-in fade-in duration-200">
          {star.map(([label, value, isReflection]) => (
            <div key={label}>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  isReflection ? "text-accent/80" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              <p className={cn("mt-0.5 leading-relaxed text-foreground", isReflection && "font-medium")}>
                {value || <span className="italic text-muted-foreground">—</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  category,
  company,
  role,
  interviewTypeLabel,
  difficultyLabel,
}: {
  category: ResumeCategory;
  company: string;
  role: string;
  interviewTypeLabel: string;
  difficultyLabel: string;
}) {
  const chips: { label: string; value: string; variant?: "default" | "secondary" | "outline" }[] = [
    { label: "Resume Type", value: category, variant: "default" },
    ...(company ? [{ label: "Company", value: company, variant: "secondary" as const }] : []),
    ...(role ? [{ label: "Role", value: role, variant: "outline" as const }] : []),
    { label: "Interview Type", value: interviewTypeLabel, variant: "secondary" },
    { label: "Difficulty", value: difficultyLabel, variant: "outline" },
  ];

  return (
    <Card className="rounded-2xl">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-3">
          <BadgeCheck className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="text-sm font-medium text-foreground">Prep Kit Generated</span>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <div key={chip.label} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{chip.label}:</span>
                <Badge variant={chip.variant ?? "secondary"}>{chip.value}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  section,
  isRegenerating,
  onRegenerate,
  defaultExpanded = true,
}: {
  section: QuestionSection;
  isRegenerating: boolean;
  onRegenerate: () => void;
  defaultExpanded?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  const toggleQuestion = (idx: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = async () => {
    const text = section.questions.map((q, i) => {
      let str = `${i + 1}. ${q.question}`;
      if (q.reason) str += `\n   Why: ${q.reason}`;
      if (q.best_story && q.best_story.title) {
        str += `\n   Best Resume Story: ${q.best_story.title} (${q.best_story.reason})`;
      }
      if (q.star_framework) {
        str += `\n   Suggested STAR Answer Structure:`;
        str += `\n     Situation: ${q.star_framework.situation}`;
        str += `\n     Task: ${q.star_framework.task}`;
        str += `\n     Action: ${q.star_framework.action}`;
        str += `\n     Result: ${q.star_framework.result}`;
        str += `\n     Reflection: ${q.star_framework.reflection}`;
      }
      return str;
    }).join("\n\n");

    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const iconBg = SECTION_COLORS[section.id] ?? "bg-muted text-muted-foreground";

  return (
    <Card className={cn("rounded-2xl transition-opacity", isRegenerating && "opacity-60")}>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                iconBg,
              )}
            >
              {SECTION_ICONS[section.id] ?? <BookOpen className="size-5" aria-hidden />}
            </span>
            <div>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{section.description}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="tabular-nums">
              {section.questions.length} Q
            </Badge>
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronUp className="size-4" aria-hidden />
              ) : (
                <ChevronDown className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded ? (
        <CardContent className="flex flex-col gap-4 pt-4">
          <Separator />
          <ol className="flex flex-col gap-4">
            {section.questions.map((q, i) => {
              const isStarExpanded = !!expandedQuestions[i];
              return (
                <li key={i} className="flex flex-col gap-2 rounded-xl border border-border/40 bg-muted/20 p-4 transition-all hover:bg-muted/40">
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-relaxed text-foreground">{q.question}</p>
                      {q.reason && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-muted-foreground/80">Context:</span> {q.reason}
                        </p>
                      )}
                      {q.best_story && q.best_story.title && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-semibold text-accent/90">Best Story Recommendation:</span>
                          <Badge variant="outline" className="px-1.5 py-0 bg-accent/5 border-accent/20 text-accent-foreground text-[10px]">
                            {q.best_story.title}
                          </Badge>
                          {q.best_story.reason && (
                            <span className="text-muted-foreground/80">— {q.best_story.reason}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {q.star_framework && (
                    <div className="mt-2 pl-9">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleQuestion(i)}
                        className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {isStarExpanded ? (
                          <>
                            <ChevronUp className="size-3.5" />
                            Hide Answer Structure
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3.5" />
                            ▼ Suggested Answer
                          </>
                        )}
                      </Button>

                      {isStarExpanded && (
                        <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-4 text-xs shadow-sm space-y-3 animate-in fade-in duration-200">
                          <div>
                            <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Situation</span>
                            <p className="mt-0.5 text-foreground leading-relaxed">{q.star_framework.situation}</p>
                          </div>
                          <div>
                            <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Task</span>
                            <p className="mt-0.5 text-foreground leading-relaxed">{q.star_framework.task}</p>
                          </div>
                          <div>
                            <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Action</span>
                            <p className="mt-0.5 text-foreground leading-relaxed">{q.star_framework.action}</p>
                          </div>
                          <div>
                            <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Result</span>
                            <p className="mt-0.5 text-foreground leading-relaxed">{q.star_framework.result}</p>
                          </div>
                          <div>
                            <span className="font-bold uppercase tracking-wider text-accent/80 text-[10px]">Reflection</span>
                            <p className="mt-0.5 text-foreground leading-relaxed font-medium">{q.star_framework.reflection}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <Separator />

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw
                className={cn("size-3.5", isRegenerating && "animate-spin")}
                aria-hidden
              />
              {isRegenerating ? "Regenerating…" : "Regenerate"}
            </Button>
            <Button
              variant={copied ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <>
                  <Check className="size-3.5" aria-hidden />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden />
                  Copy Questions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

// ── Mobile Summary Card (2x2 Grid) ───────────────────────────────────────────

function MobileSummaryCard({
  category,
  company,
  role,
  interviewTypeLabel,
  difficultyLabel,
}: {
  category: ResumeCategory;
  company: string;
  role: string;
  interviewTypeLabel: string;
  difficultyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden md:hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <div className="flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-accent/60 text-accent">
          <Check className="size-2.5 stroke-[3]" />
        </div>
        <span className="text-xs font-semibold text-foreground">Prep kit generated</span>
      </div>
      {/* 2x2 grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-border/40">
        <div className="px-3 py-2">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Resume type</p>
          <p className="mt-0.5 text-xs font-bold text-foreground truncate">{category}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Company</p>
          <p className="mt-0.5 text-xs font-bold text-foreground truncate">{company || "General"}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Interview type</p>
          <p className="mt-0.5 text-xs font-bold text-foreground truncate">{interviewTypeLabel}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Difficulty</p>
          <p className="mt-0.5 text-xs font-bold text-foreground truncate">{difficultyLabel}</p>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Question Section Card ──────────────────────────────────────────────

function MobileQuestionSectionCard({
  section,
  isRegenerating,
  onRegenerate,
  defaultExpanded = false,
}: {
  section: QuestionSection;
  isRegenerating: boolean;
  onRegenerate: () => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  const toggleQuestion = (idx: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = async () => {
    const text = section.questions.map((q, i) => {
      let str = `${i + 1}. ${q.question}`;
      if (q.reason) str += `\n   Why: ${q.reason}`;
      if (q.best_story && q.best_story.title) {
        str += `\n   Best Resume Story: ${q.best_story.title} (${q.best_story.reason})`;
      }
      if (q.star_framework) {
        str += `\n   Suggested STAR Answer Structure:`;
        str += `\n     Situation: ${q.star_framework.situation}`;
        str += `\n     Task: ${q.star_framework.task}`;
        str += `\n     Action: ${q.star_framework.action}`;
        str += `\n     Result: ${q.star_framework.result}`;
        str += `\n     Reflection: ${q.star_framework.reflection}`;
      }
      return str;
    }).join("\n\n");

    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const iconBg = SECTION_COLORS[section.id] ?? "bg-muted text-muted-foreground";

  return (
    <Card 
      className={cn(
        "rounded-xl border border-border/50 transition-opacity md:hidden overflow-hidden bg-card",
        isRegenerating && "opacity-60"
      )}
    >
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 select-none"
      >
        <div className="flex items-center gap-3">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", iconBg)}>
            {SECTION_ICONS[section.id] ?? <BookOpen className="size-4" aria-hidden />}
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-none">{section.title}</h3>
            {section.description && (
              <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1">{section.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground tabular-nums">
            {section.questions.length}Q
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 bg-muted/10">
          <div className="flex flex-col divide-y divide-border/30">
            {section.questions.map((q, i) => {
              const isStarExpanded = !!expandedQuestions[i];
              return (
                <div key={i} className="flex flex-col gap-3 p-4">

                  {/* Row: number badge + question text */}
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-bold text-foreground">
                      {i + 1}
                    </span>
                    <p className="flex-1 min-w-0 text-sm font-bold leading-snug text-foreground break-words">
                      {q.question}
                    </p>
                  </div>

                  {/* Context line */}
                  {q.reason && (
                    <p className="pl-9 text-[11px] text-muted-foreground leading-normal break-words">
                      Context: {q.reason}
                    </p>
                  )}

                  {/* Best story match — blue block matching reference */}
                  {q.best_story && q.best_story.title && (
                    <div className="ml-9 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 px-3 py-2.5">
                      <p className="text-[11px] font-medium text-blue-700/80 dark:text-blue-300/80 mb-0.5">Best story match</p>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 break-words leading-snug">{q.best_story.title}</p>
                    </div>
                  )}

                  {/* Suggested answer — full-width pill button */}
                  {q.star_framework && (
                    <div className="ml-9">
                      <button
                        onClick={() => toggleQuestion(i)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card h-10 text-xs font-semibold text-foreground hover:bg-muted active:bg-muted transition-colors"
                      >
                        Suggested answer
                        {isStarExpanded ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* STAR expanded content */}
                  {q.star_framework && isStarExpanded && (
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3 animate-in fade-in duration-200">
                      {[
                        ["Situation", q.star_framework.situation, false],
                        ["Task", q.star_framework.task, false],
                        ["Action", q.star_framework.action, false],
                        ["Result", q.star_framework.result, false],
                        ["Reflection", q.star_framework.reflection, true],
                      ].map(([label, value, isReflection]) => (
                        <div key={String(label)}>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider",
                            isReflection ? "text-accent" : "text-muted-foreground"
                          )}>
                            {String(label)}
                          </span>
                          <p className={cn(
                            "mt-0.5 text-xs leading-relaxed text-foreground break-words",
                            isReflection && "font-semibold"
                          )}>
                            {String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Sticky action bar ────────────────────────────────────────────────────────

function StickyActionBar({
  totalQuestions,
  category,
  sections,
  sessionId,
  regeneratingAll,
  onNotify,
  onBack,
  onRegenerateAll,
  isLoading,
}: {
  totalQuestions: number;
  category: ResumeCategory;
  sections: QuestionSection[];
  sessionId: string | null;
  regeneratingAll: boolean;
  onNotify: (msg: string) => void;
  onBack: () => void;
  isLoading: boolean;
  onRegenerateAll: () => void;
}) {
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDownload = () => {
    const doc = new jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const maxLineWidth = pageWidth - margin * 2;
    const lineHeight = 6;

    // Helper to add text and manage pagination
    const addText = (text: string, font: "helvetica", style: "normal" | "bold", size: number, indent: number = 0) => {
      doc.setFont(font, style);
      doc.setFontSize(size);
      const splitText = doc.splitTextToSize(text, maxLineWidth - indent);
      
      // Check if we need a new page
      if (y + (splitText.length * lineHeight) > doc.internal.pageSize.height - margin) {
        doc.addPage();
        y = margin;
      }
      
      doc.text(splitText, margin + indent, y);
      y += (splitText.length * lineHeight) + 2;
    };

    addText("INTERVIEW PREP KIT", "helvetica", "bold", 18);
    y += 4;
    addText(`Resume Category: ${category}`, "helvetica", "normal", 12);
    y += 8;

    for (const section of sections) {
      if (y > doc.internal.pageSize.height - 40) { doc.addPage(); y = margin; }
      
      addText(`── ${section.title} ──`, "helvetica", "bold", 14);
      y += 4;

      section.questions.forEach((q, i) => {
        addText(`${i + 1}. ${q.question}`, "helvetica", "bold", 11);
        
        if (q.reason) {
          addText(`Why: ${q.reason}`, "helvetica", "normal", 10, 5);
        }

        if (q.best_story && q.best_story.title) {
          addText(`Best Resume Story: ${q.best_story.title} (${q.best_story.reason})`, "helvetica", "normal", 10, 5);
        }

        if (q.star_framework) {
          y += 2;
          addText("STAR Answer Structure:", "helvetica", "bold", 10, 5);
          
          addText(`Situation: ${q.star_framework.situation}`, "helvetica", "normal", 10, 10);
          addText(`Task: ${q.star_framework.task}`, "helvetica", "normal", 10, 10);
          addText(`Action: ${q.star_framework.action}`, "helvetica", "normal", 10, 10);
          addText(`Result: ${q.star_framework.result}`, "helvetica", "normal", 10, 10);
          addText(`Reflection: ${q.star_framework.reflection}`, "helvetica", "bold", 10, 10);
        }
        y += 6; // Space between questions
      });
      y += 6; // Space between sections
    }
    doc.save("interview-prep-kit.pdf");
    onNotify("Prep kit downloaded");
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      // The generate endpoint auto-saves on generation. A sessionId means the
      // kit is already persisted. We confirm this to the user.
      if (sessionId) {
        setSavedMsg("Prep kit saved!");
      } else {
        // Edge case: no session_id (unauthenticated or DB unavailable)
        setSavedMsg("Sign in to save your prep kit.");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2500);
    }
  };

  return (
    <>
      {/* Desktop Sticky Action Bar */}
      <div className="hidden md:block fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm md:pl-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 md:px-8">
          {/* Left: stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-[var(--accent-fg,#fff)]">
                <Sparkles className="size-4" aria-hidden />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Questions Generated</p>
                <p className="text-sm font-bold text-foreground">{totalQuestions}+</p>
              </div>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <p className="text-xs text-muted-foreground">Resume Category</p>
              <Badge variant="secondary" className="mt-0.5">
                {category}
              </Badge>
            </div>
            {savedMsg ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                <Check className="size-4" aria-hidden />
                {savedMsg}
              </span>
            ) : null}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onBack}
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownload}
            >
              <Download className="size-3.5" aria-hidden />
              Download
            </Button>
            <Button
              variant={savedMsg ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="size-3.5 animate-spin" aria-hidden />
              ) : savedMsg ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              {saving ? "Saving…" : savedMsg ? "Saved!" : "Save Prep Kit"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={onRegenerateAll}
              disabled={regeneratingAll}
            >
              <RefreshCw
                className={cn("size-3.5", regeneratingAll && "animate-spin")}
                aria-hidden
              />
              {regeneratingAll ? "Regenerating…" : "Regenerate All"}
            </Button>
          </div>

        </div>
      </div>

      {/* Mobile Action Bar: [•••] | [Download] | [Regenerate] (Static at the end of content) */}
      {!isLoading && (
      <div className="md:hidden mt-8 mb-6 border-t border-border/50 pt-4">
        <div className="flex items-center gap-2">

          {/* Overflow menu — Back + Save */}
          <div className="relative shrink-0">
            <button
              id="mobile-overflow-menu"
              onClick={() => {
                const menu = document.getElementById("mobile-overflow-dropdown");
                if (menu) menu.classList.toggle("hidden");
              }}
              className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground active:bg-muted"
              aria-label="More actions"
            >
              <MoreHorizontal className="size-5" />
            </button>
            <div
              id="mobile-overflow-dropdown"
              className="hidden absolute bottom-14 left-0 z-30 w-44 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
            >
              <button
                onClick={() => {
                  document.getElementById("mobile-overflow-dropdown")?.classList.add("hidden");
                  onBack();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
                Back
              </button>
              <div className="border-t border-border/50" />
              <button
                onClick={() => {
                  document.getElementById("mobile-overflow-dropdown")?.classList.add("hidden");
                  void handleSave();
                }}
                disabled={saving}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                {saving
                  ? <RefreshCw className="size-4 shrink-0 text-muted-foreground animate-spin" />
                  : <Save className="size-4 shrink-0 text-muted-foreground" />
                }
                {saving ? "Saving…" : savedMsg ? "Saved!" : "Save Prep Kit"}
              </button>
            </div>
          </div>

          {/* Joined button group for Download and Regenerate */}
          <div className="flex flex-1 items-center h-11 rounded-xl border border-border bg-background overflow-hidden shadow-sm">
            {/* Download — left half */}
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 h-full text-sm font-semibold text-foreground hover:bg-muted active:bg-muted transition-colors"
            >
              <Download className="size-4 shrink-0" />
              <span className="truncate">Download</span>
            </button>

            {/* Regenerate — right half (accent filled) */}
            <button
              onClick={onRegenerateAll}
              className="flex flex-1 items-center justify-center gap-2 h-full bg-accent text-sm font-semibold text-[var(--accent-fg,#fff)] hover:opacity-90 active:opacity-80 transition-opacity"
            >
              <RefreshCw className="size-4 shrink-0" />
              <span className="truncate">Regenerate</span>
            </button>
          </div>

        </div>
      </div>
      )}
    </>
  );
}
