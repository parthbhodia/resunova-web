/**
 * Location/country helpers for the Jobs feed.
 *
 * Job postings carry only a free-text `location` string ("Austin, TX",
 * "Manila, Philippines", "Remote (US)") — there is no structured country/state
 * column in `job_postings`. So country/state matching is done here against that
 * text. Kept in a lib (not inline in JobsFeed) so it is unit-testable.
 */

/** US states + DC. A job's free-text location matches a state by full name or a
 *  boundary-delimited 2-letter abbr (", CA"). */
export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

const US_STATE_BY_CODE: Record<string, string> = Object.fromEntries(US_STATES.map((s) => [s.code, s.name]));

/** A job's free-text location matches a state by full name or boundary-delimited abbr (", CA"). */
export function locationMatchesState(location: string, code: string): boolean {
  const raw = location || "";
  const name = US_STATE_BY_CODE[code];
  if (!name) return false;
  if (raw.toLowerCase().includes(name.toLowerCase())) return true;
  // Abbreviations are uppercase by convention ("Austin, TX") — match case-sensitively
  // so prose like "Remote in US" doesn't false-match IN / OR / etc.
  return new RegExp(`(^|[\\s,(/])${code}([\\s,)/.]|$)`).test(raw);
}

/** Explicit US country tokens (boundary-delimited so "Houston"/"campus" don't false-match). */
const US_COUNTRY_RE = /(^|[^a-z])(usa|u\.s\.a|u\.s|united states(?: of america)?)([^a-z]|$)/i;
const US_ABBR_RE = /(^|[\s,(/–-])us([\s,)/.–-]|$)/i; // ", US" / "Remote (US)" / "US-Remote"

/** Does this free-text location positively look like a US posting?
 *  True if it names a US state (full name or ", XX" abbr) or carries an explicit
 *  US token ("United States", "USA", boundary "US"). */
export function isUSLocation(location: string): boolean {
  const raw = (location || "").trim();
  if (!raw) return false;
  if (US_COUNTRY_RE.test(raw) || US_ABBR_RE.test(raw)) return true;
  return US_STATES.some((s) => locationMatchesState(raw, s.code));
}

/** Foreign country names/tokens that show up in ATS location strings. Deliberately
 *  EXCLUDES names that collide with US states (e.g. "Georgia") — those are caught
 *  by the isUSLocation gate below instead. Matched whole-word. */
const FOREIGN_COUNTRIES: string[] = [
  "philippines", "india", "south korea", "north korea", "korea", "china", "hong kong",
  "taiwan", "japan", "singapore", "vietnam", "thailand", "indonesia", "malaysia",
  "pakistan", "bangladesh", "sri lanka", "nepal", "canada", "mexico", "brazil",
  "argentina", "colombia", "chile", "peru", "uruguay", "ecuador", "guatemala",
  "costa rica", "panama", "dominican republic", "united kingdom", "uk", "u.k",
  "england", "scotland", "wales", "ireland", "germany", "france", "spain", "italy",
  "netherlands", "portugal", "poland", "romania", "ukraine", "czech republic",
  "czechia", "hungary", "greece", "sweden", "norway", "denmark", "finland",
  "switzerland", "austria", "belgium", "turkey", "russia", "bulgaria", "croatia",
  "serbia", "slovakia", "slovenia", "lithuania", "latvia", "estonia", "israel",
  "united arab emirates", "uae", "dubai", "abu dhabi", "saudi arabia", "qatar",
  "egypt", "morocco", "tunisia", "nigeria", "kenya", "ghana", "south africa",
  "australia", "new zealand", "bengaluru", "bangalore", "hyderabad", "pune",
  "mumbai", "chennai", "gurgaon", "noida", "manila", "cebu", "seoul", "shanghai",
  "beijing", "shenzhen", "toronto", "vancouver", "montreal", "london", "dublin",
  "berlin", "munich", "paris", "amsterdam", "warsaw", "krakow", "bucharest",
];

const FOREIGN_RES = FOREIGN_COUNTRIES.map(
  (c) => new RegExp(`(^|[^a-z])${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`),
);

/** Is this posting clearly outside the US? True only when the location names a
 *  known foreign country/major-foreign-city AND carries no positive US signal.
 *  Conservative on purpose: a positive US signal always wins (so "Georgia, US"
 *  or "Turkey, TX" are never flagged), and ambiguous strings ("Remote", a bare
 *  city) are NOT flagged — they stay visible under the US filter. */
export function isClearlyInternational(location: string): boolean {
  const raw = (location || "").trim();
  if (!raw) return false;
  if (isUSLocation(raw)) return false;
  const lower = raw.toLowerCase();
  return FOREIGN_RES.some((re) => re.test(lower));
}
