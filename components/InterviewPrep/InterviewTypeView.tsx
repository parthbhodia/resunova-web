"use client";

/**
 * Interview Prep — Step 2 (Select Interview Type).
 *
 * UI-only refine: enriched category banner, cards with topics/counts/time,
 * hover/selected polish, dynamic Recommended badge, improved selection summary.
 * Routing, state management, and category detection are unchanged.
 */

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useInterviewPrepStore } from "@/store/interviewPrepStore";
import {
  classifyResumeCategory,
  type ResumeCategory,
} from "@/lib/resumeCategoryClassify";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_FALLBACK_SKILLS,
  CATEGORY_ICON_CHAR,
  CATEGORY_RECOMMENDED,
  INTERVIEW_TYPES_BY_CATEGORY,
  type InterviewTypeConfig,
} from "./interviewTypeConfig";
import WorkflowStepper from "./WorkflowStepper";

export default function InterviewTypeView() {
  const router = useRouter();

  const structuredResume = useInterviewPrepStore((s) => s.structuredResume);
  const extractedText = useInterviewPrepStore((s) => s.extractedText);
  const resumeCategory = useInterviewPrepStore((s) => s.resumeCategory);
  const company = useInterviewPrepStore((s) => s.company);
  const role = useInterviewPrepStore((s) => s.role);
  const selectedInterviewType = useInterviewPrepStore((s) => s.selectedInterviewType);
  const setSelectedInterviewType = useInterviewPrepStore((s) => s.setSelectedInterviewType);

  // Derive live category — prefer store value set during Step 1 parse; re-derive
  // if missing so this page works after a hard refresh in dev.
  const category: ResumeCategory =
    (resumeCategory as ResumeCategory | null) ??
    classifyResumeCategory(structuredResume, extractedText).category;

  const types = INTERVIEW_TYPES_BY_CATEGORY[category] ?? INTERVIEW_TYPES_BY_CATEGORY.General;
  const recommended = CATEGORY_RECOMMENDED[category];
  const selected = types.find((t) => t.id === selectedInterviewType) ?? null;

  // Pull real skills from the parsed resume; fall back to category-specific defaults.
  const detectedSkills: string[] = (() => {
    const items = (structuredResume?.skills ?? []).flatMap((s) => s.items ?? []);
    return items.length > 0 ? items.slice(0, 6) : CATEGORY_FALLBACK_SKILLS[category];
  })();

  const contextLabel = [role, company].filter(Boolean).join(" at ") || null;

  return (
    <div className="w-full px-6 py-6 md:px-8 md:py-8">
      {/* Mobile compact header */}
      <header className="mb-5 flex items-center gap-3 md:hidden">
        <button
          onClick={() => router.push("/interview-prep")}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted active:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent">Step 2 of 4</div>
          <h1 className="text-lg font-bold text-foreground">Interview Type</h1>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1 w-4 rounded-full bg-accent" />
          <div className="h-1 w-4 rounded-full bg-accent" />
          <div className="h-1 w-4 rounded-full bg-muted" />
          <div className="h-1 w-4 rounded-full bg-muted" />
        </div>
      </header>

      {/* Desktop header */}
      <header className="mb-5 hidden md:block">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Select Your Interview Type
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground md:text-base">
          Choose interview formats personalized to your resume, role, company,
          and job description.
        </p>
      </header>

      <div className="mb-6 hidden md:block">
        <WorkflowStepper activeStep={2} />
      </div>

      <div className="flex flex-col gap-5">
        {/* Category banner */}
        <CategoryBanner
          category={category}
          skills={detectedSkills}
          contextLabel={contextLabel}
        />

        {/* Interview type cards — 3-col on desktop */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => (
            <InterviewTypeCard
              key={type.id}
              type={type}
              isSelected={selectedInterviewType === type.id}
              isRecommended={type.id === recommended}
              onSelect={() =>
                setSelectedInterviewType(
                  selectedInterviewType === type.id ? null : type.id,
                )
              }
              onContinue={() => router.push("/interview-prep/setup")}
            />
          ))}
        </div>

        <Separator />

        {/* Navigation */}
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto"
            onClick={() => router.push("/interview-prep")}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
          <Button
            size="lg"
            className="hidden gap-2 w-full sm:w-auto sm:flex"
            disabled={!selectedInterviewType}
            onClick={() => router.push("/interview-prep/setup")}
          >
            Continue
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Category banner ──────────────────────────────────────────────────────────

function CategoryBanner({
  category,
  skills,
  contextLabel,
}: {
  category: ResumeCategory;
  skills: string[];
  contextLabel: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-2xl leading-none" aria-hidden>
          {CATEGORY_ICON_CHAR[category]}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-sm font-semibold text-foreground">
              {category} Profile Detected
            </span>
            <Badge variant="secondary" className="font-medium">
              {category}
            </Badge>
            {contextLabel ? (
              <span className="text-xs text-muted-foreground">· {contextLabel}</span>
            ) : null}
          </div>

          {skills.length > 0 ? (
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Skills Found:
              </span>
              {skills.map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            {CATEGORY_DESCRIPTIONS[category]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Interview type card ──────────────────────────────────────────────────────

function InterviewTypeCard({
  type,
  isSelected,
  isRecommended,
  onSelect,
  onContinue,
}: {
  type: InterviewTypeConfig;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border text-left transition-all duration-200",
        isSelected
          ? "border-accent bg-[var(--accent-bg)] shadow-[0_0_0_2px_var(--accent),0_4px_16px_-2px_color-mix(in_oklch,var(--accent)_25%,transparent)]"
          : "border-border bg-card shadow-sm hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={cn(
          "flex w-full cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-2xl",
          // Mobile: horizontal layout for the top row
          "items-center gap-3 p-4",
          // Desktop: vertical layout for the whole card
          "sm:flex-col sm:items-start sm:p-5 sm:gap-4"
        )}
      >
        {/* Checkmark (selected) */}
        {isSelected ? (
          <CheckCircle2
            className="absolute right-4 top-4 hidden size-5 text-accent sm:block sm:right-5 sm:top-5"
            aria-hidden
          />
        ) : null}

        {/* Top row container for Mobile, just Icon for Desktop */}
        <div className="flex items-center shrink-0 sm:w-full gap-3 sm:gap-0 sm:justify-between sm:items-start">
          {/* Icon */}
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors sm:size-11 sm:rounded-xl",
              isSelected
                ? "bg-accent/10 text-accent sm:bg-accent sm:text-[var(--accent-fg,#fff)]"
                : "bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent",
            )}
          >
            {type.icon}
          </span>
          {/* Badges - Desktop top right */}
          <div className="hidden sm:flex shrink-0 gap-1.5 pr-6">
            {isRecommended && (
              <Badge variant="default" className="bg-accent/10 text-accent hover:bg-accent/20 px-2 py-0 text-[10px] uppercase tracking-wide">
                Recommended
              </Badge>
            )}
            {type.badge === "Beta" && (
              <Badge variant="secondary" className="px-2 py-0 text-[10px] uppercase tracking-wide">
                Beta
              </Badge>
            )}
          </div>
        </div>

        {/* Title + Subtitle */}
        <div className="flex min-w-0 flex-1 flex-col w-full sm:mt-1">
          <div className="flex items-center justify-between gap-2 sm:pr-0">
            <span
              className={cn(
                "truncate font-heading text-sm font-semibold leading-snug sm:text-base sm:whitespace-normal",
                isSelected ? "text-accent" : "text-foreground",
              )}
            >
              {type.label}
            </span>
            <div className="flex sm:hidden shrink-0 gap-1.5">
              {isRecommended && (
                <Badge variant="default" className="bg-accent/10 text-accent hover:bg-accent/20 px-2 py-0 text-[10px] uppercase tracking-wide">
                  Recommended
                </Badge>
              )}
              {type.badge === "Beta" && (
                <Badge variant="secondary" className="px-2 py-0 text-[10px] uppercase tracking-wide">
                  Beta
                </Badge>
              )}
            </div>
          </div>

          {/* Subtitle (Hidden when expanded on mobile, hidden entirely on desktop) */}
          <div
            className={cn(
              "mt-0.5 truncate text-[12px] text-muted-foreground sm:hidden",
              isSelected ? "hidden" : "block",
            )}
          >
            {type.topics[0]} · {type.questionCount} questions · {type.estimatedMinutes} min
          </div>

          {/* Desktop Description & Topics (Always visible on Desktop, hidden on Mobile) */}
          <div className="hidden sm:block text-left w-full">
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {type.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {type.topics.map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className={cn(
                    "text-[11px] transition-colors",
                    isSelected && "border-accent/30 bg-accent/5 text-accent"
                  )}
                >
                  {topic}
                </Badge>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-3 border-t border-border/60 pt-3 mt-4">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <HelpCircle className="size-3.5" aria-hidden />
                {type.questionCount} Questions
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                {type.estimatedMinutes} min prep
              </span>
            </div>
            
            {/* Desktop Includes - Visible only on selection to avoid huge cards */}
            {isSelected && (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3">
                <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Includes</p>
                {type.includes.map((item) => (
                  <div key={item} className="flex items-start gap-1.5 text-xs text-foreground whitespace-normal">
                    <CheckCircle2 className="size-3.5 shrink-0 text-accent mt-0.5" aria-hidden />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded Details (Mobile Only) */}
      <div
        className={cn(
          "flex-col px-4 pb-4 sm:hidden",
          isSelected ? "flex" : "hidden",
        )}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          {type.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {type.topics.map((topic) => (
            <Badge
              key={topic}
              variant="outline"
              className="border-accent/30 bg-accent/5 text-[11px] text-accent"
            >
              {topic}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="size-4 shrink-0" aria-hidden />
            <span className="font-medium text-foreground">
              {type.questionCount}
            </span>
            <span>Questions</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 shrink-0" aria-hidden />
            <span className="font-medium text-foreground">
              {type.estimatedMinutes}
            </span>
            <span>Minutes</span>
          </span>
        </div>

        <Separator className="my-4 bg-border/60" />

        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Includes
          </p>
          <ul className="flex flex-col gap-1.5">
            {type.includes.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs text-foreground"
              >
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-accent"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          size="lg"
          className="mt-5 w-full gap-2"
          onClick={onContinue}
        >
          Continue to Practice Setup
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}


