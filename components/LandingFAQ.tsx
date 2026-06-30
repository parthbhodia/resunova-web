"use client";

/**
 * FAQ section for the signed-out landing page (LandingPage.tsx).
 *
 * Two jobs:
 *   1. A visible, accessible <details> accordion so humans get answers in-page.
 *   2. FAQPage JSON-LD emitted HERE — the statically-exported homepage renders
 *      LandingPage (AuthGate swaps it in for signed-out visitors), so the FAQ
 *      schema in app/page.tsx never reaches the crawlable `/`. Emitting it from
 *      inside the landing tree is what actually ships structured data.
 *
 * Styled with the landing page's resolved `C` color object + `accent` so it
 * matches the surrounding sections in both light and dark themes.
 */

import { FAQ_ITEMS } from "@/lib/faqContent";

type C = {
  bg: string;
  bg2: string;
  ink: string;
  muted: string;
  border: string;
  surface: string;
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function LandingFAQ({ C, accent }: { C: C; accent: string }) {
  return (
    <section
      id="faq"
      style={{
        borderTop: `1px solid ${C.border}`,
        background: C.bg,
        padding: "100px 40px",
        scrollMarginTop: 76,
      }}
    >
      {/* Accordion chrome — marker reset, hover, chevron rotation. */}
      <style>{`
        .lpfaq-item { background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 14px; overflow: hidden; transition: border-color 0.15s; }
        .lpfaq-item[open] { border-color: ${accent}55; }
        .lpfaq-item > summary { list-style: none; cursor: pointer; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 16px; font-weight: 650; color: ${C.ink}; letter-spacing: -0.2px; }
        .lpfaq-item > summary::-webkit-details-marker { display: none; }
        .lpfaq-item > summary:hover { color: ${accent}; }
        .lpfaq-chev { flex-shrink: 0; color: ${C.muted}; transition: transform 0.2s ease; }
        .lpfaq-item[open] .lpfaq-chev { transform: rotate(180deg); }
        .lpfaq-a { padding: 0 20px 18px; margin: 0; font-size: 14.5px; line-height: 1.65; color: ${C.muted}; }
        @media (max-width: 640px) {
          .lpfaq-item > summary { font-size: 15px; padding: 16px 16px; }
          .lpfaq-a { padding: 0 16px 16px; }
        }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 13px",
              marginBottom: 16,
              background: `${accent}1a`,
              border: `1px solid ${accent}28`,
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 600,
              color: accent,
              letterSpacing: 0.2,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block" }} />
            FAQ
          </div>
          <h2
            className="lp-h2"
            style={{
              fontSize: "clamp(30px, 4vw, 48px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: C.ink,
              margin: "0 0 16px",
            }}
          >
            Questions, answered.
          </h2>
          <p style={{ fontSize: "var(--font-size-lg)", color: C.muted, lineHeight: 1.65, maxWidth: 540, margin: "0 auto" }}>
            Everything you need to know before your first scan. Still curious? It&apos;s free — just try it.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          {FAQ_ITEMS.map((f, i) => (
            <details key={f.q} className="lpfaq-item" name="rn-landing-faq" open={i === 0}>
              <summary>
                <span>{f.q}</span>
                <svg className="lpfaq-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="lpfaq-a">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* FAQPage structured data — lives here so the statically-exported,
          crawlable homepage (which renders LandingPage) actually ships it. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  );
}
