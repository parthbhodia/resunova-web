"use client";

/**
 * Teal-school scroll system for the signed-out landing page:
 *
 *  - <Reveal>            scroll-triggered slide-in for product visuals
 *  - <FloatingFeatureNav> sticky pill bar that tracks which product section
 *                         is in view and smooth-scrolls on click
 *  - <TealScrollStyles>   the shared keyframes/classes (one <style> mount)
 *
 * The "color changes as you scroll" effect itself comes from the full-bleed
 * colored sections in LandingPage (each with a large curved top corner, like
 * tealhq.com); this file supplies the motion and the floating nav.
 *
 * All motion is gated behind prefers-reduced-motion.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

// ── Shared styles ────────────────────────────────────────────────────────────

export function TealScrollStyles() {
  return (
    <style>{`
      .lp-reveal { opacity: 0; transform: translateY(46px); }
      .lp-reveal.lp-reveal-left  { transform: translateX(-52px); }
      .lp-reveal.lp-reveal-right { transform: translateX(52px); }
      .lp-reveal.lp-in { opacity: 1; transform: none; transition: opacity .75s ease, transform .75s cubic-bezier(0.22, 1, 0.36, 1); }
      @media (prefers-reduced-motion: reduce) {
        .lp-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
      }

      .lp-featnav { position: sticky; top: 66px; z-index: 60; display: flex; justify-content: center; padding: 0 16px; margin: -26px 0 0; pointer-events: none; }
      .lp-featnav-inner { pointer-events: auto; display: inline-flex; gap: 2px; align-items: stretch; border-radius: 999px; padding: 5px; max-width: 100%; overflow-x: auto; scrollbar-width: none; }
      .lp-featnav-inner::-webkit-scrollbar { display: none; }
      .lp-featnav-btn { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; border: none; background: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 650; letter-spacing: -0.1px; padding: 9px 15px; border-radius: 999px; transition: background .18s, color .18s; }
      .lp-featnav-btn svg { flex-shrink: 0; }
      @media (max-width: 640px) { .lp-featnav { top: 58px; } .lp-featnav-btn { font-size: 12px; padding: 8px 11px; } .lp-featnav-btn svg { display: none; } }

      .lp-comarquee { overflow: hidden; position: relative; }
      .lp-comarquee-row { display: flex; gap: 12px; width: max-content; animation: lpMarqueeX 42s linear infinite; }
      .lp-comarquee:hover .lp-comarquee-row { animation-play-state: paused; }
      @keyframes lpMarqueeX { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @media (prefers-reduced-motion: reduce) { .lp-comarquee-row { animation: none; } .lp-comarquee { overflow-x: auto; } }
    `}</style>
  );
}

// ── Scroll-triggered reveal ──────────────────────────────────────────────────

export function Reveal({
  children,
  dir = "up",
  delay = 0,
}: {
  children: ReactNode;
  /** Slide-in direction: from below (default), from the left, or from the right. */
  dir?: "up" | "left" | "right";
  /** Transition delay in ms — stagger siblings with 0 / 90 / 180. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  return (
    <div
      ref={ref}
      className={`lp-reveal${dir === "left" ? " lp-reveal-left" : dir === "right" ? " lp-reveal-right" : ""}${seen ? " lp-in" : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// ── Floating feature nav ─────────────────────────────────────────────────────

export type FeatureNavItem = { id: string; label: string; icon: ReactNode };

export function FloatingFeatureNav({
  items,
  C,
  dark,
  accent,
}: {
  items: FeatureNavItem[];
  C: Record<string, string>;
  dark: boolean;
  accent: string;
}) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        // Pick the most visible intersecting section (mid-viewport band).
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.15, 0.4] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="lp-featnav" aria-label="Product features">
      <div
        className="lp-featnav-inner"
        style={{
          background: dark ? "rgba(22,27,34,0.88)" : "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: `1px solid ${C.border}`,
          boxShadow: dark ? "0 14px 34px -16px rgba(0,0,0,0.7)" : "0 14px 34px -18px rgba(13,17,23,0.35)",
        }}
      >
        {items.map(({ id, label, icon }) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              className="lp-featnav-btn"
              aria-current={on ? "true" : undefined}
              onClick={() => scrollTo(id)}
              style={{
                color: on ? "#fff" : C.muted,
                background: on ? accent : "transparent",
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
