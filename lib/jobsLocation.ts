/**
 * Location/country helpers for the Jobs feed.
 *
 * Job postings carry only a free-text `location` string ("Austin, TX",
 * "San Francisco", "Manila, Philippines", "Remote (US)") — there is NO structured
 * country/state column in `job_postings`. So country/state scoping is done here
 * against that text. Calibrated against the real prod corpus (54k postings); kept
 * in a lib (not inline in JobsFeed) so it is unit-testable.
 *
 * Strategy for the "US only" feed scope: hide a posting only when it is CLEARLY
 * international (names a foreign country, region, or major foreign city) and has
 * no positive US signal. US postings and ambiguous strings ("Remote", "Hybrid",
 * a bare US city) stay visible — we never hide something that might be US.
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

// Explicit US country tokens. "US"/"U.S." only as a boundary token so "Houston",
// "campus" etc. don't false-match; matched against the raw (mixed-case) string.
const US_COUNTRY_RE = /(^|[^a-z])(united states(?: of america)?|usa|u\.s\.a)([^a-z]|$)/i;
const US_TOKEN_RE = /(^|[\s,(>|/–-])(us|u\.s\.)([\s,)<|/.–-]|$)/i; // "Remote - US", ", US", "US > AZ", "US-CA-…"

/** Major US metros that frequently appear WITHOUT a state ("San Francisco",
 *  "Chicago"). Lowercased, whole-word matched. Deliberately omits names that
 *  collide with foreign cities (Cambridge, Manchester, Birmingham) — those fall
 *  through to ambiguous and stay visible. */
const US_CITIES = new Set<string>([
  "san francisco", "san francisco bay area", "new york city", "nyc", "brooklyn",
  "los angeles", "san jose", "san diego", "sacramento", "oakland", "palo alto",
  "mountain view", "menlo park", "sunnyvale", "santa clara", "redwood city",
  "foster city", "san mateo", "south san francisco", "seattle", "bellevue",
  "redmond", "chicago", "boston", "somerville", "austin", "dallas", "houston",
  "fort worth", "san antonio", "denver", "boulder", "colorado springs", "phoenix",
  "scottsdale", "tempe", "atlanta", "miami", "orlando", "tampa", "jacksonville",
  "charlotte", "raleigh", "nashville", "philadelphia", "pittsburgh", "baltimore",
  "arlington", "reston", "mclean", "minneapolis", "cincinnati", "columbus",
  "cleveland", "indianapolis", "salt lake city", "las vegas", "irvine",
  "long beach", "torrance", "el segundo", "santa monica", "pasadena",
]);

function hasWord(lowerHaystack: string, needle: string): boolean {
  return new RegExp(`(^|[^a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(lowerHaystack);
}

/** Does this free-text location positively look like a US posting? True if it
 *  names a US state (name or ", XX" abbr), carries an explicit US token, or is a
 *  known major US metro. */
export function isUSLocation(location: string): boolean {
  const raw = (location || "").trim();
  if (!raw) return false;
  if (US_COUNTRY_RE.test(raw) || US_TOKEN_RE.test(raw)) return true;
  if (US_STATES.some((s) => locationMatchesState(raw, s.code))) return true;
  const lower = raw.toLowerCase();
  for (const city of US_CITIES) if (hasWord(lower, city)) return true;
  return false;
}

/** Foreign countries, regions, and major foreign cities that appear in the
 *  corpus. Matched whole-word. EXCLUDES names that collide with US states/cities
 *  (Georgia, Cambridge, Manchester, Birmingham, Washington) — a positive US
 *  signal is checked first anyway. */
const FOREIGN_TERMS: string[] = [
  // countries
  "philippines", "india", "south korea", "north korea", "korea", "china", "hong kong",
  "taiwan", "japan", "singapore", "vietnam", "thailand", "indonesia", "malaysia",
  "pakistan", "bangladesh", "sri lanka", "nepal", "canada", "mexico", "brazil",
  "brasil", "argentina", "colombia", "chile", "peru", "uruguay", "ecuador",
  "guatemala", "costa rica", "panama", "dominican republic", "united kingdom",
  "uk", "u.k", "england", "scotland", "wales", "ireland", "germany", "deutschland",
  "france", "spain", "italy", "netherlands", "portugal", "poland", "romania",
  "ukraine", "czech republic", "czechia", "hungary", "greece", "sweden", "norway",
  "denmark", "finland", "switzerland", "austria", "belgium", "turkey", "russia",
  "bulgaria", "croatia", "serbia", "slovakia", "slovenia", "lithuania", "latvia",
  "estonia", "israel", "united arab emirates", "uae", "saudi arabia", "qatar",
  "egypt", "morocco", "tunisia", "nigeria", "kenya", "ghana", "south africa",
  "australia", "new zealand",
  // regions (non-US)
  "europe", "emea", "latam", "latin america", "apac", "united kingdom",
  // major foreign cities seen in the corpus
  "london", "paris", "berlin", "munich", "hamburg", "frankfurt", "amsterdam",
  "dublin", "madrid", "barcelona", "lisbon", "milan", "rome", "zurich", "geneva",
  "brussels", "stockholm", "copenhagen", "oslo", "helsinki", "warsaw", "krakow",
  "wroclaw", "prague", "budapest", "bucharest", "vilnius", "tallinn", "riga",
  "kyiv", "kiev", "sofia", "belgrade", "zagreb", "athens", "istanbul", "tel aviv",
  "toronto", "vancouver", "montreal", "montréal", "ottawa", "calgary", "mississauga",
  "sao paulo", "são paulo", "rio de janeiro", "belo horizonte", "buenos aires",
  "mexico city", "bogota", "bogotá", "santiago", "lima", "monterrey", "guadalajara",
  "bengaluru", "bangalore", "hyderabad", "mumbai", "delhi", "new delhi", "chennai",
  "pune", "gurgaon", "gurugram", "noida", "kolkata", "ahmedabad",
  "manila", "cebu", "seoul", "pangyo", "tokyo", "osaka", "shanghai", "beijing",
  "shenzhen", "guangzhou", "taipei", "bangkok", "jakarta", "kuala lumpur",
  "ho chi minh city", "hanoi", "auckland", "sydney", "melbourne", "brisbane",
  "perth", "cape town", "johannesburg", "nairobi", "lagos", "cairo", "dubai",
  "abu dhabi", "remoto",
];

const FOREIGN_RES = FOREIGN_TERMS.map(
  (c) => new RegExp(`(^|[^a-z])${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`),
);

/** Is this posting clearly outside the US? True only when the location names a
 *  known foreign country/region/major-foreign-city AND carries no positive US
 *  signal. Conservative on purpose: a positive US signal always wins (so
 *  "Atlanta, GA", "Vancouver, WA", "Turkey, TX" are never flagged), and ambiguous
 *  strings ("Remote", "Hybrid", a bare unknown city) are NOT flagged — they stay
 *  visible under the US filter. */
export function isClearlyInternational(location: string): boolean {
  const raw = (location || "").trim();
  if (!raw) return false;
  if (isUSLocation(raw)) return false;
  const lower = raw.toLowerCase();
  return FOREIGN_RES.some((re) => re.test(lower));
}
