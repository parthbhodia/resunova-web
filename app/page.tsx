import type { Metadata } from "next";
import HomePageClient from "@/components/HomePageClient";
import { FAQ_ITEMS } from "@/lib/faqContent";

const SITE_URL = "https://www.resunova.io";

export const metadata: Metadata = {
  // Keeps the existing head term and adds the frame the h1 now leads on. It
  // deliberately does NOT reuse "ATS Resume Checker": /ats-resume-checker owns
  // that exact match, and two pages bidding on one phrase split the result.
  title: "Free AI Resume Builder: Get Past the ATS | Resunova",
  // "3 free scans a day" and "no account" sit next to each other but must not
  // be merged: 3/day is the signed-in free plan, while the no-account offer is
  // the first scan only (see markAnonScanUsed in lib/anonScan.ts).
  description:
    "See the 8 checks that decide whether an ATS passes your resume on. Honest rewrites, a tailored PDF, and 3 free scans a day. Start with no account.",
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
