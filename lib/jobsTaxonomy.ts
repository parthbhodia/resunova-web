/**
 * Shared role + location taxonomy for the Jobs wizard and feed.
 *
 * Why this exists: the backend buckets a typed role into ~16 coarse `role_family`
 * values, so "Frontend Engineer" alone returns the whole `software` family. Each
 * role suggestion therefore carries `titleTerms` — substrings OR'd into the
 * server-side title filter (`?title_any=`) so a pick narrows to the real job
 * title, not just the family. Likewise the free-text `location` box silently
 * missed "New York, NY" when a user typed "New York City"; each metro carries
 * `locationTerms` (alias group) sent as `?location_any=` so the dominant ATS
 * formats all match. One source of truth, imported by the wizard and the feed.
 */

export type RoleSuggestion = {
  label: string;
  /** Title substrings OR'd into the server-side title filter so the pick narrows
   *  to the actual job title (not just the coarse role_family bucket). */
  titleTerms: string[];
};

export const ROLE_SUGGESTIONS: RoleSuggestion[] = [
  { label: "Software Engineer", titleTerms: ["software engineer", "software developer", "swe"] },
  { label: "Frontend Engineer", titleTerms: ["front end", "frontend", "front-end", "ui engineer"] },
  { label: "Backend Engineer", titleTerms: ["back end", "backend", "back-end", "server engineer"] },
  { label: "Full-Stack Engineer", titleTerms: ["full stack", "full-stack", "fullstack"] },
  { label: "Mobile Engineer (iOS / Android)", titleTerms: ["ios engineer", "android engineer", "mobile engineer", "mobile developer"] },
  { label: "DevOps / SRE", titleTerms: ["devops", "sre", "site reliability", "platform engineer", "infrastructure engineer"] },
  { label: "Data Engineer", titleTerms: ["data engineer", "analytics engineer"] },
  { label: "Data Scientist", titleTerms: ["data scientist", "applied scientist"] },
  { label: "Machine Learning Engineer", titleTerms: ["machine learning", "ml engineer", "ai engineer"] },
  { label: "Data Analyst", titleTerms: ["data analyst", "business analyst", "bi analyst"] },
  { label: "Product Manager", titleTerms: ["product manager", "product owner"] },
  { label: "Product Designer (UX / UI)", titleTerms: ["product designer", "ux designer", "ui designer", "ux/ui"] },
  { label: "QA / Test Engineer", titleTerms: ["qa engineer", "test engineer", "quality assurance", "sdet"] },
  { label: "Security Engineer", titleTerms: ["security engineer", "application security", "appsec", "cybersecurity"] },
  { label: "Sales / Account Executive", titleTerms: ["account executive", "sales representative", "business development"] },
  { label: "Marketing Manager", titleTerms: ["marketing manager", "growth marketing", "demand generation"] },
  { label: "Customer Success Manager", titleTerms: ["customer success", "account manager", "implementation specialist"] },
  { label: "Recruiter / Talent", titleTerms: ["recruiter", "talent acquisition", "sourcer"] },
  { label: "Financial Analyst", titleTerms: ["financial analyst", "fp&a", "finance analyst"] },
  { label: "Project / Program Manager", titleTerms: ["project manager", "program manager", "delivery manager"] },
];

export type MetroSuggestion = {
  label: string;
  /** Short alias hint shown under the label in the dropdown. */
  sub?: string;
  /** Location substrings OR'd into the server-side location filter so the dominant
   *  ATS formats (e.g. "New York, NY", "NYC", "Manhattan") all match one pick. */
  locationTerms: string[];
  /** When true this is the "Remote" pseudo-location — sends work_model=remote
   *  instead of a location substring filter. */
  remote?: boolean;
};

/** Default location — all US locations (no narrowing). Resunova targets US users
 *  only, so this is pre-selected. It's a sentinel: it sends NO location filter
 *  (skipped in browseSelectionToParams + JobsFeed.appendBrowseParams). */
export const NATIONWIDE_LOCATION = "United States";

