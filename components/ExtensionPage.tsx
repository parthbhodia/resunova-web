"use client";

/**
 * Extension marketing page.
 *
 * Lives in `components/` rather than the route file because it uses MUI, and
 * main's convention is that route files stay thin: `/pricing` is the worked
 * example, where `app/pricing/page.tsx` carries metadata and nothing else.
 *
 * Layout is page-scoped CSS (`ext-*`), not `sx`: per DESIGN.md §3 the split is
 * "if it is a control, it is MUI; if it is a canvas, it is CSS". The hero, the
 * section rhythm and the card grid are canvas. The buttons are controls, so
 * they are MUI. The ATS and privacy cards are static list rows, which DESIGN.md
 * explicitly leaves as plain elements rather than spending an Emotion class on
 * inert markup.
 */

import Link from "next/link";
import Button from "@mui/material/Button";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { LogoFull } from "@/components/BrandLogo";
import {
  CHROME_STORE_URL,
  CONTROL_POINTS,
  FAQ_ITEMS,
  HOW_IT_WORKS,
  IS_STORE_LIVE,
  PRIVACY_POINTS,
  REQUIREMENTS,
  SUPPORTED_ATS,
} from "@/lib/extensionContent";

function InstallButton({ variant }: { variant: "primary" | "ghost" }) {
  const isPrimary = variant === "primary";
  if (IS_STORE_LIVE) {
    return (
      <Button
        component="a"
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        variant={isPrimary ? "contained" : "outlined"}
        disableElevation
      >
        Add to Chrome
      </Button>
    );
  }
  // The listing does not exist yet, so link to the connect page rather than
  // to a store URL that 404s.
  return (
    <Button
      component={Link}
      href="/extension/connect/"
      variant={isPrimary ? "contained" : "outlined"}
      disableElevation
    >
      Connect your account
    </Button>
  );
}

