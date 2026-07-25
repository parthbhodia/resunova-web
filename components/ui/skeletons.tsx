import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Content-shaped loading placeholders.
 *
 * A spinner says "something is happening"; a skeleton says "here is what is
 * about to appear, and where" — so the layout does not jump when data lands.
 * Use these for VIEW-level loads. An in-button spinner during a submit is
 * still the right call: there the shape is already on screen.
 *
 * Every block below is wrapped in a `role="status"` region so screen readers
 * announce the load once instead of reading a wall of empty boxes.
 */

function Region({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Rows of text — headline + body lines. The last line is short, like real prose. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/5" : i % 3 === 1 ? "w-11/12" : "w-full")}
        />
      ))}
    </div>
  );
}

/** A card in a vertical list: title, two meta lines, a trailing action chip. */
export function SkeletonListCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-card p-4",
        className,
      )}
      aria-hidden
    >
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 grid gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
    </div>
  );
}

/** N list cards. The default `count` is a realistic page, not a single teaser. */
export function SkeletonList({
  count = 4,
  label = "Loading",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Region label={label} className={cn("grid gap-2.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListCard key={i} />
      ))}
    </Region>
  );
}

/** A tile in a responsive grid (résumé cards, template cards). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("grid gap-3 rounded-xl border border-border bg-card p-4", className)}
      aria-hidden
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 grid gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({
  count = 6,
  label = "Loading",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Region
      label={label}
      className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </Region>
  );
}

/** A row of KPI tiles. */
export function SkeletonStatStrip({
  count = 4,
  label = "Loading stats",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Region label={label} className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-border bg-card p-4" aria-hidden>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </Region>
  );
}
