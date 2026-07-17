"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { goToFreeScan, signInWithGoogle } from "@/lib/anonScan";
import { SITE_URL } from "@/lib/brand";
import { LogoFull, LogoMark } from "./BrandLogo";
import { Button } from "@/components/ui/button";
import {
  LandingPreviewStyles,
  VariantA,
  VariantB,
  VariantD,
  VariantE,
} from "@/components/LandingFeatureShowcase";
import LandingFAQ from "@/components/LandingFAQ";
import LandingTopCompanies from "@/components/LandingTopCompanies";
import { FloatingFeatureNav, Reveal, TealScrollStyles } from "@/components/landing/TealScroll";

// ── Design tokens ──────────────────────────────────────────────────────────
// Cool slate palette — professional SaaS, not warm editorial
const T = {
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

type Theme = "dark" | "light";

function useLandingTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = (localStorage.getItem("rn-theme") as Theme | null) || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);
  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("rn-theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);
  return [theme, toggle];
}

// ── Data ────────────────────────────────────────────────────────────────────
/** Toggle "Three steps…" / How it works block on the landing page. */
const SHOW_HOW_SECTION = false;
/** Text card grids (features, platform, research pillars) — previews carry the story. */
const SHOW_LANDING_CARDS = false;
/** Line-by-line analysis preview (VariantE) — hidden for now. */
const SHOW_SCAN_PREVIEW = false;

const FEATURES = [
  {
    num: "01",
    title: "Achievement",
    desc: "Flags duty-list bullets and surfaces rewrites that show outcomes, ownership, and impact — not just what you were assigned.",
  },
  {
    num: "02",
    title: "Quantification",
    desc: "Spots missing metrics and nudges you to add numbers where they strengthen credibility — without inventing data.",
  },
  {
    num: "03",
    title: "Job Match",
    desc: "Scores keyword and requirement fit against the posting so you know what’s covered, what’s missing, and what to add.",
  },
  {
    num: "04",
    title: "ATS Safety",
    desc: "Checks parsing risk — tables, columns, odd headings — before an ATS silently drops your application.",
  },
  {
    num: "05",
    title: "Readability",
    desc: "Rates skim-ability: bullet length, density, and layout so a recruiter grasps your story in a six-second pass.",
  },
  {
    num: "06",
    title: "Language",
    desc: "Catches weak verbs, passive voice, and tense drift — with proofreading-level fixes where the meaning stays yours.",
  },
];

const STEPS = [
  { title: "Upload your résumé",      desc: "Drop any existing PDF. We extract every bullet, section, and keyword — no re-typing required." },
  { title: "Paste the job posting",   desc: "URL or raw text. Our AI reads the role like a recruiter: extracting what they're actually screening for." },
  { title: "Get more callbacks",      desc: "Match score, gap analysis, rewritten bullets, and a tailored PDF — tuned so your application is more likely to earn a recruiter screen, not sit in silence." },
];

const PLATFORM_HIGHLIGHTS = [
  {
    title: "Résumé templating",
    desc: "Open the template gallery, pick a LaTeX layout (e.g. Harshibar ATS), customize accents, and compile a polished PDF — reuse the same structure for every role without rebuilding from scratch.",
    accent: T.blue,
  },
  {
    title: "Public share link",
    desc: "Mint a memorable URL like resunova.io/r/?id=your-name. Recruiters open your résumé in the browser; photo-enabled layouts keep your profile picture on the PDF they view.",
    accent: T.teal,
  },
  {
    title: "ATS scoring",
    desc: "Run an ATS best-practices checklist: parsing-safe structure, headings, dates, and formatting scored 0–100 with a clear pass/fail list — so you know what to fix before you apply.",
    accent: T.green,
  },
];

const RESEARCH_PILLARS = [
  {
    title: "MIT & Harvard-style guidance",
    desc: "Templates and coaching follow elite campus career-center conventions — including MIT-style ATS layouts (Harshibar) and Harvard-tier structuring: tight section headers, achievement bullets with metrics, and keyword discipline that reads well to humans and parsers.",
    accent: T.blue,
  },
  {
    title: "Transparent scoring mechanism",
    desc: "A headline ATS best-practices score (checklist passed ÷ total) plus JD match dimensions — readability, keyword fit, achievement quality, ATS safety — so you see which checks moved the number, not a mystery percentage.",
    accent: T.teal,
    href: "/blog/optimizing-resumes-for-ats",
    linkLabel: "How scoring works",
  },
  {
    title: "FERPA-informed data privacy",
    desc: "Built for students and campus communities: we apply FERPA-informed practices for education-related data — limited use, no sale of personal information, and training calibrated on anonymized top-company résumé corpora (Google, Figma, Meta, Amazon, Adobe). See our Privacy Policy.",
    accent: T.green,
    href: "/privacy",
    linkLabel: "Privacy Policy",
  },
];

// ── Résumé / CV templates (landing showcase) ────────────────────────────────
type TemplateDef = { name: string; type: "Résumé" | "CV"; accent: string; darkAccent: string; href: string; thumb: React.ReactNode };

