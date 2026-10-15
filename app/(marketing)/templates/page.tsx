import type { Metadata } from "next";
import TemplateGallery from "@/components/TemplateGallery";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";
import { templateGalleryEntries } from "@/lib/templateGallery";

const CANONICAL = `${SITE_URL}/templates/`;

export const metadata: Metadata = {
  title: "Free ATS-Friendly Resume Templates",
  description:
    "Browse free ATS-friendly resume templates and open any of them in the builder with one click. No sign-up required.",
  // /templates is public and sitemap-listed. While it lived in the app shell
  // it inherited no canonical of its own, so the only thing telling a crawler
  // which URL was real was the AppShell nav links, the sitemap, and the
  // builder deep links. Those three could disagree and none of them wins.
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
 *
 * ⚠️ This used to be mounted inside AppShell, which meant it only ever
 * appeared in the client bundle. Structured data a crawler has to execute JS
 * to see is structured data you are hoping for rather than providing.
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

/**
 * Rendered directly, with no AppShell and no Suspense wrapper.
 *
 * AppShell calls useSearchParams(), which forces Next to bail out of the
 * static prerender for the nearest Suspense boundary. This page used to
 * wrap AppShell in one whose fallback said "Loading templates...", so the
 * served HTML was 67 characters: the title tag and that sentence. No h1, no
 * links, no template names, no matter what the source file contained.
 *
 * PublicSiteFrame (the (marketing) layout) reads usePathname instead, so the
 * page now prerenders like its neighbours. /resume-examples renders 166k
 * characters for the same reason.
 *
 * The trade is chrome: a signed-in visitor browsing /templates no longer has
 * the app's persistent sidebar, and gets the marketing header and footer
 * instead. That is the right trade for a public, sitemap-listed, search
 * entry page, which is what this is. /template-builder stays in the app.
 */
export default function TemplatesPage() {
  return (
    <>
      <TemplatesJsonLd />
      <TemplateGallery />
    </>
  );
}
