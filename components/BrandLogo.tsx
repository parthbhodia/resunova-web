"use client";
import type { CSSProperties } from "react";
import { UMBC_BRAND } from "@/lib/brand";
/**
 * BrandLogo — shared logo primitives used by LandingPage + AppShell.
 *
 * LogoMark  — amber square with nova-burst mark (SVG, scales cleanly).
 *             Main four-point nova offset down-left + companion spark
 *             top-right, so it reads as "nova" (the name) rather than a
 *             generic AI sparkle. Keep in sync with marketing/html/* and
 *             app/opengraph-image.tsx if the paths change.
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

      {/* ── Nova burst ────────────────────────────────────── */}
      {/* Main four-point nova, offset down-left */}
      <path
        d="M13.4 5.2C14.4 10.9 16.9 13.4 22.6 14.4C16.9 15.4 14.4 17.9 13.4 23.6C12.4 17.9 9.9 15.4 4.2 14.4C9.9 13.4 12.4 10.9 13.4 5.2Z"
        fill="white"
      />
      {/* Companion spark, top-right */}
      <path
        d="M21.9 3.4C22.2 5.1 23.1 6 24.8 6.3C23.1 6.6 22.2 7.5 21.9 9.2C21.6 7.5 20.7 6.6 19 6.3C20.7 6 21.6 5.1 21.9 3.4Z"
        fill="white" opacity="0.92"
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
