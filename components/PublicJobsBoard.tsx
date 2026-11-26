"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { jobHref, type PublicJob } from "@/lib/publicJobs";
import {
  EMPTY_BOARD_FILTERS,
  PUBLIC_FUNCTIONS,
  PUBLIC_LEVELS,
  PUBLIC_PLACES,
  filterPublicJobs,
  formatPublicSalary,
  type PublicBoardFilters,
} from "@/lib/publicJobDisplay";

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text";

export default function PublicJobsBoard({ jobs }: { jobs: PublicJob[] }) {
  const [filters, setFilters] = useState<PublicBoardFilters>(EMPTY_BOARD_FILTERS);
  const visible = useMemo(() => filterPublicJobs(jobs, filters), [jobs, filters]);

  function set<K extends keyof PublicBoardFilters>(key: K, value: PublicBoardFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mt-8">
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="search" aria-label="Filter jobs">
        <label className="block text-sm font-semibold text-text lg:col-span-1">
          Search
          <input
            className={`${fieldClass} mt-1`}
            value={filters.search}
            placeholder="Role or company"
            onChange={(e) => set("search", e.target.value)}
          />
        </label>
        <FilterSelect label="Function" value={filters.fn} onChange={(v) => set("fn", v)} options={PUBLIC_FUNCTIONS} />
        <FilterSelect label="Level" value={filters.level} onChange={(v) => set("level", v)} options={PUBLIC_LEVELS} />
        <FilterSelect label="Location" value={filters.place} onChange={(v) => set("place", v)} options={PUBLIC_PLACES} />
        <FilterSelect
          label="Sponsorship"
          value={filters.sponsor}
          onChange={(v) => set("sponsor", v === "yes" ? "yes" : "")}
          options={[{ id: "yes", label: "Sponsors visas" }]}
        />
      </form>

      <p className="mt-4 text-sm text-rn-muted">
        {visible.length} {visible.length === 1 ? "role" : "roles"}
      </p>

      <section aria-label="Current job openings" className="mt-3 grid gap-3">
        {visible.map((job) => {
          const salary = formatPublicSalary(job);
          const place = [job.location, job.workModel].filter(Boolean).join(" · ");
          return (
            <article key={job.id} className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm font-semibold text-rn-muted">{job.company}</p>
              <Link href={jobHref(job.id)} className="mt-1 block text-lg font-bold text-text no-underline hover:text-accent">
                {job.title}
              </Link>
              <p className="mt-2 text-sm text-dim">{place || "Location not specified"}</p>
              {salary && <p className="mt-1 text-sm font-semibold text-text">{salary}</p>}
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-rn-muted">
                <span aria-hidden className="inline-block h-2 w-16 rounded-full bg-border blur-[2px]" />
                <Link href="/?view=jobs" className="text-accent no-underline">
                  Sign in to reveal
                </Link>
              </p>
            </article>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-xl border border-border bg-surface p-6 text-rn-muted">
            {jobs.length === 0
              ? "The latest job index is being refreshed."
              : "No roles match these filters."}
          </p>
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="block text-sm font-semibold text-text">
      {label}
      <select className={`${fieldClass} mt-1`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
