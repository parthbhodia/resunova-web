"use client";

import { useCallback, useSyncExternalStore } from "react";

export const T = {
  // Brand mark (logo R only — amber stays here)
  brand:       "#c4793a",
  brandGlow:   "rgba(196,121,58,0.20)",

  // Primary action — consistent with app accent
  blue:        "#2563eb",
  blueHover:   "#1d4ed8",
  blueGlow:    "rgba(37,99,235,0.14)",

  // Hot CTA — the logo's own orange, promoted to THE action color (Teal-style:
  // exactly one saturated pill on an otherwise quiet ground)
  hot:         "#e0894e",
  hotHover:    "#d4772f",
  hotInk:      "#231303",

  // Full-bleed feature blocks (committed colors — same in both themes)
  blockIndigo: "#1d2f8f",
  blockGreen:  "#0a4f42",
  blockGold:   "#f4c76b",
  blockGoldInk:"#33240a",

  // Semantic
  green:       "#059669",
  amber:       "#d97706",   // score bars only (not CTA)
  teal:        "#0d9488",

  // Light-mode neutrals
  bg:          "#f6f8fa",
  bg2:         "#eef0f3",
  ink:         "#0d1117",
  muted:       "#57606a",
  border:      "#d0d7de",
  surface:     "#ffffff",

  // Dark-mode neutrals
  dBg:         "#0d1117",
  dBg2:        "#161b22",
  dInk:        "#e6edf3",
  dMuted:      "#8b949e",
  dBorder:     "#30363d",
  dSurface:    "#21262d",
};


export type Theme = "dark" | "light";

function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function useLandingTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as Theme);
  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("rn-theme", next);
    } catch {
      /* private mode still flips the attribute for this visit */
    }
    document.documentElement.setAttribute("data-theme", next);
  }, []);
  return [theme, toggle];
}

