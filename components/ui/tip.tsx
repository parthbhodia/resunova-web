"use client";

import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type TipProps = {
  /** The words that appear on hover/focus — and the accessible name. */
  label: string;
  /** Exactly one element. Its own styling is preserved. */
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  side?: React.ComponentProps<typeof TooltipContent>["side"];
  /** Escape hatch: render the child untouched (e.g. when the label is redundant). */
  disabled?: boolean;
};

/**
 * Adds a real tooltip to an existing control without restyling it.
 *
 * The native `title` attribute waits about a second, renders in the OS style,
 * never appears on keyboard focus, and is invisible on touch — so icon-only
 * controls that rely on it read as unlabelled. `Tip` swaps that for the app's
 * own instant, themed tooltip and sets `aria-label` at the same time.
 *
 *   <Tip label="Move bullet up"><button style={ctlBtn}>↑</button></Tip>
 *
 * Needs a `TooltipProvider` above it; `AppShell` mounts one for the whole
 * signed-in app. For anything rendered outside that tree, keep `title`.
 */
export function Tip({ label, children, side = "top", disabled = false }: TipProps) {
  if (disabled) return children;

  const child = React.cloneElement(children, {
    "aria-label": children.props["aria-label"] ?? label,
    // The tooltip replaces the native popup; leaving `title` on would show both.
    title: undefined,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <Tooltip>
      <TooltipTrigger render={child} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export default Tip;
