/**
 * Turns a scraped job description into headings, paragraphs and bullet lists.
 *
 * Shared by the in-app job pane (`/?view=jobs&job=<id>`) and the public job
 * page (`/jobs/<id>`), so the two render one posting the same way. Pure and
 * server-safe: no React, no browser APIs.
 */

// ── JD structuring ──────────────────────────────────────────────────────────
// Scraped JDs arrive as plain text with wildly different shapes: Amazon is prose,
// Ashby/Lever use "-" bullets separated by blank lines, Greenhouse has label:value
// pairs, Workday injects spurious mid-sentence newlines. This parser normalizes
// them into headings / paragraphs / bullet lists so the description reads like
// Indeed's "Full job description" instead of a raw wall of text.
export type JdBlock =
  | { type: "heading"; text: string }
  | { type: "para"; text: string }
  | { type: "list"; items: string[] };

const BULLET_RE = /^\s*(?:[-•*–—●▪◦·‣]|o(?=\s)|\d+[.)])\s+/;
const HEADING_MAX = 70;

function looksLikeHeading(s: string): boolean {
  if (s.length > HEADING_MAX) return false;
  if (/:$/.test(s)) return true;                 // "Minimum qualifications:"
  if (/[.!?,;]$/.test(s)) return false;          // a full sentence
  if (s.split(/\s+/).length > 9) return false;   // too long to be a heading
  return /^[A-Z0-9]/.test(s);                     // starts with a capital / number
}

export function parseJdBlocks(raw: string): JdBlock[] {
  const text = (raw || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+$/gm, "")   // strip trailing whitespace per line
    .replace(/\n{3,}/g, "\n\n")    // collapse blank-line runs
    .trim();
  if (!text) return [];

  // Some sources (AppOne, some scraped boards) strip EVERY blank line at
  // ingest, so "blank line = paragraph break" collapses the whole JD into one
  // blob paragraph. When a multi-line JD has no blank lines at all, treat each
  // newline as a hard break instead; the fragment-merge pass below re-joins
  // genuinely wrapped sentences, and heading detection recovers the sections.
  const lines = text.split("\n");
  const hardLineMode = lines.length >= 6 && !/\n[^\S\n]*\n/.test(text);

  // Pass 1 — split into raw paragraphs and bullet lists (no heading detection yet).
  const raw1: JdBlock[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  const flushPara = () => {
    if (!para.length) return;
    const joined = para.join(" ").replace(/\s{2,}/g, " ").trim();
    para = [];
    if (joined) raw1.push({ type: "para", text: joined });
  };
  const flushList = () => {
    if (list && list.length) raw1.push({ type: "list", items: list });
    list = null;
  };
  for (const line of lines) {
    const t = line.trim();
    if (t === "") {
      // Blank line ends a paragraph but keeps a pending list open, so
      // blank-separated bullets (Ashby) still merge into one list.
      flushPara();
      continue;
    }
    if (BULLET_RE.test(t)) {
      flushPara();
      (list ??= []).push(t.replace(BULLET_RE, "").trim());
      continue;
    }
    flushList();          // a non-bullet line ends any open list
    para.push(t);          // single newlines join into one paragraph
    if (hardLineMode) flushPara();
  }
  flushPara();
  flushList();

  // Pass 2 — re-join sentence fragments split by spurious mid-sentence breaks
  // (Workday's double-newlines): a paragraph with no terminal punctuation
  // followed by one that starts lowercase is really a single sentence.
  const merged: JdBlock[] = [];
  for (const b of raw1) {
    const prev = merged[merged.length - 1];
    if (b.type === "para" && prev && prev.type === "para" && !/[.!?:;]$/.test(prev.text) && /^[a-z]/.test(b.text)) {
      prev.text = `${prev.text} ${b.text}`.replace(/\s{2,}/g, " ");
    } else {
      merged.push(b.type === "list" ? { type: "list", items: b.items } : { type: "para", text: b.text });
    }
  }

  // Pass 3 — classify short, title-ish paragraphs as headings.
  return merged.map((b) => (b.type === "para" && looksLikeHeading(b.text) ? { type: "heading", text: b.text } : b));
}

