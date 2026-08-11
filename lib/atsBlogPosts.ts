import type { Metadata } from "next";
import { SITE_URL } from "@/lib/brand";

/** Blog index metadata for ATS / career content. */

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  seoDescription: string;
  readMinutes: number;
  tag: string;
  publishedAt: string;
  modifiedAt: string;
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
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "linkedin-applicant-count-clicks-not-applications",
    title: "LinkedIn's Applicant Count Is Measuring Clicks, Not Applications",
    description:
      "For postings that redirect to a company's own site, LinkedIn keeps no record of who applied. Add the 42% who don't meet requirements and the median posting's 13 hard requirements, and '127 applicants' is a much smaller number of real competitors.",
    seoDescription:
      "LinkedIn applicant counts can include clicks that never become applications. See employer data and findings from 164,913 active US job postings.",
    readMinutes: 6,
    tag: "Data",
    publishedAt: "2026-07-16",
    modifiedAt: "2026-07-16",
    stat: "13",
    statLabel: "median hard requirements per US posting",
  },
  {
    slug: "ghost-jobs-duplicate-postings",
    title: "We 7x'd Our Job-Board Coverage Overnight. 13,000 of the New Postings Were Duplicates.",
    description:
      "Turning on six new ATS integrations 7x'd our daily ingest, and about 38% of that day's new postings turned out to be the same job reposted over and over. What we found, why it happens, and the dedupe pass that now runs continuously.",
    seoDescription:
      "Six new ATS integrations increased Resunova's job ingest 7x, but 38% of the new listings were exact duplicates. See what caused it and how we fixed it.",
    readMinutes: 5,
    tag: "Data",
    publishedAt: "2026-07-14",
    modifiedAt: "2026-07-14",
    stat: "38%",
    statLabel: "of one day's new postings were exact duplicates",
  },
  {
    slug: "salary-transparency-by-seniority",
    title: "The Higher the Job, the More They Hide the Pay",
    description:
      "Salary disclosure across 109,159 active US postings: entry-level roles list pay 41% of the time, directors 14%. The gap survives industry controls, and it changes how you should job hunt.",
    seoDescription:
      "Salary disclosure across 109,159 active US job postings falls from 41% for entry-level roles to 14% for directors. See the data by seniority.",
    readMinutes: 5,
    tag: "Data",
    publishedAt: "2026-07-14",
    modifiedAt: "2026-07-14",
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
    seoDescription:
      "Analysis of 13,128 live S&P 100 job postings: remote work, in-demand skills, advertised salaries, and federal wage filing comparisons.",
    readMinutes: 6,
    tag: "Data",
    publishedAt: "2026-07-06",
    modifiedAt: "2026-07-06",
    // This post has no opengraph-image.tsx, so unlike the other three there was
    // no existing stat to lift. Authored from the post's own body: "78.8% are
    // onsite and only 4.6% are remote. The rest of the market posts 13.7%
    // remote" (which is the 3x claim in the post's own description).
    stat: "4.6%",
    statLabel: "of big-company tech roles are remote (market: 13.7%)",
  },
  {
    slug: "claude-resume-prompts",
    title: "Claude Resume Prompts That Work (And How to Check What Comes Back)",
    description:
      "Nine copy-paste prompts for scoring, rewriting, and tailoring a resume with Claude, plus the four output checks that catch the mistakes these models reliably make.",
    seoDescription:
      "Nine copy-paste Claude resume prompts for scoring, rewriting, and tailoring, plus the verification checks that catch AI's most common resume mistakes.",
    readMinutes: 8,
    tag: "Guide",
    publishedAt: "2026-08-01",
    modifiedAt: "2026-08-01",
  },
  {
    slug: "ai-resume-rewrite-failure-modes",
    title: "Five Things AI Gets Wrong When It Rewrites Your Resume",
    description:
      "We built validators to catch what language models do to resume bullets: no-op rewrites, quantification claims with no number attached, dropped metrics, and gaps contradicted by the resume itself.",
    seoDescription:
      "Five failure modes in AI resume rewriting, found while building automated validators: no-op edits, false quantification claims, dropped metrics, and more.",
    readMinutes: 7,
    tag: "Research",
    publishedAt: "2026-08-01",
    modifiedAt: "2026-08-01",
  },
  {
    slug: "tailor-resume-to-job-description",
    title: "How to Tailor Your Resume to a Job Description (Step-by-Step)",
    description:
      "Keyword extraction, bullet rewrites, ATS checks, and the mistakes that get you filtered out: a complete tailoring playbook.",
    seoDescription:
      "Tailor your resume to any job description with this step-by-step guide to keyword extraction, bullet rewrites, match scores, and ATS checks.",
    readMinutes: 7,
    tag: "Guide",
    publishedAt: "2026-06-10",
    modifiedAt: "2026-07-18",
  },
  {
    slug: "how-ats-really-works",
    title: "How ATS Really Works (And Why You're Invisible, Not Rejected)",
    description:
      "Parsing tests across Workday, Greenhouse, Lever, and more: exact job titles, keyword bands, layout traps, and the quick-fix checklist.",
    seoDescription:
      "How ATS platforms parse and surface resumes: exact job titles, keyword matching, layout traps, visibility versus rejection, and a practical checklist.",
    readMinutes: 8,
    tag: "Research",
    publishedAt: "2026-05-15",
    modifiedAt: "2026-05-15",
  },
  {
    slug: "optimizing-resumes-for-ats",
    title: "Optimizing Résumés for Applicant Tracking Systems",
    description:
      "UIC Office of Career Services guidance: formatting, keywords in context, and what parsers can and cannot read.",
    seoDescription:
      "ATS resume guidance adapted from UIC Career Services: readable formatting, standard headings, keywords in context, and common parsing mistakes.",
    readMinutes: 6,
    tag: "Guide",
    publishedAt: "2026-05-01",
    modifiedAt: "2026-05-01",
  },
];

