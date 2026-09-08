"use client";

/**
 * The Template Builder's cold-open screen.
 *
 * Founder: "template builder should show templates first when users sign in."
 * A bare /template-builder/ used to drop you into an editor already holding a
 * demo résumé you did not write, styled in whichever preset happens to be
 * first, with the actual choice buried as cards inside the Design tab. That is
 * the same "templates are unfindable" report /templates was built to answer,
 * one click further in — on the one surface that needs no sign-up.
 *
 * Cards LEAD WITH THE ROLE FIT and keep the style name underneath, matching
 * /templates, the Home shelf and the landing gallery. All four draw from
 * `templateGalleryEntries()`, so this picker cannot drift from the public one.
 *
 * ⚠️ The fit is guidance, never structure — the presets differ in typography
 * and layout only — which is why the not-a-lock-in line is on screen here for
 * the same reason it is test-pinned on the other two surfaces: five role
 * labels with nothing qualifying them read as five different products, and
 * someone in nursing concludes we have nothing for them.
 */

import ResumeThumbnail from "@/components/seo/ResumeThumbnail";
import { templateGalleryEntries } from "@/lib/templateGallery";
import type { TBStylePreset } from "@/components/TemplateBuilder/types";

export default function TemplateFirstRunPicker({
  onPick,
  onSkip,
}: {
  onPick: (presetId: TBStylePreset) => void;
  onSkip: () => void;
}) {
  const entries = templateGalleryEntries();

  return (
    <div
      data-template-first-run
      className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8"
    >
      <header className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight text-[var(--text)]">
          Pick a look to start
        </h1>
        <p className="mt-1.5 max-w-[64ch] text-[14px] text-[var(--muted)]">
          Every one exports an ATS-safe PDF, free and without an account. You can switch
          template at any point without losing what you&rsquo;ve written.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((t) => (
          <button
            key={t.id}
            type="button"
            data-first-run-card={t.id}
            aria-label={`Start with the ${t.label} template, best for ${t.bestFor}`}
            onClick={() => onPick(t.id as TBStylePreset)}
            className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[color:var(--accent)]"
          >
            <ResumeThumbnail data={t.data} height={300} zoom={0.42} />
            <span className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold text-[var(--text)]">{t.bestFor}</span>
              <span className="shrink-0 text-[13px] font-medium text-accent">Start &rarr;</span>
            </span>
            <span className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">
              <span className="font-medium text-[var(--text)]">{t.label}</span>
              {" · "}
              {t.description}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[62ch] text-[13px] text-[var(--muted)]">
          Any template works for any role &mdash; they differ in type and layout, not in
          what they can hold.
        </p>
        <button
          type="button"
          data-first-run-skip
          onClick={onSkip}
          className="text-[13px] font-medium text-[color:var(--accent-ink)] underline underline-offset-2"
        >
          Skip, just start writing &rarr;
        </button>
      </div>
    </div>
  );
}
