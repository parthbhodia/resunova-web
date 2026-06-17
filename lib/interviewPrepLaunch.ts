import { useInterviewPrepStore } from "@/store/interviewPrepStore";
import { classifyResumeCategory } from "@/lib/resumeCategoryClassify";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import type { JobDetail } from "@/lib/jobsApi";

/**
 * Pre-fill the Interview Prep store from a Jobs-feed posting so the user lands
 * on the Prep Dashboard ready to generate — no re-upload. Links the prep session
 * to the posting via `jobPostingId` (see /api/interview-prep/job-statuses).
 *
 * Pure store mutation (uses getState()), safe to call from event handlers.
 * The caller navigates to /interview-prep/dashboard afterwards.
 */
export function prefillPrepFromJob(job: JobDetail): void {
  const store = useInterviewPrepStore.getState();
  const resumeText = (job.resumeText ?? "").trim();
  const structured = (job.structuredResume ?? null) as StructuredResume | null;

  store.reset();
  store.setCompany(job.company ?? "");
  store.setRole(job.title ?? "");
  store.setJobDescription(job.jdText ?? "");
  store.setJobPostingId(job.id);

  if (resumeText || structured) {
    store.setParsedResume({
      fileName: job.company ? `Résumé for ${job.company}` : "Your résumé",
      extractedText: resumeText,
      resumeHeader: [],
      structuredResume: structured,
      category: classifyResumeCategory(structured, resumeText).category,
    });
  }
}
