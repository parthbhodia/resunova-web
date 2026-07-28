"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

export type IconButtonProps = Omit<ButtonProps, "aria-label" | "children"> & {
  /**
   * What the button does, in plain words ("Delete résumé"). Required — it is
   * BOTH the hover/focus tooltip and the accessible name, so an icon-only
   * control can never ship unlabelled.
   */
  label: string;
  /** The icon element. */
  children: React.ReactNode;
  /** Tooltip placement. */
  side?: React.ComponentProps<typeof TooltipContent>["side"];
  /** Set false to render the button without a tooltip (still labelled). */
  tooltip?: boolean;
};

/**
 * An icon-only button with a real, instant tooltip instead of the browser's
 * ~1s native `title` popup.
 *
 * Requires a `TooltipProvider` above it — `AppShell` mounts one for every
 * signed-in surface. Outside that tree pass `tooltip={false}` (or wrap in a
 * provider yourself); the `aria-label` is applied either way.
 */
export function IconButton({
  label,
  children,
  side = "top",
  tooltip = true,
  variant = "ghost",
  size = "icon-sm",
  className,
  ...props
}: IconButtonProps) {
  const button = (
    <Button
      aria-label={label}
      variant={variant}
      size={size}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      {children}
    </Button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      {/* The trigger IS the button — base-ui merges its props onto it rather
          than wrapping it in a second interactive element. */}
      <TooltipTrigger render={button} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export default IconButton;
