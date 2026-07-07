"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResumeAnalyzeStore, type StructuredResume } from "@/store/resumeAnalyzeStore";
import type { CSSProperties, FocusEvent as ReactFocusEvent, HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { apiUrl } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";
import BulletImprovedEditor from "@/components/BulletImprovedEditor";
import { highlightMetricSpans } from "@/lib/highlightResumeMetrics";
import {
  bulletMatchesAnalysisCategory,
  cleanAiArtifacts,
  getRewriteForCategory,
  type CategoryAssignmentOptions,
} from "@/lib/analysisCategoryMatch";
import { resumeLineMatchesSuggestionOriginal } from "@/lib/suggestionResumeMatch";
import { looksLikeStructuredEmploymentLine } from "@/lib/profileFromResumeText";
import {
  normalizeResumeExtractLine as normalizeExtractLine,
  lineLooksLikeBulletLead,
  looksLikeLoneJobTitleLine,
  looksLikeEntryHeader,
} from "@/lib/resumeEntryLineHeuristics";
import {
  findBulletIndexForLine,
  normalizeForMatch,
  type LiveBulletItem,
} from "@/lib/resumeBulletMatch";
import {
  RESUME_BULLET_STYLESHEET,
  RESUME_PAGE_WIDTH,
  bulletsBlockStyle,
  isTechnologiesLine,
  paragraphBlockStyle,
  type ResumeSectionRole,
} from "@/lib/resumeLayout";

export type { LiveBulletItem } from "@/lib/resumeBulletMatch";
export { findBulletIndexForLine, normalizeForMatch } from "@/lib/resumeBulletMatch";

export type Block =
  | { type: "header"; lines: string[] }
  /** `key` is the stable section identity (`experience`, `skills`, `extra.0`, …)
   *  used to key section name-edits and drive reordering. Only the structured
   *  builder sets it; the legacy text builder leaves it undefined (no reorder). */
  | { type: "section"; text: string; key?: string }
  /** `paths` (parallel to `lines`) carries the stable structuredResume path of each
   *  editable line (e.g. `edu.0.head`, `skills.2`, `extra.1.0`) — used to key
   *  `fieldOverrides`. Only the structured builder emits it; undefined = not editable. */
  | { type: "paragraph"; lines: string[]; paths?: (string | undefined)[] }
  /** `path` (per item) is the stable structuredResume path of the bullet
   *  (e.g. `exp.0.bullets.2`) — used to key `fieldOverrides` for inline bullet
   *  editing. Undefined = not editable (legacy text-path payloads). */
  | { type: "bullets"; items: Array<{ rawLine: string; bulletIdx: number; path?: string }> };

/** Known resume section titles (full trimmed line). Strict mode avoids mistaking ALL-CAPS names for sections. */
const KNOWN_SECTIONS =
  /^(?:EXPERIENCE|WORK\s+HISTORY|WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|PROFESSIONAL\s+HISTORY|EMPLOYMENT(?:\s+HISTORY)?|CAREER(?:\s+HISTORY|\s+OVERVIEW|\s+SUMMARY)?|EDUCATION|SKILLS|SUMMARY|PROFILE|PROJECTS|CERTIFICATIONS|AWARDS|PUBLICATIONS|LANGUAGES|VOLUNTEER|PROFESSIONAL\s+SUMMARY|TECHNICAL\s+SKILLS|ACHIEVEMENTS?|REFERENCES|OBJECTIVE|ACTIVITIES(?:\s*&\s*LEADERSHIP)?|CO-?CURRICULAR\s+ACTIVITIES|EXTRA\s+CURRICULAR\s+ACTIVITIES|EXTRACURRICULAR(?:\s+ACTIVITIES)?|HONORS|LEADERSHIP|INTERESTS)\s*$/iu;

/** Exported for AnnotatedResumePanel extract heuristics (identity line vs lone section heading). */
export function lineLooksLikeStandaloneSectionHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 72) return false;
  return KNOWN_SECTIONS.test(t);
}

function looksLikeSectionHeading(line: string, strict = false): boolean {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  // In strict mode (used for first-line header detection), only match known section keywords.
  // This prevents "JOHN DOE" or "PARTH BHODIA" from being misidentified as section headings.
  if (strict) return KNOWN_SECTIONS.test(t);
  if (KNOWN_SECTIONS.test(t)) return true;
  // Generic ALL-CAPS fallback. Reject lines that look like degree / qualification rows
  // even though every alpha char happens to be uppercase — these contain digits, percent,
  // parens, em-/en-dashes, or slashes. E.g. "ICSE — 97.16% (2021)", "B.TECH (CGPA 9.2)",
  // "AWS / GCP CERT 2022" are NOT section headings; they're content lines that should
  // stay grouped with the preceding institution / role.
  if (/[0-9%()/–—]/.test(t)) return false;
  if (/[A-Z]/.test(t) && t === t.toUpperCase() && !/^\d/.test(t)) return true;
  return false;
}

/**
 * PDF text sometimes loses spaces between words. Display-only heuristic: split camelCase
 * and add a space after punctuation when missing (does not change stored bullets).
 */
export function softenRunOnExtractLine(s: string): string {
  const t0 = s.trim();
  const glueFix = (u: string) => {
    let y = u;
    y = y.replace(
      /([a-z])(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?=\d|[\s,;–—]|$)/gi,
      "$1 $2",
    );
    y = y.replace(
      /([A-Z])(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?=\d|[\s,;–—]|$)/g,
      "$1 $2",
    );
    y = y.replace(/([A-Za-z])(May)(?=\d)/g, "$1 $2");
    y = y.replace(/\|(?=[A-Za-z])/g, "| ");
    return y;
  };
  let t = glueFix(t0);
  if (t.length < 36) {
    return t !== t0 ? (s.includes(t0) ? s.replace(t0, t) : t) : s;
  }
  const spaceCount = (t.match(/\s/g) ?? []).length;
  if (spaceCount / t.length > 0.035) {
    return t !== t0 ? (s.includes(t0) ? s.replace(t0, t) : t) : s;
  }
  let x = t;
  x = x.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  x = x.replace(/([,;:])([^\s\d])/g, "$1 $2");
  x = x.replace(/\s{2,}/g, " ");
  if (x !== t0) {
    return s.includes(t0) ? s.replace(t0, x) : x;
  }
  return s;
}

