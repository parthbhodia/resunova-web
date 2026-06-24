"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUploadResume } from "@/hooks/useUploadResume";
import { useInterviewPrepStore } from "@/store/interviewPrepStore";
import { classifyResumeCategory } from "@/lib/resumeCategoryClassify";
import { cn } from "@/lib/utils";
import ResumeHistoryPicker from "./ResumeHistoryPicker";

/**
 * Resume Upload — reuses the shared `/api/upload-resume` pipeline (same parsing
 * ATS scoring uses), stores the parsed result in the Interview Prep store, and
 * classifies the resume into an industry category. No mock data.
 */
export default function ResumeUploadCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { upload } = useUploadResume();

  const fileName = useInterviewPrepStore((s) => s.fileName);
  const parsing = useInterviewPrepStore((s) => s.parsing);
  const parseError = useInterviewPrepStore((s) => s.parseError);
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

        {/* Pick from history — self-hides when signed out / no saved resumes.
            Shown only before a resume is selected, to fill the pre-upload space. */}
        {!hasParsed && !parsing ? <ResumeHistoryPicker /> : null}

        {/* Parsed confirmation — compact success state only. We intentionally do
            NOT surface the raw extracted resume (name/skills/experience): the user
            doesn't need to audit our parse, and exposing it leaks extraction
            artifacts that undermine trust. The detected category is the one clean,
            useful signal — it personalizes Step 2. */}
        {hasParsed ? (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            aria-live="polite"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Resume parsed
                  {resumeCategory ? ` · ${resumeCategory} profile detected` : ""}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove resume"
              onClick={() => clearResume()}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
