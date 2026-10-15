import type { Metadata } from "next";
import ExtensionPage from "@/components/ExtensionPage";
import { SITE_URL } from "@/lib/brand";
import { FAQ_ITEMS } from "@/lib/extensionContent";

export const metadata: Metadata = {
  title: "Chrome Extension: Auto-Fill Job Applications",
  description:
    "Resunova's Chrome extension fills job application forms from your Resunova profile on Greenhouse, Ashby, Lever and Workday. You review every field and click submit yourself.",
  alternates: { canonical: `${SITE_URL}/extension/` },
  robots: { index: true, follow: true },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function ExtensionRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ExtensionPage />
    </>
  );
}
