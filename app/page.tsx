import type { Metadata } from "next";
import HomePageClient from "@/components/HomePageClient";
import { FAQ_ITEMS } from "@/lib/faqContent";

const SITE_URL = "https://www.resunova.io";

export const metadata: Metadata = {
  title: "Free AI Resume Builder — Tailor Your Resume to Any Job | Resunova",
  description:
    "Free AI resume builder for students and the job-seeking community. Create your resume, score it across 8 dimensions, tailor it to any job description, and download an ATS-friendly PDF in under a minute. Start free, upgrade anytime.",
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    "name": q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": a,
    },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
