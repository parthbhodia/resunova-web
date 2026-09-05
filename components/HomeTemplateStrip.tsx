"use client";

/**
 * "Start from a template" — the Home dashboard's template shelf.
 *
 * Founder-directed: a clear section on the homepage leading to the templates,
 * because users could not find them (the only routes were buried). Small real
 * thumbnails, one per preset; a card opens the builder with that preset
 * applied, and the header links to the full /templates gallery. Derived from
 * the same templateGalleryEntries() the gallery draws, so this shelf and the
 * gallery can never disagree about what exists.
 */

import { useRouter } from "next/navigation";
import ResumeThumbnail from "@/components/seo/ResumeThumbnail";
import { templateGalleryEntries } from "@/lib/templateGallery";

export default function HomeTemplateStrip() {
  const router = useRouter();
  const entries = templateGalleryEntries();

  return (
    <section data-testid="home-template-strip">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">Start from a template</h2>
        <button
          type="button"
          onClick={() => router.push("/templates/")}
          className="text-[13px] font-medium text-accent hover:underline"
        >
          Browse all templates →
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {entries.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={`Use the ${t.label} template`}
            onClick={() => router.push(t.builderHref)}
            className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-left transition-colors hover:border-[color:var(--accent)]"
          >
            <ResumeThumbnail data={t.data} height={128} zoom={0.18} />
            <span className="mt-1.5 px-0.5 text-[12px] font-medium text-[var(--text)]">
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
