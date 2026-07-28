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

export type TailorPrepHandoff = {
  resumeText: string;
  structured: StructuredResume | null;
  jobDescription: string;
  company: string;
  role: string;
};

/**
 * Pre-fill Interview Prep from a finished Tailor run.
 *
 * Tailor already holds everything the prep setup screen asks for, so sending
 * the user there empty-handed makes them paste the JD and re-upload a résumé
 * they just used. Same store mutations as the Jobs-feed path above; there is no
 * `jobPostingId` because a Tailor run is not tied to a posting in our corpus.
 */
export function prefillPrepFromTailor(handoff: TailorPrepHandoff): void {
  const store = useInterviewPrepStore.getState();
  const resumeText = (handoff.resumeText ?? "").trim();
  const structured = handoff.structured ?? null;
  const company = (handoff.company ?? "").trim();

  store.reset();
  store.setCompany(company);
  store.setRole((handoff.role ?? "").trim());
  store.setJobDescription((handoff.jobDescription ?? "").trim());

  if (resumeText || structured) {
    store.setParsedResume({
      fileName: company ? `Résumé for ${company}` : "Your tailored résumé",
      extractedText: resumeText,
      resumeHeader: [],
      structuredResume: structured,
      category: classifyResumeCategory(structured, resumeText).category,
    });
  }
}