export type BlogAuthor = {
  name: string;
  /** Shown after the name in the byline, e.g. "Data, Resunova". */
  role?: string;
  /** An author page or profile. Becomes the Person's `url` in JSON-LD. */
  url?: string;
};

/**
 * The human credited on every post, or `null` to credit the organization.
 *
 * ⚠️ INTENTIONALLY NULL. A named, credentialed author is a real ranking and
 * trust signal for career advice, and every competitor in this space runs one —
 * but the fix is for a real person to put their name here, not for this file to
 * invent one. A fabricated byline on posts whose whole selling point is
 * measured honesty would be the single worst thing on the site.
 *
 * Set it to `{ name: "..." }` and the byline, the article JSON-LD, and every
 * future post pick it up at once; that is the only reason this is one constant
 * rather than a field repeated on all nine posts.
 */
export const BLOG_AUTHOR: BlogAuthor | null = null;

/** Byline display name — the author when one is set, else the organization. */
export function blogAuthorName(): string {
  return BLOG_AUTHOR?.name ?? "Resunova Team";
}

export function blogPostHref(slug: string): string {
  return `/blog/${slug}/`;
}

/** Absolute URL of the blog's RSS feed (app/blog/rss.xml/route.ts). */
export const BLOG_RSS_URL = `${SITE_URL}/blog/rss.xml`;

export function blogPostBySlug(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export const BLOG_LAST_MODIFIED = BLOG_POSTS.reduce(
  (latest, post) => (post.modifiedAt > latest ? post.modifiedAt : latest),
  BLOG_POSTS[0]?.modifiedAt ?? "2026-01-01",
);

export function blogPostCanonical(slug: string): string {
  return `${SITE_URL}${blogPostHref(slug)}`;
}

export function createBlogPostMetadata(slug: string): Metadata {
  const post = blogPostBySlug(slug);
  if (!post) throw new Error(`Unknown blog post: ${slug}`);

  const canonical = blogPostCanonical(slug);
  const publishedTime = `${post.publishedAt}T00:00:00.000Z`;
  const modifiedTime = `${post.modifiedAt}T00:00:00.000Z`;

  return {
    title: post.title,
    description: post.seoDescription,
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      // Feed discovery from every post, not just the index: readers and
      // aggregators land on an article far more often than on /blog/.
      types: { "application/rss+xml": BLOG_RSS_URL },
    },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: "Resunova",
      title: post.title,
      description: post.seoDescription,
      publishedTime,
      modifiedTime,
      images: [`${canonical}opengraph-image.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.seoDescription,
      images: [`${canonical}opengraph-image.png`],
    },
  };
}

export function createBlogPostJsonLd(slug: string): object[] {
  const post = blogPostBySlug(slug);
  if (!post) throw new Error(`Unknown blog post: ${slug}`);

  const canonical = blogPostCanonical(slug);
  return [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.seoDescription,
      image: `${canonical}opengraph-image.png`,
      datePublished: post.publishedAt,
      dateModified: post.modifiedAt,
      // A Person once someone is credited, the Organization until then. Emitting
      // a Person with the org's own name would be worse than the Organization
      // it replaced: it claims a human author that does not exist.
      author: BLOG_AUTHOR
        ? {
            "@type": "Person",
            name: BLOG_AUTHOR.name,
            ...(BLOG_AUTHOR.role ? { jobTitle: BLOG_AUTHOR.role } : {}),
            ...(BLOG_AUTHOR.url ? { url: BLOG_AUTHOR.url } : {}),
          }
        : { "@type": "Organization", name: "Resunova", url: SITE_URL },
      publisher: { "@id": `${SITE_URL}/#org` },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog/` },
        { "@type": "ListItem", position: 3, name: post.title, item: canonical },
      ],
    },
  ];
}
