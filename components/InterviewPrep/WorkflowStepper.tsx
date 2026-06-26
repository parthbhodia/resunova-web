"use client";

import { Fragment } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_STEPS } from "./constants";

interface WorkflowStepperProps {
  /** 1-based step number that is currently active. Defaults to 1. */
  activeStep?: number;
}

/**
 * Horizontal workflow stepper rendered directly below the page heading.
 * Highlights the current step; completed steps show a check mark.
 */
export default function WorkflowStepper({ activeStep = 1 }: WorkflowStepperProps) {
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
          return (
            <Fragment key={step.id}>
              {idx > 0 ? (
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              ) : null}
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
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