export function buildBlocks(lines: string[], bulletAnalysis: LiveBulletItem[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  const header: string[] = [];
  while (i < lines.length && header.length < 12) {
    const line = lines[i];
    if (findBulletIndexForLine(line, bulletAnalysis) >= 0) break;
    const t = line.trim();
    if (t === "") {
      if (header.length >= 2) { i++; break; }
      i++;
      continue;
    }
    // Stop at any known section keyword — strict so names like "PARTH BHODIA" aren't mistaken.
    if (looksLikeSectionHeading(t, true)) break;
    if (lineLooksLikeBulletLead(line)) break;
    if (!isPlaceholderIdentityLine(line)) header.push(line);
    i++;
  }
  if (header.length) blocks.push({ type: "header", lines: header });

  while (i < lines.length) {
    const idx = findBulletIndexForLine(lines[i], bulletAnalysis);
    if (idx >= 0) {
      const items: Array<{ rawLine: string; bulletIdx: number }> = [];
      while (i < lines.length) {
        const ti = lines[i].trim();
        if (ti === "") { i++; continue; }
        const j = findBulletIndexForLine(lines[i], bulletAnalysis);
        if (j < 0) break;
        if (isPlaceholderIdentityLine(lines[i])) {
          i++;
          continue;
        }
        items.push({ rawLine: lines[i], bulletIdx: j });
        i++;
      }
      if (items.length) blocks.push({ type: "bullets", items });
    } else {
      const t = lines[i].trim();
      if (!t) { i++; continue; }
      if (looksLikeSectionHeading(t)) {
        if (!isPlaceholderIdentityLine(lines[i])) {
          blocks.push({ type: "section", text: t });
        }
        i++;
        continue;
      }
      const para: string[] = [];
      while (i < lines.length) {
        const ti = lines[i].trim();
        if (!ti) break;
        if (findBulletIndexForLine(lines[i], bulletAnalysis) >= 0) break;
        if (looksLikeSectionHeading(ti)) break;
        if (isPlaceholderIdentityLine(lines[i])) {
          i++;
          continue;
        }
        para.push(lines[i]);
        i++;
      }
      if (para.length) blocks.push({ type: "paragraph", lines: para });
    }
  }

  if (!blocks.length) {
    const nonempty = lines.map(l => l.trimEnd()).filter(l => l.trim());
    if (nonempty.length) blocks.push({ type: "paragraph", lines: nonempty });
  }
  return blocks;
}

// ── Structured-data block builder ──────────────────────────────────────────
// Builds the SAME Block[] shape as buildBlocks() but directly from the typed
// structuredResume fields — no text-parsing heuristics. This kills the whole
// class of parse bugs (double bullets, tech-stack-as-bullet, stray markers)
// because section boundaries, entry headers, project tech, and the
// "exactly-one-bullet-marker" rule come from typed fields, not guesses.
// Bullet→analysis identity still uses the fuzzy matcher (findBulletIndexForLine)
// because bulletAnalysis is a sparse weakest-only subset — see plan.

/** Leading list markers a vision/LLM extract may keep on a bullet. */
const _LEADING_MARKER_RE = /^[\s•\-–—*·◦▪▸→>]+/u;

function _cleanBullet(raw: string): string {
  return (raw || "").replace(_LEADING_MARKER_RE, "").trim();
}

/** Join non-empty pieces with " | " for an entry-header line. */
function _entryHeaderLine(...pieces: Array<string | undefined>): string {
  return pieces.map((p) => (p || "").trim()).filter(Boolean).join(" | ");
}

const _ACTION_VERB_RE =
  /^(Built|Designed|Engineered|Architected|Developed|Delivered|Implemented|Led|Created|Launched|Managed|Drove|Optimized|Integrated|Automated|Reduced|Improved|Won|Achieved|Spearheaded)\b/i;

/** A project's first "bullet" is often the tech stack, not an achievement
 *  (e.g. "Vue Js, REST API, Mongo DB"). Mirrors backend
 *  `_looks_like_tech_stack_line` in resume_gui/extract/synthesize.py so the
 *  structured path promotes it onto the `name | tech` header instead of
 *  rendering it as a stray bullet. */
function _looksLikeTechStackLine(text: string): boolean {
  const s = (text || "").trim();
  if (!s || s.length > 90) return false;
  if (_ACTION_VERB_RE.test(s)) return false;
  if (s.includes(". ") || s.endsWith(".")) return false;
  const parts = s.split(/\s*[,·|]\s*/).filter(Boolean);
  if (parts.length < 2) return false;
  if (parts.some((p) => p.split(/\s+/).length > 4)) return false;
  return s.split(/\s+/).length <= 14;
}

/** Vision extract often puts per-employer stacks in extra_sections as
 *  "Technologies (Adobe)", "TECHNOLOGIES - COMPANY", etc. Bare "Technologies"
 *  (no company) stays a global extra section. Mirrors synthesize.py. */
function _companyFromTechnologiesExtraTitle(title: string): string | null {
  const m = (title || "")
    .trim()
    .match(/^technologies\s*(?:\(\s*(.+?)\s*\)|[-–—:|]\s*(.+))\s*$/i);
  if (!m) return null;
  return (m[1] || m[2] || "").trim() || null;
}

function _normalizeCompanyKey(company: string): string {
  return normalizeForMatch(company)
    .replace(/\b(incorporated|inc|llc|ltd|limited|corp|corporation|co|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function _partitionCompanyTechExtras(
  extras: StructuredResume["extra_sections"],
): { techByCompany: Map<string, string[]>; otherExtras: StructuredResume["extra_sections"] } {
  const techByCompany = new Map<string, string[]>();
  const otherExtras: StructuredResume["extra_sections"] = [];
  for (const extra of extras || []) {
    const company = _companyFromTechnologiesExtraTitle(extra.title || "");
    const lines = (extra.lines || []).map((l) => (l || "").trim()).filter(Boolean);
    if (company && lines.length) {
      const key = _normalizeCompanyKey(company);
      if (key) {
        const prev = techByCompany.get(key) || [];
        techByCompany.set(key, [...prev, ...lines]);
        continue;
      }
    }
    otherExtras.push(extra);
  }
  return { techByCompany, otherExtras };
}

function _techLinesForExperience(
  exp: { company?: string },
  techByCompany: Map<string, string[]>,
): string[] {
  const expKey = _normalizeCompanyKey(exp.company || "");
  if (!expKey) return [];
  if (techByCompany.has(expKey)) return techByCompany.get(expKey)!;
  for (const [parsedKey, lines] of techByCompany) {
    if (parsedKey.includes(expKey) || expKey.includes(parsedKey)) return lines;
  }
  return [];
}

/** Paragraph line(s) for tech under a job — uses "Technologies:" so renderLabeledLine styles it. */
function _companyTechParagraphLines(rawLines: string[]): string[] {
  const cleaned = rawLines
    .map((l) => l.replace(/^technologies\s*:\s*/i, "").trim())
    .filter(Boolean);
  if (!cleaned.length) return [];
  if (cleaned.some((l) => /^[^:]+:\s*.+/.test(l))) return cleaned;
  return [`Technologies: ${cleaned.join(", ")}`];
}

/** True when the structured payload has enough real content to render from. */
export function isStructuredUsable(s: StructuredResume | null | undefined): boolean {
  if (!s) return false;
  const hasHeaderIdentity = Boolean(
    (s.full_name || "").trim()
    || (s.summary || "").trim()
    || (s.email || "").trim()
    || (s.phone || "").trim()
    || (s.headline || "").trim(),
  );
  const firstExp = s.experience?.[0];
  const hasEmployerIdentity = Boolean(
    (firstExp?.company || "").trim() || (firstExp?.role || "").trim(),
  );
  const hasBody =
    (s.experience?.some((e) => (e.role || e.company || "").trim() || (e.bullets?.length ?? 0) > 0) ?? false)
    || (s.education?.some((e) => (e.institution || e.degree || "").trim()) ?? false)
    || (s.projects?.some((p) => (p.name || "").trim() || (p.bullets?.length ?? 0) > 0) ?? false)
    || (s.skills?.some((sk) => (sk.items?.length ?? 0) > 0) ?? false);
  return hasBody && (hasHeaderIdentity || hasEmployerIdentity);
}

// Matches the fixed section order emitted by resume_gui/extract/synthesize.py
// (summary → education → experience → projects → skills), so the structured
// render shows the résumé in the same order the text path always has.
const _DEFAULT_SECTION_ORDER = ["summary", "education", "experience", "projects", "skills"];

export function buildBlocksFromStructured(
  s: StructuredResume,
  bulletAnalysis: LiveBulletItem[],
  /** Session reorder override (array of section keys). When present, sections
   *  emit in this order; any present-but-unlisted keys are appended in default
   *  order. Null/empty = the fixed natural order. */
  sectionOrder?: string[] | null,
): Block[] {
  const blocks: Block[] = [];
  const { techByCompany, otherExtras } = _partitionCompanyTechExtras(s.extra_sections);

  // ── Header ──
  const headerLines: string[] = [];
  if ((s.full_name || "").trim()) headerLines.push(s.full_name.trim());
  const contact = [s.email, s.phone, s.linkedin, s.github]
    .map((c) => (c || "").trim())
    .filter(Boolean)
    .join(" | ");
  if (contact) headerLines.push(contact);
  if ((s.location || "").trim() && !contact.includes(s.location.trim())) {
    headerLines.push(s.location.trim());
  }
  if (headerLines.length) blocks.push({ type: "header", lines: headerLines });

  // Bullets block builder — fuzzy-match each bullet to its (sparse) analysis entry.
  // `pathPrefix` (e.g. `exp.0.bullets`) makes each bullet inline-editable; the
  // post-filter index keys the override and is stable for a given input.
  const pushBullets = (rawBullets: string[], pathPrefix?: string) => {
    const items = rawBullets
      .map((b) => _cleanBullet(b))
      .filter(Boolean)
      .map((clean, i) => ({
        rawLine: `• ${clean}`,
        bulletIdx: findBulletIndexForLine(clean, bulletAnalysis),
        path: pathPrefix ? `${pathPrefix}.${i}` : undefined,
      }));
    if (items.length) blocks.push({ type: "bullets", items });
  };

  const emitSection = (key: string) => {
    switch (key) {
      case "summary": {
        const sum = (s.summary || "").trim();
        if (!sum) return;
        blocks.push({ type: "section", text: "SUMMARY", key });
        blocks.push({ type: "paragraph", lines: [sum] });
        return;
      }
      case "experience": {
        const rows = (s.experience || []).filter(
          (e) => (e.role || e.company || "").trim() || (e.bullets?.length ?? 0) > 0,
        );
        if (!rows.length) return;
        blocks.push({ type: "section", text: "EXPERIENCE", key });
        rows.forEach((e, ei) => {
          const head = _entryHeaderLine(e.role, e.company, e.location, e.dates);
          if (head) blocks.push({ type: "paragraph", lines: [head], paths: [`exp.${ei}.head`] });
          pushBullets(e.bullets || [], `exp.${ei}.bullets`);
          const techLines = _companyTechParagraphLines(_techLinesForExperience(e, techByCompany));
          if (techLines.length) blocks.push({ type: "paragraph", lines: techLines });
        });
        return;
      }
      case "education": {
        const rows = (s.education || []).filter((e) => (e.institution || e.degree || "").trim());
        if (!rows.length) return;
        blocks.push({ type: "section", text: "EDUCATION", key });
        rows.forEach((e, ei) => {
          const head = _entryHeaderLine(e.institution, e.location, e.dates);
          const para: string[] = [];
          const paths: (string | undefined)[] = [];
          if (head) { para.push(head); paths.push(`edu.${ei}.head`); }
          if ((e.degree || "").trim()) { para.push(e.degree.trim()); paths.push(`edu.${ei}.degree`); }
          if (para.length) blocks.push({ type: "paragraph", lines: para, paths });
          if ((e.bullets || []).length) pushBullets(e.bullets!, `edu.${ei}.bullets`);
        });
        return;
      }
      case "projects": {
        const rows = (s.projects || []).filter(
          (p) => (p.name || "").trim() || (p.bullets?.length ?? 0) > 0,
        );
        if (!rows.length) return;
        blocks.push({ type: "section", text: "PROJECTS", key });
        rows.forEach((p, pi) => {
          let tech = (p.tech || "").trim();
          let bullets = (p.bullets || []).map((b) => _cleanBullet(b)).filter(Boolean);
          // Promote a tech-stack first bullet onto the header when tech is empty.
          if (!tech && bullets.length && _looksLikeTechStackLine(bullets[0])) {
            tech = bullets[0];
            bullets = bullets.slice(1);
          }
          const head = _entryHeaderLine(p.name, tech);
          if (head) blocks.push({ type: "paragraph", lines: [head], paths: [`proj.${pi}.head`] });
          pushBullets(bullets, `proj.${pi}.bullets`);
        });
        return;
      }
      case "skills": {
        const rows = (s.skills || []).filter((sk) => (sk.items?.length ?? 0) > 0);
        if (!rows.length) return;
        blocks.push({ type: "section", text: "SKILLS", key });
        const lines = rows.map((sk) => {
          const label = (sk.category || "").trim();
          const items = (sk.items || []).map((i) => i.trim()).filter(Boolean).join(", ");
          return label ? `${label}: ${items}` : items;
        });
        if (lines.length) blocks.push({ type: "paragraph", lines, paths: lines.map((_, j) => `skills.${j}`) });
        return;
      }
      default: {
        // Extra sections (activities, certifications, etc.) keyed `extra.<xi>`.
        // Per-company "Technologies (…)" blocks are merged under experience.
        const m = /^extra\.(\d+)$/.exec(key);
        if (!m) return;
        const xi = Number(m[1]);
        const extra = otherExtras[xi];
        if (!extra) return;
        const title = (extra.title || "").trim();
        const lines = (extra.lines || []).map((l) => (l || "").trim()).filter(Boolean);
        if (!title || !lines.length) return;
        blocks.push({ type: "section", text: title.toUpperCase(), key });
        blocks.push({ type: "paragraph", lines, paths: lines.map((_, li) => `extra.${xi}.${li}`) });
        return;
      }
    }
  };

  // Natural order = the synthesizer's FIXED order (resume_gui/extract/synthesize.py),
  // core sections first then extras — NOT the backend section_order inference.
  // A session `sectionOrder` override (from the inline up/down controls) is
  // honored on top: listed keys first (in that order), then any remaining
  // present keys in natural order so nothing is ever dropped.
  const naturalOrder = [
    ..._DEFAULT_SECTION_ORDER,
    ...otherExtras.map((_, xi) => `extra.${xi}`),
  ];
  let order = naturalOrder;
  if (sectionOrder && sectionOrder.length) {
    const known = new Set(naturalOrder);
    const listed = sectionOrder.filter((k) => known.has(k));
    const rest = naturalOrder.filter((k) => !listed.includes(k));
    order = [...listed, ...rest];
  }
  const seen = new Set<string>();
  for (const key of order) {
    if (seen.has(key)) continue;
    seen.add(key);
    emitSection(key);
  }

  return blocks;
}

/** Mirrors backend `_CONTACT_ANCHOR` — find identity block when PDF line order is wrong. */
const HEADER_CONTACT_ANCHOR =
  /@|linkedin\.com\/|www\.linkedin\.com\/|github\.com\/|www\.github\.com\/|\bportfolio\b|\bsite\b|\bmobile\b|\bphone\b|[\[(]?\d{3}[\])]?[\s.-]?\d{3}[\s.-]?\d{4}/i;

const HEADER_JOB_ROLE =
  /\b(Engineer|Developer|Architect|Scientist|Analyst|Designer|Consultant|Specialist|Manager|Director|Lead|Intern|Associate|Executive)\b/i;

function stripHeaderCandidateLines(lines: string[], start: number, end: number): string[] {
  const out: string[] = [];
  const lo = Math.max(0, start);
  const hi = Math.min(lines.length, end);
  for (let j = lo; j < hi; j++) {
    const line = normalizeExtractLine(lines[j]);
    if (!line) {
      if (out.length >= 2) break;
      continue;
    }
    if (KNOWN_SECTIONS.test(line)) continue;
    if (lineLooksLikeBulletLead(line)) continue;
    if (line.length > 180) continue;
    if (/%|↑|€|\$\d/.test(line)) continue;
    out.push(line);
    if (out.length >= 8) break;
  }
  return out.slice(0, 8);
}

function headerWindow(lines: string[], centerIdx: number, before: number, after: number): string[] {
  return stripHeaderCandidateLines(lines, centerIdx - before, centerIdx + after);
}

function looksLikeAllCapsPersonName(line: string): boolean {
  const t = line.trim();
  const words = t.split(/\s+/).filter(Boolean).map((w) => w.replace(/[''-]/g, ""));
  if (words.length < 2 || words.length > 5 || t.length > 48) return false;
  if (!/^[A-Za-z]/.test(words[0])) return false;
  const capsWords = words.filter((w) => w.length > 1 && w === w.toUpperCase());
  if (capsWords.length < 2) return false;
  return !KNOWN_SECTIONS.test(t);
}

function looksLikeTitlePersonName(line: string): boolean {
  const t = line.trim();
  if (t.length < 5 || t.length > 44) return false;
  if (HEADER_JOB_ROLE.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  const tokenOk = (w: string) => /^[A-Z][a-z]+(?:-[A-Z][a-z]+)*$/.test(w.replace(/[''.,]/g, ""));
  if (!words.every(tokenOk)) return false;
  return !KNOWN_SECTIONS.test(t);
}

/** Collapse odd spaces / unicode so “N ⁄ A” and NBSP variants match N/A heuristics. */
function collapseForPlaceholderMatch(raw: string): string {
  const s = (raw.normalize?.("NFKC") ?? raw)
    .replace(/\ufeff/g, "")
    .replace(/[\u00a0\u2000-\u200b\u202f\u2060]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/** PDF / model sometimes emits a bogus first “name” line — never treat as display title. */
export function isPlaceholderIdentityLine(line: string): boolean {
  const t = collapseForPlaceholderMatch(normalizeExtractLine(line));
  if (!t) return true;
  // N/A with ASCII slash, fraction slash (U+2044), division slash, thin spaces, etc.
  if (/^(?:n[\s./\u2044\u2215\u2013-]*a\.?|not\s+applicable|tbd|none|null|—|--|\.\.\.|unknown|undefined|\?)$/i.test(t)) return true;
  // Lines that are only punctuation / separators (common PDF junk)
  if (/^[\s\-–—_.\/\\|]+$/i.test(t)) return true;
  return false;
}

/** Drop placeholder tokens anywhere in API/inferred header arrays (not only first line). */
function sanitizeHeaderLineArray(lines: string[]): string[] {
  return lines
    .map((s) => normalizeExtractLine(s))
    .filter((l) => l.length > 0 && !isPlaceholderIdentityLine(l));
}

/** PDF extract often wraps one logical bullet across lines; keep a single row per bullet index. */
function collapseAdjacentSameBulletRows(
  items: Array<{ rawLine: string; bulletIdx: number; path?: string }>,
  bullets: LiveBulletItem[],
): Array<{ rawLine: string; bulletIdx: number; path?: string }> {
  const out: Array<{ rawLine: string; bulletIdx: number; path?: string }> = [];

  const isLikelyBulletContinuation = (line: string): boolean => {
    const t = normalizeForMatch(line).trim();
    if (!t || t.length > 80) return false;
    if (/^[+]/.test(t)) return false;
    if (/^[A-Z][a-z].*:$/.test(t)) return false;
    if (/^technologies\s*:/i.test(t)) return false;
    return /^[a-z0-9(]/.test(t) || /^(and|or|with|for|to|across|in|on)\b/i.test(t);
  };

  for (const it of items) {
    const prev = out[out.length - 1];
    // Only collapse wrapped lines that mapped to the SAME real analysis bullet.
    // bulletIdx === -1 means "no analysis entry" (the common case for the
    // structured builder) — those are distinct complete bullets and must NOT
    // merge with each other.
    if (prev && prev.bulletIdx === it.bulletIdx && it.bulletIdx >= 0) {
      const canon = bullets[it.bulletIdx]?.originalBullet?.trim();
      prev.rawLine = canon && canon.length > 0 ? canon : `${prev.rawLine} ${it.rawLine}`.replace(/\s+/g, " ").trim();
      continue;
    }
    if (prev && isLikelyBulletContinuation(it.rawLine)) {
      prev.rawLine = `${prev.rawLine} ${normalizeForMatch(it.rawLine)}`.replace(/\s+/g, " ").trim();
      continue;
    }
    // Keep the first item's path for the merged row (its stable override key).
    out.push({ rawLine: it.rawLine, bulletIdx: it.bulletIdx, path: it.path });
  }
  return out;
}

/** Client replay of `_extract_resume_header` when API `resumeHeader` is missing or stale. */
function inferResumeHeaderFromExtract(text: string): string[] {
  if (!text?.trim()) return [];
  const lines = text.split(/\r?\n/).map(normalizeExtractLine);

  const primary: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (primary.length >= 2) break;
      continue;
    }
    if (KNOWN_SECTIONS.test(line)) break;
    if (lineLooksLikeBulletLead(line)) break;
    if (primary.length === 0 && isPlaceholderIdentityLine(line)) continue;
    if (!isPlaceholderIdentityLine(line)) primary.push(line);
    if (primary.length >= 6) break;
  }
  if (primary.length > 0) return sanitizeHeaderLineArray(primary).slice(0, 6);

  const limit = Math.min(220, lines.length);
  let best: string[] = [];
  for (let i = 0; i < limit; i++) {
    const line = lines[i];
    if (!line || line.length > 200) continue;
    if (HEADER_CONTACT_ANCHOR.test(line)) {
      const chunk = headerWindow(lines, i, 10, 6);
      if (chunk.length > best.length) best = chunk;
    }
  }
  if (!best.length) {
    for (let i = 0; i < Math.min(360, lines.length); i++) {
      const line = lines[i];
      if (looksLikeAllCapsPersonName(line) || looksLikeTitlePersonName(line)) {
        best = headerWindow(lines, i, 2, 6);
        break;
      }
    }
  }
  if (!best.length) {
    const emailRe = /\S+@\S+\.\S+/;
    for (let i = 0; i < Math.min(400, lines.length); i++) {
      const line = lines[i];
      if (line && emailRe.test(line)) {
        best = headerWindow(lines, i, 10, 6);
        break;
      }
    }
  }
  return sanitizeHeaderLineArray(best).slice(0, 6);
}

/** Shared with AnnotatedResumePanel to prepend identity onto synthetic extracts. */
export function mergeResumeHeaderSources(apiHeader: string[] | undefined, inferBasisFull: string): string[] {
  let api = sanitizeHeaderLineArray(apiHeader ?? []);
  /* One line exactly matching a résumé section is not identity (mis-parsed extracts). */
  if (api.length === 1 && KNOWN_SECTIONS.test(api[0])) {
    api = [];
  }
  if (api.length >= 1) return api.slice(0, 8);
  const inferred = inferResumeHeaderFromExtract(inferBasisFull);
  if (inferred.length) return inferred.slice(0, 8);
  return [];
}

/** Inject centered name/contact when blocks start with EXPERIENCE (or bogus header missing API lines). */
function shouldPrependIdentityHeader(blocks: Block[], headerLines: string[]): boolean {
  if (!headerLines.length) return false;
  const first = blocks[0];
  if (!first) return true;
  if (first.type === "section" || first.type === "bullets" || first.type === "paragraph") return true;
  if (first.type === "header") {
    const blob = (first.lines ?? []).join(" ").toLowerCase();
    return !headerLines.some(
      (h) => h.trim().length >= 3 && blob.includes(h.trim().toLowerCase()),
    );
  }
  return false;
}

function renderInline(text: string): ReactNode[] {
  const normalized = text.replace(/\\textbf\{([^}]*)\}/g, "**$1**");
  const parts = normalized.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, k) => {
    if (/^\*\*.+\*\*$/.test(p)) return <strong key={k}>{p.slice(2, -2)}</strong>;
    return <span key={k}>{p}</span>;
  });
}

function normalizeHeaderContactGlue(line: string): string {
  let out = line;
  out = out.replace(/(GitHub)(Email\s*:)/gi, "$1 | $2");
  out = out.replace(/(LinkedIn)(GitHub)/gi, "$1 | $2");
  out = out.replace(/(Email\s*:)(Mobile\s*:)/gi, "$1 | $2");
  out = out.replace(/(Mobile\s*:)(Senior\s+[A-Za-z])/gi, "$1 | $2");
  out = out.replace(/(Location\s*:)(?=[A-Za-z])/gi, "$1 ");
  return out;
}

function isLikelyHeaderContactLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.length > 160) return false;

  const words = t.split(/\s+/).filter(Boolean);
  const hasStrongContactAnchor = /@|linkedin|github|portfolio|website|mobile|phone|email|location|\+\d{1,3}/i.test(t);
  const hasDelimiter = /[|•◆·]/.test(t);
  const looksSentenceLike = /\b(with|building|engineered|delivered|optimized|owning|across)\b/i.test(t);

  if (hasStrongContactAnchor) return true;
  if (!hasDelimiter) {
    return words.length >= 2 && words.length <= 8 && !looksSentenceLike;
  }
  return words.length <= 14 && !looksSentenceLike;
}

function normalizeSkillsLineSpacing(line: string): string {
  return line
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function mergeWrappedSkillsLines(lines: string[]): string[] {
  const cleaned = lines
    .map((ln) => normalizeSkillsLineSpacing(softenRunOnExtractLine(ln.trim())))
    .filter((ln) => ln.length > 0);

  const out: string[] = [];
  for (const line of cleaned) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(line);
      continue;
    }

    const prevEndsWithDelimiter = /[,/:;-]$/.test(prev);
    const lineLooksContinuation =
      /^[a-z0-9]/.test(line) ||
      /^(and|or|with|plus|incl\.?|including|tools?|frameworks?|platforms?|pipelines?)\b/i.test(line);

    if (prevEndsWithDelimiter || lineLooksContinuation) {
      out[out.length - 1] = `${prev} ${line}`.replace(/\s{2,}/g, " ").trim();
      continue;
    }

    out.push(line);
  }

  return out;
}

