"use client";

/**
 * HomeDashboard — the signed-in landing "hub" (default view for `/`).
 *
 * A single activation/retention surface instead of dropping returning users
 * straight into the Analyze uploader: a personal greeting, a KPI row, quick
 * actions, a recent-résumés strip, and a "Get set up" onboarding checklist.
 *
 * Everything reads from data the app already stores — fetchLibraryItems()
 * (résumés + analyses + builder drafts), GET /api/applications (tracker), and
 * GET /api/scan-limit-status (Free-plan quota). No new backend.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseClient,
  fetchLibraryItems,
  fetchUserProfile,
  type LibraryItem,
} from "@/lib/supabase";
import { apiUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpgradeDialog } from "@/components/UpgradeDialog";

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
  limit?: number;
  used?: number;
  remaining?: number;
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
      <span className="text-[12.5px] leading-snug text-[var(--muted)]">{desc}</span>
    </button>
  );
}

const CheckGlyph = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/* ---------- main component ---------- */

/** Pro billing hasn't launched — hide the proactive Upgrade-to-Pro CTA for now. */
const SHOW_UPGRADE_CTA = false;

export default function HomeDashboard() {
  const router = useRouter();
  const { openUpgrade } = useUpgradeDialog();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string>("there");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [scan, setScan] = useState<ScanStatus | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      const token = session?.access_token ?? null;

      // Greeting name — profile displayName first, else email prefix.
      let display: string | null = null;
      try {
        const profile = await fetchUserProfile();
        display = profile?.displayName ?? null;
      } catch {
        /* non-fatal */
      }
      if (alive) setName(firstName(display, user?.email));

      // Library items (résumés + analyses + drafts).
      try {
        const rows = await fetchLibraryItems();
        if (alive) setItems(rows);
      } catch {
        if (alive) setItems([]);
      }

      // Application tracker stats + Free-plan quota (best-effort, need a token).
      if (token) {
        const authHeaders = { Authorization: `Bearer ${token}` };
        try {
          const resp = await fetch(apiUrl("/api/applications"), { headers: authHeaders });
          if (resp.ok) {
            const data = await resp.json();
            if (alive && data?.stats) setStats(data.stats as AppStats);
          }
        } catch {
          /* non-fatal */
        }
        try {
          const resp = await fetch(apiUrl("/api/scan-limit-status"), { headers: authHeaders });
          if (resp.ok) {
            const data = (await resp.json()) as ScanStatus;
            if (alive) setScan(data);
          }
        } catch {
          /* non-fatal */
        }
      }

      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const derived = useMemo(() => {
    const resumeLike = items.filter((i) => i.kind === "tailored" || i.kind === "builder");
    const analyzed = items.filter((i) => i.kind === "analyzed");
    const tailored = items.filter((i) => i.kind === "tailored");
    const scored = items
      .map((i) => i.score)
      .filter((s): s is number => typeof s === "number");
    const bestScore = scored.length ? Math.max(...scored) : null;
    return {
      totalResumes: resumeLike.length,
      analyzedCount: analyzed.length,
      tailoredCount: tailored.length,
      bestScore,
      hasResume: resumeLike.length > 0 || analyzed.length > 0,
      hasAnalyzed: analyzed.length > 0 || bestScore !== null,
      hasTailored: tailored.length > 0,
    };
  }, [items]);

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
        go: () => router.push("/?view=builder&flow=tailor"),
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
    ? "Unlimited"
    : scan?.enforced && typeof scan.remaining === "number"
      ? `Free · ${Math.max(0, scan.remaining)} scan${scan.remaining === 1 ? "" : "s"} left today`
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
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Let&apos;s get you your dream job — pick up where you left off.
          </p>
        </div>
        {/* Upgrade-to-Pro section — hidden until Pro billing launches.
            Flip SHOW_UPGRADE_CTA to true to restore the plan pill + Upgrade button. */}
        {SHOW_UPGRADE_CTA && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--muted)]">
              {planLabel}
            </span>
            {!scan?.unlimited ? (
              <Button size="sm" className="gap-1.5" onClick={() => openUpgrade()}>
                Upgrade
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
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
                onClick={() => router.push("/?view=builder&flow=tailor")}
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
                <p className="text-[13.5px] text-[var(--muted)]">
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

        {/* Onboarding checklist */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[var(--text)]">Get set up</h2>
              <span className="text-[12px] font-medium text-[var(--muted)]">
                {doneCount}/{checklist.length}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-[var(--muted)]">
              {allDone
                ? "You're all set — go land your dream job."
                : "Finish these to get the most out of Resunova."}
            </p>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface2)]">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(doneCount / checklist.length) * 100}%` }}
              />
            </div>

            <ul className="mt-4 flex flex-col gap-1">
              {checklist.map((c) => (
                <li key={c.label}>
                  <button
                    type="button"
                    disabled={c.done || !c.go}
                    onClick={() => c.go?.()}
                    className={
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition-colors " +
                      (c.done
                        ? "text-[var(--dim)]"
                        : "text-[var(--text)] hover:bg-[var(--surface2)]")
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
                    {!c.done && c.go ? (
                      <span className="ml-auto text-[var(--muted)]">→</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
