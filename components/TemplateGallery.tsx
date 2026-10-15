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
 *
 * Cards LEAD WITH THE ROLE FIT, not the style name (founder: "instead of
 * classic templates give them option for software roles, etc"). Five proper
 * nouns told a visitor nothing about which one was theirs, while the
 * thumbnails were already drawn around real roles. The name survives as the
 * secondary label because it is how the builder's Style panel refers back to
 * the same thing. ⚠️ The fit is guidance, never structure: presets differ in
 * typography and layout only, so the header says out loud that any template
 * works for any role rather than letting five labels imply five products.
 *
 * The copy below the grid exists because this page was an orphan: it ranked
 * (or tried to) for "ats-friendly resume templates" while carrying roughly
 * three sentences of prose, and nothing on the blog or the examples hub
 * pointed at it. The added sections do three jobs. They give the page enough
 * substance to answer the query it is targeting, they link it into the
 * content cluster that already covers the subject in depth (the same
 * bridge lesson Teal learned from a 3-million-page job board diluting its
 * resume authority), and they say the honest thing about the two sidebar
 * layouts instead of letting "ATS-friendly" quietly cover five designs that
 * are not equally parse-friendly.
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import ResumeThumbnail from "@/components/seo/ResumeThumbnail";
import { templateGalleryEntries } from "@/lib/templateGallery";
import {
  ATS_GUIDE_FORMAT_CHECKLIST,
  RESEARCH_QUICK_CHECKLIST,
  type AtsGuideItem,
} from "@/lib/atsBestPracticesContent";

/**
 * What every template here keeps, pulled by id from the shared ATS checklists
 * rather than retyped. The checklists are already the single source of truth
 * for the in-app and blog guidance on this subject; a second copy here would
 * drift from the first the moment either one is edited.
 */
const KEPT_TRAIT_IDS = ["single_column", "standard_headers", "standard_fonts", "no_decorative"];
const KEPT_TRAITS: AtsGuideItem[] = KEPT_TRAIT_IDS.map(
  (id) =>
    ATS_GUIDE_FORMAT_CHECKLIST.find((i) => i.id === id) ??
    RESEARCH_QUICK_CHECKLIST.find((i) => i.id === id),
).filter((i): i is AtsGuideItem => i !== undefined);

/** Related reading, chosen to continue the subject rather than to fill a list. */
const RELATED_READING = [
  {
    href: "/blog/how-ats-really-works/",
    label: "How ATS Really Works (And Why You're Invisible, Not Rejected)",
    note: "What the software actually does with the file you upload, from parsing tests across Workday, Greenhouse, Lever, and more.",
  },
  {
    href: "/blog/optimizing-resumes-for-ats/",
    label: "Optimizing Résumés for Applicant Tracking Systems",
    note: "A formatting checklist, adapted from UIC Career Services guidance, for what parsers can and cannot read.",
  },
  {
    href: "/blog/tailor-resume-to-job-description/",
    label: "How to Tailor Your Resume to a Job Description",
    note: "Keyword extraction, bullet rewrites, and match scores. The layout matters less than what you put in it.",
  },
];

export default function TemplateGallery() {
  const router = useRouter();
  const entries = templateGalleryEntries();

  // Derived from the presets, never hardcoded: the sidebar looks are the two
  // creative presets that carry an enforcedLayout. When a third ships, this
  // sentence grows with it instead of quietly going stale.
  const singleColumn = entries.filter((t) => t.data.customization.layout === "single");
  const sidebar = entries.filter((t) => t.data.customization.layout !== "single");

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold text-[var(--text)]">Resume templates</h1>
        <p className="mt-1 max-w-[70ch] text-[14px] text-[var(--muted)]">
          Pick the look that fits your field and start writing. Every template is free,
          ATS-friendly, and opens in the builder with the style already applied. Any
          template works for any role, so switch whenever you like without losing your
          content.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((t) => (
          <button
            key={t.id}
            type="button"
            data-template-card={t.id}
            aria-label={`${t.label} template, best for ${t.bestFor}`}
            onClick={() => router.push(t.builderHref)}
            className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[color:var(--accent)]"
          >
            <ResumeThumbnail data={t.data} height={300} zoom={0.42} />
            <span className="mt-3 flex items-baseline justify-between gap-2">
              <span data-template-bestfor className="text-[15px] font-semibold text-[var(--text)]">
                {t.bestFor}
              </span>
              <span className="shrink-0 text-[13px] font-medium text-accent">
                Use this template →
              </span>
            </span>
            <span className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">
              <span className="font-medium text-[var(--text)]">{t.label}</span>
              {" · "}
              {t.description}
            </span>
          </button>
        ))}
      </div>

      {/* Everything below is the part the page was missing: an answer to the
          question "what makes a template ATS-friendly", stated in terms of
          what these specific layouts do and do not do. */}

      <section aria-labelledby="what-these-keep" className="mt-10">
        <h2 id="what-these-keep" className="text-[17px] font-bold text-[var(--text)]">
          What all five of these keep
        </h2>
        <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-[var(--muted)]">
          A template is ATS-friendly when a parser can still pull your name, dates, and job titles
          out of it. These layouts are built to that constraint:
        </p>
        <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
          {KEPT_TRAITS.map((trait) => (
            <li
              key={trait.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--muted)]"
            >
              {trait.text}
            </li>
          ))}
        </ul>
      </section>

      {sidebar.length > 0 ? (
        <section aria-labelledby="sidebar-looks" className="mt-8">
          <h2 id="sidebar-looks" className="text-[17px] font-bold text-[var(--text)]">
            The {sidebar.map((t) => t.label).join(" and ")} looks
          </h2>
          <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-[var(--muted)]">
            {sidebar.map((t) => t.label).join(" and ")} use a sidebar to split your details from
            the job you are applying for. They read well when a person opens the file directly, and
            a column layout is where parsers struggle most.{" "}
            {singleColumn.length > 0
              ? `If the application goes through a high-volume portal, one of the ${singleColumn.length} single-column layouts above is the safer pick.`
              : "If the application goes through a high-volume portal, a single-column layout is the safer pick."}{" "}
            Run either through the{" "}
            <Link href="/ats-resume-checker/" className="font-medium text-accent hover:underline">
              free ATS resume checker
            </Link>{" "}
            before you submit.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="how-to-pick" className="mt-8">
        <h2 id="how-to-pick" className="text-[17px] font-bold text-[var(--text)]">
          How to pick one
        </h2>
        <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-[var(--muted)]">
          Start from the field you are aiming at, then change your mind freely. Swapping the style
          in the builder keeps every bullet you have written, so a template is a first draft, not a
          commitment. If you would rather see filled-in examples for your specific job title, the{" "}
          <Link href="/resume-examples/" className="font-medium text-accent hover:underline">
            resume examples by role
          </Link>{" "}
          are the better starting point.
        </p>
      </section>

      <section aria-labelledby="related-reading" className="mt-8">
        <h2 id="related-reading" className="text-[17px] font-bold text-[var(--text)]">
          Keep reading
        </h2>
        <ul className="mt-2 grid list-none gap-2.5 p-0">
          {RELATED_READING.map((item) => (
            <li key={item.href} className="text-[13px] leading-relaxed">
              <Link href={item.href} className="font-medium text-accent hover:underline">
                {item.label}
              </Link>
              <span className="mt-0.5 block text-[var(--muted)]">{item.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-[13px] text-[var(--muted)]">
        Looking for what to write, not how it looks?{" "}
        <Link href="/resume-examples/" className="font-medium text-accent hover:underline">
          Browse real resume examples by role →
        </Link>
      </p>
    </div>
  );
}
