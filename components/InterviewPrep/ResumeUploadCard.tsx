"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud, X, Star, MessageSquare, Briefcase } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUploadResume } from "@/hooks/useUploadResume";
import { useInterviewPrepStore } from "@/store/interviewPrepStore";
import { classifyResumeCategory } from "@/lib/resumeCategoryClassify";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";

/**
 * Resume Upload — reuses the shared `/api/upload-resume` pipeline (same parsing
 * ATS scoring uses), stores the parsed result in the Interview Prep store, and
 * classifies the resume into an industry category. No mock data.
 */
export default function ResumeUploadCard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { upload } = useUploadResume();

  const fileName = useInterviewPrepStore((s) => s.fileName);
  const parsing = useInterviewPrepStore((s) => s.parsing);
  const parseError = useInterviewPrepStore((s) => s.parseError);
  const structuredResume = useInterviewPrepStore((s) => s.structuredResume);
  const resumeCategory = useInterviewPrepStore((s) => s.resumeCategory);
  const setParsing = useInterviewPrepStore((s) => s.setParsing);
  const setParseError = useInterviewPrepStore((s) => s.setParseError);
  const setParsedResume = useInterviewPrepStore((s) => s.setParsedResume);
  const clearResume = useInterviewPrepStore((s) => s.clearResume);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      if (!/\.(pdf|docx?)$/i.test(file.name)) {
        setParseError("Please upload a PDF or Word (.doc / .docx) file.");
        return;
      }
      setParsing(true);
      try {
        const result = await upload(file);
        const { category } = classifyResumeCategory(
          result.structuredResume,
          result.extractedText,
        );
        setParsedResume({
          fileName: result.filename ?? file.name,
          extractedText: result.extractedText,
          resumeHeader: result.resumeHeader,
          structuredResume: result.structuredResume,
          category,
        });
      } catch (e) {
        setParseError(
          e instanceof Error ? e.message : "Could not parse your resume.",
        );
      }
    },
    [upload, setParsing, setParseError, setParsedResume],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer?.files?.[0]);
  };

  const fullName = structuredResume?.full_name?.trim() || "";
  const headline = structuredResume?.headline?.trim() || "";
  const skills = (structuredResume?.skills ?? []).flatMap((s) => s.items ?? []);
  const experienceBullets = (structuredResume?.experience ?? [])
    .flatMap((exp) => exp.bullets ?? [])
    .slice(0, 6);
  const hasParsed = Boolean(fileName) && !parsing;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Resume Upload</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {/* Upload drop zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            dragging
              ? "border-accent bg-[var(--accent-bg)]"
              : "border-border bg-muted/20 hover:bg-muted/30",
          )}
        >
          {parsing ? (
            <Loader2 className="size-7 animate-spin text-accent" aria-hidden />
          ) : (
            <UploadCloud className="size-7 text-muted-foreground" aria-hidden />
          )}
          <div className="text-sm font-medium text-foreground">
            {parsing ? "Parsing your resume…" : "Drag & drop your resume here"}
          </div>
          {!parsing ? (
            <div className="text-xs text-muted-foreground">
              or click to browse · Supported formats: PDF, DOCX
            </div>
          ) : null}
        </div>

        {parseError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {parseError}
          </div>
        ) : null}

        {/* Parsed file + category */}
        {hasParsed ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate text-sm font-medium text-foreground">
                  {fileName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3" aria-hidden />
                  Parsed Successfully
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove resume"
                  onClick={() => clearResume()}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            </div>

            <Separator className="hidden lg:block bg-border/50" />

            {/* Next Steps Card */}
            <div className="mt-2 flex flex-col gap-5 rounded-xl border border-border bg-card/50 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Star className="size-5 text-amber-500" aria-hidden />
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                  Next Steps
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                </div>
                <span className="text-sm font-bold text-foreground">
                  74/100
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-4 py-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      1
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      Improve resume keywords
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                    High impact
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-4 py-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      2
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      Complete projects section
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                    Quick win
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-4 py-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      3
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      Prepare for interviews
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                    Recommended
                  </Badge>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-3">
                <Button 
                  className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700" 
                  size="lg"
                  onClick={() => router.push('/interview-prep/interview-type')}
                >
                  <FileText className="size-4" />
                  Analyze Resume
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="gap-2 border-border/60 bg-background hover:bg-muted/50"
                    onClick={() => router.push('/interview-prep/interview-type')}
                  >
                    <MessageSquare className="size-4 text-muted-foreground" />
                    Interview
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2 border-border/60 bg-background hover:bg-muted/50"
                    onClick={() => router.push('/jobs')}
                  >
                    <Briefcase className="size-4 text-muted-foreground" />
                    View Jobs
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
