import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import TemplateGallery from "@/components/TemplateGallery";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";
import { templateGalleryEntries } from "@/lib/templateGallery";

const CANONICAL = `${SITE_URL}/templates/`;

export const metadata: Metadata = {
  title: "Free ATS-Friendly Resume Templates",
  description:
    "Browse free ATS-friendly resume templates and open any of them in the builder with one click. No sign-up required.",
  // /templates is public and sitemap-listed, but it renders inside the app
  // shell, so it inherited no canonical of its own. Without this the URLs it
  // does get (AppShell nav links, sitemap, builder deep links) were the only
  // thing telling a crawler which URL is the real one.
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: CANONICAL,
    siteName: "Resunova",
    title: "Free ATS-Friendly Resume Templates",
    description:
      "Free resume templates that keep standard fonts, real text, and standard section headings. Open any of them in the builder with one click.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free ATS-Friendly Resume Templates",
    description:
      "Free resume templates that keep standard fonts, real text, and standard section headings. Open any of them in the builder with one click.",
  },
};

/**
 * Breadcrumb + ItemList for the gallery.
 *
 * The gallery is the one surface that lists every template we actually ship,
 * derived from RESUME_STYLE_PRESETS, so the schema can be derived too. A
 * template card that exists in the DOM but not in the markup is the failure
 * mode the presets-derived production was built to prevent.
 */
function TemplatesJsonLd() {
  const entries = templateGalleryEntries();
  return (
    <JsonLd
      data={[
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Templates", item: CANONICAL },
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "ATS-friendly resume templates",
          numberOfItems: entries.length,
          itemListElement: entries.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `${t.label} (${t.bestFor})`,
            description: t.description,
            url: `${SITE_URL}${t.builderHref}`,
          })),
        },
      ]}
    />
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplatesPageSkeleton />}>
      <AppShell>
        <TemplatesJsonLd />
        <TemplateGallery />
      </AppShell>
    </Suspense>
  );
}

function TemplatesPageSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0d1117)",
        color: "var(--muted, #94a3b8)",
      }}
    >
      Loading templates...
    </div>
  );
}