export default function ExtensionPage() {
  return (
    <MuiThemeRegistry>
      <div className="ext-root">
        <header className="ext-header">
          <Link href="/" style={{ textDecoration: "none" }} aria-label="Resunova home">
            <LogoFull markSize={26} textColor="var(--text)" />
          </Link>
          <Link href="/" className="ext-back">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
        </header>

        <main>
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section className="ext-hero">
            <p className="ext-eyebrow">Chrome extension</p>
            <h1 className="ext-h1">Stop retyping your life into every job form.</h1>
            <p className="ext-lede">
              Open a posting on Greenhouse, Ashby, Lever or Workday. One click pulls your name,
              contact details, links and employment answers out of your Resunova profile and fills
              them in. You read the form before anything is sent.
            </p>

            <div className="ext-cta-row">
              <InstallButton variant="primary" />
              <Button component="a" href="#how" variant="outlined" disableElevation>
                See how it works
              </Button>
            </div>

            <p className="ext-store-note">
              {IS_STORE_LIVE
                ? "Free to install. Works with any Resunova account."
                : "The Chrome Web Store listing is not published yet. Connect the extension once it is installed."}
            </p>

            <ul className="ext-reqs">
              {REQUIREMENTS.map((r) => (
                <li key={r}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ext-tick">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {r}
                </li>
              ))}
            </ul>
          </section>

          {/* ── Supported platforms ──────────────────────────────────────── */}
          <section className="ext-section">
            <p className="ext-eyebrow">Supported platforms</p>
            <h2 className="ext-h2">Four application systems, covered honestly.</h2>
            <p className="ext-section-lede">
              Each platform has its own adapter rather than one generic form filler. Where a
              platform only works partly, the page says so.
            </p>

            <div className="ext-ats-grid">
              {SUPPORTED_ATS.map((ats) => (
                <article key={ats.id} className="ext-ats-card">
                  <div className="ext-ats-head">
                    <h3>{ats.name}</h3>
                    <span className="ext-badge">{ats.hosts}</span>
                  </div>
                  <p className="ext-ats-coverage">{ats.coverage}</p>
                  <p className="ext-ats-match">
                    <span>Matches</span>
                    <code>{ats.match}</code>
                  </p>
                </article>
              ))}
            </div>

            <p className="ext-footnote">
              LinkedIn, Indeed and iCIMS are not supported yet. Those flows change too often to
              claim, so they will appear here only when an adapter genuinely works.
            </p>
          </section>

          {/* ── How it works ─────────────────────────────────────────────── */}
          <section className="ext-section" id="how">
            <p className="ext-eyebrow">How it works</p>
            <h2 className="ext-h2">Four steps, and you own the last one.</h2>

            <ol className="ext-steps">
              {HOW_IT_WORKS.map((s) => (
                <li key={s.step} className="ext-step">
                  <span className="ext-step-num">{s.step}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Control ──────────────────────────────────────────────────── */}
          <section className="ext-section ext-section-alt">
            <p className="ext-eyebrow">You stay in control</p>
            <h2 className="ext-h2">The typing goes. The judgement stays yours.</h2>
            <div className="ext-control-grid">
              {CONTROL_POINTS.map((c) => (
                <div key={c.title} className="ext-control-card">
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Privacy ──────────────────────────────────────────────────── */}
          <section className="ext-section">
            <p className="ext-eyebrow">Permissions and privacy</p>
            <h2 className="ext-h2">What it can see, and what it cannot.</h2>
            <div className="ext-privacy-grid">
              {PRIVACY_POINTS.map((p) => (
                <div key={p.title} className="ext-privacy-card">
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────────── */}
          <section className="ext-section">
            <p className="ext-eyebrow">FAQ</p>
            <h2 className="ext-h2">Questions worth asking.</h2>
            <div className="ext-faq">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="ext-faq-item">
                  <summary>
                    {item.q}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="ext-faq-chev">
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── Closing CTA ──────────────────────────────────────────────── */}
          <section className="ext-cta-panel">
            <h2 className="ext-h2">Your next application, minus the retyping.</h2>
            <p className="ext-lede">
              Set up your profile once, then let the extension handle the fields you would otherwise
              retype on every single form.
            </p>
            <div className="ext-cta-row ext-cta-row-center">
              <InstallButton variant="primary" />
              <Button component={Link} href="/profile/" variant="outlined" disableElevation>
                Set up your profile
              </Button>
            </div>
          </section>
        </main>

        <footer className="ext-footer">
          <span>© 2026 Resunova</span>
          <nav aria-label="Footer">
            <Link href="/">Home</Link>
            <Link href="/jobs/">Jobs</Link>
            <Link href="/pricing/">Pricing</Link>
            <Link href="/privacy/">Privacy</Link>
            <Link href="/contact/">Contact</Link>
          </nav>
        </footer>

        <style>{EXT_CSS}</style>
      </div>
    </MuiThemeRegistry>
  );
}

const EXT_CSS = `
  .ext-root {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', -apple-system, sans-serif;
    --ext-line: var(--border);
    --ext-card: var(--surface);
  }
  .ext-header {
    position: sticky; top: 0; z-index: 50;
    height: 56px; padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between;
    background: var(--glass-bg);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--ext-line);
  }
  .ext-back {
    font-size: var(--font-size-base); color: var(--dim); text-decoration: none;
    display: flex; align-items: center; gap: 6px;
    transition: color var(--transition);
  }
  .ext-back:hover { color: var(--text); }

  .ext-hero { max-width: 760px; margin: 0 auto; padding: 72px 24px 56px; text-align: center; }
  .ext-eyebrow {
    font-size: var(--font-size-sm); font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 14px;
  }
  .ext-h1 {
    font-size: 48px; font-weight: 800; letter-spacing: -1.6px; line-height: 1.08;
    margin: 0 0 20px;
  }
  .ext-h2 {
    font-size: 30px; font-weight: 800; letter-spacing: -0.8px; line-height: 1.18;
    margin: 0 0 14px;
  }
  .ext-lede {
    font-size: var(--font-size-lg); color: var(--muted);
    line-height: 1.72; margin: 0 auto 32px; max-width: 600px;
  }
  .ext-cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .ext-cta-row-center { margin-top: 28px; }
  .ext-store-note { font-size: var(--font-size-sm); color: var(--dim); margin: 18px 0 0; }
  .ext-reqs {
    list-style: none; padding: 0; margin: 40px auto 0; max-width: 520px;
    display: flex; flex-direction: column; gap: 10px; text-align: left;
  }
  .ext-reqs li {
    display: flex; gap: 10px; align-items: flex-start;
    font-size: var(--font-size-base); color: var(--muted); line-height: 1.6;
  }
  .ext-tick { color: var(--green); flex-shrink: 0; margin-top: 3px; }

  .ext-section { max-width: 1080px; margin: 0 auto; padding: 56px 24px; }
  .ext-section-alt {
    max-width: none; background: var(--surface2);
    border-top: 1px solid var(--ext-line); border-bottom: 1px solid var(--ext-line);
  }
  .ext-section-alt > * { max-width: 1032px; margin-left: auto; margin-right: auto; }
  .ext-section-lede {
    font-size: var(--font-size-lg); color: var(--muted); line-height: 1.72;
    margin: 0 0 32px; max-width: 640px;
  }

  /* minmax floor chosen so 4 cards land 2x2 rather than 3+1 orphan. At the
     1032px content width 2x380+16 fits and 3x380+32 does not. The min() cap
     keeps that floor from overflowing narrow viewports, where the track would
     otherwise stay 380px wide and push the page sideways. */
  .ext-ats-grid {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr));
  }
  .ext-ats-card {
    background: var(--ext-card); border: 1px solid var(--ext-line);
    border-radius: 14px; padding: 20px;
  }
  .ext-ats-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .ext-ats-head h3 { font-size: var(--font-size-xl); font-weight: 700; margin: 0; letter-spacing: -0.3px; }
  .ext-badge {
    font-size: 11px; color: var(--muted); background: var(--surface2);
    border: 1px solid var(--ext-line); border-radius: 99px; padding: 3px 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .ext-ats-coverage { font-size: var(--font-size-base); color: var(--muted); line-height: 1.6; margin: 0 0 12px; }
  .ext-ats-match { display: flex; flex-direction: column; gap: 3px; margin: 0; }
  .ext-ats-match span { font-size: 11px; color: var(--dim); text-transform: uppercase; letter-spacing: 0.08em; }
  .ext-ats-match code {
    font-size: 11px; color: var(--accent); word-break: break-all;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .ext-footnote {
    font-size: var(--font-size-base); color: var(--dim); line-height: 1.7;
    margin: 24px 0 0; max-width: 640px;
  }

  .ext-steps { list-style: none; padding: 0; margin: 0; display: grid; gap: 20px; }
  .ext-step { display: flex; gap: 16px; align-items: flex-start; }
  .ext-step-num {
    width: 30px; height: 30px; flex-shrink: 0; border-radius: 9px;
    background: var(--accent-bg); color: var(--accent-ink, var(--accent));
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: var(--font-size-base);
  }
  .ext-step h3 { font-size: var(--font-size-lg); font-weight: 700; margin: 3px 0 6px; }
  .ext-step p { font-size: var(--font-size-base); color: var(--muted); line-height: 1.68; margin: 0; }

  .ext-control-grid {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  }
  .ext-privacy-grid {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr));
  }
  .ext-control-card, .ext-privacy-card {
    border: 1px solid var(--ext-line); border-radius: 14px; padding: 20px;
    background: var(--surface);
  }
  .ext-section-alt .ext-control-card { background: var(--bg); }
  .ext-control-card h3, .ext-privacy-card h3 {
    font-size: var(--font-size-lg); font-weight: 700; margin: 0 0 8px; letter-spacing: -0.2px;
  }
  .ext-control-card p, .ext-privacy-card p {
    font-size: var(--font-size-base); color: var(--muted); line-height: 1.68; margin: 0;
  }

  .ext-faq { display: flex; flex-direction: column; gap: 10px; max-width: 760px; }
  .ext-faq-item {
    border: 1px solid var(--ext-line); border-radius: 12px;
    background: var(--ext-card); overflow: hidden;
  }
  .ext-faq-item summary {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 16px 18px; cursor: pointer; list-style: none;
    font-size: var(--font-size-lg); font-weight: 600;
  }
  .ext-faq-item summary::-webkit-details-marker { display: none; }
  .ext-faq-chev { color: var(--dim); flex-shrink: 0; transition: transform var(--transition); }
  .ext-faq-item[open] .ext-faq-chev { transform: rotate(180deg); }
  .ext-faq-item p {
    padding: 0 18px 16px; margin: 0;
    font-size: var(--font-size-base); color: var(--muted); line-height: 1.7;
  }

  .ext-cta-panel {
    max-width: 760px; margin: 24px auto 64px; padding: 40px 32px;
    text-align: center; border: 1px solid var(--ext-line);
    border-radius: 18px; background: var(--surface2);
  }
  .ext-footer {
    border-top: 1px solid var(--ext-line);
    padding: 28px 24px; display: flex; flex-wrap: wrap; gap: 16px;
    align-items: center; justify-content: space-between;
    font-size: var(--font-size-sm); color: var(--dim);
    max-width: 1032px; margin: 0 auto;
  }
  .ext-footer nav { display: flex; flex-wrap: wrap; gap: 18px; }
  .ext-footer a { color: var(--dim); text-decoration: none; }
  .ext-footer a:hover { color: var(--text); }

  @media (max-width: 720px) {
    .ext-hero { padding: 48px 20px 40px; }
    .ext-h1 { font-size: 32px; letter-spacing: -1px; }
    .ext-h2 { font-size: 22px; }
    .ext-section { padding: 40px 20px; }
    .ext-cta-panel { margin: 16px 20px 48px; padding: 32px 20px; }
    .ext-cta-row { flex-direction: column; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ext-back, .ext-faq-chev { transition: none; }
  }
`;
