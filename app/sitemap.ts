import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { BLOG_LAST_MODIFIED, BLOG_POSTS } from "@/lib/atsBlogPosts";
import { ROLE_RESUME_DATA, ROLE_DATA_LAST_UPDATED, roleResumeHref, skillsForResumeHref } from "@/lib/roleResumeData";
import { COMPARISONS, comparisonHref } from "@/lib/competitorComparison";
import { JOBS_GENERATED_AT, PUBLIC_JOBS, jobHref } from "@/lib/jobsSeoData";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/blog/`, lastModified: new Date(BLOG_LAST_MODIFIED), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/blog/methodology/`, lastModified: new Date(BLOG_LAST_MODIFIED), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/resume-examples/`, lastModified: new Date(ROLE_DATA_LAST_UPDATED), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/ats-resume-checker/`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/cover-letter/`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/skills-for-resume/`, lastModified: new Date(ROLE_DATA_LAST_UPDATED), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/template-builder/`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/templates/`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/terms/`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy/`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/contact/`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/jobs/`, lastModified: JOBS_GENERATED_AT ? new Date(JOBS_GENERATED_AT) : new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}/`,
    lastModified: new Date(post.modifiedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const roleExamplePages: MetadataRoute.Sitemap = ROLE_RESUME_DATA.map((role) => ({
    url: `${SITE_URL}${roleResumeHref(role.slug)}/`,
    lastModified: new Date(ROLE_DATA_LAST_UPDATED),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const skillsPages: MetadataRoute.Sitemap = ROLE_RESUME_DATA.map((role) => ({
    url: `${SITE_URL}${skillsForResumeHref(role.slug)}/`,
    lastModified: new Date(ROLE_DATA_LAST_UPDATED),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const comparePages: MetadataRoute.Sitemap = COMPARISONS.map((c) => ({
    url: `${SITE_URL}${comparisonHref(c.slug)}/`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const jobPages: MetadataRoute.Sitemap = PUBLIC_JOBS.map((job) => ({
    url: `${SITE_URL}${jobHref(job.id)}/`,
    lastModified: job.postedAt ? new Date(job.postedAt) : (JOBS_GENERATED_AT ? new Date(JOBS_GENERATED_AT) : new Date()),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages, ...roleExamplePages, ...skillsPages, ...comparePages, ...jobPages];
}
