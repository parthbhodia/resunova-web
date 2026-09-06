"use client";

import { Component, type ReactNode } from "react";

/**
 * Contains a render failure to the subtree that caused it.
 *
 * Written for the PDF thumbnail, which brought down all of My Résumés on
 * 2026-09-06: pdf.js called an API the browser did not have, threw while the
 * chunk evaluated, and the whole view fell through to the global crash page —
 * so a decorative thumbnail cost someone access to every résumé they had
 * saved. PdfCardThumbnail's own contract already said it "returns null on any
 * load/render failure", and that was only true for failures it could catch
 * inside a callback; a throw during render walked straight past it.
 *
 * Deliberately silent by default: the fallback for a thumbnail is the
 * placeholder the card already draws underneath. Pass `fallback` where the
 * absence needs saying out loud.
 */
export class RenderErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Logged, never swallowed silently — a thumbnail that stops appearing for
    // every user on an older browser should be findable in a console.
    console.error("[RenderErrorBoundary] contained a render failure", error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
