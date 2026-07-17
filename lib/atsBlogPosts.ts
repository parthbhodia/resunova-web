/** Blog index metadata for ATS / career content. */

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  readMinutes: number;
  tag: string;
  publishedAt?: string;
  /**
   * The post's single headline number, e.g. "38%". Data posts have one; guides
   * don't, and we never invent one to fill the slot (a fabricated stat on a
   * research index is worse than an empty slot). Both the blog index and the
   * post's OG image render this, so it lives here rather than in either of
   * them: the social card and the index cannot claim different figures for the
   * same post.
   */
  stat?: string;
  /**
   * What `stat` is counting. Required whenever `stat` is set: a bare "13" next
   * to a headline about applicant counts reads as "13 applicants" when it
   * actually means "13 required skills per posting". A number without its unit
   * is not a finding, it's a decoration.
   */
  statLabel?: string;
};

/**
 * Whether a post leads with a measured number.
 *
 * Keyed off `stat` rather than off `tag`, deliberately. The blog index gives
 * these posts a stat-led card and everything else a plain row, so grouping by
 * tag would put a stat-less post (e.g. the "Research"-tagged ATS parsing
 * explainer) into a wall of numbers with an empty hole where its number should
 * be. This way the rule is structural: a post gets the card treatment if, and
 * only if, it actually has a finding to lead with.
 */
export function hasFinding(post: BlogPostMeta): boolean {
  return Boolean(post.stat);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Format an ISO date for display. Parsed by hand rather than via `new Date()`:
 * "2026-07-16" parses as UTC midnight, so toLocaleDateString renders "Jul 15"
 * anywhere west of Greenwich. This is a static export, so that wrong date would
 * be baked into the HTML at build time.
 */
export function formatPublishedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "linkedin-applicant-count-clicks-not-applications",
    title: "LinkedIn's Applicant Count Is Measuring Clicks, Not Applications",
    description:
      "For postings that redirect to a company's own site, LinkedIn keeps no record of who applied. Add the 42% who don't meet requirements and the median posting's 13 hard requirements, and '127 applicants' is a much smaller number of real competitors.",
    readMinutes: 6,
    tag: "Data",
    publishedAt: "2026-07-16",
    stat: "13",
    statLabel: "median hard requirements per US posting",
  },
  {
    slug: "ghost-jobs-duplicate-postings",
    title: "We 7x'd Our Job-Board Coverage Overnight. 13,000 of the New Postings Were Duplicates.",
    description:
      "Turning on six new ATS integrations 7x'd our daily ingest, and about 38% of that day's new postings turned out to be the same job reposted over and over. What we found, why it happens, and the dedupe pass that now runs continuously.",
    readMinutes: 5,
    tag: "Data",
    publishedAt: "2026-07-14",
    stat: "38%",
    statLabel: "of one day's new postings were exact duplicates",
  },
  {
    slug: "salary-transparency-by-seniority",
    title: "The Higher the Job, the More They Hide the Pay",
    description:
      "Salary disclosure across 109,159 active US postings: entry-level roles list pay 41% of the time, directors 14%. The gap survives industry controls, and it changes how you should job hunt.",
    readMinutes: 5,
    tag: "Data",
    publishedAt: "2026-07-14",
    // Kept as the full delta, not truncated to "14%": the gap between entry
    // level and director IS the finding, and the OG card already ships it this
    // way. ASCII "->" rather than a U+2192 arrow because next/og renders the OG
    // image through Satori with a generic sans stack, where the arrow glyph
    // risks tofu.
    stat: "41% -> 14%",
    statLabel: "pay disclosure, entry level to director",
  },
  {
    slug: "sp100-tech-hiring-2026",
    title: "What 13,128 Live Job Postings at S&P 100 Companies Reveal About Tech Hiring",
    description:
      "Live data from ~50 S&P 100 career APIs: remote is 3x rarer at the giants, the big-company pay premium is gone, and two companies advertise below their own federal wage filings.",
    readMinutes: 6,
    tag: "Data",
    publishedAt: "2026-07-06",
    // This post has no opengraph-image.tsx, so unlike the other three there was
    // no existing stat to lift. Authored from the post's own body: "78.8% are
    // onsite and only 4.6% are remote. The rest of the market posts 13.7%
    // remote" (which is the 3x claim in the post's own description).
    stat: "4.6%",
    statLabel: "of big-company tech roles are remote (market: 13.7%)",
  },
  {
    slug: "tailor-resume-to-job-description",
    title: "How to Tailor Your Resume to a Job Description (Step-by-Step)",
    description:
      "Keyword extraction, bullet rewrites, ATS checks, and the mistakes that get you filtered out: a complete tailoring playbook.",
    readMinutes: 7,
    tag: "Guide",
    publishedAt: "2026-06-10",
  },
  {
    slug: "how-ats-really-works",
    title: "How ATS Really Works (And Why You're Invisible, Not Rejected)",
    description:
      "Parsing tests across Workday, Greenhouse, Lever, and more: exact job titles, keyword bands, layout traps, and the quick-fix checklist.",
    readMinutes: 8,
    tag: "Research",
    publishedAt: "2026-05-15",
  },
  {
    slug: "optimizing-resumes-for-ats",
    title: "Optimizing Résumés for Applicant Tracking Systems",
    description:
      "UIC Office of Career Services guidance: formatting, keywords in context, and what parsers can and cannot read.",
    readMinutes: 6,
    tag: "Guide",
    publishedAt: "2026-05-01",
  },
];

export function blogPostHref(slug: string): string {
  return `/blog/${slug}`;
}

export function blogPostBySlug(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