function renderSkillsLine(text: string): ReactNode {
  const m = text.match(/^([^:]{2,42}):(\s*)(.+)$/);
  if (!m) return <>{renderInline(text)}</>;
  const label = m[1].trim();
  const value = m[3].trim();
  const labelWords = label.split(/\s+/).filter(Boolean).length;
  if (labelWords > 5) return <>{renderInline(text)}</>;
  return (
    <>
      <strong>{label}:</strong>{" "}
      {renderInline(value)}
    </>
  );
}

const RESUME_HEADING_FONT = "var(--az-resume-heading-font, 'Georgia', 'Times New Roman', serif)";
const RESUME_BODY_FONT = "var(--az-resume-body-font, 'Georgia', 'Times New Roman', serif)";
const RESUME_UI_FONT = "var(--az-resume-ui-font, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)";

function roleForKnownSection(text: string): ResumeSectionRole | null {
  const t = text.trim();
  if (!KNOWN_SECTIONS.test(t)) return null;
  if (/\beducation\b/i.test(t)) return "education";
  if (/\b(skill|technical skills)\b/i.test(t)) return "skills";
  if (/\b(project|portfolio)\b/i.test(t)) return "projects";
  if (/\b(experience|work|employment|career)\b/i.test(t)) return "experience";
  if (/\b(summary|profile|objective)\b/i.test(t)) return "summary";
  if (/\b(activity|activities|leadership|honors|interest)\b/i.test(t)) return "activities";
  return "other";
}

function currentSectionRole(blocks: Block[], index: number): ResumeSectionRole | null {
  for (let j = index - 1; j >= 0; j--) {
    const block = blocks[j];
    if (block?.type !== "section") continue;
    const role = roleForKnownSection(block.text);
    if (role) return role;
  }
  return null;
}

const EDUCATION_INSTITUTION_RE =
  /\b(university|college|institute|school|academy|polytechnic|faculty|department|vidyapeeth|steinhardt|charusat)\b/i;

function looksLikeEducationInstitutionLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 180) return false;
  if (lineLooksLikeBulletLead(t)) return false;
  if (splitLeadingLabelAndValue(t)) return false;
  return EDUCATION_INSTITUTION_RE.test(t);
}

