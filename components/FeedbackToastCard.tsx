"use client";

/**
 * Material-style elevated feedback card (snackbar / toast surface).
 * Paper elevation + icon + title/body + optional actions — shared by scan-limit,
 * Analyze, and Tailor feedback so every corner of the app doesn't invent its own.
 */

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeedbackToastVariant = "info" | "success" | "warning" | "error";

/** Heuristic title/variant for free-form string toasts (Analyze / Tailor). */
export function feedbackToastMeta(msg: string): {
  title: string;
  variant: FeedbackToastVariant;
} {
  const m = msg.toLowerCase();
  if (m.includes("limit reached") || m.includes("free scans used")) {
    return { title: "Daily limit reached", variant: "warning" };
  }
  if (m.includes("sign in")) {
    return { title: "Sign in required", variant: "info" };
  }
  if (
    m.includes("score updated") ||
    m.includes("unlocked") ||
    m.startsWith("analyzed") ||
    m.includes("saved") ||
    m.includes("updated") ||
    m.includes("applied")
  ) {
    return { title: "Done", variant: "success" };
  }
  if (
    m.includes("apply at least") ||
    m.includes("couldn't find") ||
    m.includes("heads-up")
  ) {
    return { title: "Heads up", variant: "warning" };
  }
  if (m.includes("error") || m.includes("failed") || m.includes("couldn't")) {
    return { title: "Something went wrong", variant: "error" };
  }
  return { title: "Notice", variant: "info" };
}

type Action = {
  label: string;
  onClick: () => void;
};

const VARIANT_STYLES: Record<
  FeedbackToastVariant,
  { iconWrap: string; icon: ReactNode }
> = {
  info: {
    iconWrap: "bg-primary/10 text-primary",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 11v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="12" cy="8" r="1" fill="currentColor" />
      </svg>
    ),
  },
  success: {
    iconWrap: "bg-[color-mix(in_srgb,var(--green-ink,#047857)_12%,transparent)] text-[var(--green-ink,#047857)]",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  warning: {
    iconWrap: "bg-[color-mix(in_srgb,var(--amber-ink,#b45309)_12%,transparent)] text-[var(--amber-ink,#b45309)]",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4.5L21 19.5H3L12 4.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M12 10v4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
    ),
  },
  error: {
    iconWrap: "bg-destructive/10 text-destructive",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 8v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  },
};

export function FeedbackToastCard({
  title,
  description,
  variant = "info",
  onDismiss,
  primaryAction,
  secondaryAction,
  className,
  role = "status",
}: {
  title: string;
  description?: ReactNode;
  variant?: FeedbackToastVariant;
  onDismiss?: () => void;
  primaryAction?: Action;
  secondaryAction?: Action;
  className?: string;
  role?: "status" | "alert";
}) {
  const styles = VARIANT_STYLES[variant];
  const hasActions = Boolean(primaryAction || secondaryAction);

  return (
    <div
      role={role}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn(
        "fixed bottom-6 right-6 z-[9999] w-[min(22.5rem,calc(100vw-2rem))]",
        "animate-in fade-in-0 slide-in-from-bottom-3 duration-200",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-hidden rounded-xl bg-card text-card-foreground",
          "ring-1 ring-black/8 dark:ring-white/10",
          "shadow-[var(--md-elevation-4)]",
        )}
      >
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <div
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
              styles.iconWrap,
            )}
          >
            {styles.icon}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-foreground">
                {title}
              </p>
              {onDismiss ? (
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label="Dismiss"
                  className="md-state-layer -mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}
            </div>
            {description ? (
              <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {hasActions ? (
          <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-3 py-2.5">
            {secondaryAction ? (
              <Button type="button" variant="ghost" size="sm" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ) : null}
            {primaryAction ? (
              <Button type="button" size="sm" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