const RESUME_TEMPLATES: TemplateDef[] = [
  {
    name: "Elise", type: "Résumé", accent: "#0f5561", darkAccent: "#2dd4bf", href: "/template-builder/?preset=creative-teal",
    thumb: (
      <svg viewBox="0 0 200 264" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
        <rect width="200" height="264" rx="6" fill="#ffffff" />
        {/* Dark teal right sidebar */}
        <path d="M130 0h64a6 6 0 0 1 6 6v252a6 6 0 0 1-6 6h-64Z" fill="#0f5561" />
        {/* Main column */}
        <text x="14" y="26" fontFamily="Helvetica, Arial, sans-serif" fontSize="11.5" fontWeight="700" fill="#0f172a" letterSpacing="0.3">SOFIA MARIN</text>
        <text x="14" y="36" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.5" fill="#0f5561">sofia.marin@email.com · (312) 555-0177 · Chicago, IL</text>
        <text x="14" y="50" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.4" fontWeight="700" fill="#0f5561" letterSpacing="1">SUMMARY</text>
        <text x="14" y="59" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fill="#334155">Brand designer turning research into identity</text>
        <text x="14" y="66" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fill="#334155">systems for consumer and B2B products.</text>
        <text x="14" y="81" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.4" fontWeight="700" fill="#0f5561" letterSpacing="1">EXPERIENCE</text>
        <text x="14" y="92" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.9" fontWeight="700" fill="#0f172a">Senior Brand Designer</text>
        <text x="14" y="100" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fontStyle="italic" fill="#475569">Ogilvy — 2021 – Present</text>
        <text x="16" y="109" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fill="#334155">• Rebranded 6 product lines, lifting recall 22%</text>
        <text x="16" y="116" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fill="#334155">• Led a 4-designer identity systems team</text>
        <text x="14" y="129" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.9" fontWeight="700" fill="#0f172a">Brand Designer</text>
        <text x="14" y="137" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fontStyle="italic" fill="#475569">Landor — 2018 – 2021</text>
        <text x="16" y="146" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fill="#334155">• Shipped 30+ campaign systems across print</text>
        <text x="16" y="153" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fill="#334155">• Cut asset production time 40% with templates</text>
        <text x="14" y="166" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.9" fontWeight="700" fill="#0f172a">Junior Designer</text>
        <text x="14" y="174" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fontStyle="italic" fill="#475569">Studio North — 2016 – 2018</text>
        <text x="16" y="183" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fill="#334155">• Produced identity work for 12 retail clients</text>
        {/* Sidebar: initials badge + inverse-text sections */}
        <circle cx="165" cy="34" r="15" fill="#0a3d46" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <text x="165" y="38.5" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="10" fontWeight="700" fill="#ffffff">SM</text>
        <text x="138" y="66" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.8" fontWeight="700" fill="#ffffff" letterSpacing="1">EDUCATION</text>
        <line x1="138" y1="70" x2="192" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <text x="138" y="79" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fontWeight="700" fill="#ffffff">BFA, Graphic Design</text>
        <text x="138" y="86" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.3" fill="rgba(255,255,255,0.72)">RISD · 2016</text>
        <text x="138" y="104" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.8" fontWeight="700" fill="#ffffff" letterSpacing="1">SKILLS</text>
        <line x1="138" y1="108" x2="192" y2="108" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <text x="138" y="117" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="rgba(255,255,255,0.85)">Brand identity</text>
        <text x="138" y="125" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="rgba(255,255,255,0.85)">Art direction</text>
        <text x="138" y="133" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="rgba(255,255,255,0.85)">Figma · Illustrator</text>
        <text x="138" y="141" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="rgba(255,255,255,0.85)">Typography</text>
        <text x="138" y="149" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="rgba(255,255,255,0.85)">Motion basics</text>
        <text x="138" y="167" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.8" fontWeight="700" fill="#ffffff" letterSpacing="1">AWARDS</text>
        <line x1="138" y1="171" x2="192" y2="171" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <text x="138" y="180" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="rgba(255,255,255,0.85)">ADC Young Guns</text>
        <text x="138" y="188" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="rgba(255,255,255,0.85)">D&amp;AD Shortlist</text>
      </svg>
    ),
  },
  {
    name: "Harper", type: "Résumé", accent: "#1e3a5f", darkAccent: "#93b3d8", href: "/template-builder/?preset=creative-banner",
    thumb: (
      <svg viewBox="0 0 200 264" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
        <rect width="200" height="264" rx="6" fill="#ffffff" />
        {/* Navy top banner */}
        <path d="M6 0h188a6 6 0 0 1 6 6v52H0V6a6 6 0 0 1 6-6Z" fill="#1e3a5f" />
        <text x="14" y="24" fontFamily="Helvetica, Arial, sans-serif" fontSize="11.5" fontWeight="700" fill="#ffffff" letterSpacing="0.3">AVERY JOHNS</text>
        <text x="14" y="34" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.9" fontWeight="700" fill="rgba(255,255,255,0.88)">Data analyst translating messy data into decisions.</text>
        <text x="14" y="44" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.3" fill="rgba(255,255,255,0.72)">avery.johns@email.com · (917) 555-0163 · New York, NY</text>
        <circle cx="176" cy="28" r="14" fill="#16304f" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <text x="176" y="32.5" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="9.5" fontWeight="700" fill="#ffffff">AJ</text>
        {/* Two-column body: main + light right sidebar */}
        <line x1="124" y1="66" x2="124" y2="252" stroke="#e2e8f0" strokeWidth="0.8" />
        <text x="14" y="78" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.2" fontWeight="700" fill="#1e3a5f" letterSpacing="1">EXPERIENCE</text>
        <text x="14" y="89" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.8" fontWeight="700" fill="#0f172a">Senior Data Analyst</text>
        <text x="14" y="97" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fontStyle="italic" fill="#475569">Spotify — 2022 – Present</text>
        <text x="16" y="106" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.5" fill="#334155">• Built retention models guiding a $4M budget</text>
        <text x="16" y="113" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.5" fill="#334155">• Automated weekly KPI packs, saving 12 hrs/wk</text>
        <text x="14" y="126" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.8" fontWeight="700" fill="#0f172a">Data Analyst</text>
        <text x="14" y="134" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fontStyle="italic" fill="#475569">Peloton — 2019 – 2022</text>
        <text x="16" y="143" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.5" fill="#334155">• Modeled churn drivers across 2M subscribers</text>
        <text x="16" y="150" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.5" fill="#334155">• Shipped dashboards used by 40+ stakeholders</text>
        <text x="14" y="163" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.8" fontWeight="700" fill="#0f172a">Analytics Intern</text>
        <text x="14" y="171" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fontStyle="italic" fill="#475569">NBCUniversal — 2018</text>
        <text x="16" y="180" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.5" fill="#334155">• A/B tested homepage modules (+8% CTR)</text>
        <text x="132" y="78" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.2" fontWeight="700" fill="#1e3a5f" letterSpacing="1">EDUCATION</text>
        <text x="132" y="88" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fontWeight="700" fill="#0f172a">B.S. Statistics</text>
        <text x="132" y="95" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.3" fill="#475569">NYU · 2019</text>
        <text x="132" y="111" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.2" fontWeight="700" fill="#1e3a5f" letterSpacing="1">SKILLS</text>
        <text x="132" y="121" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="#334155">SQL · Python · dbt</text>
        <text x="132" y="129" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="#334155">Tableau · Looker</text>
        <text x="132" y="137" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="#334155">Experiment design</text>
        <text x="132" y="145" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="#334155">Stakeholder comms</text>
        <text x="132" y="161" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.2" fontWeight="700" fill="#1e3a5f" letterSpacing="1">CERTS</text>
        <text x="132" y="171" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="#334155">Google Analytics IQ</text>
        <text x="132" y="179" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.4" fill="#334155">AWS Cloud Practitioner</text>
      </svg>
    ),
  },
  {
    name: "Executive", type: "Résumé", accent: "#2563eb", darkAccent: "#60a5fa", href: "/template-builder/?preset=executive",
    thumb: (
      <svg viewBox="0 0 200 264" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
        <rect width="200" height="264" rx="6" fill="#ffffff" />
        <text x="100" y="27" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="12.5" fontWeight="700" fill="#1e293b" letterSpacing="0.5">MORGAN AVERY</text>
        <text x="100" y="37" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fill="#64748b">Senior Product Manager · morgan.avery@email.com · San Francisco</text>
        <line x1="18" y1="44" x2="182" y2="44" stroke="#1e3a5f" strokeWidth="0.9" />
        <text x="18" y="58" fontFamily="Helvetica, Arial, sans-serif" fontSize="7" fontWeight="700" fill="#1e3a5f" letterSpacing="0.9">EXPERIENCE</text>
        <text x="18" y="70" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.3" fontWeight="700" fill="#1e293b">Senior Product Manager</text>
        <text x="182" y="70" textAnchor="end" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fill="#64748b">2021 – Present</text>
        <text x="18" y="78" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.1" fontStyle="italic" fill="#475569">Stripe — San Francisco, CA</text>
        <text x="20" y="87" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.9" fill="#334155">• Led 0→1 launch of a merchant analytics suite (12k+ users)</text>
        <text x="20" y="95" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.9" fill="#334155">• Grew activation 28% via an onboarding redesign</text>
        <text x="18" y="108" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.3" fontWeight="700" fill="#1e293b">Product Manager</text>
        <text x="182" y="108" textAnchor="end" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fill="#64748b">2018 – 2021</text>
        <text x="18" y="116" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.1" fontStyle="italic" fill="#475569">Asana — San Francisco, CA</text>
        <text x="20" y="125" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.9" fill="#334155">• Shipped 3 core features adopted by 60% of teams</text>
        <text x="20" y="133" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.9" fill="#334155">• Built the experimentation roadmap with design + eng</text>
        <text x="18" y="146" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.3" fontWeight="700" fill="#1e293b">Associate Product Manager</text>
        <text x="182" y="146" textAnchor="end" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fill="#64748b">2016 – 2018</text>
        <text x="18" y="154" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.1" fontStyle="italic" fill="#475569">Intuit — Mountain View, CA</text>
        <text x="20" y="163" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.9" fill="#334155">• Owned billing experiments lifting retention 9%</text>
        <text x="18" y="178" fontFamily="Helvetica, Arial, sans-serif" fontSize="7" fontWeight="700" fill="#1e3a5f" letterSpacing="0.9">EDUCATION</text>
        <text x="18" y="190" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.7" fontWeight="700" fill="#1e293b">B.S. Computer Science</text>
        <text x="182" y="190" textAnchor="end" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fill="#64748b">2016</text>
        <text x="18" y="198" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.1" fill="#475569">University of California, Berkeley</text>
        <text x="18" y="213" fontFamily="Helvetica, Arial, sans-serif" fontSize="7" fontWeight="700" fill="#1e3a5f" letterSpacing="0.9">SKILLS</text>
        <text x="18" y="225" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.9" fill="#334155">Product strategy · Roadmapping · SQL · Figma · A/B testing</text>
        <text x="18" y="234" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.9" fill="#334155">Go-to-market · Stakeholder management · Analytics</text>
      </svg>
    ),
  },
  {
    name: "Modern", type: "Résumé", accent: "#0d9488", darkAccent: "#2dd4bf", href: "/template-builder/?preset=modern",
    thumb: (
      <svg viewBox="0 0 200 264" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
        <rect width="200" height="264" rx="6" fill="#ffffff" />
        <text x="18" y="26" fontFamily="Helvetica, Arial, sans-serif" fontSize="13" fontWeight="700" fill="#0f172a" letterSpacing="0.3">JORDAN LEE</text>
        <text x="18" y="36" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" fill="#64748b">jordan.lee@email.com · (206) 555-0140 · Seattle, WA · github.com/jlee</text>
        <text x="18" y="50" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.8" fontWeight="700" fill="#0f5561" letterSpacing="0.8">EXPERIENCE</text>
        <text x="18" y="61" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.2" fontWeight="700" fill="#0f172a">Software Engineer II</text>
        <text x="182" y="61" textAnchor="end" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fill="#64748b">NVIDIA · 2022–Present</text>
        <text x="20" y="70" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.8" fill="#334155">• Built a GPU job scheduler cutting queue time 35%</text>
        <text x="20" y="77" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.8" fill="#334155">• Shipped a Go telemetry pipeline at 2M events/s</text>
        <text x="18" y="89" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.2" fontWeight="700" fill="#0f172a">Software Engineer</text>
        <text x="182" y="89" textAnchor="end" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fill="#64748b">Cloudflare · 2020–2022</text>
        <text x="20" y="98" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.8" fill="#334155">• Cut p99 latency 40% via a Rust edge cache</text>
        <text x="20" y="105" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.8" fill="#334155">• Owned the rollout of zero-downtime deploys</text>
        <text x="18" y="117" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.2" fontWeight="700" fill="#0f172a">SDE Intern</text>
        <text x="182" y="117" textAnchor="end" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.7" fill="#64748b">Amazon · 2019</text>
        <text x="20" y="126" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.8" fill="#334155">• Automated CI checks, saving ~10 hrs/week</text>
        <text x="18" y="140" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.8" fontWeight="700" fill="#0f5561" letterSpacing="0.8">EDUCATION</text>
        <text x="18" y="151" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.6" fontWeight="700" fill="#0f172a">B.S. Computer Science &amp; Engineering</text>
        <text x="18" y="159" fontFamily="Helvetica, Arial, sans-serif" fontSize="5" fill="#475569">University of Washington · GPA 3.8 · 2020</text>
        <text x="18" y="173" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.8" fontWeight="700" fill="#0f5561" letterSpacing="0.8">SKILLS</text>
        <text x="18" y="184" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.8" fill="#334155">Go · Rust · Python · Kubernetes · AWS · gRPC · Postgres</text>
        <text x="18" y="192" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.8" fill="#334155">React · TypeScript · Kafka · Terraform · CI/CD</text>
        <text x="18" y="206" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.8" fontWeight="700" fill="#0f5561" letterSpacing="0.8">PROJECTS</text>
        <text x="18" y="217" fontFamily="Helvetica, Arial, sans-serif" fontSize="5.3" fontWeight="700" fill="#0f172a">distcache — distributed KV store (4k★)</text>
        <text x="18" y="225" fontFamily="Helvetica, Arial, sans-serif" fontSize="4.8" fill="#334155">Raft consensus, &lt;1ms reads; 2k req/s per node in Go</text>
      </svg>
    ),
  },
  {
    name: "Classic", type: "Résumé", accent: "#b45309", darkAccent: "#fbbf24", href: "/template-builder/?preset=classic",
    thumb: (
      <svg viewBox="0 0 200 264" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
        <rect width="200" height="264" rx="6" fill="#ffffff" />
        <text x="100" y="28" textAnchor="middle" fontFamily="'Times New Roman', Georgia, serif" fontSize="13.5" fontWeight="700" fill="#1a1a1a">Eleanor R. Whitman</text>
        <text x="100" y="39" textAnchor="middle" fontFamily="'Times New Roman', Georgia, serif" fontSize="5" fill="#555555">Boston, MA · eleanor.whitman@email.com · (617) 555-0119</text>
        <line x1="20" y1="46" x2="180" y2="46" stroke="#1a1a1a" strokeWidth="0.7" />
        <text x="18" y="60" fontFamily="'Times New Roman', Georgia, serif" fontSize="7" fontWeight="700" fill="#1a1a1a" letterSpacing="1">EXPERIENCE</text>
        <text x="18" y="72" fontFamily="'Times New Roman', Georgia, serif" fontSize="6.4" fontWeight="700" fill="#1a1a1a">Associate Attorney</text>
        <text x="182" y="72" textAnchor="end" fontFamily="'Times New Roman', Georgia, serif" fontSize="5" fill="#555555">2019 – Present</text>
        <text x="18" y="80" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.3" fontStyle="italic" fill="#444444">Ropes &amp; Gray LLP — Boston, MA</text>
        <text x="22" y="89" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.1" fill="#333333">— Second-chaired three M&amp;A deals totaling $1.2B</text>
        <text x="22" y="97" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.1" fill="#333333">— Drafted and negotiated commercial agreements</text>
        <text x="18" y="110" fontFamily="'Times New Roman', Georgia, serif" fontSize="6.4" fontWeight="700" fill="#1a1a1a">Judicial Law Clerk</text>
        <text x="182" y="110" textAnchor="end" fontFamily="'Times New Roman', Georgia, serif" fontSize="5" fill="#555555">2018 – 2019</text>
        <text x="18" y="118" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.3" fontStyle="italic" fill="#444444">U.S. District Court, D. Mass.</text>
        <text x="22" y="127" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.1" fill="#333333">— Authored bench memoranda for federal civil matters</text>
        <text x="18" y="142" fontFamily="'Times New Roman', Georgia, serif" fontSize="7" fontWeight="700" fill="#1a1a1a" letterSpacing="1">EDUCATION</text>
        <text x="18" y="154" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.8" fontWeight="700" fill="#1a1a1a">J.D., Harvard Law School</text>
        <text x="182" y="154" textAnchor="end" fontFamily="'Times New Roman', Georgia, serif" fontSize="5" fill="#555555">2018</text>
        <text x="18" y="162" fontFamily="'Times New Roman', Georgia, serif" fontSize="5" fontStyle="italic" fill="#444444">cum laude · Harvard Law Review</text>
        <text x="18" y="173" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.8" fontWeight="700" fill="#1a1a1a">B.A., Yale University</text>
        <text x="182" y="173" textAnchor="end" fontFamily="'Times New Roman', Georgia, serif" fontSize="5" fill="#555555">2015</text>
        <text x="18" y="188" fontFamily="'Times New Roman', Georgia, serif" fontSize="7" fontWeight="700" fill="#1a1a1a" letterSpacing="1">BAR ADMISSIONS</text>
        <text x="18" y="200" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.1" fill="#333333">Massachusetts (2018) · New York (2019)</text>
        <text x="18" y="214" fontFamily="'Times New Roman', Georgia, serif" fontSize="7" fontWeight="700" fill="#1a1a1a" letterSpacing="1">HONORS</text>
        <text x="18" y="226" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.1" fill="#333333">Order of the Coif · Moot Court Champion</text>
      </svg>
    ),
  },
  {
    name: "Academic CV", type: "CV", accent: "#7c3aed", darkAccent: "#a78bfa", href: "/template-builder/?preset=classic",
    thumb: (
      <svg viewBox="0 0 200 264" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
        <rect width="200" height="264" rx="6" fill="#ffffff" />
        <text x="100" y="24" textAnchor="middle" fontFamily="'Times New Roman', Georgia, serif" fontSize="12.5" fontWeight="700" fill="#1a1a1a">Priya N. Raman, Ph.D.</text>
        <text x="100" y="34" textAnchor="middle" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.6" fill="#555555">Dept. of Computer Science · Stanford University · praman@stanford.edu</text>
        <line x1="20" y1="41" x2="180" y2="41" stroke="#1a1a1a" strokeWidth="0.6" />
        <text x="18" y="53" fontFamily="'Times New Roman', Georgia, serif" fontSize="6.6" fontWeight="700" fill="#1a1a1a" letterSpacing="0.6">EDUCATION</text>
        <text x="18" y="63" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.3" fill="#333333">Ph.D., Computer Science — MIT</text>
        <text x="182" y="63" textAnchor="end" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.7" fill="#555555">2020</text>
        <text x="18" y="71" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.3" fill="#333333">B.S., Computer Science — Caltech</text>
        <text x="182" y="71" textAnchor="end" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.7" fill="#555555">2015</text>
        <text x="18" y="84" fontFamily="'Times New Roman', Georgia, serif" fontSize="6.6" fontWeight="700" fill="#1a1a1a" letterSpacing="0.6">SELECTED PUBLICATIONS</text>
        <text x="18" y="94" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.6" fill="#333333">1. Raman P., Chen L. Sparse Attention at Scale. NeurIPS 2023.</text>
        <text x="18" y="101" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.6" fill="#333333">2. Raman P. et al. Efficient Transformers for Long Context. ICML 2023.</text>
        <text x="18" y="108" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.6" fill="#333333">3. Raman P., Gupta S. Retrieval-Augmented Pretraining. ACL 2022.</text>
        <text x="18" y="115" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.6" fill="#333333">4. Raman P. et al. Calibrated Uncertainty in LLMs. ICLR 2022.</text>
        <text x="18" y="122" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.6" fill="#333333">5. Raman P., Lee J. Robust Fine-Tuning of Encoders. EMNLP 2021.</text>
        <text x="18" y="129" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.6" fill="#333333">6. Raman P. Data-Efficient Representation Learning. NeurIPS 2020.</text>
        <text x="18" y="142" fontFamily="'Times New Roman', Georgia, serif" fontSize="6.6" fontWeight="700" fill="#1a1a1a" letterSpacing="0.6">APPOINTMENTS</text>
        <text x="18" y="152" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.3" fill="#333333">Assistant Professor — Stanford University</text>
        <text x="182" y="152" textAnchor="end" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.7" fill="#555555">2021–</text>
        <text x="18" y="160" fontFamily="'Times New Roman', Georgia, serif" fontSize="5.3" fill="#333333">Research Scientist — Google DeepMind</text>
        <text x="182" y="160" textAnchor="end" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.7" fill="#555555">2020–21</text>
        <text x="18" y="173" fontFamily="'Times New Roman', Georgia, serif" fontSize="6.6" fontWeight="700" fill="#1a1a1a" letterSpacing="0.6">GRANTS &amp; AWARDS</text>
        <text x="18" y="183" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.8" fill="#333333">NSF CAREER Award (2023) · Best Paper, NeurIPS 2023</text>
        <text x="18" y="191" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.8" fill="#333333">Google Research Scholar (2022) · MIT Presidential Fellow</text>
        <text x="18" y="204" fontFamily="'Times New Roman', Georgia, serif" fontSize="6.6" fontWeight="700" fill="#1a1a1a" letterSpacing="0.6">TEACHING</text>
        <text x="18" y="214" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.8" fill="#333333">CS224N: NLP with Deep Learning · CS161: Algorithms</text>
        <text x="18" y="222" fontFamily="'Times New Roman', Georgia, serif" fontSize="4.8" fill="#333333">Advising 5 Ph.D. students · 3 M.S. theses</text>
      </svg>
    ),
  },
];