function splitLeadingLabelAndValue(text: string): { hasBullet: boolean; label: string; value: string } | null {
  const m = text.trim().match(/^([•●▪◦○–—\-]\s*)?([^:]{2,42}):\s*(.+)$/u);
  if (!m) return null;
  const label = m[2].trim();
  const value = m[3].trim();
  if (!label || !value || label.split(/\s+/).length > 5) return null;
  return { hasBullet: Boolean(m[1]), label, value };
}

function renderLabeledLine(text: string): ReactNode {
  const split = splitLeadingLabelAndValue(text);
  if (!split) return renderInline(softenRunOnExtractLine(text));
  const body = (
    <>
      <strong>{split.label}:</strong>{" "}
      {renderInline(softenRunOnExtractLine(split.value))}
    </>
  );
  if (!split.hasBullet) return body;
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
      <span style={{ color: "var(--resume-paper-dim)" }}>•</span>
      <span>{body}</span>
    </span>
  );
}

function renderMetricLineWithLabel(text: string, highlightsEnabled: boolean): ReactNode {
  if (!highlightsEnabled) {
    const split = splitLeadingLabelAndValue(text);
    if (!split) return text;
    return (
      <>
        <strong>{split.label}:</strong> {split.value}
      </>
    );
  }
  const split = splitLeadingLabelAndValue(text);
  if (!split) return highlightMetricSpans(text);
  return (
    <>
      <strong>{split.label}:</strong>{" "}
      {highlightMetricSpans(split.value)}
    </>
  );
}

function EntryHeaderLine({ line }: { line: string }) {
  const t = line.trim();

  if (t.includes("|")) {
    const parts = t.split("|").map(p => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    const isLastDate = /\b(19|20)\d{2}\b/.test(last) || /present|current/i.test(last);
    const mains = isLastDate ? parts.slice(0, -1) : parts;
    const datePart = isLastDate ? last : null;

    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0 8px", lineHeight: 1.22 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: "var(--resume-paper-ink)", fontSize: 10.8, fontFamily: RESUME_BODY_FONT }}>
            {mains[0]}
          </span>
          {mains.slice(1).map((p, i) => (
            <span key={i} style={{ color: "var(--resume-paper-muted)", fontSize: 10, fontStyle: "italic", fontFamily: RESUME_BODY_FONT }}>
              {"·"} {p}
            </span>
          ))}
        </div>
        {datePart && (
          <span style={{ color: "var(--resume-paper-muted)", fontSize: 9.5, fontFamily: RESUME_BODY_FONT, flexShrink: 0 }}>
            {datePart}
          </span>
        )}
      </div>
    );
  }

  // Mid-dot separated entry: degree (bold) on line 1, rest (muted/italic) on line 2
  if (t.includes("·")) {
    const parts = t.split("·").map(p => p.trim()).filter(Boolean);
    const title = parts[0];
    const rest = parts.slice(1);
    // Separate trailing year/GPA tokens from the institution/location
    const dateGpaRe = /^(\d{4}|\d\.\d{1,2})$/;
    let metaStart = rest.length;
    for (let i = rest.length - 1; i >= 1; i--) {
      if (dateGpaRe.test(rest[i])) metaStart = i;
      else break;
    }
    const institutionParts = rest.slice(0, metaStart);
    const metaParts = rest.slice(metaStart);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontWeight: 700, color: "var(--resume-paper-ink)", fontSize: 10.8, fontFamily: RESUME_BODY_FONT }}>
            {title}
          </span>
          {metaParts.length > 0 && (
            <span style={{ color: "var(--resume-paper-muted)", fontSize: 9.5, fontFamily: RESUME_BODY_FONT, flexShrink: 0, whiteSpace: "nowrap" }}>
              {metaParts.join(" · ")}
            </span>
          )}
        </div>
        {institutionParts.length > 0 && (
          <span style={{ color: "var(--resume-paper-muted)", fontSize: 10, fontStyle: "italic", fontFamily: RESUME_BODY_FONT }}>
            {institutionParts.join(" · ")}
          </span>
        )}
      </div>
    );
  }

  // Standalone date/location row (no pipe) — right-align like a job date column.
  const looksLikeDateOnlyRow =
    t.length <= 72 &&
    !/[;]/.test(t) &&
    !/\b(sitting|examination|exam|passed|for|license|certification|bar)\b/i.test(t) &&
    (/\b(19|20)\d{2}\s*[–—\-]\s*((19|20)\d{2}|present|current)\b/i.test(t) ||
      /^\s*[A-Za-z .,'-]{0,48}\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(19|20)\d{2}\s*$/i.test(t));

  if (looksLikeDateOnlyRow) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ color: "var(--resume-paper-muted)", fontSize: 9.5, fontStyle: "italic", fontFamily: RESUME_BODY_FONT, lineHeight: 1.22 }}>
          {renderInline(t)}
        </span>
      </div>
    );
  }

  // Narrative line with embedded dates (e.g. bar exam schedule) — keep left-aligned.
  return (
    <div style={{
      fontSize: "var(--az-resume-body-font-size, 10px)",
      color: "var(--resume-paper-ink)",
      lineHeight: "var(--az-resume-line-height, 1.45)",
      fontFamily: RESUME_BODY_FONT,
      overflowWrap: "anywhere",
      wordBreak: "break-word",
    }}>
      {renderInline(t)}
    </div>
  );
}

function coalesceEmploymentParagraphLines(lines: string[]): string[] {
  const out: string[] = [];
  const isLikelyMeta = (t: string): boolean => {
    const hasDate = /\b(19|20)\d{2}\b/.test(t) || /\b(?:present|current)\b/i.test(t);
    const hasRole = /\b(Engineer|Developer|Architect|Analyst|Manager|Lead|Consultant|Designer|Scientist)\b/i.test(t);
    return t.length <= 90 && (hasDate || hasRole);
  };
  const isLikelyCompany = (t: string): boolean => {
    if (!t || t.length > 90) return false;
    if (/\b(19|20)\d{2}\b/.test(t)) return false;
    if (lineLooksLikeBulletLead(t)) return false;
    if (/^[+•\-–—]/.test(t)) return false;
    return /\b(Inc|LLC|Ltd|Technologies|Solutions|Systems|Corp|Company|Remote|,\s*[A-Z]{2}|,\s*[A-Za-z]+)\b/i.test(t);
  };

  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim();
    const next = i + 1 < lines.length ? lines[i + 1].trim() : "";
    if (cur && next && isLikelyCompany(cur) && isLikelyMeta(next)) {
      out.push(`${cur} | ${next}`);
      i++;
      continue;
    }
    out.push(lines[i]);
  }
  return out;
}

function scoreBorderColor(score: number): string {
  if (score >= 70) return "rgba(52,211,153,0.8)";
  if (score >= 55) return "rgba(245,158,11,0.85)";
  return "rgba(248,113,113,0.85)";
}

const TAILOR_GAP_HIGHLIGHT: CSSProperties = {
  background: "rgba(139,92,246,0.12)",
  borderLeft: "3px solid #8b5cf6",
  paddingLeft: 6,
  marginLeft: -9,
  borderRadius: "0 3px 3px 0",
  transition: "background 0.3s, border-color 0.3s",
};

const TAILOR_APPLIED_HIGHLIGHT: CSSProperties = {
  background: "rgba(52,211,153,0.14)",
  borderLeft: "3px solid rgb(34, 197, 94)",
  paddingLeft: 6,
  marginLeft: -9,
  borderRadius: "0 3px 3px 0",
  transition: "background 0.3s, border-color 0.3s",
};

/** Analyze/Tailor preview — user approved "Replace line in preview". */
const PREVIEW_LINE_APPLIED_BG = "rgba(52,211,153,0.14)";
const PREVIEW_LINE_APPLIED_BAR = "3px solid rgb(34, 197, 94)";

function tailorHighlightKind(
  line: string,
  gapFixHighlights: string[],
  appliedHighlights: string[],
): "applied" | "gap" | null {
  const block = line.trim();
  if (!block) return null;
  if (appliedHighlights.some((o) => resumeLineMatchesSuggestionOriginal(block, o))) return "applied";
  if (gapFixHighlights.some((o) => resumeLineMatchesSuggestionOriginal(block, o))) return "gap";
  return null;
}

function scoreBgTint(
  score: number,
  highlighted: boolean,
  presentationOnly: boolean,
  highlightsEnabled: boolean,
): string {
  if (!highlightsEnabled) return "transparent";
  if (presentationOnly) {
    if (highlighted) return "rgba(239,68,68,0.16)";
    if (score >= 70) return "rgba(52,211,153,0.15)";
    if (score >= 55) return "rgba(245,158,11,0.18)";
    return "rgba(248,113,113,0.16)";
  }
  if (highlighted) return "rgba(239,68,68,0.06)";
  if (score >= 70) return "rgba(52,211,153,0.04)";
  if (score >= 55) return "rgba(245,158,11,0.05)";
  return "rgba(248,113,113,0.06)";
}

interface PopupState {
  bulletIdx: number;
  top: number;
  left: number;
}

interface Props {
  extractedText: string;
  /** Prefer full PDF/plain extract for guessing name/contact when the visible doc uses synthetic bullets. */
  headerInferenceText?: string | null;
  resumeHeader?: string[];
  bulletAnalysis: LiveBulletItem[];
  /** Structured resume for the Tailor flow (from /api/upload-resume). Takes precedence
   *  over the Analyze Zustand store when provided; falls back to the store for Analyze. */
  structuredResume?: StructuredResume | null;
  /** When true, `structuredResume` (prop) is authoritative — never fall back to the
   *  Analyze Zustand store. Set by the Tailor flow so a stale Analyze-store structured
   *  doc can't leak into the Tailor preview. */
  structuredResumeAuthoritative?: boolean;
  /** Tailor-preview escape hatch: when authoritative is set but no structured doc is
   *  available (the boost API only returns flat `tailoredText`), parse that text rather
   *  than rendering the "Structured preview unavailable" dead-end. Keeps store isolation
   *  (authoritative still blocks the Analyze store) while letting the tailored résumé +
   *  its PDF export actually render. */
  flatTextFallback?: boolean;
  activeCategory: string | null;
  rewriteEdits: Record<number, string>;
  patchBulletRewrite: (bulletIndex: number, value: string | null) => void;
  previewLineOverrides: Record<number, string>;
  patchPreviewLine: (bulletIndex: number, value: string | null) => void;
  selectedBulletIndex?: number | null;
  onBulletLinkedSelect?: (index: number) => void;
  pulseBulletIndex?: number | null;
  presentationOnly?: boolean;
  categoryAssignmentOpts?: CategoryAssignmentOptions;
  /** Tailor gap-fix panel — purple highlight on targeted bullets. */
  tailorGapFixHighlights?: string[];
  /** Tailor gap-fix just applied — green flash on updated bullets. */
  tailorAppliedHighlights?: string[];
  /** Index-based gap targets (Analyze-style); preferred over string highlights. */
  gapFixTargetBulletIndices?: number[];
  /** Brief green flash on applied bullet indices after gap apply. */
  tailorAppliedBulletIndices?: ReadonlySet<number>;
  /** Score / gap / metric tinting on bullets and lines (off = clean résumé for preview + PDF). */
  highlightsEnabled?: boolean;
  /** Analyze: the professional-summary paragraph has issues — amber-highlight it + make it clickable. */
  summaryFlagged?: boolean;
  /** Click handler on the flagged summary block (opens the Summary Rewrite fix). */
  onSummarySelect?: () => void;
  /** Tooltip on the flagged summary, e.g. "89 words · 4 issues — click to fix". */
  summaryHint?: string;
  /** Applied summary rewrite — replaces the summary paragraph text in preview + PDF. */
  summaryOverride?: string;
  /** Per-field edited text, keyed by stable structured path (`edu.0.head`, `skills.2`, …). */
  fieldOverrides?: Record<string, string>;
  /** Commit an inline field edit (path, new text; empty text clears the override). */
  onFieldEdit?: (path: string, text: string) => void;
  /** Commit an inline summary edit (routes to summaryOverride; empty text clears it). */
  onSummaryEdit?: (text: string) => void;
  /** When true, lines with a structured path render as inline-editable (Analyze only). */
  fieldsEditable?: boolean;
  /** Currently selected section block index for box-wise editing (transient
   *  selection highlight; cleared on reorder). */
  selectedSectionIdx?: number | null;
  /** Callback when a section is selected (clicked). */
  onSectionSelected?: (blockIdx: number) => void;
  /** Per-section edited heading text, keyed by stable section key (e.g.
   *  `experience`, `extra.0`) so edits survive reordering. */
  sectionEdits?: Record<string, string>;
  /** Update section heading edit for a given section key (null clears). */
  patchSectionEdit?: (sectionKey: string, value: string | null) => void;
  /** Session reorder override (array of section keys); honored by the builder. */
  sectionOrderOverride?: string[] | null;
  /** Commit a new section order (full key array) after an up/down move. */
  onReorderSections?: (order: string[]) => void;
}

