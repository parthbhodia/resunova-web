"use client";

/**
 * HomeDashboard — the signed-in landing "hub" (default view for `/`).
 *
 * A single activation/retention surface instead of dropping returning users
 * straight into the Analyze uploader: a personal greeting, a KPI row, quick
 * actions, a recent-résumés strip, and a right rail that starts as a "Get set
 * up" checklist and becomes a progress card once that checklist is done.
 *
 * Everything reads from data the app already stores — fetchLibraryItems()
 * (résumés + analyses + builder drafts), GET /api/applications (tracker), and
 * GET /api/scan-limit-status (Free-plan quota + last-7-day usage).
 */

import { useEffect, useMemo, useState } from "react";
import { tailorHref } from "@/lib/tailorRoute";
import { useRouter } from "next/navigation";
import {
  getSupabaseClient,
  fetchLibraryItems,
  fetchUserProfile,
  type LibraryItem,
} from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpgradeDialog } from "@/components/UpgradeDialog";
import { readCache, writeCache } from "@/lib/clientCache";
import { apiFetch } from "@/lib/apiClient";
import {
  computeScoreProgress,
  formatScoreProgress,
  scoreProgressTone,
  shortDate,
  type ScoreProgress,
} from "@/components/analyze/scoreProgress";

type AppStats = {
  saved: number;
  applied: number;
  interviewing: number;
  offer: number;
  rejected: number;
  archived: number;
  total: number;
};

type ScanStatus = {
  enforced?: boolean;
  unlimited?: boolean;
  /** "pro" | "institution" for unlimited tiers; absent on the metered tier. */
  plan?: string | null;
  limit?: number;
  used?: number;
  remaining?: number;
  usedLast7Days?: number | null;
};

/** Deep-link a library item to its detail panel (mirrors ResumeLibrary.openItem). */
function hrefForItem(item: LibraryItem): string {
  if (item.kind === "analyzed") return `/?view=library&analysis=${encodeURIComponent(item.id)}`;
  if (item.kind === "builder") return `/?view=library&builder=${encodeURIComponent(item.id)}`;
  if (item.kind === "cover_letter") return `/?view=library&cl=${encodeURIComponent(item.id)}`;
  return `/?view=library&resume=${encodeURIComponent(item.record.folder)}`;
}

const KIND_LABEL: Record<LibraryItem["kind"], string> = {
  tailored: "Tailored",
  analyzed: "Analyzed",
  builder: "Draft",
  cover_letter: "Cover letter",
};

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name || "").trim();
  if (n) return n.split(/\s+/)[0];
  const e = (email || "").trim();
  if (e) return e.split("@")[0].replace(/[._-]+/g, " ").split(" ")[0];
  return "there";
}

function relativeDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function scoreTone(score: number): string {
  if (score >= 80) return "var(--green-ink)";
  if (score >= 60) return "var(--amber-ink)";
  return "var(--red-ink)";
}

/* ---------- small presentational pieces ---------- */

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <span className="text-[28px] font-bold leading-none" style={{ color: tone || "var(--text)" }}>
        {value}
      </span>
      {hint ? <span className="text-[12px] text-[var(--dim)]">{hint}</span> : null}
    </div>
  );
}