function TemplateCard({ t, C, dark }: { t: TemplateDef; C: Record<string, string>; dark: boolean }) {
  // Card chrome (type badge, "Use this", hover ring) needs a theme-legible accent.
  // The print ink colors (navy / bronze) are too dark to read on the dark card surface.
  const a = dark ? t.darkAccent : t.accent;
  return (
    <Link
      href={t.href}
      prefetch={false}
      aria-label={`Build with the ${t.name} ${t.type} template`}
      style={{
        display: "block", textDecoration: "none",
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
        overflow: "hidden", transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = C.shadow; el.style.borderColor = `${a}66`; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "none"; el.style.borderColor = C.border; }}
    >
      <div style={{ position: "relative", padding: "20px 20px 0", background: dark ? "rgba(255,255,255,0.03)" : "#eef2f7" }}>
        {/* Solid backing — the badge can overlap dark thumb areas (Elise sidebar, Harper banner). */}
        <span style={{ position: "absolute", top: 14, right: 14, zIndex: 1, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: a, background: dark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)", border: `1px solid ${a}55`, padding: "3px 8px", borderRadius: 6 }}>{t.type}</span>
        <div style={{ filter: "drop-shadow(0 8px 18px rgba(15,23,42,0.16))" }}>
          {t.thumb}
        </div>
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: -0.2 }}>{t.name}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: a }}>Use this →</span>
      </div>
    </Link>
  );
}


