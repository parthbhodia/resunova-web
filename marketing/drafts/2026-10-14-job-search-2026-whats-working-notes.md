# Draft notes: Job search 2026 — what's working

**Status:** DRAFT on branch `blog/job-search-2026-whats-working`. Not published. No PR opened.

**Slug:** `job-search-2026-whats-working`  
**Title:** Most of Your Job Search Shouldn't Be Applications  
**publishedAt:** 2026-10-14  
**Files:**
- `app/blog/job-search-2026-whats-working/page.tsx`
- `lib/atsBlogPosts.ts` (Guide tag, no fabricated `stat`)

## External sources used in draft

1. https://www.gem.com/blog/key-takeaways-from-the-2026-recruiting-benchmarks-report
2. https://www.gem.com/resource/recruiting-benchmarks
3. https://www.ashbyhq.com/talent-trends-report/reports/recruiting-operations-benchmarks-talent-trends
4. https://www.ashbyhq.com/talent-trends-report/reports/referrals
5. https://www.glassdoor.com/blog/ai-has-not-killed-online-job-applications/
6. https://www.cnbc.com/2026/01/12/cold-applying-is-still-the-no-1-way-to-get-a-new-job-but-this-method-is-quickly-getting-more-common.html
7. https://www.cnbc.com/2026/01/22/recruiting-pro-of-30-years-if-i-was-looking-for-a-job-in-2026-i-would-honestly-stop-applying-online.html
8. LinkedIn Labor Market Report Jan 2026 PDF (3.6× hire if connected to employee)
9. https://news.linkedin.com/2026/LinkedIn-Research-Talent-2026
10. https://news.linkedin.com/2026/Grads-Guide-2026
11. https://huntr.co/research/best-job-boards
12. https://huntr.co/research/2025-annual-job-search-trends-report
13. https://huntr.co/research/job-search-trends-q1-2026
14. https://huntr.co/research/job-search-trends-q2-2026
15. https://www.linkedin.com/pulse/job-searching-2026-whats-actually-working-sarah-felice-ku2yc

## Reddit / social title variants

1. Most of your job search shouldn't be applications. Here's the 2025–2026 evidence.
2. Referrals convert ~11× inbound (Gem). Cold apply still lands most offers (Glassdoor). Both can be true.
3. I stopped optimizing for Easy Apply volume after reading Gem, Ashby, and Huntr side by side.

## On-page SEO pass (2026-10-14)

Done:
- Title 49 chars; seoDescription 148 chars, front-loaded "Job search 2026"
- `robots: index,follow` via `createBlogPostMetadata`; sitemap + llms.txt + RSS via `BLOG_POSTS`
- Schema: FAQPage only in page (BlogPosting + Breadcrumb from layout); removed duplicate Article
- H2s retitled for primary keywords; keyword in first 100 words
- Adobe CDN PDF replaced with LinkedIn Talent Community summary URL
- 15 visible source links in Sources; 2 internal links (tailor + how-ats)
- CTA → `/?view=analyze`
- blogSeo + blogConversion: 27/27 pass

Not done (needs live deploy): Rich Results Test, GSC URL inspection, CWV.

## Next posts in series (not drafted)

2. Job search strategy / weekly OS (Pante-inspired)
3. Resume that gets noticed (Seaman-inspired)
4. ATS paste/parse (park unless new primary evidence)
5. How recruiters sort Workday/Greenhouse/Lever/Ashby
