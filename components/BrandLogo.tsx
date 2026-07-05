"use client";
import type { CSSProperties } from "react";
import { UMBC_BRAND } from "@/lib/brand";
/**
 * BrandLogo — shared logo primitives used by LandingPage + AppShell.
 *
 * LogoMark  — amber square with the Nova R (SVG, scales cleanly):
 *             uniform-stroke R letterform + four-point nova spark in the
 *             top-right, tying the mark to the name (resu-NOVA). Keep in
 *             sync with marketing/html/* and app/opengraph-image.tsx if
 *             the paths change.
 * LogoFull  — mark + "Resunova" wordmark side-by-side
 */

interface LogoMarkProps {
  /** px size of the square mark (default 28) */
  size?: number;
  /** Brand variant (default "resunova") */
  variant?: "resunova" | "umbc";
}

export function LogoMark({ size = 28, variant = "resunova" }: LogoMarkProps) {
  const markColor = variant === "umbc" ? UMBC_BRAND.gold : "#c4793a";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-label={`${variant} logo mark`}
    >
      {/* Colored rounded square */}
      <rect width="28" height="28" rx="7" fill={markColor} />

      {/* ── Nova R ────────────────────────────────────────── */}
      {/* R letterform — uniform 2.4 stroke */}
      <path d="M8.7 8.2v12.6" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M8.7 8.2h4.1a4.1 4.1 0 0 1 0 8.2H8.7"
        stroke="white" strokeWidth="2.4" strokeLinecap="round"
        strokeLinejoin="round" fill="none"
      />
      <path d="M13.2 16.4l4.4 4.4" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      {/* Nova spark, top-right */}
      <path
        d="M21.4 4.6c.35 1.75 1.25 2.65 3 3-1.75.35-2.65 1.25-3 3-.35-1.75-1.25-2.65-3-3 1.75-.35 2.65-1.25 3-3z"
        fill="white" opacity="0.88"
      />
    </svg>
  );
}

interface LogoFullProps {
  /** px size of the square mark (wordmark scales with it) */
  markSize?: number;
  /** Override text color (defaults to currentColor / inherit) */
  textColor?: string;
  /** Brand variant (default "resunova") */
  variant?: "resunova" | "umbc";
  className?: string;
  style?: CSSProperties;
}

export function LogoFull({
  markSize = 28,
  textColor,
  variant = "resunova",
  className,
  style,
}: LogoFullProps) {
  const fontSize = Math.round(markSize * 0.64);
  const brandText = variant === "umbc" ? "UMBC" : "Resunova";
  return (
    <div
      className={className}
      style={{
        display: "flex", alignItems: "center",
        gap: Math.round(markSize * 0.32),
        ...style,
      }}
    >
      <LogoMark size={markSize} variant={variant} />
      <span style={{
        fontSize,
        fontWeight: 700,
        letterSpacing: -0.5,
        lineHeight: 1,
        color: textColor ?? "inherit",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        userSelect: "none",
      }}>
        {brandText}
      </span>
    </div>
  );
}
