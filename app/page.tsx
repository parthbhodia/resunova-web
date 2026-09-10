import type { Metadata } from "next";
import HomePageClient from "@/components/HomePageClient";
import { FAQ_ITEMS } from "@/lib/faqContent";

const SITE_URL = "https://www.resunova.io";

export const metadata: Metadata = {
  // Keeps the existing head term and adds the frame the h1 now leads on. It
  // deliberately does NOT reuse "ATS Resume Checker": /ats-resume-checker owns
  // that exact match, and two pages bidding on one phrase split the result.
  title: "Free AI Resume Builder: Get Past the ATS | Resunova",
  // 3 free scans a day is the signed-in free plan, and it is the whole offer:
  // scanning requires an account (see lib/anonScan.ts). The template builder is
  // the surface that still needs no sign-up, and it says so on its own page.
  description:
    "See the 8 checks that decide whether an ATS passes your resume on. Honest rewrites, a tailored PDF, and 3 free scans a day with a free account.",
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
