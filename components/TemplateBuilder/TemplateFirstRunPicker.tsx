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

import { useMemo, useState } from "react";
import Link from "next/link";
import ResumeThumbnail from "@/components/seo/ResumeThumbnail";
import { templateGalleryEntries } from "@/lib/templateGallery";
import {
  RESUME_EXAMPLE_INDEX,
  exampleCategories,
  loadExampleData,
  searchExamples,
} from "@/lib/resumeExamplesIndex";
import type { TBResumeData, TBStylePreset } from "@/components/TemplateBuilder/types";

/** Results shown before the list asks you to narrow it. */
const EXAMPLE_RESULT_CAP = 9;

export default function TemplateFirstRunPicker({
  onPick,
  onPickExample,
  onSkip,
}: {
  onPick: (presetId: TBStylePreset) => void;
  onPickExample?: (data: TBResumeData) => void;
  onSkip: () => void;
}) {
  const entries = templateGalleryEntries();
  const categories = useMemo(() => exampleCategories(), []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  const browsing = query.trim().length > 0 || category !== null;
  const results = useMemo(
    () => (browsing ? searchExamples(query, category) : []),
    [browsing, query, category],
  );

  async function startFromExample(id: string) {
    if (!onPickExample) return;
    setLoadingId(id);
    setLoadError("");
    try {
      const data = await loadExampleData(id);
      if (!data) {
        setLoadError("That example could not be opened. Try another, or start from a template.");
        return;
      }
      onPickExample(data);
    } catch {
      setLoadError("That example could not be opened. Try another, or start from a template.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div
      data-template-first-run
      className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8"
    >
      <header className="mb-5">
        <h1 className="text-[24px] font-bold tracking-tight text-[var(--text)]">
          Start your résumé
        </h1>
        <p className="mt-1.5 max-w-[64ch] text-[14px] text-[var(--muted)]">
          Search your role to open a finished example you can edit, or pick a look and
          write from scratch. Either way it exports an ATS-safe PDF, free and without an
          account.
        </p>
      </header>

      {/* Search a role. The index carries only scalars, so this renders with
          no catalog weight; the chosen example's document loads on click. */}
      <div className="mb-5">
        <label htmlFor="first-run-example-search" className="sr-only">
          Search résumé examples by role or skill
        </label>
        <input
          id="first-run-example-search"
          data-first-run-search
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${RESUME_EXAMPLE_INDEX.length} examples · try “nurse”, “data analyst”, “SQL”`}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--dim)] focus:border-[color:var(--accent)]"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const on = category === c;
            return (
              <button
                key={c}
                type="button"
                data-first-run-category={c}
                aria-pressed={on}
                onClick={() => setCategory(on ? null : c)}
                className={
                  on
                    ? "rounded-full border border-[color:var(--accent)] bg-[var(--accent-bg)] px-3 py-1 text-[12px] font-semibold text-[color:var(--accent-ink)]"
                    : "rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] font-medium text-[var(--muted)] hover:border-[color:var(--accent)]"
                }
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mb-4 text-[13px] text-[color:var(--red-ink)]">
          {loadError}
        </p>
      )}

      {browsing && (
        <section data-first-run-examples className="mb-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--text)]">
              {results.length === 0
                ? "No examples match that"
                : `${results.length} example${results.length === 1 ? "" : "s"} to start from`}
            </h2>
            <button
              type="button"
              data-first-run-clear
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
              className="text-[13px] font-medium text-[color:var(--accent-ink)] underline underline-offset-2"
            >
              Clear
            </button>
          </div>
          {results.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">
              Nothing here matches that yet. Pick a look below and write your own, or
              browse every example on the{" "}
              <Link href="/resume-examples/" className="text-[color:var(--accent-ink)] underline underline-offset-2">
                examples page
              </Link>
              .
            </p>
          ) : (
            <>
              <ul className="grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {results.slice(0, EXAMPLE_RESULT_CAP).map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      data-first-run-example={row.id}
                      disabled={loadingId !== null}
                      aria-label={`Start from the ${row.title} example`}
                      onClick={() => void startFromExample(row.id)}
                      className="flex w-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[color:var(--accent)] disabled:opacity-60"
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[14px] font-semibold text-[var(--text)]">{row.title}</span>
                        <span className="shrink-0 text-[12px] font-medium text-[var(--dim)]">{row.score}/100</span>
                      </span>
                      <span className="mt-0.5 text-[12px] text-[var(--muted)]">
                        {row.category} · {row.level}
                      </span>
                      <span className="mt-1.5 text-[12px] font-medium text-accent">
                        {loadingId === row.id ? "Opening…" : "Start from this →"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {results.length > EXAMPLE_RESULT_CAP && (
                <p className="mt-2.5 text-[12px] text-[var(--muted)]">
                  Showing {EXAMPLE_RESULT_CAP} of {results.length}. Keep typing to narrow it.
                </p>
              )}
              <p className="mt-2.5 text-[12px] text-[var(--muted)]">
                Examples are written for illustration. Your name and contact details start
                blank, and the sample experience is there to be replaced with yours.
              </p>
            </>
          )}
        </section>
      )}

      <h2 className="mb-3 text-[15px] font-semibold text-[var(--text)]">
        Or pick a look and write your own
      </h2>
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
