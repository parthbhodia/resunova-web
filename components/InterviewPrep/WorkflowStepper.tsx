"use client";

import { Fragment } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { WORKFLOW_STEPS } from "./constants";

interface WorkflowStepperProps {
  /** 1-based step number that is currently active. Defaults to 1. */
  activeStep?: number;
}

/**
 * Horizontal workflow stepper rendered directly below the page heading.
 * Highlights the current step; completed steps show a check mark and are
 * clickable — users can navigate back to any earlier step.
 */
export default function WorkflowStepper({ activeStep = 1 }: WorkflowStepperProps) {
  const router = useRouter();
  const activeStepInfo = WORKFLOW_STEPS.find((s) => s.id === activeStep);

  return (
    <nav aria-label="Interview prep steps" className="overflow-x-auto">
      {/* Mobile view (< md): Compact text indicator */}
      <div className="flex items-center gap-2 md:hidden">
        <span className="flex h-6 items-center rounded-full bg-accent px-2.5 text-xs font-semibold text-[var(--accent-fg,#fff)]">
          Step {activeStep} of {WORKFLOW_STEPS.length}
        </span>
        <span className="text-sm font-medium text-foreground">
          {activeStepInfo?.label}
        </span>
      </div>

      {/* Desktop view (>= md): Full horizontal stepper */}
      <ol className="hidden min-w-max items-center gap-1.5 md:flex">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isActive = step.id === activeStep;
          const isComplete = step.id < activeStep;
          const isClickable = isComplete;

          const pill = (
            <div
              aria-current={isActive ? "step" : undefined}
              aria-disabled={step.id > activeStep}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? "border-accent/30 bg-[var(--accent-bg)] font-medium text-accent"
                  : isComplete
                    ? "border-border bg-transparent font-medium text-foreground"
                    : "border-border bg-transparent text-muted-foreground opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-accent text-[var(--accent-fg,#fff)]"
                    : isComplete
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="size-3" aria-hidden /> : step.id}
              </span>
              {step.label}
            </div>
          );

          return (
            <Fragment key={step.id}>
              {idx > 0 ? (
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              ) : null}
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => router.push(step.route)}
                  aria-label={`Go to step ${step.id}: ${step.label}`}
                  className="cursor-pointer rounded-full ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {pill}
                </button>
              ) : (
                pill
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

