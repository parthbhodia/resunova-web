/** Static config for the Interview Prep workflow (no mock resume data). */

export type WorkflowStep = {
  id: number;
  label: string;
  /** Route to navigate to when this step is clicked (completed steps only). */
  route: string;
  /** Only the active step is interactive; future steps render disabled. */
  enabled: boolean;
};

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 1, label: "Resume & Job Details", route: "/interview-prep",               enabled: true },
  { id: 2, label: "Interview Type",        route: "/interview-prep/interview-type", enabled: false },
  { id: 3, label: "Practice Setup",        route: "/interview-prep/setup",          enabled: false },
  { id: 4, label: "Prep Dashboard",        route: "/interview-prep/dashboard",      enabled: false },
];

export const SUGGESTED_COMPANIES = [
  "Google",
  "Amazon",
  "Meta",
  "Microsoft",
  "Stripe",
  "Apple",
];