export const US_METROS: MetroSuggestion[] = [
  { label: NATIONWIDE_LOCATION, sub: "All US locations · nationwide", locationTerms: [] },
  { label: "Remote (anywhere in the US)", sub: "Work-from-anywhere roles", locationTerms: [], remote: true },
  { label: "New York, NY", sub: "NYC · Manhattan · Brooklyn · Queens", locationTerms: ["new york", "nyc", "manhattan", "brooklyn"] },
  { label: "San Francisco Bay Area, CA", sub: "SF · Oakland · South Bay", locationTerms: ["san francisco", "bay area", "oakland", "palo alto", "mountain view", "san jose", "sunnyvale"] },
  { label: "Los Angeles, CA", sub: "LA · Santa Monica · Pasadena", locationTerms: ["los angeles", "santa monica", "pasadena", "culver city"] },
  { label: "Seattle, WA", sub: "Seattle · Bellevue · Redmond", locationTerms: ["seattle", "bellevue", "redmond"] },
  { label: "Boston, MA", sub: "Boston · Cambridge", locationTerms: ["boston", "cambridge"] },
  { label: "Washington, DC", sub: "DC · Arlington · Bethesda · Reston", locationTerms: ["washington, dc", "washington dc", "arlington", "bethesda", "reston"] },
  { label: "Austin, TX", locationTerms: ["austin"] },
  { label: "Chicago, IL", locationTerms: ["chicago"] },
  { label: "Denver, CO", sub: "Denver · Boulder", locationTerms: ["denver", "boulder"] },
  { label: "Atlanta, GA", locationTerms: ["atlanta"] },
  { label: "Dallas–Fort Worth, TX", sub: "Dallas · Fort Worth · Plano", locationTerms: ["dallas", "fort worth", "plano", "irving"] },
  { label: "Miami, FL", locationTerms: ["miami"] },
  { label: "San Diego, CA", locationTerms: ["san diego"] },
  { label: "Houston, TX", locationTerms: ["houston"] },
  { label: "Phoenix, AZ", locationTerms: ["phoenix", "tempe", "scottsdale"] },
];

/** Rank suggestions: label-prefix matches first, then any substring match. */
export function matchRoleSuggestions(query: string, limit = 6): RoleSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return ROLE_SUGGESTIONS.slice(0, limit);
  const starts: RoleSuggestion[] = [];
  const incl: RoleSuggestion[] = [];
  for (const r of ROLE_SUGGESTIONS) {
    const hay = `${r.label} ${r.titleTerms.join(" ")}`.toLowerCase();
    if (r.label.toLowerCase().startsWith(q)) starts.push(r);
    else if (hay.includes(q)) incl.push(r);
  }
  return [...starts, ...incl].slice(0, limit);
}

export function matchMetros(query: string, limit = 6): MetroSuggestion[] {
  const q = query.trim().toLowerCase();
  // Surface "United States" (the nationwide default) first, then Remote, then cities.
  const nationwide = US_METROS.filter((m) => m.label === NATIONWIDE_LOCATION);
  const remote = US_METROS.filter((m) => m.remote);
  const cities = US_METROS.filter((m) => !m.remote && m.label !== NATIONWIDE_LOCATION);
  if (!q) return [...nationwide, ...remote, ...cities].slice(0, limit);
  const starts: MetroSuggestion[] = [];
  const incl: MetroSuggestion[] = [];
  for (const m of cities) {
    const hay = `${m.label} ${m.sub || ""} ${m.locationTerms.join(" ")}`.toLowerCase();
    if (m.label.toLowerCase().startsWith(q)) starts.push(m);
    else if (hay.includes(q)) incl.push(m);
  }
  const remoteHit = "remote".includes(q) || q.includes("remote") ? remote : [];
  const nationwideHit = "united states".includes(q) || "usa nationwide america".includes(q) ? nationwide : [];
  return [...nationwideHit, ...remoteHit, ...starts, ...incl].slice(0, limit);
}

/** Experience-level buckets → the granular `seniority` values the corpus stores.
 * Single source of truth shared by the onboarding wizard and JobsFeed's filter
 * chip so the two never drift. Sent to the backend as `?seniority_any=`. */
export const SENIORITY_BUCKET_VALS: Record<string, string[]> = {
  entry: ["intern", "entry"],
  mid: ["mid"],
  senior: ["senior"],
  lead: ["lead", "principal", "director", "executive"],
};

/** What the wizard hands back to the feed when the user browses/skips. */
export type JobsBrowseSelection = {
  /** The role label/text (drives the backend role_family classification). */
  role: string;
  /** Title aliases for the server-side title filter. */
  titleTerms: string[];
  /** The location label/text (display only). */
  location: string;
  /** Location aliases for the server-side location filter. */
  locationTerms: string[];
  /** "remote" when the Remote metro was chosen, else "". */
  workModel: string;
  /** Experience-level bucket key (entry|mid|senior|lead) or "" for any. */
  seniority: string;
};

export function browseSelectionToParams(sel: JobsBrowseSelection): URLSearchParams {
  const p = new URLSearchParams();
  if (sel.role.trim()) p.set("role", sel.role.trim());
  if (sel.titleTerms.length) p.set("title_any", sel.titleTerms.join("|"));
  if (sel.locationTerms.length) p.set("location_any", sel.locationTerms.join("|"));
  // Skip the free-text location when Remote or the "United States" nationwide
  // default is chosen — neither is a place to narrow on (US-only corpus already).
  // Only free-text city searches (no workModel) send it.
  else if (sel.location.trim() && sel.location.trim() !== NATIONWIDE_LOCATION && !sel.workModel) p.set("location", sel.location.trim());
  if (sel.workModel) p.set("work_model", sel.workModel);
  const senVals = sel.seniority ? SENIORITY_BUCKET_VALS[sel.seniority] : undefined;
  if (senVals?.length) p.set("seniority_any", senVals.join("|"));
  return p;
}