// ── Root ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [theme, toggleTheme]  = useLandingTheme();
  const dark = theme === "dark";
  const [showBanner, setShowBanner] = useState(false);
  /** Mobile hamburger menu (≤768px). */
  const [menuOpen, setMenuOpen] = useState(false);
  /** Which mobile-menu accordion is open (Features / Resume / Cover Letter). */
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  useEffect(() => {
    const dismissed = localStorage.getItem("rn-banner-v2");
    if (!dismissed) setShowBanner(true);
  }, []);
  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("rn-banner-v2", "1");
  }, []);

  // Sticky mobile CTA: with the page many screens tall, the hero's primary
  // action disappears after screen one — surface it again once the user has
  // scrolled past the hero. Session-dismissible; ≤640px only (via CSS).
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
  const [stickyCtaDismissed, setStickyCtaDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return sessionStorage.getItem("rn-sticky-cta") === "1"; } catch { return false; }
  });
  useEffect(() => {
    const onScroll = () => setStickyCtaVisible(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const dismissStickyCta = useCallback(() => {
    setStickyCtaDismissed(true);
    try { sessionStorage.setItem("rn-sticky-cta", "1"); } catch { /* ignore */ }
  }, []);

  const C = {
    bg:      dark ? T.dBg      : T.bg,
    bg2:     dark ? T.dBg2     : T.bg2,
    ink:     dark ? T.dInk     : T.ink,
    muted:   dark ? T.dMuted   : T.muted,
    border:  dark ? T.dBorder  : T.border,
    surface: dark ? T.dSurface : T.surface,
    glow:    dark ? "rgba(37,99,235,0.10)" : T.blueGlow,
    shadow:  dark ? "0 28px 72px rgba(0,0,0,0.60)" : "0 28px 72px rgba(13,17,23,0.10)",
  };

  async function signIn() {
    setLoading(true); setError(null);
    const err = await signInWithGoogle();
    if (err) { setError(err); setLoading(false); }
  }

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const header = document.querySelector(".lp-header");
    const offset =
      header instanceof HTMLElement ? header.getBoundingClientRect().height + 10 : 72;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, []);

  const primaryBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 10,
    padding: "13px 26px",
    background: T.blue, color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: "var(--font-size-lg)", fontWeight: 600, letterSpacing: -0.2,
    cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
    transition: "background 0.15s, box-shadow 0.15s",
    opacity: loading ? 0.7 : 1,
    boxShadow: `0 4px 16px ${T.blueGlow}`,
    whiteSpace: "nowrap" as const,
  };

  const ghostBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 10,
    padding: "13px 22px",
    background: "transparent", color: C.muted,
    border: `1px solid ${C.border}`, borderRadius: 10,
    fontSize: "var(--font-size-lg)", fontWeight: 500, letterSpacing: -0.2,
    cursor: "pointer", fontFamily: "inherit",
    transition: "border-color 0.15s, color 0.15s",
    whiteSpace: "nowrap" as const,
  };

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: "'DM Sans', -apple-system, sans-serif", minHeight: "100vh" }}>

      {/* ───────────── Announcement banner ──────────────────── */}
      {showBanner && (
        <div style={{
          position: "relative", zIndex: 101,
          background: "linear-gradient(90deg, #1e40af 0%, #2563eb 50%, #0ea5e9 100%)",
          padding: "11px 48px 11px 20px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          textAlign: "center",
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#fff", lineHeight: 1.4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 8 }}><path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z" /></svg>
            <strong style={{ fontWeight: 700 }}>New:</strong>
            {" "}AI bullet rewrites + 8-dimension résumé scoring. No account, no paywall.
            {" "}
            <button
              onClick={() => { goToFreeScan(); }}
              style={{
                background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff", borderRadius: 6, padding: "2px 10px",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                marginLeft: 6, transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.28)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.18)"; }}
            >Try it free →</button>
          </span>
          <button
            onClick={dismissBanner}
            aria-label="Dismiss banner"
            style={{
              position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "rgba(255,255,255,0.6)",
              cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
          ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ display: "block" }}><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
      )}

      {/* ───────────── Header ───────────────────────────────── */}
      <header className="lp-header" style={{
        position: "sticky", top: 0, zIndex: 100, width: "100%",
        height: 76,
        background: dark ? "rgba(13,17,23,0.95)" : "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px) saturate(150%)",
        WebkitBackdropFilter: "blur(12px) saturate(150%)",
        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}>
        <div className="lp-header-inner" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 16px"
        }}>
          <style>{`
            @media (min-width: 768px) { .lp-header-inner { padding: 0 32px !important; } }
          `}</style>
          {/* Logo — shared SVG mark + wordmark */}
          <Link href="/" prefetch={false} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center" }} aria-label="Resunova home">
            <LogoFull markSize={32} textColor={dark ? "#ffffff" : "#0f172a"} />
          </Link>

          {/* Center Nav */}
          <nav className="lp-nav hidden md-flex" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 36, position: "absolute", left: 0, right: 0, height: "100%", pointerEvents: "none" }}>
            <style>{`
              @media (min-width: 768px) { .md-flex { display: flex !important; } }
              .mega-menu-dropdown {
                position: fixed;
                top: 76px;
                left: 0;
                width: 100vw;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-4px);
                transition: all 0.2s ease-out;
                z-index: 1000;
                pointer-events: none;
                display: flex;
                justify-content: center;
              }
              .mega-menu-trigger:hover .mega-menu-dropdown,
              .mega-menu-dropdown:hover {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
                pointer-events: auto;
              }
              .mega-menu-trigger:hover .mega-chevron {
                transform: rotate(180deg);
              }
              .mega-menu-trigger:hover .features-btn {
                color: #2563eb !important;
              }
            `}</style>
            
            {/* Resume Tools Dropdown */}
            <div className="mega-menu-trigger" style={{ height: "100%", display: "flex", alignItems: "center", position: "relative", cursor: "pointer", pointerEvents: "auto" }}>
              <button
                type="button"
                className="features-btn"
                style={{
                  background: "none", border: "none", color: dark ? "#ffffff" : "#1e293b", display: "flex", alignItems: "center", gap: 4,
                  fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 600, transition: "color 0.2s", padding: "8px 0"
                }}
              >
                Features
                <svg className="mega-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {/* Dropdown Container (Attached to navbar) */}
              <div className="mega-menu-dropdown">
                <div style={{
                  width: "100%",
                  background: dark ? "rgba(20,24,30,0.98)" : "#ffffff",
                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 24px 48px rgba(0,0,0,0.06)",
                  display: "flex",
                  justifyContent: "center",
                  padding: "48px 0"
                }}>
                  <div style={{
                    width: 1216,
                    maxWidth: "100%",
                    display: "grid",
                    gridTemplateColumns: "3fr 2fr 2fr",
                    gap: 64,
                    padding: "0 32px"
                  }}>
                    {/* Column 1: Tools */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {[
                      { title: "ATS Checker", desc: "Get instant feedback for your resume.", icon: <path d="M12 20v-6M6 20V10M18 20V4"/>, href: "/?view=analyze" },
                      { title: "Resume Builder", desc: "Create your best resume yet. Get hired.", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>, href: "/?view=builder" },
                      { title: "Cover Letter", desc: "Let AI write your cover letter.", icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>, href: "/?view=cover-letter" },
                      { title: "Resume Templates", desc: "Designed by typographers, approved by recruiters.", icon: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>, href: "/template-builder" }
                    ].map((item) => (
                      <a
                        key={item.title}
                        href={item.href}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 16,
                          background: "transparent", border: "none",
                          textAlign: "left", cursor: "pointer", transition: "opacity 0.2s",
                          textDecoration: "none"
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      >
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 32, height: 32, flexShrink: 0,
                          color: T.blue
                        }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            {item.icon}
                          </svg>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 600, color: dark ? "#ffffff" : "#0f172a", fontFamily: "inherit" }}>{item.title}</span>
                          <span style={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.6)" : "#64748b", lineHeight: 1.4 }}>{item.desc}</span>
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Column 2: Resume Examples */}
                  <div style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, paddingLeft: 40 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: dark ? "#ffffff" : "#0f172a", marginBottom: 20 }}>Resume Examples</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {[
                        { label: "Software Engineer", href: "/resume-examples/software-engineer" },
                        { label: "Data Analyst", href: "/resume-examples/data-analyst" },
                        { label: "Registered Nurse", href: "/resume-examples/registered-nurse" },
                        { label: "Sales Representative", href: "/resume-examples/sales-representative" }
                      ].map(item => (
                        <Link
                          key={item.label}
                          href={item.href}
                          style={{
                            background: "transparent", border: "none", textAlign: "left",
                            fontSize: 14, color: dark ? "rgba(255,255,255,0.7)" : "#475569", cursor: "pointer",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            fontWeight: 500, textDecoration: "none"
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = dark ? "#ffffff" : "#0f172a"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = dark ? "rgba(255,255,255,0.7)" : "#475569"; }}
                        >
                          {item.label}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </Link>
                      ))}
                      <Link
                        href="/resume-examples"
                        style={{
                          background: "transparent", border: "none", textAlign: "left",
                          fontSize: 14, color: T.blue, cursor: "pointer", marginTop: 8,
                          fontWeight: 600, textDecoration: "none"
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                      >
                        View all examples
                      </Link>
                    </div>
                  </div>

                  {/* Column 3: Guides */}
                  <div style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, paddingLeft: 40 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: dark ? "#ffffff" : "#0f172a", marginBottom: 20 }}>Guides</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {[
                        { title: "How to Tailor Your Resume to a Job Description", href: "/blog/tailor-resume-to-job-description" },
                        { title: "How ATS Really Works (And Why You're Invisible, Not Rejected)", href: "/blog/how-ats-really-works" },
                        { title: "Optimizing Résumés for Applicant Tracking Systems", href: "/blog/optimizing-resumes-for-ats" }
                      ].map(post => (
                        <Link
                          key={post.title}
                          href={post.href}
                          style={{
                            background: "transparent", border: "none", textAlign: "left",
                            fontSize: 14, color: dark ? "rgba(255,255,255,0.7)" : "#475569", cursor: "pointer",
                            lineHeight: 1.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                            fontWeight: 500, textDecoration: "none"
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = dark ? "#ffffff" : "#0f172a"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = dark ? "rgba(255,255,255,0.7)" : "#475569"; }}
                        >
                          {post.title}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0, marginTop: 4 }}>
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </Link>
                      ))}
                      <Link
                        href="/blog"
                        style={{
                          background: "transparent", border: "none", textAlign: "left",
                          fontSize: 14, color: T.blue, cursor: "pointer", marginTop: 8,
                          fontWeight: 600, textDecoration: "none"
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                      >
                        View all guides
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {[
              ["Resume", "templates", "/?view=builder"],
              ["Cover Letter", "cover-letter", "/?view=cover-letter"],
              ["ATS Checker", "analyze", "/?view=analyze"],
              ["Blog", "blog-nav", "/blog/"]
            ].map(([lbl, id, href]) => (
              <Link
                key={id}
                href={href}
                style={{
                  background: "none", border: "none", color: dark ? "#ffffff" : "#1e293b",
                  fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 600, transition: "color 0.2s", padding: "8px 0",
                  textDecoration: "none", pointerEvents: "auto"
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = T.blue; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = dark ? "#ffffff" : "#1e293b"; }}
              >{lbl}</Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Theme toggle — kept from the previous header (all breakpoints) */}
            <button onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"} style={{
              width: 34, height: 34, borderRadius: 8,
              background: "transparent",
              border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: C.muted, transition: "color 0.15s",
            }}>
              {dark
                ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 000 11 6 6 0 008-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              }
            </button>
            <div className="md-flex hidden" style={{ display: "none", alignItems: "center", gap: 16 }}>
            <button
              onClick={signIn}
              style={{
                background: "transparent",
                border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`,
                color: dark ? "#ffffff" : "#0f172a",
                fontSize: 15,
                fontWeight: 600,
                padding: "8px 20px",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "inherit"
              }}
              onMouseEnter={e => { 
                (e.currentTarget as HTMLElement).style.backgroundColor = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
              }}
              onMouseLeave={e => { 
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              Log In
            </button>

            <Button onClick={signIn} disabled={loading}
              aria-label="Create My Resume"
              title="Create My Resume"
              style={{
                background: T.hot,
                color: T.hotInk,
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                padding: "8px 24px",
                borderRadius: 999,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "inherit",
                boxShadow: "0 4px 14px rgba(212,119,47,0.35)"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLElement).style.background = T.hotHover;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "none";
                (e.currentTarget as HTMLElement).style.background = T.hot;
              }}
            >
              {loading ? "Loading…" : "Create My Resume"}
            </Button>
            </div>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            className="lp-nav-burger md-hide"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: "transparent",
              border: `1px solid transparent`,
              cursor: "pointer", alignItems: "center", justifyContent: "center", display: "flex",
              color: C.ink, transition: "all 0.15s",
            }}
            onMouseEnter={e => { 
              (e.currentTarget as HTMLElement).style.backgroundColor = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; 
            }}
            onMouseLeave={e => { 
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <style>{`
              @media (min-width: 768px) { .md-hide { display: none !important; } }
            `}</style>
            {menuOpen
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            }
          </button>
          </div>
        </div>

        {/* Mobile dropdown menu (hamburger target) */}
        {menuOpen && (
          <div
            className="lp-nav-menu"
            style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 99,
              background: dark ? "rgba(13,17,23,0.98)" : "rgba(255,255,255,0.98)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              borderBottom: `1px solid ${C.border}`,
              boxShadow: dark ? "0 16px 32px rgba(0,0,0,0.5)" : "0 16px 32px rgba(13,17,23,0.12)",
              display: "flex", flexDirection: "column",
              height: "calc(100vh - 76px)", overflowY: "auto",
              padding: "16px 20px 32px",
              animation: "lpMenuIn 0.22s cubic-bezier(0.22,1,0.36,1) both",
              transformOrigin: "top",
            }}
          >
            {/* Features Accordion */}
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setMobileExpanded(o => o === "Features" ? null : "Features")}
                style={{
                  width: "100%", background: "none", border: "none", textAlign: "left",
                  padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink,
                  fontFamily: "inherit", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                Features
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: mobileExpanded === "Features" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {mobileExpanded === "Features" && (
                <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { title: "ATS Checker", desc: "Get instant feedback for your resume.", href: "/?view=analyze" },
                    { title: "Resume Builder", desc: "Create your best resume yet. Get hired.", href: "/?view=builder" },
                    { title: "Cover Letter", desc: "Let AI write your cover letter.", href: "/?view=cover-letter" },
                    { title: "Resume Templates", desc: "Designed by typographers, approved by recruiters.", href: "/template-builder" }
                  ].map(item => (
                    <a key={item.title} href={item.href} onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.location.assign(item.href); }} style={{ display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 500, color: C.ink }}>{item.title}</span>
                        <span style={{ fontSize: 13, color: C.muted }}>{item.desc}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Resume Accordion */}
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setMobileExpanded(o => o === "Resume" ? null : "Resume")}
                style={{
                  width: "100%", background: "none", border: "none", textAlign: "left",
                  padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink,
                  fontFamily: "inherit", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                Resume
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: mobileExpanded === "Resume" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {mobileExpanded === "Resume" && (
                <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { title: "Software Engineering", desc: "Modern technical resume example.", href: "/template-builder/?preset=modern" },
                    { title: "Business & Strategy", desc: "Executive layout with strong hierarchy.", href: "/template-builder/?preset=executive" },
                    { title: "Academic CV", desc: "Classic styling for formal applications.", href: "/template-builder/?preset=classic" },
                  ].map(item => (
                    <a key={item.title} href={item.href} onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.location.assign(item.href); }} style={{ display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 500, color: C.ink }}>{item.title}</span>
                        <span style={{ fontSize: 13, color: C.muted }}>{item.desc}</span>
                      </div>
                    </a>
                  ))}
                  <a href="/template-builder" onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.location.assign("/template-builder"); }} style={{ fontSize: 14, color: T.blue, textDecoration: "none", fontWeight: 600, marginTop: 4 }}>
                    View all templates →
                  </a>
                </div>
              )}
            </div>

            {/* Cover Letter Accordion */}
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setMobileExpanded(o => o === "Cover Letter" ? null : "Cover Letter")}
                style={{
                  width: "100%", background: "none", border: "none", textAlign: "left",
                  padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink,
                  fontFamily: "inherit", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                Cover Letter
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: mobileExpanded === "Cover Letter" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {mobileExpanded === "Cover Letter" && (
                <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  <a href="/?view=cover-letter" onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.location.assign("/?view=cover-letter"); }} style={{ display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 500, color: C.ink }}>AI Cover Letter Writer</span>
                      <span style={{ fontSize: 13, color: C.muted }}>Generate a tailored cover letter in seconds.</span>
                    </div>
                  </a>
                </div>
              )}
            </div>

            <a href="/?view=analyze" onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.location.assign("/?view=analyze"); }} style={{ padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.border}` }}>
              ATS Checker
            </a>
            
            <a href="/blog/" onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.location.assign("/blog/"); }} style={{ padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.border}` }}>
              Blog
            </a>

            {/* Bottom Actions */}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12, paddingTop: 32 }}>
              <button
                onClick={() => { setMenuOpen(false); signIn(); }}
                style={{
                  width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: C.ink,
                  padding: "12px", fontSize: 16, fontWeight: 600, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  transition: "background 0.2s"
                }}
              >
                Log In
              </button>
              <button
                onClick={() => { setMenuOpen(false); signIn(); }}
                style={{
                  width: "100%", background: T.hot, border: "none", color: T.hotInk,
                  padding: "12px", fontSize: 16, fontWeight: 700, borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                  transition: "opacity 0.2s"
                }}
              >
                Create My Resume
              </button>
            </div>
          </div>
        )}
      </header>

      {/* overflow-x only below header — overflow on a sticky ancestor breaks position:sticky */}
      <div className="lp-main" style={{ overflowX: "hidden", minWidth: 0 }}>
      {/* ───────────── Hero ─────────────────────────────────── */}
      <section className="lp-hero-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px 80px", display: "grid", gridTemplateColumns: "1fr 460px", gap: 56, alignItems: "center", minHeight: "88vh" }}>

        {/* Left */}
        <div className="lp-hero-left" style={{ animation: "lpFadeUp 0.7s ease both" }}>
          {/* Pill badge */}
          <div className="lp-hero-badge" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px", marginBottom: 36,
            background: C.glow, border: `1px solid ${T.blue}28`,
            borderRadius: 100, fontSize: "var(--font-size-sm)", color: T.blue,
            fontWeight: 600, letterSpacing: 0.2, maxWidth: "100%",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue, display: "inline-block", flexShrink: 0 }} />
            <span className="lp-hero-sub-full">Completely free · No account to scan · Built for students &amp; career switchers · ATS-safe</span>
            <span className="lp-hero-sub-short">Completely free · No account · ATS-safe</span>
          </div>

          {/* Headline — DM Sans 800. Full on desktop; punchy 2-liner on phones. */}
          <h1 className="lp-hero-h1" style={{
            fontSize: "clamp(48px, 5.5vw, 72px)",
            fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em",
            color: C.ink, margin: "0 0 28px",
          }}>
            <span className="lp-hero-sub-full">
              Score your résumé.<br />
              Fix the weak bullets.<br />
              Tailor it to any job.<br />
              <span style={{ color: T.blue }}>Free. Actually free.</span>
            </span>
            <span className="lp-hero-sub-short">
              Score, fix, and tailor<br />your résumé.{" "}
              <span style={{ color: T.blue }}>Actually free.</span>
            </span>
          </h1>

          <p style={{ fontSize: "var(--font-size-xl)", color: C.muted, lineHeight: 1.72, maxWidth: 480, margin: "0 0 44px", letterSpacing: -0.15 }}>
            {/* Full copy on desktop; trimmed on phones. Key phrases highlighted. */}
            <span className="lp-hero-sub-full">
              Upload your résumé, get an <b style={{ color: T.blue, fontWeight: 700 }}>8-dimension score</b>, <b style={{ color: T.blue, fontWeight: 700 }}>honest bullet-by-bullet rewrites</b>, and a <b style={{ color: T.blue, fontWeight: 700 }}>tailored PDF</b> in about <b style={{ color: C.ink, fontWeight: 700 }}>60 seconds</b>.{" "}
            </span>
            <span className="lp-hero-sub-short">
              An <b style={{ color: T.blue, fontWeight: 700 }}>8-dimension score</b>, <b style={{ color: T.blue, fontWeight: 700 }}>honest rewrites</b>, and a <b style={{ color: T.blue, fontWeight: 700 }}>tailored PDF</b> in about <b style={{ color: C.ink, fontWeight: 700 }}>60 seconds</b>.{" "}
            </span>
            <strong style={{ color: C.ink, fontWeight: 700 }}>No account.</strong>{" "}
            <strong style={{ color: "#16a34a", fontWeight: 700 }}>No paywall.</strong>
          </p>

          {/* CTA row */}
          <div className="lp-hero-actions" style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40, alignItems: "flex-start" }}>
            <div className="lp-hero-cta-row" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {/* Primary — frictionless scan, no OAuth required */}
              <button
                className="lp-hero-cta-btn"
                onClick={() => { goToFreeScan(); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "18px 38px",
                  background: T.hot,
                  color: T.hotInk, border: "none", borderRadius: 999,
                  fontSize: 18, fontWeight: 800, letterSpacing: -0.3,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 10px 32px rgba(212,119,47,0.45)",
                  transition: "transform 0.15s, box-shadow 0.15s, background 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = "translateY(-2px)";
                  el.style.background = T.hotHover;
                  el.style.boxShadow = "0 14px 40px rgba(212,119,47,0.55)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = "";
                  el.style.background = T.hot;
                  el.style.boxShadow = "0 10px 32px rgba(212,119,47,0.45)";
                }}
              >
                Score my résumé free
                <span style={{ fontSize: 20, lineHeight: 1 }}>→</span>
              </button>
            </div>

            {/* Trust micro-copy */}
            <p style={{ fontSize: 13, color: C.muted, margin: 0, letterSpacing: -0.1 }}>
              No account needed to scan &nbsp;·&nbsp; Sign in only to save your analysis &nbsp;·&nbsp; Completely free
            </p>
          </div>

          {error && <p style={{ fontSize: "var(--font-size-base)", color: "#f85149", marginBottom: 16 }}>{error}</p>}

          {/* Social proof */}
          <div className="lp-hero-social" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex" }}>
              {[["P","#4285f4"],["R","#ff9900"],["V","#276ef1"],["A","#7c3aed"],["M","#0d9488"],["N","#2563eb"]].map(([l,bg], i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: bg, border: `2px solid ${C.bg}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: "var(--font-size-sm)",
                  marginLeft: i > 0 ? -9 : 0, zIndex: 5 - i, position: "relative",
                }}>{l}</div>
              ))}
            </div>
            <span style={{ fontSize: "var(--font-size-base)", color: C.muted }}>
              <b style={{ color: C.ink, fontWeight: 600 }}>400+</b> early users · more interview callbacks reported
            </span>
          </div>
        </div>

        {/* Right: animated score preview */}
        <div
          className="lp-hero-preview"
          style={{
            transform: "rotate(1.5deg)",
            animation: "cardSlide 0.8s cubic-bezier(0.34,1.36,0.64,1) 0.3s both, heroFloat 6s ease-in-out 1.1s infinite",
            transformOrigin: "center top",
            position: "relative",
          }}
        >
          <div style={{
            position: "absolute", top: -14, right: 18, zIndex: 2,
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#fff",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            padding: "5px 12px", borderRadius: 20, textTransform: "uppercase",
            boxShadow: "0 4px 16px rgba(37,99,235,0.35), 0 0 0 1px rgba(255,255,255,0.15) inset",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#4ade80", boxShadow: "0 0 8px #4ade80",
              animation: "pulse 2s infinite",
            }} />
            Live analysis
          </div>
          <VariantA embedded />
        </div>
      </section>

      <LandingPreviewStyles />
      <TealScrollStyles />

      {/* ───────────── Floating feature nav (tracks the product sections) ── */}
      <FloatingFeatureNav
        C={C}
        dark={dark}
        accent={T.hotHover}
        items={[
          { id: "jobs", label: "Jobs", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/></svg> },
          { id: "product-rewrite", label: "AI Rewrites", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> },
          { id: "product-tour", label: "Tailor", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg> },
          { id: "templates", label: "Templates", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h4"/></svg> },
          { id: "interview", label: "Interview", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v10H9l-4 4z"/><path d="M8 9h8M8 12h5"/></svg> },
        ]}
      />

      {/* ───────────── Jobs — promoted to first band after the hero ─────── */}
      <JobsBand C={C} dark={dark} />

      {/* ───────────── Stats ticker ─────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.bg2, overflow: "hidden", padding: "18px 0" }}>
        <div style={{ display: "flex", gap: 0, width: "max-content", animation: "ticker 36s linear infinite" }}>
          {[...Array(4)].flatMap(() => [
            ["$0",      "Completely free — always"],
            ["250k+",   "Jobs on the board"],
            ["400+",    "Job seekers so far"],
            ["60s",     "Typical tailoring time"],
            ["4.7 ★",   "Early user rating"],
            ["ATS",     "Best-practices checklist"],
            ["Callbacks", "Recruiter & phone screens"],
            ["FERPA",   "FERPA-informed student privacy"],
          ]).map(([stat, lbl], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 40px", flexShrink: 0 }}>
              <span style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: T.blue, letterSpacing: -0.5 }}>{stat}</span>
              <span style={{ fontSize: "var(--font-size-base)", color: C.muted, whiteSpace: "nowrap" }}>{lbl}</span>
              <span style={{ color: C.border, marginLeft: 12, fontSize: "var(--font-size-xl)" }}>·</span>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────── AI rewrite preview (B) ─────────────── */}
      <LandingPreviewSection
        id="product-rewrite"
        eyebrow="Bullet rewrites"
        title="&quot;Responsible for&quot; never got anyone hired."
        desc="Resunova flags weak duty-list bullets and rewrites them with stronger verbs and real numbers, using only facts already on your résumé. No inventing. No keyword stuffing."
        dark
        curve="right"
        C={C}
        wide
        animationOnly={!SHOW_LANDING_CARDS}
        ctaLabel="Fix my bullets free"
        ctaHref="/?view=analyze"
      >
        <VariantB embedded />
      </LandingPreviewSection>

      {SHOW_LANDING_CARDS && (
      <section id="features" className="lp-sec" style={{ padding: "120px 40px", maxWidth: 1200, margin: "0 auto", scrollMarginTop: 76 }}>
        <div style={{ marginBottom: 64 }}>
          <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, letterSpacing: "0.15em", color: T.blue, textTransform: "uppercase", margin: "0 0 16px" }}>
            What we analyze
          </p>
          <h2 className="lp-h2" style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: C.ink, margin: 0, maxWidth: 540 }}>
            Every dimension of<br />a recruiter&apos;s decision.
          </h2>
          <p style={{ fontSize: "var(--font-size-lg)", color: C.muted, lineHeight: 1.65, maxWidth: 520, margin: "16px 0 0" }}>
            Six scores from the Analyze flow — the ones that matter most in a first-pass screen.
          </p>
        </div>

        {/* Grid */}
        <div className="lp-feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
          {FEATURES.map((f, i) => <FeatureCell key={i} f={f} dark={dark} C={C} />)}
        </div>
      </section>
      )}

      {SHOW_SCAN_PREVIEW && (
      <LandingPreviewSection
        id="product-scan"
        eyebrow="Line-by-line analysis"
        title="See what a recruiter would flag — before you apply."
        desc="Upload a PDF and get flagged weaknesses, strong bullets, and a first fix you can accept in one click."
        C={C}
        wide
        animationOnly={!SHOW_LANDING_CARDS}
        ctaLabel="Scan my résumé free"
        ctaHref="/?view=analyze"
      >
        <VariantE embedded />
      </LandingPreviewSection>
      )}

      {SHOW_LANDING_CARDS && (
      <section id="platform" style={{ background: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, scrollMarginTop: 76 }}>
        <div className="lp-sec" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, letterSpacing: "0.15em", color: T.blue, textTransform: "uppercase", margin: "0 0 16px" }}>
              Built into Resunova
            </p>
            <h2 className="lp-h2" style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: C.ink, margin: 0 }}>
              Templating, sharing &amp; ATS scoring.
            </h2>
            <p style={{ fontSize: "var(--font-size-lg)", color: C.muted, lineHeight: 1.65, maxWidth: 560, margin: "18px auto 0" }}>
              Beyond JD tailoring — publish, score, and format your résumé in one place.
            </p>
          </div>
          <div className="lp-platform-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {PLATFORM_HIGHLIGHTS.map((h, i) => (
              <PlatformHighlightCard key={i} h={h} dark={dark} C={C} />
            ))}
          </div>
        </div>
      </section>
      )}

      <LandingPreviewSection
        id="product-tour"
        eyebrow="Tailor to the role"
        title="Paste the job description. Close every gap. Export."
        desc="Score your fit against the posting, fix missing keywords across your bullets, then export an ATS-safe PDF that matches the preview exactly."
        C={C}
        bg={C.surface}
        curve="left"
        wide
        animationOnly={!SHOW_LANDING_CARDS}
        ctaLabel="Tailor my résumé now"
        ctaHref="/?view=builder&flow=tailor"
      >
        <VariantD embedded />
      </LandingPreviewSection>

      {/* ───────────── Templates showcase — gold block ───────── */}
      <section id="templates" className="lp-sec" style={{ background: T.blockGold, borderRadius: "0 clamp(36px, 8vw, 110px) 0 0", padding: "108px 40px 100px", scrollMarginTop: 120 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, letterSpacing: "0.15em", color: "#7a5416", textTransform: "uppercase", margin: "0 0 14px" }}>Templates</p>
            <h2 className="lp-h2" style={{ fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.03em", color: T.blockGoldInk, margin: "0 0 14px" }}>
              Clean enough for recruiters. Plain enough for the ATS.
            </h2>
            <p style={{ fontSize: "var(--font-size-lg)", color: "#6b4e1c", lineHeight: 1.65, maxWidth: 560, margin: "0 auto" }}>
              Pick a technical, creative, or CV layout, tailor it to the job description, and export an ATS-safe PDF. No design skills required.
            </p>
          </div>
          <Reveal>
            <div className="lp-templates-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 22 }}>
              {RESUME_TEMPLATES.map((t) => (
                <TemplateCard key={t.name} t={t} C={C} dark={dark} />
              ))}
            </div>
          </Reveal>
          <div style={{ textAlign: "center", marginTop: 42 }}>
            <button
              onClick={() => { window.location.href = "/template-builder"; }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 30px",
                background: T.blockGoldInk, color: T.blockGold,
                border: "none", borderRadius: 999,
                fontSize: 15, fontWeight: 800, letterSpacing: -0.2,
                cursor: "pointer", fontFamily: "inherit",
                transition: "transform 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              Start from a free template <span style={{ fontSize: 17 }}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Jobs section moved up — now rendered as <JobsBand /> directly after the hero. */}

      {/* ───────────── Research & data approach ─────────────── */}
      <section id="approach" className="lp-sec" style={{ padding: "100px 40px", maxWidth: 1200, margin: "0 auto", scrollMarginTop: 76 }}>
        <div style={{ display: "grid", gridTemplateColumns: SHOW_LANDING_CARDS ? "1fr 1fr" : "1fr", gap: 56, alignItems: "start", maxWidth: SHOW_LANDING_CARDS ? undefined : 640 }} className="lp-approach-grid">
          <div>
            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, letterSpacing: "0.15em", color: T.blue, textTransform: "uppercase", margin: "0 0 16px" }}>
              How we build
            </p>
            <h2 className="lp-h2" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.03em", color: C.ink, margin: "0 0 20px" }}>
              MIT &amp; Harvard guidance. Top-company training.
            </h2>
            <p style={{ fontSize: "var(--font-size-lg)", color: C.muted, lineHeight: 1.72, margin: "0 0 16px" }}>
              Our scoring mechanism blends campus career-center playbooks (MIT- and Harvard-style structure) with recruiter-informed match dimensions. Models and checklists are trained and calibrated on résumés and job descriptions from Google, Figma, Meta, Amazon, Adobe, and other top tech roles in our library — then improved responsibly with product data.
            </p>
            <p style={{ fontSize: "var(--font-size-lg)", color: C.muted, lineHeight: 1.68, margin: 0 }}>
              Student data is handled with <strong style={{ color: C.ink, fontWeight: 600 }}>FERPA-informed privacy</strong>
              {" "}— we do not sell personal data. Training and quality work use only what our{" "}
              <Link href="/privacy" prefetch={false} style={{ color: T.blue, textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>
              {" "}allows: operating the service, analytics, and internal model improvement for the community.
            </p>
          </div>
          {SHOW_LANDING_CARDS && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {RESEARCH_PILLARS.map((p, i) => (
              <PlatformHighlightCard key={i} h={p} dark={dark} C={C} compact />
            ))}
          </div>
          )}
        </div>
      </section>

      {/* How it works — hidden via SHOW_HOW_SECTION */}
      {SHOW_HOW_SECTION && (
      <section id="how" style={{ borderBottom: `1px solid ${C.border}`, scrollMarginTop: 76 }}>
        <div className="lp-sec" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, letterSpacing: "0.15em", color: T.blue, textTransform: "uppercase", margin: "0 0 16px" }}>The process</p>
            <h2 className="lp-h2" style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: C.ink, margin: 0 }}>
              Three steps to your next interview callback.
            </h2>
          </div>
          <div className="lp-step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48 }}>
            {STEPS.map((s, i) => (
              <div key={i}>
                {/* Step number — large bold DM Sans, blue */}
                <div style={{ fontSize: "var(--font-size-4xl)", fontWeight: 800, color: T.blue, opacity: 0.18, lineHeight: 1, marginBottom: 20, letterSpacing: -3 }}>
                  0{i + 1}
                </div>
                <h3 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: C.ink, margin: "0 0 12px", letterSpacing: -0.4 }}>{s.title}</h3>
                <p style={{ fontSize: "var(--font-size-lg)", color: C.muted, lineHeight: 1.72, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ───────────── Company logos ────────────────────────── */}
      <section id="reviews" className="lp-sec" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.bg2, padding: "72px 40px", scrollMarginTop: 76 }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: "var(--font-size-sm)", fontWeight: 600, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 48px" }}>
            Where our users are interviewing
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 56, flexWrap: "wrap" }}>
            {/* Google */}
            <svg height="24" viewBox="0 0 74 24" fill="none" aria-label="Google" style={{ opacity: dark ? 0.55 : 0.5 }}>
              <path d="M9.24 8.19v2.46h5.88c-.26 1.57-1.67 4.22-5.88 4.22-3.54 0-6.43-2.93-6.43-6.54S5.7 1.79 9.24 1.79c2.03 0 3.39.86 4.16 1.61l2.84-2.73C14.45.5 12.03-.5 9.24-.5 4.13-.5.01 3.63.01 8.73s4.12 9.23 9.23 9.23c5.33 0 8.86-3.75 8.86-9.03 0-.6-.07-1.07-.16-1.53L9.24 8.19z" fill="currentColor" transform="translate(0,6)" style={{ color: dark ? "#e6edf3" : "#57606a" }} />
              <text x="22" y="19" fontFamily="-apple-system,sans-serif" fontSize="18" fontWeight="500" fill={dark ? "#8b949e" : "#57606a"}>Google</text>
            </svg>
            {/* Meta */}
            <svg height="22" viewBox="0 0 80 22" aria-label="Meta" style={{ opacity: dark ? 0.55 : 0.5 }}>
              <text x="0" y="17" fontFamily="-apple-system,sans-serif" fontSize="20" fontWeight="700" letterSpacing="-0.5" fill={dark ? "#8b949e" : "#57606a"}>Meta</text>
            </svg>
            {/* Amazon */}
            <svg height="26" viewBox="0 0 90 26" aria-label="Amazon" style={{ opacity: dark ? 0.55 : 0.5 }}>
              <text x="0" y="18" fontFamily="-apple-system,sans-serif" fontSize="18" fontWeight="500" fill={dark ? "#8b949e" : "#57606a"}>amazon</text>
              <path d="M2 23 Q22 29 46 23" stroke={dark ? "#8b949e" : "#57606a"} strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
            {/* Microsoft */}
            <svg height="22" viewBox="0 0 110 22" aria-label="Microsoft" style={{ opacity: dark ? 0.55 : 0.5 }}>
              <rect x="0" y="1" width="9" height="9" fill={dark ? "#8b949e" : "#57606a"} />
              <rect x="10" y="1" width="9" height="9" fill={dark ? "#8b949e" : "#57606a"} />
              <rect x="0" y="11" width="9" height="9" fill={dark ? "#8b949e" : "#57606a"} />
              <rect x="10" y="11" width="9" height="9" fill={dark ? "#8b949e" : "#57606a"} />
              <text x="24" y="16" fontFamily="-apple-system,sans-serif" fontSize="15" fontWeight="400" fill={dark ? "#8b949e" : "#57606a"}>Microsoft</text>
            </svg>
            {/* Apple */}
            <svg height="24" viewBox="0 0 60 24" aria-label="Apple" style={{ opacity: dark ? 0.55 : 0.5 }}>
              <path d="M11.5 0C10.2 0 8.7.8 7.9 1.9 7.2 2.9 6.6 4.4 6.8 5.9c1.4.1 2.9-.7 3.7-1.8C11.3 3 11.9 1.5 11.5 0zm3.4 6c-1.9 0-3.5 1.1-4.4 1.1-.9 0-2.4-1-4-1-2 0-4 1.2-5 3-2.2 3.8-.6 9.4 1.6 12.5 1 1.5 2.3 3.1 3.9 3.1 1.6 0 2.2-1 4.1-1 1.9 0 2.4 1 4.1 1 1.7 0 2.8-1.5 3.9-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.2-1.2-3.2-4.7 0-3 2.4-4.4 2.5-4.5C18.7 6.5 16.6 6 14.9 6z" fill={dark ? "#8b949e" : "#57606a"} />
            </svg>
            {/* Stripe */}
            <svg height="22" viewBox="0 0 52 22" aria-label="Stripe" style={{ opacity: dark ? 0.55 : 0.5 }}>
              <text x="0" y="17" fontFamily="-apple-system,sans-serif" fontSize="20" fontWeight="600" fill={dark ? "#8b949e" : "#57606a"}>Stripe</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ───────────── Post-logos CTA nudge ─────────────────── */}
      {/* Sits on the page ground (C.bg, no hairline) so the interview block's
          curved corner directly below carves out of clean matching whitespace. */}
      <div style={{ background: C.bg, padding: "36px 40px 76px", textAlign: "center" }}>
        <p style={{ fontSize: "var(--font-size-lg)", color: C.muted, margin: "0 0 18px", fontWeight: 500 }}>
          Is your résumé ready for these companies?
        </p>
        <button
          onClick={() => { goToFreeScan(); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 32px",
            background: T.hot, color: T.hotInk,
            border: "none", borderRadius: 999,
            fontSize: 16, fontWeight: 800, letterSpacing: -0.2,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 10px 26px -8px rgba(212,119,47,0.6)",
            transition: "transform 0.15s, background 0.15s",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translateY(-2px)";
            el.style.background = T.hotHover;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "";
            el.style.background = T.hot;
          }}
        >
          Check my résumé score — it&apos;s free <span style={{ fontSize: 18 }}>→</span>
        </button>
      </div>

      {/* ───────────── Interview coaching announcement strip ──
          Parked for now (stacked bands cluttered the reviews→interview seam,
          and the interview block below announces the feature itself).
          Re-enable by removing `false &&`. */}
      {false && (
      <div role="region" aria-label="Interview coaching — now live" style={{
        background: "linear-gradient(90deg, #1e40af 0%, #2563eb 50%, #0ea5e9 100%)",
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 11, flexWrap: "wrap", textAlign: "center",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
          <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="8.5" y1="22" x2="15.5" y2="22" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#fff", lineHeight: 1.45 }}>
          <strong style={{ fontWeight: 700 }}>Now live:</strong> AI mock interviews tailored to the exact role — part of our growing university partnerships, including <strong style={{ fontWeight: 700 }}>UMBC</strong>.
        </span>
      </div>
      )}

      {/* ───────────── Interview coaching ───────────────────── */}
      <section id="interview" className="lp-interview-sec" style={{ background: T.blockGreen, borderRadius: "clamp(36px, 8vw, 110px) 0 0 0", padding: "108px 40px 100px", scrollMarginTop: 120 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 13px", marginBottom: 16,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.24)",
              borderRadius: 100, fontSize: 12, fontWeight: 600, color: "#dff1ea", letterSpacing: 0.2,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", display: "inline-block" }} />
              Interview coaching · Now live
            </div>
            <h2 className="lp-h2" style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#ffffff", margin: "0 0 16px" }}>
              Practice the questions this job will actually ask.
            </h2>
            <p style={{ fontSize: "var(--font-size-lg)", color: "#bfe0d6", lineHeight: 1.65, maxWidth: 580, margin: "0 auto" }}>
              Resunova generates questions from the actual job posting, not a generic question bank, and gives instant, specific feedback on your answers. Walk in prepared, not winging it.
            </p>
          </div>

          <Reveal>
          <div className="lp-interview-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {([
              { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="8.5" y1="22" x2="15.5" y2="22" /></svg>), accent: T.blue, title: "AI mock interviews", desc: "Role-specific questions pulled from the exact job description you’re targeting." },
              { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.52l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96z" /></svg>), accent: "#16a34a", title: "Instant STAR feedback", desc: "Each answer scored on structure, specifics, and impact — so every story lands." },
              { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></svg>), accent: T.teal, title: "Reusable answer bank", desc: "Save your best stories once, then tailor them per company in a click." },
            ]).map(({ icon, accent, title, desc }) => (
              <div key={title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "26px 24px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", color: accent, marginBottom: 16 }}>
                  {icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: "0 0 8px", letterSpacing: -0.3 }}>{title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
          </Reveal>

          {/* Interview prep finally gets a real CTA */}
          <div style={{ textAlign: "center", marginTop: 44 }}>
            <button
              onClick={() => { window.location.href = "/interview-prep"; }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "15px 32px",
                background: T.hot, color: T.hotInk,
                border: "none", borderRadius: 999,
                fontSize: 16, fontWeight: 800, letterSpacing: -0.2,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 12px 30px -10px rgba(0,0,0,0.55)",
                transition: "transform 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.background = T.hotHover; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.background = T.hot; }}
            >
              Practice my interview free <span style={{ fontSize: 18 }}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ───────────── University partnerships banner (image) ── */}
      <section aria-label="University partnerships" className="lp-sec" style={{ background: C.bg, padding: "76px 40px", borderTop: `1px solid ${C.border}` }}>
        {/* Desktop: static SVG banner. Its text is unreadable when the image
            scales below ~640px, so mobile swaps in a real-HTML card instead. */}
        <Link href="/contact" prefetch={false} aria-label="Partner with Resunova — university career centers" className="lp-uni-desktop" style={{ display: "block", maxWidth: 1040, margin: "0 auto", borderRadius: 24, overflow: "hidden", boxShadow: C.shadow }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG banner; next/image can't optimize SVG and breaks `output: export` */}
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/university-partners-banner.svg`}
            alt="Resunova partners with university career centers, including UMBC (University of Maryland, Baltimore County) — unlimited scans and Career Center-aligned feedback for students, with more campuses joining."
            width={1200}
            height={360}
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </Link>
        <Link href="/contact" prefetch={false} aria-label="Partner with Resunova — university career centers" className="lp-uni-mobile" style={{ display: "none", textDecoration: "none", borderRadius: 20, overflow: "hidden", boxShadow: C.shadow, background: "linear-gradient(135deg, #14284d 0%, #1e3a8a 55%, #2563eb 100%)", padding: "26px 22px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#93c5fd", textTransform: "uppercase", margin: "0 0 10px" }}>University partnerships</p>
          <h3 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#ffffff", margin: "0 0 10px" }}>
            Built with university career centers
          </h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: "0 0 18px" }}>
            Unlimited scans and Career Center–aligned feedback for students — with more campuses joining.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "#fde68a" }}>
              🎓 UMBC
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f59e0b", color: "#1e293b", borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 800 }}>
              Partner with us →
            </span>
          </div>
        </Link>
      </section>

      {/* ───────────── FAQ (visible + JSON-LD for the crawlable homepage) ── */}
      <LandingFAQ C={C} accent={T.blue} />

      {/* ───────────── Final CTA ────────────────────────────── */}
      <section className="lp-sec" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #0ea5e9 100%)", padding: "100px 40px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(40px, 5.5vw, 68px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.04em", color: "#fff", margin: "0 0 20px" }}>
          In about sixty seconds,<br />you&apos;ll know exactly what to fix.
        </h2>
        <p style={{ fontSize: "var(--font-size-xl)", color: "rgba(255,255,255,0.82)", margin: "0 0 44px", lineHeight: 1.65, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          <strong style={{ color: "#fff", fontWeight: 700 }}>Completely free</strong>
          {" "}for students, lifelong learners, and anyone in the job-seeking community. No credit card, no hidden tiers. Upload your résumé and apply with one built to earn callbacks.
        </p>

        {/* Dual CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            onClick={() => { goToFreeScan(); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "18px 40px",
              background: T.hot, color: T.hotInk,
              border: "none", borderRadius: 999,
              fontSize: 18, fontWeight: 800, letterSpacing: -0.3,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              transition: "transform 0.15s, background 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-2px)";
              el.style.background = T.hotHover;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "";
              el.style.background = T.hot;
            }}
          >
            Score my résumé free <span style={{ fontSize: 20 }}>→</span>
          </button>

          <button
            onClick={signIn}
            disabled={loading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              padding: "17px 30px",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1.5px solid rgba(255,255,255,0.30)",
              borderRadius: 14,
              fontSize: 16, fontWeight: 600, letterSpacing: -0.2,
              cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
              whiteSpace: "nowrap",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.22)";
              el.style.borderColor = "rgba(255,255,255,0.50)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.12)";
              el.style.borderColor = "rgba(255,255,255,0.30)";
            }}
          >
            <GoogleG /> {loading ? "Loading…" : "Sign in with Google"}
          </button>
        </div>

        {/* Micro-copy */}
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", margin: 0 }}>
          No credit card &nbsp;·&nbsp; No paywall &nbsp;·&nbsp; Nothing to cancel
        </p>
      </section>

      {/* ───────────── Footer ───────────────────────────────── */}
      <footer className="lp-footer" style={{
        borderTop: `1px solid ${C.border}`,
        background: C.bg2,
      }}>
        <div className="lp-footer-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px 28px" }}>
          <div className="lp-footer-top" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 40,
            flexWrap: "wrap",
            marginBottom: 32,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, maxWidth: 320 }}>
              <Link href="/" prefetch={false} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", width: "fit-content" }}>
                <LogoMark size={24} />
                <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: C.ink, letterSpacing: -0.3 }}>Resunova</span>
              </Link>
              <p style={{ fontSize: "var(--font-size-sm)", color: C.muted, margin: 0, lineHeight: 1.55 }}>
                Résumé scoring and tailoring — free for students and job seekers.
              </p>
            </div>

            <nav className="lp-footer-nav" aria-label="Footer" style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              {[
                ["Blog", "/blog"],
                ["Contact", "/contact"],
                ["Privacy", "/privacy"],
                ["Terms", "/terms"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className="lp-footer-link"
                  style={{ fontSize: "var(--font-size-sm)", color: C.muted, textDecoration: "none", fontWeight: 500, transition: "color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.ink; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
                >
                  {label}
                </Link>
              ))}

              {/* Product Hunt badge — theme-aware (light/dark) */}
              <a
                href="https://www.producthunt.com/products/resunova?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-resunova"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-ph-badge"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 54,
                  filter: dark ? "brightness(1.1) drop-shadow(0 2px 6px rgba(0,0,0,0.3))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.08))",
                  transition: "filter 0.2s",
                  marginLeft: "auto",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.filter = dark ? "brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.4))" : "drop-shadow(0 4px 8px rgba(0,0,0,0.12))";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.filter = dark ? "brightness(1.1) drop-shadow(0 2px 6px rgba(0,0,0,0.3))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.08))";
                }}
              >
                <img
                  alt="Resunova - The AI resume checker that can't lie to you | Product Hunt"
                  width="250"
                  height="54"
                  src={`https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1187910&theme=${dark ? "dark" : "light"}&t=1783180072635`}
                  style={{ display: "block", maxWidth: "100%", height: "auto" }}
                />
              </a>
            </nav>
          </div>

          <div className="lp-footer-bottom" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            paddingTop: 24,
            borderTop: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 12, color: C.muted }}>© 2026 Resunova. All rights reserved.</span>
            <a
              href={SITE_URL}
              className="lp-footer-link"
              style={{ fontSize: 12, color: C.muted, textDecoration: "none", fontWeight: 500, transition: "color 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.blue; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
            >
              {SITE_URL.replace(/^https:\/\//, "")}
            </a>
          </div>
        </div>
      </footer>

      {/* ── Global keyframes ────────────────────────────────── */}
      {stickyCtaVisible && !stickyCtaDismissed && (
        <div className="lp-sticky-cta" role="region" aria-label="Scan your resume">
          <button
            onClick={() => { goToFreeScan(); }}
            className="lp-sticky-cta-btn"
            style={{
              flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "15px 20px", background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
              color: "#fff", border: "none", borderRadius: 13,
              fontSize: 15, fontWeight: 800, letterSpacing: -0.2,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 10px 30px rgba(30,58,138,0.45)",
            }}
          >
            Score my résumé free →
          </button>
          <button
            onClick={dismissStickyCta}
            aria-label="Dismiss"
            style={{
              width: 40, height: 40, flexShrink: 0, borderRadius: "50%",
              border: `1px solid ${C.border}`, background: C.surface, color: C.muted,
              fontSize: 15, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 6px 20px rgba(15,23,42,0.18)",
            }}
          >
            ✕
          </button>
        </div>
      )}
      <style>{`
        @keyframes lpFadeUp  { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        @keyframes ticker    { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes barFill   { from { width: 0; } to { width: var(--w); } }
        @keyframes ringDraw  { from { stroke-dashoffset: var(--full); } to { stroke-dashoffset: var(--off); } }
        @keyframes cardSlide { from { opacity: 0; transform: translateY(32px) rotate(1.5deg); } to { opacity: 1; transform: rotate(1.5deg); } }
        @keyframes heroFloat { 0%, 100% { transform: rotate(1.5deg) translateY(0); } 50% { transform: rotate(1.5deg) translateY(-6px); } }
        @keyframes lpMenuIn { from { opacity: 0; transform: translateY(-10px) scaleY(0.97); } to { opacity: 1; transform: translateY(0) scaleY(1); } }
        @keyframes lpTapRipple { from { transform: scale(0.4); opacity: 0.85; } to { transform: scale(2.4); opacity: 0; } }
        @keyframes lpCheckPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes lpCursorIn { from { transform: translate(12px,10px); opacity: 0; } to { transform: translate(0,0); opacity: 1; } }
        @keyframes lpTapPress { 0% { transform: translate(0,0); } 45% { transform: translate(-2px,-3px) scale(0.86); } 100% { transform: translate(0,0); } }
        @keyframes lpScorePulse { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
        @keyframes lpArrowPop { from { transform: translateY(4px) scale(0); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .lp-hero-sub-short { display: none; }
        .lp-nav-burger { display: none; }
        @media (min-width: 769px) { .lp-nav-menu { display: none !important; } }
        @media (max-width: 768px) {
          .lp-nav-cta { display: none !important; }
          .lp-nav-section { display: none !important; }
          .lp-nav-burger { display: inline-flex !important; }
          .lp-signin-btn { padding-left: 11px !important; padding-right: 11px !important; }
          .lp-nav { gap: 10px !important; }
        }
        @media (max-width: 860px) {
          .lp-hero-grid { grid-template-columns: 1fr !important; }
          .lp-hero-preview { transform: none !important; max-width: 420px; margin: 0 auto; }
          .lp-feat-grid { grid-template-columns: 1fr 1fr !important; }
          .lp-step-grid { grid-template-columns: 1fr !important; }
          .lp-rev-grid  { grid-template-columns: 1fr !important; }
          .lp-platform-grid { grid-template-columns: 1fr !important; }
          .lp-approach-grid { grid-template-columns: 1fr !important; }
          .lp-jobs-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .lp-jobs-band { padding: 64px 20px !important; }
          .lp-hero-h1   { font-size: 48px !important; }
        }
        .lp-uni-mobile { display: none !important; }
        .lp-sticky-cta { display: none; }
        @keyframes lpStickyIn { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (max-width: 640px) {
          .lp-sticky-cta {
            display: flex;
            position: fixed;
            left: 12px;
            right: 12px;
            bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            z-index: 60;
            gap: 8px;
            align-items: center;
            animation: lpStickyIn 0.25s ease both;
          }
        }
        @media (max-width: 768px) {
          /* Templates: horizontal snap carousel — six stacked full-width cards
             were ~6 viewport-heights of scroll on a phone. */
          .lp-templates-grid {
            display: flex !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            gap: 14px !important;
            padding: 4px 4px 18px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .lp-templates-grid::-webkit-scrollbar { display: none; }
          .lp-templates-grid > a {
            flex: 0 0 76%;
            max-width: 300px;
            scroll-snap-align: center;
          }
        }
        @media (max-width: 640px) {
          /* Tighter mobile rhythm: 100/40 desktop padding wastes ~20% of a
             390px viewport's width and adds screens of empty space. */
          .lp-sec { padding: 64px 20px !important; }
          .lp-uni-desktop { display: none !important; }
          .lp-uni-mobile { display: block !important; }
          /* Interview trio: swipe instead of a 3-screen stack. */
          .lp-interview-grid {
            display: flex !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            gap: 14px !important;
            padding: 4px 4px 18px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .lp-interview-grid::-webkit-scrollbar { display: none; }
          .lp-interview-grid > * { flex: 0 0 82%; scroll-snap-align: center; }
          /* Tabbed tailor demo: trim the desktop-sized reserved panel height. */
          .lp-demo-tabbody { min-height: 200px !important; }
        }
        @media (max-width: 640px) {
          .lp-hero-sub-full { display: none !important; }
          .lp-hero-sub-short { display: inline !important; }
          /* Eye-catchy mobile hero: tighter, centered, visual pulled above the fold */
          .lp-hero-grid { padding: 26px 20px 48px !important; min-height: 0 !important; gap: 26px !important; }
          .lp-hero-left { text-align: center !important; }
          .lp-hero-badge { display: none !important; }
          .lp-hero-h1 { margin-bottom: 16px !important; }
          .lp-hero-left > p { margin-bottom: 26px !important; margin-left: auto !important; margin-right: auto !important; }
          .lp-hero-actions { align-items: stretch !important; margin-bottom: 26px !important; }
          .lp-hero-cta-row { width: 100% !important; }
          .lp-hero-cta-btn { width: 100% !important; justify-content: center !important; padding: 17px 24px !important; }
          .lp-hero-social { justify-content: center !important; }
          .lp-interview-sec { padding: 64px 20px !important; }
          .lp-footer-top { flex-direction: column !important; gap: 24px !important; }
          .lp-footer-nav { width: 100%; flex-direction: column; align-items: flex-start !important; gap: 16px !important; }
          .lp-ph-badge { margin-left: 0 !important; }
          .lp-footer-bottom { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
        @media (max-width: 600px) {
          .lp-header { padding: 0 16px !important; }
          .lp-nav { gap: 10px !important; }
          .lp-nav-section { display: none !important; }
          .lp-nav > a[href*="producthunt"] { display: none !important; }
        }
        @media (max-width: 540px) {
          .lp-feat-grid { grid-template-columns: 1fr !important; }
          .lp-hero-h1   { font-size: 38px !important; }
        }
        .lp-preview-e-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 720px) {
          .lp-preview-e-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      </div>
    </div>
  );
}

// ── Product preview section wrapper ─────────────────────────────────────────
function LandingPreviewSection({
  id,
  eyebrow,
  title,
  desc,
  dark = false,
  wide = false,
  bg,
  animationOnly = false,
  ctaLabel,
  ctaHref,
  curve,
  C,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  desc?: string;
  dark?: boolean;
  wide?: boolean;
  bg?: string;
  animationOnly?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  /** Teal-style curved section opening: large top corner on this side. */
  curve?: "left" | "right";
  C: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{
        padding: animationOnly ? "88px 40px" : "108px 40px 100px",
        background: bg ?? (dark ? "#0f172a" : C.bg2),
        borderTop: dark || curve ? undefined : `1px solid ${C.border}`,
        borderRadius: curve === "left" ? "clamp(36px, 8vw, 110px) 0 0 0" : curve === "right" ? "0 clamp(36px, 8vw, 110px) 0 0" : undefined,
        scrollMarginTop: 120,
      }}
    >
      <div style={{ maxWidth: wide ? 960 : 800, margin: "0 auto", textAlign: animationOnly ? "center" : undefined }}>
        <p style={{
          fontSize: "var(--font-size-sm)", fontWeight: 700, letterSpacing: "0.15em",
          color: T.blue, textTransform: "uppercase", margin: "0 0 12px",
        }}>{eyebrow}</p>
        <h2 className="lp-h2" style={{
          fontSize: animationOnly ? "clamp(24px, 3vw, 36px)" : "clamp(28px, 3.5vw, 44px)",
          fontWeight: 800, lineHeight: 1.12,
          letterSpacing: "-0.03em", color: dark ? "#f8fafc" : C.ink,
          margin: "0 0 10px",
          maxWidth: animationOnly ? 640 : undefined,
          marginLeft: animationOnly ? "auto" : undefined,
          marginRight: animationOnly ? "auto" : undefined,
        }}>{title}</h2>
        {desc ? (
          <p style={{
            fontSize: animationOnly ? "var(--font-size-base)" : "var(--font-size-lg)",
            color: dark ? "#94a3b8" : C.muted,
            lineHeight: 1.6,
            margin: animationOnly ? "0 auto 32px" : "0 0 40px",
            maxWidth: animationOnly ? 520 : 560,
          }}>{desc}</p>
        ) : null}
        <Reveal>{children}</Reveal>
        {ctaLabel && ctaHref && (
          <div style={{ marginTop: 36, textAlign: animationOnly ? "center" : undefined }}>
            <button
              onClick={() => { ctaHref === "/?view=analyze" ? goToFreeScan() : (window.location.href = ctaHref); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 30px",
                background: T.hot,
                color: T.hotInk,
                border: "none",
                borderRadius: 999,
                fontSize: 15, fontWeight: 800, letterSpacing: -0.2,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 10px 26px -8px rgba(212,119,47,0.6)",
                transition: "transform 0.15s, background 0.15s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(-1px)";
                el.style.background = T.hotHover;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "";
                el.style.background = T.hot;
              }}
            >
              {ctaLabel} <span style={{ fontSize: 17 }}>→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Animated "apply" job feed ───────────────────────────────────────────────
// Self-playing demo: each role slides up, a cursor taps Apply, the card turns
// green with a tick, then it slides away and the next role rises in. Loops.
type JobCard = { logo: React.ReactNode; title: string; company: string; match: number; low: number; target: boolean; featured: boolean; opacity: number };

// Shared clock for the apply demo: a single module-level epoch means any number
// of interval ticks (StrictMode double-invoke, dev HMR remounts) compute the
// exact same frame from the same timeline — so the demo can never run fast.
let jobDemoEpoch = 0;

function CheckPop() {
  return (
    <span style={{ display: "inline-flex", animation: "lpCheckPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }} aria-hidden>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6" /></svg>
    </span>
  );
}

function JobApplyFeed({ jobs, C, dark }: { jobs: JobCard[]; C: Record<string, string>; dark: boolean }) {
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<"enter" | "idle" | "tap" | "applied" | "leave">("enter");
  const [displayScore, setDisplayScore] = useState(jobs[0].low);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  // One interval drives the whole demo from elapsed time. Every value is derived
  // purely from the clock, so writes are idempotent — even a stray second
  // interval couldn't race or speed it up. Each ~4.2s cycle: slide in (low score,
  // red) → cursor tap → score climbs to the optimized match (green) → hold → out.
  useEffect(() => {
    const CYCLE = 4200;
    if (!jobDemoEpoch) jobDemoEpoch = performance.now();
    const id = window.setInterval(() => {
      const list = jobsRef.current;
      const elapsed = performance.now() - jobDemoEpoch;
      const t = elapsed % CYCLE;
      const curIdx = Math.floor(elapsed / CYCLE) % list.length;
      const job = list[curIdx];
      const st: "enter" | "idle" | "tap" | "applied" | "leave" =
        t < 500 ? "enter" : t < 1300 ? "idle" : t < 1750 ? "tap" : t < 3500 ? "applied" : "leave";
      const p = Math.min(1, Math.max(0, (t - 1750) / 800));
      const score = t < 1750 ? job.low : Math.round(job.low + (job.match - job.low) * p);
      setIdx(curIdx);
      setStage(st);
      setDisplayScore(score);
    }, 60);
    return () => clearInterval(id);
  }, []);

  const job = jobs[idx];
  const applied = stage === "applied" || stage === "leave";
  const tapping = stage === "tap";
  const showCursor = stage === "idle" || stage === "tap";
  const green = "#16a34a";
  const red = "#dc2626";
  const scoreColor = applied ? green : red;
  const cardTransform = stage === "enter" ? "translateY(48px)" : stage === "leave" ? "translateY(-48px)" : "translateY(0)";
  const cardOpacity = stage === "enter" || stage === "leave" ? 0 : 1;

  // Next roles in the queue — peek out behind the active card with real info
  // (logo, title, match) instead of blank slabs, and rotate with the demo.
  const next1 = jobs[(idx + 1) % jobs.length];
  const next2 = jobs[(idx + 2) % jobs.length];

  const queueRow = (q: JobCard) => (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 14px" }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: C.bg2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: "scale(0.82)" }}>{q.logo}</div>
      <span style={{ fontSize: 12.5, fontWeight: 650, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{q.title}</span>
      <span style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{q.company}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{q.low} match</span>
    </div>
  );

  return (
    <div style={{ position: "relative", paddingTop: 62 }}>
      {/* Up-next queue behind the active card — top strip of each stays visible */}
      <div aria-hidden style={{ position: "absolute", left: 26, right: 26, top: 0, height: 72, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, opacity: 0.55, overflow: "hidden" }}>
        {queueRow(next2)}
      </div>
      <div aria-hidden style={{ position: "absolute", left: 13, right: 13, top: 30, height: 72, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, opacity: 0.8, overflow: "hidden" }}>
        {queueRow(next1)}
      </div>

      <div style={{
        position: "relative", width: "100%",
        background: applied ? (dark ? "rgba(22,163,74,0.13)" : "#f0fdf4") : C.surface,
        border: `2px solid ${applied ? green : T.blue}`,
        borderRadius: 16, padding: "18px 20px",
        boxShadow: applied ? "0 14px 32px rgba(22,163,74,0.20)" : "0 14px 32px rgba(37,99,235,0.18)",
        transform: cardTransform, opacity: cardOpacity,
        transition: "transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease, background 0.3s, border-color 0.3s, box-shadow 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: C.bg2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{job.logo}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginBottom: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{job.title}</span>
              {job.target && (
                <span style={{ background: "rgba(37,99,235,0.10)", color: T.blue, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg> Target role
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{job.company}</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
              {applied && (
                <span aria-hidden style={{ color: green, display: "inline-flex", animation: "lpArrowPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </span>
              )}
              <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor, lineHeight: 1, transition: "color 0.3s", animation: applied ? "lpScorePulse 0.5s ease" : undefined }}>{displayScore}</div>
            </div>
            <div style={{ fontSize: 11, color: applied ? green : C.muted, marginTop: 2, fontWeight: applied ? 600 : 400, transition: "color 0.3s" }}>{applied ? "optimized" : "match"}</div>
          </div>
        </div>

        <div style={{ height: 5, background: C.bg2, borderRadius: 99, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ height: "100%", width: `${displayScore}%`, background: scoreColor, borderRadius: 99, transition: "background 0.3s" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button type="button" tabIndex={-1} aria-hidden style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              minWidth: 124, padding: "9px 18px", borderRadius: 10, border: "none",
              fontSize: 14, fontWeight: 700, fontFamily: "inherit", color: "#fff", cursor: "default",
              background: applied ? green : T.blue,
              transform: tapping ? "scale(0.95)" : "scale(1)",
              transition: "background 0.25s ease, transform 0.12s ease",
            }}>
              {applied ? (<><CheckPop /> Applied</>) : "Apply"}
            </button>

            {tapping && (
              <span aria-hidden style={{
                position: "absolute", left: "50%", top: "50%", width: 22, height: 22, marginLeft: -11, marginTop: -11,
                borderRadius: "50%", border: `2px solid ${T.blue}`, pointerEvents: "none",
                animation: "lpTapRipple 0.55s ease-out forwards",
              }} />
            )}

            {showCursor && (
              <span aria-hidden style={{
                position: "absolute", right: -8, bottom: -12, pointerEvents: "none",
                filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.3))",
                animation: tapping ? "lpTapPress 0.5s ease" : "lpCursorIn 0.5s ease both",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" stroke="#0d1117" strokeWidth="1.5" strokeLinejoin="round"><path d="M5 2.5l14.5 7.6-6.3 1.4-1.4 6.3z" /></svg>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Jobs band ───────────────────────────────────────────────────────────────
// Promoted to the first full-width band right after the hero so the job-search
// story leads the page. Two-column on desktop (copy + scored job cards), stacks
// to a single column on mobile via `.lp-jobs-grid` / `.lp-jobs-band`.
function JobsBand({ C, dark }: { C: Record<string, string>; dark: boolean }) {
  const features: Array<{ svg: React.ReactNode; bg: string; color: string; title: string; desc: string }> = [
    {
      svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
      bg: "rgba(37,99,235,0.10)", color: T.blue, title: "Role-matched feed", desc: "Postings scored against your saved target roles and preferred locations.",
    },
    {
      svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>,
      bg: "rgba(22,163,74,0.10)", color: "#16a34a", title: "Résumé match score", desc: "See exactly how well your résumé fits each job before you write a word.",
    },
    {
      svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>,
      bg: "rgba(217,119,6,0.10)", color: "#d97706", title: "One-click tailor", desc: "Paste the posting, close keyword gaps, and download a tailored PDF.",
    },
    {
      svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
      bg: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: C.muted, title: "Track applications", desc: "Save jobs, track your status, never lose a follow-up.",
    },
  ];

  const jobs: JobCard[] = [
    { logo: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>, title: "Software Engineer II", company: "Google · Remote · Full-time", match: 91, low: 47, target: true, featured: true, opacity: 1 },
    { logo: <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><text x="12" y="18" textAnchor="middle" fontSize="19" fontWeight="800" fontStyle="italic" fontFamily="Arial, Helvetica, sans-serif" fill="#76B900">N</text></svg>, title: "Machine Learning Engineer", company: "NVIDIA · Santa Clara · Hybrid", match: 86, low: 43, target: false, featured: false, opacity: 0.96 },
    { logo: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#635BFF"/></svg>, title: "Backend Engineer", company: "Stripe · New York · Full-time", match: 88, low: 38, target: false, featured: false, opacity: 0.9 },
    { logo: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/></svg>, title: "Product Manager", company: "Meta · Menlo Park · Full-time", match: 85, low: 41, target: false, featured: false, opacity: 0.62 },
  ];

  // Committed dark-indigo block: same in both themes, so copy colors are fixed
  // (not theme vars) and the companies rail gets a translucent-on-indigo C map.
  const ink = "#ffffff";
  const soft = "#c6cdf5";
  const dim = "#9daaf0";
  const onIndigoC: Record<string, string> = {
    ...C,
    ink,
    muted: soft,
    border: "rgba(255,255,255,0.20)",
    surface: "rgba(255,255,255,0.08)",
    bg2: "rgba(255,255,255,0.10)",
  };

  return (
    <section id="jobs" style={{ background: T.blockIndigo, borderRadius: "clamp(36px, 8vw, 110px) 0 0 0", scrollMarginTop: 120 }}>
      <div className="lp-jobs-band" style={{ padding: "110px 40px 90px", maxWidth: 1200, margin: "0 auto" }}>
        <div className="lp-jobs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

          {/* Left — copy + features */}
          <Reveal dir="left">
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 13px", marginBottom: 18,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.24)",
              borderRadius: 100, fontSize: 12, fontWeight: 600, color: ink, letterSpacing: 0.2,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", display: "inline-block" }} />
              New · Job matching
            </div>
            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, letterSpacing: "0.15em", color: dim, textTransform: "uppercase", margin: "0 0 14px" }}>
              Your job search, upgraded
            </p>
            <h2 style={{ fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.03em", margin: "0 0 20px", color: ink }}>
              A job board that<br />reads your résumé.
            </h2>
            <p style={{ fontSize: "var(--font-size-lg)", color: soft, lineHeight: 1.7, margin: "0 0 24px", maxWidth: 460 }}>
              Browse a feed with disclosed salaries and H-1B sponsor data where postings share them. See your match score before you apply, tailor on the spot, and track every application in one place.
            </p>

            {/* Scale stat — a number that lands. Round + under the true total, refreshed daily. */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
              <span style={{ fontSize: "clamp(30px, 4.5vw, 44px)", fontWeight: 800, color: T.hot, letterSpacing: "-0.03em", lineHeight: 1 }}>250,000+</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>jobs on the board</span>
              <span style={{ fontSize: 13, color: dim }}>· refreshed daily</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
              {features.map(({ svg, title, desc }) => (
                <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, color: "#fff" }}>
                    {svg}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: ink, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 14, color: soft, lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { window.location.href = "/?view=jobs"; }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 30px",
                background: T.hot,
                color: T.hotInk, border: "none", borderRadius: 999,
                fontSize: "var(--font-size-base)", fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 10px 26px -8px rgba(0,0,0,0.5)",
                transition: "transform 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.background = T.hotHover; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.background = T.hot; }}
            >
              Browse 250,000+ jobs <span style={{ fontSize: 18 }}>→</span>
            </button>
          </div>
          </Reveal>

          {/* Right — self-playing apply demo (cycles roles, taps Apply, slides up) */}
          <Reveal dir="right" delay={90}>
            <JobApplyFeed jobs={jobs} C={C} dark={dark} />
          </Reveal>
        </div>

        {/* Top companies hiring — live counts as an auto-scrolling marquee. */}
        <Reveal delay={120}>
          <LandingTopCompanies C={onIndigoC} accent={T.hot} marquee />
        </Reveal>
      </div>
    </section>
  );
}

// ── Feature cell ────────────────────────────────────────────────────────────
type HighlightCardContent = {
  title: string;
  desc: string;
  accent: string;
  href?: string;
  linkLabel?: string;
};

function PlatformHighlightCard({
  h,
  dark,
  C,
  compact = false,
}: {
  h: HighlightCardContent;
  dark: boolean;
  C: Record<string, string>;
  compact?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const icon =
    h.title === "Résumé templating" ? "T"
    : h.title === "Public share link" ? "↗"
    : h.title === "ATS scoring" ? "✓"
    : h.title.startsWith("MIT") ? "M"
    : h.title.startsWith("Transparent") ? "%"
    : h.title.startsWith("FERPA") ? "F"
    : h.title.startsWith("Top-company") ? "G"
    : "◎";
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: compact ? "20px 22px" : "32px 28px",
        background: C.surface,
        border: `1px solid ${hover ? (dark ? T.dBorder : "#c8d1da") : C.border}`,
        borderRadius: 16,
        boxShadow: hover
          ? (dark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 32px rgba(13,17,23,0.08)")
          : "none",
        transition: "box-shadow 0.2s, border-color 0.2s",
        display: compact ? "flex" : "block",
        gap: compact ? 14 : undefined,
        alignItems: compact ? "flex-start" : undefined,
      }}
    >
      <div
        style={{
          width: compact ? 36 : 40,
          height: compact ? 36 : 40,
          flexShrink: 0,
          borderRadius: 10,
          background: `${h.accent}18`,
          border: `1px solid ${h.accent}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: compact ? 0 : 18,
          fontSize: compact ? 15 : 18,
          fontWeight: 800,
          color: h.accent,
          letterSpacing: -0.5,
        }}
        aria-hidden
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: compact ? 16 : 18, fontWeight: 700, color: C.ink, margin: "0 0 8px", letterSpacing: -0.35 }}>
          {h.title}
        </h3>
        <p style={{ fontSize: compact ? 13.5 : 14, color: C.muted, lineHeight: 1.68, margin: 0 }}>{h.desc}</p>
        {h.href && h.linkLabel ? (
          <Link
            href={h.href}
            prefetch={false}
            style={{
              display: "inline-block",
              marginTop: 10,
              fontSize: "var(--font-size-base)",
              fontWeight: 600,
              color: T.blue,
              textDecoration: "none",
              letterSpacing: -0.1,
            }}
          >
            {h.linkLabel} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// ── Feature grid cell ────────────────────────────────────────────────────────
function FeatureCell({ f, dark, C }: { f: typeof FEATURES[0]; dark: boolean; C: Record<string,string> }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "36px 32px",
        background: hover ? (dark ? "#1e2329" : "#f0f3f7") : C.surface,
        transition: "background 0.2s",
      }}
    >
      {/* Feature number — bold blue DM Sans, no serif */}
      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: T.blue, letterSpacing: "0.08em", marginBottom: 14 }}>{f.num}</div>
      <h3 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: C.ink, margin: "0 0 10px", letterSpacing: -0.4 }}>{f.title}</h3>
      <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.72, margin: 0 }}>{f.desc}</p>
    </div>
  );
}

// ── Lock icon ─────────────────────────────────────────────────────────────────
// ── Google G icon ─────────────────────────────────────────────────────────────
function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  );
}
