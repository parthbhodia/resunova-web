"use client";

/**
 * /templates — the visual template gallery.
 *
 * Users reported the resume templates were hard to find, and they were: the
 * only route was Template Builder (itself buried in a nav drawer) and then
 * its Style panel. This page is the one-click answer: every real preset as a
 * REAL rendered thumbnail (the product's own ResumePreview, not a mock), one
 * click into the builder with that preset already applied via the proven
 * ?preset= deep link. People pick templates by looking at them.
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import ResumeThumbnail from "@/components/seo/ResumeThumbnail";
import { templateGalleryEntries } from "@/lib/templateGallery";

export default function TemplateGallery() {
  const router = useRouter();
  const entries = templateGalleryEntries();

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold text-[var(--text)]">Resume templates</h1>
        <p className="mt-1 max-w-[70ch] text-[14px] text-[var(--muted)]">
          Pick a look and start writing. Every template is free, ATS-friendly, and opens in
          the builder with the style already applied. You can switch templates at any time
          without losing your content.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((t) => (
          <button
            key={t.id}
            type="button"
            data-template-card={t.id}
            onClick={() => router.push(t.builderHref)}
            className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[color:var(--accent)]"
          >
            <ResumeThumbnail data={t.data} height={300} zoom={0.42} />
            <span className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold text-[var(--text)]">{t.label}</span>
              <span className="shrink-0 text-[13px] font-medium text-accent">
                Use this template →
              </span>
            </span>
            <span className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">
              {t.description}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-8 text-[13px] text-[var(--muted)]">
        Looking for what to write, not how it looks?{" "}
        <Link href="/resume-examples/" className="font-medium text-accent hover:underline">
          Browse real resume examples by role →
        </Link>
      </p>
    </div>
  );
}