function QuickAction({
  title,
  desc,
  badge,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  badge?: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-all hover:border-[color:var(--accent)] hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[18px] text-accent">
          {icon}
        </span>
        {badge ? (
          <span className="rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="text-[14px] font-semibold text-[var(--text)]">{title}</span>
      <span className="text-[13px] leading-snug text-[var(--muted)]">{desc}</span>
    </button>
  );
}

const CheckGlyph = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

type ChecklistItem = { label: string; done: boolean; go: null | (() => void) };

/** The rail while there is still setup to do. Verbatim extraction, so the two
 *  rail states read as siblings rather than as one branch buried in the other. */
function SetupChecklist({ items, doneCount }: { items: ChecklistItem[]; doneCount: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">Get set up</h2>
        <span className="text-[12px] font-medium text-[var(--muted)]">
          {doneCount}/{items.length}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--muted)]">
        Finish these to get the most out of Resunova.
      </p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface2)]">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col gap-1">
        {items.map((c) => (
          <li key={c.label}>
            <button
              type="button"
              disabled={c.done || !c.go}
              onClick={() => c.go?.()}
              className={
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition-colors " +
                (c.done ? "text-[var(--dim)]" : "text-[var(--text)] hover:bg-[var(--surface2)]")
              }
            >
              <span
                className={
                  "flex size-5 shrink-0 items-center justify-center rounded-full border " +
                  (c.done
                    ? "border-transparent bg-accent text-accent-foreground"
                    : "border-[var(--border)] text-transparent")
                }
              >
                {CheckGlyph}
              </span>
              <span className={c.done ? "line-through" : ""}>{c.label}</span>
              {!c.done && c.go ? <span className="ml-auto text-[var(--muted)]">→</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * What the rail shows once there is no setup left: movement, not inventory.
 *
 * Deliberately thin, and deliberately NOT a restatement of the KPI row above
 * it. Those are five counts of what exists right now; this is the only thing
 * on the page that says anything changed. Padding it out with "3 tailored
 * versions" would print the same fact twice on one screen, which is how a
 * dashboard stops being read.
 *
 * With one scan on record there is no arc to draw, so the card says what
 * produces one. That is the whole retention question in a sentence: more than
 * half the people who scan never come back for a second one, and nothing in
 * the product had ever told them the second scan is where the value is.
 */
function ProgressCard({
  progress,
  firstScanAt,
  onScan,
}: {
  progress: ScoreProgress | null;
  firstScanAt: string | null;
  onScan: () => void;
}) {
  const since = firstScanAt ? shortDate(firstScanAt) : null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-[15px] font-semibold text-[var(--text)]">Your progress</h2>

      {progress ? (
        <>
          <p
            className="mt-2 text-[20px] font-bold leading-tight"
            style={{ color: scoreProgressTone(progress) }}
          >
            {formatScoreProgress(progress)}
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Across {progress.runs} scored scans.
          </p>
        </>
      ) : (
        <p className="mt-2 text-[13px] leading-snug text-[var(--muted)]">
          {since
            ? `You've scanned once, on ${since}. Scan again after your next edit and this will show what moved.`
            : "Scan a résumé and this will start tracking how your score moves."}
        </p>
      )}

      <Button size="sm" variant="outline" className="mt-4 w-full" onClick={onScan}>
        {progress ? "Scan again" : "Run a scan"}
      </Button>
    </div>
  );
}

/* ---------- snapshot cache ----------
   Home is remounted on every `?view=` switch. Holding the last render above
   the component tree turns the return trip into an instant paint instead of
   four round-trips behind a skeleton. Cleared wholesale on sign-out. */

type HomeSnapshot = {
  name: string;
  items: LibraryItem[];
  stats: AppStats | null;
  scan: ScanStatus | null;
};

const HOME_CACHE_KEY = "home:dashboard";
const HOME_TTL_MS = 90_000;

/* ---------- main component ---------- */

export default function HomeDashboard() {
  const router = useRouter();
  const { openUpgrade } = useUpgradeDialog();

  // Home is the first thing seen after sign-in and is returned to constantly,
  // so the last snapshot paints immediately while the refresh runs behind it.
  const cached = readCache<HomeSnapshot>(HOME_CACHE_KEY, HOME_TTL_MS)?.data ?? null;
  const [loading, setLoading] = useState(!cached);
  const [name, setName] = useState<string>(cached?.name ?? "there");
  const [items, setItems] = useState<LibraryItem[]>(cached?.items ?? []);
  const [stats, setStats] = useState<AppStats | null>(cached?.stats ?? null);
  const [scan, setScan] = useState<ScanStatus | null>(cached?.scan ?? null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      const token = session?.access_token ?? null;
      const json = async <T,>(path: string): Promise<T | null> => {
        if (!token) return null;
        const resp = await apiFetch(path);
        return resp.ok ? ((await resp.json()) as T) : null;
      };

      // These four are independent. Awaiting them in sequence made the
      // dashboard wait out four round-trips before painting anything.
      const [profileR, itemsR, appsR, scanR] = await Promise.allSettled([
        fetchUserProfile(),
        fetchLibraryItems(),
        json<{ stats?: AppStats }>("/api/applications"),
        json<ScanStatus>("/api/scan-limit-status"),
      ]);
      if (!alive) return;

      const nextName = firstName(
        profileR.status === "fulfilled" ? profileR.value?.displayName ?? null : null,
        user?.email,
      );
      const nextItems = itemsR.status === "fulfilled" ? itemsR.value : [];
      const nextStats =
        appsR.status === "fulfilled" && appsR.value?.stats ? appsR.value.stats : null;
      const nextScan = scanR.status === "fulfilled" ? scanR.value : null;

      setName(nextName);
      setItems(nextItems);
      setStats(nextStats);
      setScan(nextScan);
      setLoading(false);
      writeCache<HomeSnapshot>(HOME_CACHE_KEY, {
        name: nextName,
        items: nextItems,
        stats: nextStats,
        scan: nextScan,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const derived = useMemo(() => {
    const resumeLike = items.filter((i) => i.kind === "tailored" || i.kind === "builder");
    const analyzed = items.filter((i) => i.kind === "analyzed");
    const tailored = items.filter((i) => i.kind === "tailored");

    // MEASURED ATS grades only, and this is two separate refusals.
    //
    // (1) A tailored row's `score` is `ratings.match_score` — how well the
    // résumé covers ONE job description. An analysis row's is the general
    // quality grade. Maxing across both put a 91% JD match under the heading
    // "Best ATS score", which is a different number wearing this one's name;
    // the same never-blend rule the Tailor scoreboard follows.
    //
    // (2) `scoreSource === 'estimate'` is the deterministic projection written
    // when edits are saved, not a grade the analyzer produced. A headline
    // "best" built on a projection is unfalsifiable.
    const measured = analyzed
      .filter((i) => i.kind === "analyzed" && i.analysis.scoreSource !== "estimate")
      .map((i) => ({ score: i.score, createdAt: i.createdAt }))
      .filter((e): e is { score: number; createdAt: string } => typeof e.score === "number");
    const bestScore = measured.length ? Math.max(...measured.map((e) => e.score)) : null;

    return {
      totalResumes: resumeLike.length,
      analyzedCount: analyzed.length,
      tailoredCount: tailored.length,
      bestScore,
      measured,
      hasResume: resumeLike.length > 0 || analyzed.length > 0,
      hasAnalyzed: analyzed.length > 0 || bestScore !== null,
      hasTailored: tailored.length > 0,
    };
  }, [items]);

  /** The arc across measured scans, or null when there is no trend to claim. */
  const progress = useMemo(() => computeScoreProgress(derived.measured), [derived.measured]);
  /** When they started, for the "you have been at this a while" line. */
  const firstScanAt = useMemo(() => {
    const dates = derived.measured.map((e) => e.createdAt).filter(Boolean).sort();
    return dates[0] ?? null;
  }, [derived.measured]);

  const savedJobs = stats?.saved ?? 0;
  const trackedTotal = stats?.total ?? 0;

  const checklist = useMemo(() => {
    return [
      { label: "Create your account", done: true, go: null as null | (() => void) },
      {
        label: "Add your first résumé",
        done: derived.hasResume,
        go: () => router.push("/?view=analyze"),
      },
      {
        label: "Check your ATS score",
        done: derived.hasAnalyzed,
        go: () => router.push("/?view=analyze"),
      },
      {
        label: "Tailor a résumé to a job",
        done: derived.hasTailored,
        go: () => router.push(tailorHref()),
      },
      {
        label: "Track a job application",
        done: trackedTotal > 0,
        go: () => router.push("/?view=jobs"),
      },
    ];
  }, [derived, trackedTotal, router]);

  const doneCount = checklist.filter((c) => c.done).length;
  const allDone = doneCount === checklist.length;
  const recent = items.slice(0, 4);

  const planLabel = scan?.unlimited
    ? (scan.plan === "pro" ? "Pro" : scan.plan === "institution" ? "University" : scan.plan === "admin" ? "Admin" : "Unlimited")
    : scan?.enforced && typeof scan.remaining === "number"
      ? `${scan.plan === "pro" ? "Pro" : "Free"} · ${Math.max(0, scan.remaining)} scan${scan.remaining === 1 ? "" : "s"} left today`
      : scan?.plan === "pro"
        ? "Pro"
        : "Free plan";

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-6 md:px-8 md:py-8">
      {/* Greeting */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-[var(--text)] md:text-[30px]">
            {greeting(new Date().getHours())},{" "}
            <span className="text-accent">{name}</span>
          </h1>
          {/* "Pick up where you left off" needs somewhere to pick up FROM.
              On a fresh account it names a history that does not exist. */}
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            {derived.hasAnalyzed
              ? "Pick up where you left off."
              : "Start with a scan to see where your résumé stands."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--muted)]">
            {planLabel}
          </span>
          {!scan?.unlimited && scan?.plan !== "pro" && scan?.plan !== "admin" ? (
            <Button size="sm" className="gap-1.5" onClick={() => openUpgrade()}>
              Upgrade
            </Button>
          ) : null}
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Résumés"
              value={String(derived.totalResumes)}
              hint="in your library"
            />
            <StatCard
              label="Scans (7d)"
              value={
                typeof scan?.usedLast7Days === "number"
                  ? String(scan.usedLast7Days)
                  : "—"
              }
              hint={
                typeof scan?.usedLast7Days === "number"
                  ? "résumé scans this week"
                  : "usage loads with your plan"
              }
            />
            <StatCard
              label="Best ATS score"
              value={derived.bestScore !== null ? String(derived.bestScore) : "—"}
              hint={derived.bestScore !== null ? "across all scans" : "run a scan to see"}
              tone={derived.bestScore !== null ? scoreTone(derived.bestScore) : undefined}
            />
            <StatCard
              label="Tailored versions"
              value={String(derived.tailoredCount)}
              hint={derived.tailoredCount ? "matched to a JD" : "tailor to a job"}
            />
            <StatCard
              label="Saved jobs"
              value={String(savedJobs)}
              hint={trackedTotal ? `${trackedTotal} tracked` : "from the jobs feed"}
            />
          </>
        )}
      </div>

      {/* Main grid: quick actions + recent (left), checklist (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {/* Quick actions */}
          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-[var(--text)]">Quick actions</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <QuickAction
                title="ATS check"
                desc="Score your résumé against recruiter filters."
                badge={!derived.hasAnalyzed ? "Start here" : undefined}
                icon="◎"
                onClick={() => router.push("/?view=analyze")}
              />
              <QuickAction
                title="Tailor to a job"
                desc="Match your résumé to a specific JD."
                icon="✦"
                onClick={() => router.push("/tailor-2/?flow=tailor")}
              />
              <QuickAction
                title="Find jobs"
                desc="Discover roles ranked to your résumé."
                icon="⌕"
                onClick={() => router.push("/?view=jobs")}
              />
              <QuickAction
                title="Interview prep"
                desc="Practice questions from your résumé."
                icon="◆"
                onClick={() => router.push("/interview-prep")}
              />
            </div>
          </section>

          {/* Recent résumés */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[var(--text)]">Recent résumés</h2>
              {recent.length > 0 ? (
                <button
                  type="button"
                  onClick={() => router.push("/?view=library")}
                  className="text-[13px] font-medium text-accent hover:underline"
                >
                  View all →
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-[84px] rounded-xl" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6">
                <p className="text-[14px] text-[var(--muted)]">
                  No résumés yet. Upload one to get an instant ATS score.
                </p>
                <Button size="sm" onClick={() => router.push("/?view=analyze")}>
                  Scan your résumé
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recent.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => router.push(hrefForItem(item))}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[color:var(--accent)]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[var(--surface2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {KIND_LABEL[item.kind]}
                        </span>
                        {item.isDefault ? (
                          <span className="rounded bg-[var(--accent-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 truncate text-[14px] font-semibold text-[var(--text)]">
                        {item.title || "Untitled résumé"}
                      </p>
                      <p className="truncate text-[12px] text-[var(--dim)]">
                        {item.subtitle} · {relativeDate(item.createdAt)}
                      </p>
                    </div>
                    {typeof item.score === "number" ? (
                      <span
                        className="shrink-0 text-[20px] font-bold"
                        style={{ color: scoreTone(item.score) }}
                      >
                        {item.score}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* The rail: setup while there IS setup, then what you've built.
            A finished checklist is five struck-through lines telling a
            returning user they have nothing to do, in the most persistent slot
            on the page. Once it is done it has said everything it can. */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          {allDone ? (
            <ProgressCard
              progress={progress}
              firstScanAt={firstScanAt}
              onScan={() => router.push("/?view=analyze")}
            />
          ) : (
            <SetupChecklist items={checklist} doneCount={doneCount} />
          )}
        </aside>
      </div>
    </div>
  );
}
