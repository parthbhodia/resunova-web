"use client";

/**
 * Interview Prep — Step 1 (Resume & Job Details).
 *
 * Reuses the shared `/api/upload-resume` parsing pipeline (same as ATS scoring),
 * stores the parsed resume + job/target-role inputs in `useInterviewPrepStore`
 * for later steps, and classifies the resume into an industry category. Later
 * steps (Interview Type, Practice Setup, Prep Dashboard) are not built yet — the
 * CTA only acknowledges that Step 2 is coming.
 *
 * Layout: a horizontal workflow stepper sits under the heading; the content area
 * spans the full page width as a responsive two-column grid (Resume Upload |
 * Job Description), with Target Role and the CTA stacked full-width below.
 */

import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInterviewPrepStore } from "@/store/interviewPrepStore";
import WorkflowStepper from "./WorkflowStepper";
import PrepHistoryPicker from "./PrepHistoryPicker";
import ResumeUploadCard from "./ResumeUploadCard";
import JobDescriptionCard from "./JobDescriptionCard";
import TargetRoleCard from "./TargetRoleCard";

export default function InterviewPrepView() {
  const router = useRouter();
  const fileName = useInterviewPrepStore((s) => s.fileName);
  const canContinue = Boolean(fileName);

  return (
    <div className="w-full px-6 py-6 md:px-8 md:py-8">
      {/* Mobile compact header */}
      <header className="mb-5 flex items-center gap-3 md:hidden">
        <button
          onClick={() => router.back()}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted active:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent">Step 1 of 4</div>
          <h1 className="text-lg font-bold text-foreground">Interview Prep</h1>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1 w-4 rounded-full bg-accent" />
          <div className="h-1 w-4 rounded-full bg-muted" />
          <div className="h-1 w-4 rounded-full bg-muted" />
          <div className="h-1 w-4 rounded-full bg-muted" />
        </div>
      </header>

      {/* Desktop header */}
      <header className="mb-5 hidden md:block">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Interview Prep
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground md:text-base">
          Upload your resume and provide job details to generate personalized
          interview preparation.
        </p>
      </header>

      <div className="mb-6 hidden md:block">
        <WorkflowStepper activeStep={1} />
      </div>

      <div className="flex flex-col gap-6">
        {/* Reopen a saved kit — self-hides when signed out / no history */}
        <PrepHistoryPicker />

        {/* Two-column: Resume Upload | Job Description */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <ResumeUploadCard />
          <JobDescriptionCard />
        </div>

        {/* Target Role (full width) */}
        <TargetRoleCard />

        {/* CTA (full width) */}
        <Card className="rounded-2xl border-accent/20 bg-[var(--accent-bg)]">
          <CardContent className="flex flex-col gap-4 py-3 lg:gap-5 lg:py-2">
            <div className="hidden lg:flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-[var(--accent-fg,#fff)]">
                <ArrowRight className="size-5" aria-hidden />
              </span>
              <div className="flex-1">
                <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  Ready to generate your personalized prep kit
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                  We&apos;ll analyze your resume, company, role, and job
                  description to create personalized interview preparation.
                </p>
              </div>
            </div>

            <Separator className="hidden lg:block bg-accent/15" />

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              {!canContinue ? (
                <span className="hidden sm:inline-block text-sm text-muted-foreground sm:mr-auto">
                  Upload your resume to continue
                </span>
              ) : null}
              <Button
                size="lg"
                className="gap-2 w-full sm:w-auto"
                disabled={!canContinue}
                onClick={() => router.push("/interview-prep/interview-type")}
              >
                Continue to Interview Type
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
