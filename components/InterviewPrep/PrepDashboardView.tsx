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

import { useEffect, useState } from "react";
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
  Copy,
  Database,
  Download,
  Library,
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
  fetchStoryBank,
  deleteStory,
  type PrepQuestion,
  type PrepStory,
} from "@/lib/supabase";

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
  const loadedFromDb          = useInterviewPrepStore((s) => s.loadedFromDb);
  const setSessionId          = useInterviewPrepStore((s) => s.setSessionId);
  const setLoadedFromDb       = useInterviewPrepStore((s) => s.setLoadedFromDb);

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

  const fetchQuestions = async (isRegenerate: boolean = false) => {
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
          session_id: storeSessionId,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      // Capture session_id returned by the backend persistence layer
      if (data.session_id) {
        setSessionId(String(data.session_id));
        setLoadedFromDb(false);
      }

      const built: QuestionSection[] = [
        toSection("resume", "Resume-Based Questions", "Generated from your projects, achievements, and experience.", data.resume_questions),
        toSection("jd", "Job Description — Role Requirements", "Generated from the role's core requirements and responsibilities.", data.jd_questions),
        toSection("behavioral", "Behavioral Questions", "STAR-method and leadership-focused interview preparation.", data.behavioral_questions),
        toSection("company", company ? `${company} — Company-Specific Questions` : "Company-Specific Questions", company ? `Tailored to ${company}'s known interview patterns and culture.` : "Questions tailored to your target company's values.", data.company_questions),
      ].filter((s) => s.questions.length > 0);

      if (built.length === 0) throw new Error("No questions returned from AI");
      setSections(built);
      // New stories were just accumulated into the bank server-side — refresh it.
      setBankRefresh((n) => n + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      // Keep existing mock-built sections visible on error
    } finally {
      if (!isRegenerate) {
        setLoading(false);
      }
    }
  };

  // On mount: try to load from DB when there is no freshly uploaded resume in store
  useEffect(() => {
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
            const built: QuestionSection[] = [
              toSection("resume", "Resume-Based Questions", "Generated from your projects, achievements, and experience.", saved.questions.resume_questions),
              toSection("jd", "Job Description — Role Requirements", "Generated from the role's core requirements and responsibilities.", saved.questions.jd_questions),
              toSection("behavioral", "Behavioral Questions", "STAR-method and leadership-focused interview preparation.", saved.questions.behavioral_questions),
              toSection("company", saved.company ? `${saved.company} — Company-Specific Questions` : "Company-Specific Questions", saved.company ? `Tailored to ${saved.company}'s known interview patterns and culture.` : "Questions tailored to your target company's values.", saved.questions.company_questions),
            ].filter((s) => s.questions.length > 0);

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
      await fetchQuestions(true);
    } finally {
      setRegenerating((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="w-full px-6 py-6 pb-32 md:px-8 md:py-8">
      {/* Header */}
      <header className="mb-5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Your Personalized Interview Prep Kit
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground md:text-base">
          Questions generated from your resume, job description, company, role,
          and selected interview type.
        </p>
      </header>

      <div className="mb-6">
        <WorkflowStepper activeStep={4} />
      </div>

      <div className="flex flex-col gap-5">
        {/* Loaded-from-DB banner */}
        {loadedFromDb && !dbBannerDismissed && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950/40">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Database className="size-4 shrink-0" aria-hidden />
              <span>
                Showing your last saved prep kit. Upload a new resume to generate fresh questions.
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

        {/* Top summary card */}
        <SummaryCard
          category={category}
          company={company}
          role={role}
          interviewTypeLabel={interviewTypeLabel}
          difficultyLabel={difficultyLabel}
        />

        {/* Master story bank — accumulates across every prep session */}
        <StoryBankPanel refreshSignal={bankRefresh} />

        {/* Question section cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="size-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Generating your personalized questions with AI...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-destructive/50 rounded-2xl bg-destructive/5">
            <p className="text-sm font-semibold text-destructive">Error: {error}</p>
            <Button variant="outline" size="sm" onClick={() => void fetchQuestions()}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid gap-5">
            {sections.map((section) => (
              <QuestionCard
                key={section.id}
                section={section}
                isRegenerating={!!regenerating[section.id]}
                onRegenerate={() => triggerRegenerate(section.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      <StickyActionBar
        totalQuestions={totalQuestions}
        category={category}
        sections={sections}
        sessionId={storeSessionId}
        onBack={() => router.push("/interview-prep/setup")}
        onRegenerateAll={() => fetchQuestions(true)}
      />
    </div>
  );
}

// ── Story bank ───────────────────────────────────────────────────────────────

const MASTER_STORY_CAP = 10;

function StoryBankPanel({ refreshSignal }: { refreshSignal: number }) {
  const [stories, setStories] = useState<PrepStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const bank = await fetchStoryBank();
      if (!cancelled) {
        setStories(bank);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

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
                Reusable STAR+R master stories — these accumulate across every prep and answer most behavioral questions.
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
}: {
  section: QuestionSection;
  isRegenerating: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
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
                            Suggested Answer Structure (STAR+R)
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

// ── Sticky action bar ────────────────────────────────────────────────────────

function StickyActionBar({
  totalQuestions,
  category,
  sections,
  sessionId,
  onBack,
  onRegenerateAll,
}: {
  totalQuestions: number;
  category: ResumeCategory;
  sections: QuestionSection[];
  sessionId: string | null;
  onBack: () => void;
  onRegenerateAll: () => void;
}) {
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDownload = () => {
    const lines: string[] = ["INTERVIEW PREP KIT\n", `Resume Category: ${category}\n`];
    for (const section of sections) {
      lines.push(`\n── ${section.title} ──`);
      section.questions.forEach((q, i) => {
        lines.push(`\n${i + 1}. ${q.question}`);
        if (q.reason) lines.push(`   Why: ${q.reason}`);
        if (q.best_story && q.best_story.title) {
          lines.push(`   Best Resume Story: ${q.best_story.title} (${q.best_story.reason})`);
        }
        if (q.star_framework) {
          lines.push(`   STAR Answer Structure:`);
          lines.push(`     Situation: ${q.star_framework.situation}`);
          lines.push(`     Task: ${q.star_framework.task}`);
          lines.push(`     Action: ${q.star_framework.action}`);
          lines.push(`     Result: ${q.star_framework.result}`);
          lines.push(`     Reflection: ${q.star_framework.reflection}`);
        }
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview-prep-kit.txt";
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm md:pl-[var(--sidebar-width,0px)]">
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
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Regenerate All
          </Button>
        </div>
      </div>
    </div>
  );
}
