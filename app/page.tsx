import type { Metadata } from "next";
import HomePageClient from "@/components/HomePageClient";
import { FAQ_ITEMS } from "@/lib/faqContent";

const SITE_URL = "https://www.resunova.io";

const HOME_TITLE = "Free AI Resume Builder: Get Past the ATS | Resunova";
const HOME_DESCRIPTION =
  "See the 8 checks that decide whether an ATS passes your resume on. Rewrites from the facts already on it, a tailored PDF, and 3 free scans a day with a free account.";

export const metadata: Metadata = {
  // Absolute so the root template cannot append another "· Resunova" or fall
  // back to the layout default. Does not reuse "ATS Resume Checker": that
  // exact match belongs to /ats-resume-checker.
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  openGraph: { title: HOME_TITLE, description: HOME_DESCRIPTION },
  twitter: { title: HOME_TITLE, description: HOME_DESCRIPTION },
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