export default function AnalyzeLiveResumeBody({
  extractedText,
  headerInferenceText = null,
  resumeHeader,
  bulletAnalysis,
  structuredResume: structuredResumeProp = null,
  structuredResumeAuthoritative = false,
  flatTextFallback = false,
  activeCategory,
  rewriteEdits,
  patchBulletRewrite,
  previewLineOverrides,
  patchPreviewLine,
  selectedBulletIndex = null,
  onBulletLinkedSelect,
  presentationOnly = false,
  pulseBulletIndex = null,
  categoryAssignmentOpts,
  tailorGapFixHighlights = [],
  tailorAppliedHighlights = [],
  gapFixTargetBulletIndices = [],
  tailorAppliedBulletIndices = new Set<number>(),
  highlightsEnabled = true,
  summaryFlagged = false,
  onSummarySelect,
  summaryHint,
  summaryOverride = "",
  fieldOverrides = {},
  onFieldEdit,
  onSummaryEdit,
  fieldsEditable = false,
  selectedSectionIdx = null,
  onSectionSelected,
  sectionEdits = {},
  patchSectionEdit,
  sectionOrderOverride = null,
  onReorderSections,
}: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  // Tracks which bullets are in "edit textarea" mode (after accepting or choosing to write own)
  const [editingBullets, setEditingBullets] = useState<Record<number, boolean>>({});
  // Local edit text per bullet (pre-filled from AI rewrite or empty for "write own")
  const [editDrafts, setEditDrafts] = useState<Record<number, string>>({});

  const acceptedBullets = useResumeAnalyzeStore((s) => s.acceptedBullets);
  const acceptBullet = useResumeAnalyzeStore((s) => s.acceptBullet);
  const unacceptBullet = useResumeAnalyzeStore((s) => s.unacceptBullet);
  const structuredFromStore = useResumeAnalyzeStore((s) => s.structuredResume);
  // Tailor passes the structured doc as a prop (it lives in component state, not the
  // Analyze store) and marks it authoritative so a stale store value can't leak in.
  // Analyze leaves the prop null and reads the hydrated store.
  const structuredResume = structuredResumeAuthoritative
    ? structuredResumeProp
    : (structuredResumeProp ?? structuredFromStore);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [popupDraft, setPopupDraft] = useState<string>("");
  const [aiRewritingIdx, setAiRewritingIdx] = useState<number | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);

  const structuredPreviewActive = isStructuredUsable(structuredResume);

  const blocks = useMemo(() => {
    // Primary path: typed structuredResume (vision extract) — no line-parse heuristics.
    if (structuredPreviewActive) {
      return buildBlocksFromStructured(structuredResume!, bulletAnalysis, sectionOrderOverride);
    }
    // Tailor marks structured authoritative: never silently re-parse flat text (that
    // bypasses section order, per-company tech, and WYSIWYG parity with synthesize.py)
    // — unless the caller has only flat text to show (boost preview) and explicitly
    // opts into the flat-parse fallback below.
    if (structuredResumeAuthoritative && !flatTextFallback) {
      return [];
    }
    // Analyze only: legacy saved runs / payloads without structuredResume in storage.
    const lines = extractedText.split(/\r?\n/).map(normalizeExtractLine);
    const result = buildBlocks(lines, bulletAnalysis);
    const inferBasis = (headerInferenceText ?? "").trim() || extractedText.trim();
    const headerLines = mergeResumeHeaderSources(resumeHeader, inferBasis);
    if (shouldPrependIdentityHeader(result, headerLines)) {
      result.unshift({ type: "header", lines: [...headerLines] });
    }
    return result;
  }, [
    structuredPreviewActive,
    structuredResume,
    structuredResumeAuthoritative,
    flatTextFallback,
    extractedText,
    bulletAnalysis,
    resumeHeader,
    headerInferenceText,
    sectionOrderOverride,
  ]);

  // Ordered section keys currently rendered (structured path only) — drives the
  // inline up/down reorder controls. Derived from blocks so it always reflects
  // the live order after an override is applied.
  const sectionKeysInOrder = useMemo(
    () => blocks.flatMap((b) => (b.type === "section" && b.key ? [b.key] : [])),
    [blocks],
  );
  const moveSection = useCallback(
    (key: string, dir: -1 | 1) => {
      const idx = sectionKeysInOrder.indexOf(key);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= sectionKeysInOrder.length) return;
      const next = [...sectionKeysInOrder];
      [next[idx], next[j]] = [next[j], next[idx]];
      onReorderSections?.(next);
    },
    [sectionKeysInOrder, onReorderSections],
  );

  useEffect(() => {
    if (popup == null) return;
    const bullet = bulletAnalysis[popup.bulletIdx];
    if (!bullet) return;
    // Seed from the SAME resolved suggestion that gates the editor (not the raw
    // improvedBullet) so the textarea is never rendered blank when a category
    // rewrite resolves but improvedBullet is empty.
    setPopupDraft(resolveBulletSuggestion(popup.bulletIdx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup, rewriteEdits, bulletAnalysis, activeCategory, categoryAssignmentOpts]);

  // On-demand LLM rewrite for the preview popup — same path as the sidebar card
  // (POST /api/rewrite-bullet). Used when no rewrite passed the quality checks.
  const requestPopupAiRewrite = useCallback(async (idx: number, originalBullet: string, category: string) => {
    setAiRewritingIdx(idx);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const resp = await fetch(apiUrl("/api/rewrite-bullet"), {
        method: "POST",
        headers,
        body: JSON.stringify({ bullet: originalBullet, rewrite: true, instruction: category }),
      });
      if (!resp.ok) throw new Error("rewrite failed");
      const json = await resp.json() as { improved?: string | null };
      const improved = (json.improved ?? "").trim();
      if (improved && improved !== originalBullet) {
        patchBulletRewrite(idx, improved);   // → rewriteEdits → popup re-seeds with it
        setPopupDraft(improved);
      }
    } catch {
      /* silently ignore — button re-enables */
    } finally {
      setAiRewritingIdx(null);
    }
  }, [patchBulletRewrite]);

  useEffect(() => {
    if (!popup) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopup(null);
    };
    window.addEventListener("mousedown", handler, true);
    return () => window.removeEventListener("mousedown", handler, true);
  }, [popup]);

  useEffect(() => {
    if (!popup) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setPopup(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [popup]);

  useEffect(() => {
    if (!popup) return;

    const onMouseMove = (e: MouseEvent) => {
      const drag = popupDragOffsetRef.current;
      if (!drag) return;

      const panelW = popupRef.current?.offsetWidth ?? 320;
      const panelH = popupRef.current?.offsetHeight ?? 360;
      const nextLeft = e.clientX - drag.dx;
      const nextTop = e.clientY - drag.dy;

      const left = Math.max(8, Math.min(nextLeft, window.innerWidth - panelW - 8));
      const top = Math.max(8, Math.min(nextTop, window.innerHeight - panelH - 8));

      setPopup((prev) => (prev ? { ...prev, left, top } : prev));
    };

    const onMouseUp = () => {
      popupDragOffsetRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [popup]);

  const popupBullet = popup != null ? bulletAnalysis[popup.bulletIdx] : null;
  const popupPreviewApplied = popup != null ? previewLineOverrides[popup.bulletIdx] !== undefined : false;

  const resolveBulletSuggestion = (bulletIdx: number): string => {
    const bullet = bulletAnalysis[bulletIdx];
    if (!bullet) return "";
    const raw = activeCategory
      ? getRewriteForCategory(
          bullet,
          activeCategory,
          rewriteEdits[bulletIdx],
          bulletAnalysis,
          bulletIdx,
          categoryAssignmentOpts,
        )
      : (bullet.improvedBullet ?? "");
    return cleanAiArtifacts(raw).text;
  };
  const popupSuggestionBase = popup != null ? resolveBulletSuggestion(popup.bulletIdx) : "";

  return (
    <div
      className={highlightsEnabled ? undefined : "az-highlights-off"}
      style={{
      background: "var(--resume-paper-bg)",
      color: "var(--resume-paper-ink)",
      boxSizing: "border-box",
      width: RESUME_PAGE_WIDTH,
      maxWidth: "100%",
      padding: "var(--az-resume-paper-padding, 36px 48px)",
      fontFamily: RESUME_BODY_FONT,
      fontSize: "var(--az-resume-base-font-size, 10.5px)",
      lineHeight: "var(--az-resume-line-height, 1.45)",
      minHeight: 120,
      // break-word (not anywhere) breaks only genuinely-long unbreakable tokens (URLs,
      // emails) without collapsing the box's intrinsic min-width — `anywhere`/`break-word`
      // would let a tight mobile column wrap one character per line. See boost preview.
      overflowWrap: "break-word",
      wordBreak: "normal",
    }}>
      <style>{`
        @keyframes az-mirror-pulse {
          0%   { outline: 2px solid rgba(234,179,8,0.95); outline-offset: 1px; }
          100% { outline: 2px solid transparent; outline-offset: 8px; }
        }
        ${RESUME_BULLET_STYLESHEET}
        .az-editable-field { border-bottom: 1px dashed transparent; transition: background 0.12s, border-color 0.12s; }
        .az-editable-field:hover { background: rgba(33,150,243,0.06); border-bottom-color: rgba(33,150,243,0.5); cursor: text; }
        .az-editable-field:focus { outline: none; background: rgba(33,150,243,0.08); border-bottom-color: rgba(33,150,243,0.85); }
      `}</style>

      {blocks.length === 0 && (
        <div style={{ color: "var(--resume-paper-muted)", fontStyle: "italic", textAlign: "center", padding: "32px 0", lineHeight: 1.5, fontSize: 11 }}>
          {structuredResumeAuthoritative && !structuredPreviewActive && !flatTextFallback
            ? "Structured preview unavailable. Upload your PDF here, or run Match score — we'll extract a structured résumé model from your text (not plain-text guessing)."
            : "No extractable résumé text."}
        </div>
      )}

      {blocks.map((blk, bi) => {

        /* ── Name / contact header ── */
        if (blk.type === "header") {
          const rest = [...blk.lines];
          while (rest.length > 0 && isPlaceholderIdentityLine(rest[0])) {
            rest.shift();
          }
          const nameLine = rest[0]?.trim() || "";
          const contactLines = rest
            .slice(1)
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && isLikelyHeaderContactLine(l));
          // Flatten contact info — split on common separators into individual items
          const contactItems: string[] = [];
          for (const ln of contactLines) {
            if (isPlaceholderIdentityLine(ln)) continue;
            const normalizedLine = normalizeHeaderContactGlue(ln);
            const parts = normalizedLine.split(/[|•·,]\s*|\s{2,}/).map(p => p.trim()).filter(Boolean);
            const chunk = parts.length > 1 ? parts : [normalizedLine.trim()];
            for (const p of chunk) {
              if (!isPlaceholderIdentityLine(p)) contactItems.push(p);
            }
          }

          // Inline header editing (Analyze): name + each contact item commit to
          // fieldOverrides under stable `header.*` paths. Display substitutes the
          // override; blur equal to the original (or emptied) clears it.
          const headerEditable = !!(fieldsEditable && onFieldEdit);
          const headerEditableProps = (path: string, original: string): HTMLAttributes<HTMLDivElement> =>
            (headerEditable
              ? {
                  contentEditable: true,
                  suppressContentEditableWarning: true,
                  "data-field-path": path,
                  ...(fieldOverrides[path] !== undefined ? { "data-field-edited": "1" } : {}),
                  className: "az-editable-field",
                  title: "Click to edit — applies to preview and PDF",
                  onBlur: (e: ReactFocusEvent<HTMLDivElement>) => {
                    const txt = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
                    onFieldEdit!(path, txt === original.replace(/\s+/g, " ").trim() ? "" : txt);
                  },
                  onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => {
                    if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                    else if (e.key === "Escape") {
                      e.preventDefault();
                      e.currentTarget.textContent = original;
                      e.currentTarget.blur();
                    }
                  },
                }
              : {}) as HTMLAttributes<HTMLDivElement>;
          const nameShown = fieldOverrides["header.name"] ?? nameLine;

          return (
            <div key={bi} style={{ textAlign: "var(--az-resume-header-align, left)" as CSSProperties["textAlign"], marginBottom: "var(--az-resume-contact-margin-bottom, 16px)" }}>
              {nameLine && (
                <div {...headerEditableProps("header.name", nameLine)} style={{
                  fontSize: "var(--az-resume-name-size, 22px)",
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  color: "var(--resume-paper-ink)",
                  marginBottom: "var(--az-resume-header-name-margin-bottom, 3px)",
                  fontFamily: RESUME_HEADING_FONT,
                }}>
                  {renderInline(nameShown)}
                </div>
              )}
              {contactItems.length > 0 && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "var(--az-resume-header-justify, flex-start)" as CSSProperties["justifyContent"],
                  alignItems: "center",
                  gap: 4,
                  fontSize: "calc(var(--az-resume-body-font-size, 10px) + 0.3px)",
                  color: "var(--resume-paper-muted)",
                  fontFamily: RESUME_BODY_FONT,
                  lineHeight: 1.4,
                }}>
                  {contactItems.map((item, ci) => (
                    <span key={ci} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {ci > 0 && <span style={{ color: "var(--resume-paper-dim)" }}>|</span>}
                      <span {...(headerEditableProps(`header.contact.${ci}`, item) as HTMLAttributes<HTMLSpanElement>)}>
                        {renderInline(fieldOverrides[`header.contact.${ci}`] ?? item)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        }

        /* ── Section heading (Template Builder SECTION_TITLE look) ── */
        if (blk.type === "section") {
          // Inline section editing is gated on `sectionEditable`, NOT on
          // `presentationOnly`. The Analyze preview runs in presentation mode
          // (full-width, clean WYSIWYG) but still opts into editing via
          // `fieldsEditable`; flipping presentationOnly would collapse the panel
          // to 460px (the Tailor-builder layout). Tailor keeps its incidental
          // section editing via `!presentationOnly`.
          const sectionEditable = fieldsEditable || !presentationOnly;
          // Section name-edits key off the stable section key (so they survive
          // reorder); falls back to the heading text for the legacy text path.
          const sectionKey = blk.key ?? blk.text;
          const isSelected = selectedSectionIdx === bi;
          const isEditing = isSelected && sectionEdits[sectionKey] !== undefined;
          const editValue = sectionEdits[sectionKey] ?? blk.text;
          // Reorder controls (structured path only — needs a real key).
          const reorderable = !!(sectionEditable && blk.key && onReorderSections);
          const isFirstSection = reorderable && sectionKeysInOrder[0] === blk.key;
          const isLastSection =
            reorderable && sectionKeysInOrder[sectionKeysInOrder.length - 1] === blk.key;

          return (
            <div
              key={bi}
              data-section-idx={bi}
              className={sectionEditable ? "az-editable-section" : undefined}
              title={sectionEditable && !isSelected ? "Click to edit this section heading" : undefined}
              onClick={() => {
                if (!sectionEditable || isEditing) return;
                // First click selects (shows the hint); a second click on an
                // already-selected heading drops into the edit textarea.
                if (isSelected) patchSectionEdit?.(sectionKey, blk.text);
                else onSectionSelected?.(bi);
              }}
              style={{
                marginTop: "var(--az-resume-section-margin-top, 11px)",
                marginBottom: "var(--az-resume-section-title-margin-bottom, 6px)",
                paddingBottom: isSelected ? 4 : 2,
                paddingLeft: isSelected ? 8 : 0,
                paddingRight: reorderable ? 44 : isSelected ? 8 : 0,
                paddingTop: isSelected ? 4 : 0,
                borderBottom: isSelected && sectionEditable
                  ? "2px solid var(--accent)"
                  : "0.5px solid var(--resume-paper-accent)",
                fontSize: "var(--az-resume-section-size, 10.5px)",
                fontWeight: 700,
                letterSpacing: "var(--az-resume-section-tracking, 1px)",
                color: isSelected && sectionEditable ? "var(--accent)" : "var(--resume-paper-accent)",
                textTransform: "uppercase",
                fontFamily: RESUME_HEADING_FONT,
                background: isSelected && sectionEditable ? "rgba(var(--accent-rgb, 200, 121, 58), 0.06)" : "transparent",
                borderRadius: isSelected ? 4 : 0,
                cursor: sectionEditable ? "pointer" : "default",
                transition: "all 0.15s",
                position: "relative",
              }}
            >
              {!isEditing ? (
                <>
                  {sectionEdits[sectionKey] ?? blk.text}
                  {isSelected && sectionEditable && (
                    <span className="az-pdf-ignore" style={{
                      marginLeft: 8,
                      fontSize: 9,
                      fontWeight: 600,
                      color: "var(--muted)",
                      fontFamily: "system-ui, sans-serif",
                    }}>
                      [Click to edit]
                    </span>
                  )}
                  {reorderable && (
                    <span
                      className="az-pdf-ignore az-section-move"
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "inline-flex", gap: 2 }}
                    >
                      <button
                        type="button"
                        className="az-section-move-btn"
                        title="Move section up"
                        disabled={isFirstSection}
                        onClick={(e) => { e.stopPropagation(); moveSection(blk.key!, -1); }}
                      >▲</button>
                      <button
                        type="button"
                        className="az-section-move-btn"
                        title="Move section down"
                        disabled={isLastSection}
                        onClick={(e) => { e.stopPropagation(); moveSection(blk.key!, 1); }}
                      >▼</button>
                    </span>
                  )}
                </>
              ) : (
                <textarea
                  autoFocus
                  value={editValue}
                  onChange={(e) => patchSectionEdit?.(sectionKey, e.target.value)}
                  onBlur={() => {
                    if (editValue === blk.text) {
                      patchSectionEdit?.(sectionKey, null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      patchSectionEdit?.(sectionKey, null);
                    }
                  }}
                  style={{
                    width: "100%",
                    minHeight: "24px",
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--accent)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: "var(--az-resume-section-size, 10.5px)",
                    fontWeight: 700,
                    fontFamily: RESUME_HEADING_FONT,
                    letterSpacing: "var(--az-resume-section-tracking, 1px)",
                    textTransform: "uppercase",
                    resize: "vertical",
                  }}
                />
              )}
            </div>
          );
        }

        /* ── Paragraph / entry header ── */
        if (blk.type === "paragraph") {
          const sectionRole = currentSectionRole(blocks, bi);
          const inSkillsSection = sectionRole === "skills";
          const inExperienceSection = sectionRole === "experience";
          const inEducationSection = sectionRole === "education";
          // Substitute per-field overrides into the SOURCE lines before any
          // merge/coalesce pass, so an edit always renders even when the merged
          // row count no longer aligns with `paths`.
          const sourceLines = blk.paths
            ? blk.lines.map((l, i2) => {
                const p = blk.paths?.[i2];
                const o = p ? fieldOverrides[p] : undefined;
                return o ?? l;
              })
            : blk.lines;
          const paragraphLines = inSkillsSection
            ? mergeWrappedSkillsLines(sourceLines)
            : inExperienceSection
              ? coalesceEmploymentParagraphLines(sourceLines)
              : sourceLines;
          // Inline editing only when rendered rows still align 1:1 with paths
          // (skills/experience merges can change the row count).
          const linePaths =
            blk.paths && paragraphLines.length === blk.lines.length ? blk.paths : undefined;
          // Professional-summary paragraph. When a rewrite has been applied
          // (summaryOverride) render it with a green "applied" tint; otherwise,
          // if flagged, an amber "needs work" callout. Both are clickable → open
          // the Summary Rewrite fix, and both are stripped from PDF export via
          // cleanForExport's [data-summary-flag] rule.
          const isSummaryBlock = sectionRole === "summary";
          const summaryApplied = isSummaryBlock && !!summaryOverride.trim();
          const isFlaggedSummary = isSummaryBlock && summaryFlagged && !summaryApplied && highlightsEnabled;
          const isSummaryInteractive =
            isSummaryBlock && highlightsEnabled && (isFlaggedSummary || summaryApplied);
          const summaryDisplayLines = summaryApplied ? [summaryOverride.trim()] : paragraphLines;

          return (
            <div
              key={bi}
              data-summary-flag={isSummaryInteractive ? "1" : undefined}
              onClick={isSummaryInteractive ? onSummarySelect : undefined}
              title={
                summaryApplied
                  ? "Summary rewrite applied — click to edit or reset"
                  : isFlaggedSummary
                    ? (summaryHint || "Summary needs work — click to see the rewrite")
                    : undefined
              }
              style={{
                ...paragraphBlockStyle(sectionRole, summaryDisplayLines),
                ...(isFlaggedSummary
                  ? {
                      cursor: "pointer",
                      background: "rgba(245,158,11,0.12)",
                      boxShadow: "inset 3px 0 0 0 rgba(245,158,11,0.85)",
                      borderRadius: 4,
                      paddingLeft: 9,
                      paddingTop: 3,
                      paddingBottom: 3,
                      transition: "background 0.15s",
                    }
                  : summaryApplied
                    ? {
                        cursor: "pointer",
                        background: "rgba(34,197,94,0.10)",
                        boxShadow: "inset 3px 0 0 0 rgba(34,197,94,0.7)",
                        borderRadius: 4,
                        paddingLeft: 9,
                        paddingTop: 3,
                        paddingBottom: 3,
                        transition: "background 0.15s",
                      }
                    : null),
              }}
            >
              {summaryDisplayLines.map((ln, li) => {
                const t = ln.trim();
                if (!t || isPlaceholderIdentityLine(ln)) return null;
                // Inline field editing: contentEditable + commit-on-blur. An
                // edit equal to the original (or emptied) clears the override.
                // The summary edits through summaryOverride (not fieldOverrides)
                // so the applied-rewrite render, PDF export, and rescore all see
                // one override — but only when the block isn't acting as a
                // flagged/applied click-target (those clicks open the fix card).
                const fieldPath = isSummaryBlock ? undefined : linePaths?.[li];
                const fieldEdited = !!(fieldPath && fieldOverrides[fieldPath] !== undefined);
                const summaryInlineEditable =
                  isSummaryBlock && !isSummaryInteractive && !!(fieldsEditable && onSummaryEdit);
                const fieldEditable = !!(fieldsEditable && fieldPath && onFieldEdit) || summaryInlineEditable;
                const editableProps = (fieldEditable
                  ? {
                      contentEditable: true,
                      suppressContentEditableWarning: true,
                      "data-field-path": summaryInlineEditable ? "summary" : fieldPath,
                      ...(fieldEdited ? { "data-field-edited": "1" } : {}),
                      className: "az-editable-field",
                      title: "Click to edit — applies to preview and PDF",
                      onBlur: (e: ReactFocusEvent<HTMLDivElement>) => {
                        const txt = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
                        const original = (blk.lines[li] ?? "").replace(/\s+/g, " ").trim();
                        if (summaryInlineEditable) onSummaryEdit!(txt === original ? "" : txt);
                        else onFieldEdit!(fieldPath!, txt === original ? "" : txt);
                      },
                      onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => {
                        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                        else if (e.key === "Escape") {
                          e.preventDefault();
                          e.currentTarget.textContent = blk.lines[li] ?? "";
                          e.currentTarget.blur();
                        }
                      },
                    }
                  : {}) as HTMLAttributes<HTMLDivElement>;
                const fieldEditedStyle: CSSProperties | undefined =
                  fieldEdited && highlightsEnabled
                    ? {
                        background: "rgba(34,197,94,0.08)",
                        boxShadow: "inset 2px 0 0 0 rgba(34,197,94,0.55)",
                        borderRadius: 3,
                      }
                    : undefined;
                if (looksLikeEntryHeader(t)) {
                  return (
                    <div key={li} {...editableProps} style={{ marginBottom: inEducationSection ? 0 : 1, ...fieldEditedStyle }}>
                      <EntryHeaderLine line={t} />
                    </div>
                  );
                }
                if (inEducationSection && looksLikeEducationInstitutionLine(t)) {
                  return (
                    <div key={li} {...editableProps} style={{
                      fontSize: 10.65,
                      fontWeight: 700,
                      color: "var(--resume-paper-ink)",
                      lineHeight: 1.22,
                      marginTop: li > 0 ? 3 : 0,
                      marginBottom: 0,
                      fontFamily: RESUME_BODY_FONT,
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      ...fieldEditedStyle,
                    }}>
                      {renderInline(softenRunOnExtractLine(t))}
                    </div>
                  );
                }
                // Plain paragraph text (summary, skills list, location, etc.)
                const tailorHl =
                  highlightsEnabled && presentationOnly && bulletAnalysis.length === 0
                    ? tailorHighlightKind(ln, tailorGapFixHighlights, tailorAppliedHighlights)
                    : null;
                const tailorHlStyle =
                  tailorHl === "applied"
                    ? TAILOR_APPLIED_HIGHLIGHT
                    : tailorHl === "gap"
                      ? TAILOR_GAP_HIGHLIGHT
                      : undefined;
                const summaryLine = sectionRole === "summary";
                return (
                  <div key={li} {...editableProps} style={{
                    fontSize: summaryLine
                      ? "var(--az-resume-body-font-size, 10px)"
                      : inEducationSection ? 10.25 : "var(--az-resume-body-font-size, 10px)",
                    color: "var(--resume-paper-ink)",
                    lineHeight: summaryLine
                      ? "var(--az-resume-summary-line-height, 1.5)"
                      : inEducationSection ? 1.28 : "var(--az-resume-line-height, 1.45)",
                    marginBottom: isTechnologiesLine(t) ? 0 : summaryLine ? 0 : inEducationSection ? 0 : 0,
                    fontFamily: RESUME_BODY_FONT,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    ...tailorHlStyle,
                    ...fieldEditedStyle,
                  }}>
                    {inSkillsSection
                      ? renderSkillsLine(normalizeSkillsLineSpacing(t))
                      : renderLabeledLine(t)}
                  </div>
                );
              })}
            </div>
          );
        }

        /* ── Bullet rows ── */
        const bulletRows = collapseAdjacentSameBulletRows(blk.items, bulletAnalysis);
        const bulletSectionRole = currentSectionRole(blocks, bi);
        return (
          <div key={bi} style={bulletsBlockStyle(bulletSectionRole)}>
            {bulletRows.map(({ rawLine, bulletIdx, path }, ii) => {
              const bullet = bulletAnalysis[bulletIdx];

              // Neutral render for bullets with no analysis entry (bulletIdx < 0 /
              // not in the sparse weakest-only bulletAnalysis). These are the
              // majority of bullets on the structured path; they must still
              // render — just without score badge, popup, ✦, or category
              // highlight. Keep `.az-resume-bullet` so the CSS marker + indent
              // and the PDF clean-export path still apply.
              if (!bullet) {
                const strippedRaw = rawLine.replace(/^[\s•\-–—*·◦▪▸→>]+/, "").trimStart();
                // Inline edit: a per-bullet override (keyed by structured path)
                // replaces the displayed text. Editing is contentEditable on the
                // span (see editableProps) — neutral bullets have no popup/card,
                // so there's no click conflict.
                const bulletEdited = !!(path && fieldOverrides[path] !== undefined);
                const bulletEditable = !!(fieldsEditable && path && onFieldEdit);
                const neutralSource = bulletEdited ? fieldOverrides[path!] : strippedRaw;
                const neutralText = softenRunOnExtractLine(neutralSource);
                if (!neutralText && !bulletEditable) return null;
                const tailorHl = highlightsEnabled && presentationOnly
                  ? tailorHighlightKind(neutralText, tailorGapFixHighlights, tailorAppliedHighlights)
                  : null;
                const tailorHlStyle =
                  tailorHl === "applied"
                    ? TAILOR_APPLIED_HIGHLIGHT
                    : tailorHl === "gap"
                      ? TAILOR_GAP_HIGHLIGHT
                      : undefined;
                const bulletEditedStyle: CSSProperties | undefined =
                  bulletEdited && highlightsEnabled
                    ? {
                        background: "rgba(34,197,94,0.08)",
                        boxShadow: "inset 2px 0 0 0 rgba(34,197,94,0.55)",
                        borderRadius: 3,
                      }
                    : undefined;
                const editableSpanProps = (bulletEditable
                  ? {
                      contentEditable: true,
                      suppressContentEditableWarning: true,
                      "data-field-path": path,
                      ...(bulletEdited ? { "data-field-edited": "1" } : {}),
                      className: "az-editable-field",
                      title: "Click to edit — applies to preview and PDF",
                      onBlur: (e: ReactFocusEvent<HTMLSpanElement>) => {
                        const txt = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
                        const original = strippedRaw.replace(/\s+/g, " ").trim();
                        onFieldEdit!(path!, txt === original ? "" : txt);
                      },
                      onKeyDown: (e: ReactKeyboardEvent<HTMLSpanElement>) => {
                        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                        else if (e.key === "Escape") {
                          e.preventDefault();
                          e.currentTarget.textContent = strippedRaw;
                          e.currentTarget.blur();
                        }
                      },
                    }
                  : {}) as HTMLAttributes<HTMLSpanElement>;
                return (
                  <div
                    key={`neutral-${bi}-${ii}`}
                    data-bullet-idx={-1}
                    className={`az-resume-bullet${presentationOnly ? " az-resume-bullet--tailor" : ""}`}
                    style={{
                      marginLeft: 0,
                      lineHeight: "var(--az-resume-line-height, 1.45)",
                      ...tailorHlStyle,
                      ...bulletEditedStyle,
                    }}
                  >
                    <span {...editableSpanProps} style={{ flex: 1, fontSize: "var(--az-resume-body-font-size, 10px)", lineHeight: "inherit", color: "var(--resume-paper-ink)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                      {renderMetricLineWithLabel(neutralText, highlightsEnabled)}
                    </span>
                  </div>
                );
              }

              const nm = normalizeForMatch(rawLine);
              const showTextRaw = previewLineOverrides[bulletIdx] ?? (nm.length >= 8 ? nm : bullet.originalBullet);
              // Strip any residual leading bullet chars before display — the CSS ::before already
              // adds the visible bullet, so "• • text" or "- • text" must become "text".
              const showText = softenRunOnExtractLine(
                showTextRaw.replace(/^[\s•\-–—*·◦▪▸→>]+/, "").trimStart()
              );
              const isHighlighted = activeCategory
                ? bulletMatchesAnalysisCategory(
                    bullet,
                    activeCategory,
                    bulletAnalysis,
                    bulletIdx,
                    categoryAssignmentOpts,
                  )
                : false;
              const isSelected = selectedBulletIndex === bulletIdx;
              const previewLineApplied = previewLineOverrides[bulletIdx] !== undefined;
              const issues = Array.isArray(bullet.issues) ? bullet.issues : [];
              const hasActionable = !!(bullet.improvedBullet || issues.length);
              const isPulsing = pulseBulletIndex === bulletIdx;
              const isGapFixTarget =
                highlightsEnabled && presentationOnly && gapFixTargetBulletIndices.includes(bulletIdx);
              const isGapFixApplied =
                highlightsEnabled && presentationOnly && tailorAppliedBulletIndices.has(bulletIdx);
              const isPreviewLineApplied = highlightsEnabled && previewLineApplied;

              let bgTint = scoreBgTint(
                bullet.score,
                isHighlighted && !isPreviewLineApplied,
                presentationOnly,
                highlightsEnabled,
              );
              let leftBar = highlightsEnabled && activeCategory && isHighlighted && !isPreviewLineApplied
                ? "4px solid rgba(248, 113, 113, 0.95)"
                : highlightsEnabled
                  ? `3px solid ${scoreBorderColor(bullet.score)}`
                  : "none";

              if (highlightsEnabled && presentationOnly && isGapFixApplied) {
                bgTint = PREVIEW_LINE_APPLIED_BG;
                leftBar = PREVIEW_LINE_APPLIED_BAR;
              } else if (highlightsEnabled && presentationOnly && isGapFixTarget) {
                bgTint = "rgba(139,92,246,0.12)";
                leftBar = "3px solid #8b5cf6";
              } else if (isPreviewLineApplied) {
                bgTint = PREVIEW_LINE_APPLIED_BG;
                leftBar = PREVIEW_LINE_APPLIED_BAR;
              }

              return (
                <div
                  key={`${bulletIdx}-${bi}-${ii}`}
                  data-bullet-idx={bulletIdx}
                  className={`az-resume-bullet${presentationOnly ? " az-resume-bullet--tailor" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Only open the "AI Suggestion" popup when there's an
                    // actual rewrite to show. After the no-op-rewrite filter
                    // landed server-side, the popup's "No rewrite suggestion
                    // available for this bullet" empty state fires often —
                    // and that empty popup duplicates the score + tag info
                    // that's already on the flagged-bullet card on the left.
                    // When no rewrite exists, just route to the card via
                    // onBulletLinkedSelect (parent scrolls / expands it).
                    const suggested = resolveBulletSuggestion(bulletIdx);
                    const hasRewrite = suggested.trim().length > 0;
                    if (presentationOnly && hasRewrite) {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const popupTop = Math.max(8, Math.min(rect.top, window.innerHeight - 340));
                      const popupLeft = Math.max(8, rect.left - 336);
                      setPopup({ bulletIdx, top: popupTop, left: popupLeft });
                      setPopupDraft(rewriteEdits[bulletIdx] ?? suggested);
                    } else if (!presentationOnly) {
                      setExpandedIdx((prev) => (prev === bulletIdx ? null : bulletIdx));
                    }
                    onBulletLinkedSelect?.(bulletIdx);
                  }}
                  style={{
                    marginLeft: 0,
                    lineHeight: "var(--az-resume-line-height, 1.45)",
                    background: bgTint,
                    borderLeft: leftBar,
                    boxShadow: isSelected ? "inset 0 0 0 1.5px var(--resume-paper-accent)" : undefined,
                    cursor: hasActionable ? "pointer" : "default",
                    animation: isPulsing ? "az-mirror-pulse 0.85s ease-out 1" : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    {/* Score badge — visible in non-presentation mode only */}
                    {!presentationOnly && (
                      <span className={`az-pdf-ignore az-score-badge az-score-badge--${bullet.score >= 70 ? "strong" : bullet.score >= 55 ? "fair" : "weak"}`} style={{ flexShrink: 0, marginTop: 1 }}>
                        {bullet.score}
                      </span>
                    )}

                    <span style={{ flex: 1, fontSize: "var(--az-resume-body-font-size, 10px)", lineHeight: "inherit", color: "var(--resume-paper-ink)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                      {renderMetricLineWithLabel(showText, highlightsEnabled)}
                      {previewLineApplied && (
                        <span className="az-pdf-ignore az-preview-applied-mark"
                          title={presentationOnly ? "Suggestion applied" : "Preview updated"}
                          style={{ marginLeft: 5, fontSize: 9, fontWeight: 800, color: presentationOnly ? "var(--green)" : "var(--amber)" }}
                        >
                          {presentationOnly ? "✓" : "●"}
                        </span>
                      )}
                      {highlightsEnabled && presentationOnly && hasActionable && !previewLineApplied && (
                        <span className="az-pdf-ignore" title="Click to see AI suggestion" style={{ marginLeft: 5, fontSize: 9, color: "var(--resume-paper-muted)" }}>✦</span>
                      )}
                    </span>
                  </div>

                  {/* ── Inline detail panel (non-presentation mode only) ── */}
                  {!presentationOnly && expandedIdx === bulletIdx && (() => {
                    const accepted = acceptedBullets[bulletIdx];
                    const isEditing = editingBullets[bulletIdx];
                    const editDraft = editDrafts[bulletIdx] ?? "";

                    // ── State D: editing textarea ──
                    if (isEditing) {
                      return (
                        <div style={{ fontFamily: "system-ui, sans-serif", marginTop: 8 }} onClick={e => e.stopPropagation()}>
                          <textarea
                            autoFocus
                            value={editDraft}
                            onChange={e => setEditDrafts(prev => ({ ...prev, [bulletIdx]: e.target.value }))}
                            placeholder="Write your improved bullet…"
                            className="az-edit-textarea"
                          />
                          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            <button
                              onClick={() => {
                                const t = editDraft.trim();
                                if (!t) return;
                                acceptBullet(bulletIdx, t, "custom");
                                patchBulletRewrite(bulletIdx, t);
                                setEditingBullets(prev => { const n = { ...prev }; delete n[bulletIdx]; return n; });
                              }}
                              className="az-btn az-btn--primary az-btn--sm"
                            >Save</button>
                            <button
                              onClick={() => setEditingBullets(prev => { const n = { ...prev }; delete n[bulletIdx]; return n; })}
                              className="az-btn az-btn--ghost az-btn--sm"
                            >Cancel</button>
                            {editDraft.trim() && (
                              <CopyTiny text={editDraft} />
                            )}
                          </div>
                        </div>
                      );
                    }

                    // ── State C: accepted ──
                    if (accepted) {
                      const acceptedText = previewLineOverrides[bulletIdx] ?? rewriteEdits[bulletIdx] ?? bullet.improvedBullet ?? "";
                      return (
                        <div style={{ fontFamily: "system-ui, sans-serif", marginTop: 6 }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span className={`az-score-badge az-score-badge--${accepted === "ai" ? "accepted" : "accepted"}`} style={{
                              background: accepted === "ai" ? "var(--az-accepted-ai-bg)" : "var(--az-accepted-custom-bg)",
                              borderColor: accepted === "ai" ? "var(--az-accepted-ai-border)" : "var(--az-accepted-custom-border)",
                              color: accepted === "ai" ? "var(--az-strong-text)" : "#2563eb",
                            }}>
                              {accepted === "ai" ? "✓ AI" : "✓ Custom"}
                            </span>
                            <button
                              onClick={() => {
                                setEditDrafts(prev => ({ ...prev, [bulletIdx]: acceptedText }));
                                setEditingBullets(prev => ({ ...prev, [bulletIdx]: true }));
                              }}
                              className="az-btn az-btn--ghost az-btn--sm"
                            >Edit</button>
                            <button
                              onClick={() => {
                                unacceptBullet(bulletIdx);
                                patchBulletRewrite(bulletIdx, null);
                              }}
                              className="az-btn az-btn--ghost az-btn--sm"
                            >Undo</button>
                          </div>
                          {acceptedText && (
                            <div className="az-bullet-accepted-text">{acceptedText}</div>
                          )}
                        </div>
                      );
                    }

                    // ── State B: expanded suggestion view ──
                    const MAX_CHIPS = 3;
                    const visibleIssues = bullet.issues.slice(0, MAX_CHIPS);
                    const overflowCount = bullet.issues.length - MAX_CHIPS;
                    return (
                      <div style={{ fontFamily: "system-ui, sans-serif", marginTop: 6 }} onClick={e => e.stopPropagation()}>
                        {/* Issues chips — max 3 + overflow pill */}
                        {bullet.issues.length > 0 && (
                          <div className="az-chips" style={{ marginBottom: 8, paddingLeft: 2 }}>
                            {visibleIssues.map((issue, ij) => (
                              <span key={ij} className="az-chip">{issue}</span>
                            ))}
                            {overflowCount > 0 && (
                              <span className="az-chip az-chip--overflow">+{overflowCount} more</span>
                            )}
                          </div>
                        )}

                        {/* AI suggestion card */}
                        {bullet.improvedBullet && (
                          <div className="az-suggestion-card">
                            <div className="az-suggestion-card__header">
                              <span>✦</span> AI Suggestion
                            </div>
                            <div className="az-suggestion-card__body">
                              {bullet.improvedBullet}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {bullet.improvedBullet && (
                            <button
                              className="az-btn az-btn--primary az-btn--sm"
                              onClick={() => {
                                acceptBullet(bulletIdx, bullet.improvedBullet!, "ai");
                                patchBulletRewrite(bulletIdx, bullet.improvedBullet!);
                              }}
                            >Accept AI</button>
                          )}
                          {bullet.improvedBullet && (
                            <button
                              className="az-btn az-btn--ghost az-btn--sm"
                              onClick={() => {
                                setEditDrafts(prev => ({ ...prev, [bulletIdx]: bullet.improvedBullet! }));
                                setEditingBullets(prev => ({ ...prev, [bulletIdx]: true }));
                              }}
                            >Edit draft</button>
                          )}
                          <button
                            className="az-btn az-btn--ghost az-btn--sm"
                            style={{ color: "var(--muted)" }}
                            onClick={() => {
                              setEditDrafts(prev => ({ ...prev, [bulletIdx]: "" }));
                              setEditingBullets(prev => ({ ...prev, [bulletIdx]: true }));
                            }}
                          >Write my own</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── AI suggestion popup (presentationOnly click on bullet) ── */}
      {popup && popupBullet && (
        <div
          ref={popupRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: popup.top,
            left: popup.left,
            zIndex: 9999,
            width: 320,
            background: "var(--surface)",
            borderRadius: 10,
            boxShadow: "var(--shadow)",
            border: "1px solid var(--border)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 12,
            overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px 8px", borderBottom: "1px solid var(--border)", background: "var(--surface2)",
            cursor: "move",
          }}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            popupDragOffsetRef.current = {
              dx: e.clientX - popup.left,
              dy: e.clientY - popup.top,
            };
            e.preventDefault();
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10,
                background: popupBullet.score >= 70 ? "rgba(52,211,153,0.15)" : popupBullet.score >= 55 ? "rgba(245,158,11,0.15)" : "rgba(248,113,113,0.15)",
                color: popupBullet.score >= 70 ? "var(--green)" : popupBullet.score >= 55 ? "var(--yellow)" : "var(--red)",
              }}>
                {popupBullet.score}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>AI Suggestion</span>
            </div>
            <button
              type="button"
              onClick={() => setPopup(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 4px", borderRadius: 4, fontSize: 15, lineHeight: 1 }}
              aria-label="Close"
            >×</button>
          </div>

          {popupBullet.issues.length > 0 && (
            <div style={{ padding: "8px 12px 6px", display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid var(--border)" }}>
              {popupBullet.issues.map((issue, j) => (
                <span key={j} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: "var(--red-bg)", color: "var(--red)", fontWeight: 500 }}>
                  {issue}
                </span>
              ))}
            </div>
          )}

          {popupSuggestionBase ? (
            <div style={{ padding: "10px 12px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Suggested rewrite
              </div>
              <textarea
                value={popupDraft}
                onChange={(e) => { setPopupDraft(e.target.value); patchBulletRewrite(popup.bulletIdx, e.target.value); }}
                rows={4}
                style={{
                  width: "100%", boxSizing: "border-box", fontSize: 12, lineHeight: 1.55,
                  color: "var(--text)", border: "1px solid var(--border-h)", borderRadius: 6,
                  padding: "8px 10px", resize: "vertical", fontFamily: "inherit",
                  background: "var(--bg)", outline: "none",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.background = "var(--surface2)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-h)"; e.target.style.background = "var(--bg)"; }}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                {popupDraft !== popupSuggestionBase && (
                  <button
                    type="button"
                    onClick={() => { setPopupDraft(popupSuggestionBase); patchBulletRewrite(popup.bulletIdx, null); }}
                    style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-h)", background: "var(--surface2)", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}
                  >Reset</button>
                )}
                <button
                  type="button"
                  onClick={async (e) => { e.stopPropagation(); try { await navigator.clipboard.writeText(popupDraft); } catch { /* ignore */ } }}
                  style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(63,185,80,0.45)", background: "var(--green-bg)", color: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                >Copy</button>
                {popupPreviewApplied ? (
                  <button
                    type="button"
                    onClick={() => { patchPreviewLine(popup.bulletIdx, null); setPopup(null); }}
                    style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--amber)", background: "var(--amber-bg)", color: "var(--amber-h)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                  >Revert</button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { patchPreviewLine(popup.bulletIdx, popupDraft.trim()); setPopup(null); }}
                    style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, boxShadow: "var(--shadow-sm)" }}
                  >Apply to preview</button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: "10px 12px 14px" }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10, lineHeight: 1.5 }}>
                No auto-rewrite passed quality checks for this bullet. Generate one with AI.
              </div>
              <button
                type="button"
                disabled={aiRewritingIdx === popup.bulletIdx}
                onClick={(e) => {
                  e.stopPropagation();
                  requestPopupAiRewrite(
                    popup.bulletIdx,
                    bulletAnalysis[popup.bulletIdx]?.originalBullet ?? "",
                    activeCategory ?? "",
                  );
                }}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid rgba(139,92,246,0.4)",
                  background: aiRewritingIdx === popup.bulletIdx ? "var(--surface2)" : "rgba(139,92,246,0.1)",
                  color: aiRewritingIdx === popup.bulletIdx ? "var(--dim)" : "rgb(139,92,246)",
                  fontSize: 12, fontWeight: 600,
                  cursor: aiRewritingIdx === popup.bulletIdx ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {aiRewritingIdx === popup.bulletIdx ? "Generating…" : "✦ Generate AI rewrite"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyTiny({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={async (e) => { e.stopPropagation(); try { await navigator.clipboard.writeText(text); } catch { /* ignore */ } }}
      style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(63,185,80,0.4)", background: "var(--green-bg)", color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}
    >Copy</button>
  );
}
