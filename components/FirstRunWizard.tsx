"use client";

/**
 * FirstRunWizard — a one-time, Jobright-style welcome shown right after a user's
 * first sign-in, instead of dumping a brand-new account on the Analyze screen with
 * no orientation.
 *
 * Two quick steps that reuse existing pieces:
 *   1. Target role(s) → chips backed by ROLE_SUGGESTIONS, saved into the user's
 *      profile (powers the Jobs feed ranking).
 *   2. First action   → "Scan my résumé" (primary) / "Browse jobs" / explore.
 *
 * It is deliberately conservative about WHEN it appears so it never nags returning
 * users or interrupts the anonymous-scan → sign-in hand-off:
 *   • signed in, not an institution user
 *   • account created within the last 24h (genuinely new)
 *   • hasn't already been completed/skipped (per-user localStorage flag)
 *   • the user did NOT arrive via the anonymous free-scan funnel (they're already
 *     mid-flow with a restored report — don't cover it)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ROLE_SUGGESTIONS } from "@/lib/jobsTaxonomy";
import { fetchUserProfile, upsertUserProfile } from "@/lib/supabase";
import { EMPTY_PROFILE } from "@/lib/profileStorage";
import { hasUsedAnonScan } from "@/lib/anonScan";

const FIRST_RUN_KEY_PREFIX = "rn_first_run_v1";
const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ROLES = 3;

function storageKey(userId: string): string {
  return `${FIRST_RUN_KEY_PREFIX}:${userId}`;
}

function isNewAccount(user: User): boolean {
  if (!user.created_at) return false;
  const created = Date.parse(user.created_at);
  if (Number.isNaN(created)) return false;
  return Date.now() - created < NEW_ACCOUNT_WINDOW_MS;
}

export default function FirstRunWizard({
  user,
  isUmbc,
}: {
  user: User | null;
  isUmbc: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const userId = user?.id ?? null;

  // Decide once per mount whether this is a brand-new user who should be greeted.
  useEffect(() => {
    if (!user || !userId || isUmbc) return;
    if (!isNewAccount(user)) return;
    if (hasUsedAnonScan()) return; // already engaged via the free-scan funnel
    try {
      if (localStorage.getItem(storageKey(userId)) === "1") return;
    } catch {
      // If storage is unavailable, fall through and show once.
    }
    setStep(1);
    setOpen(true);
  }, [user, userId, isUmbc]);

  const markDone = useCallback(() => {
    if (!userId) return;
    try {
      localStorage.setItem(storageKey(userId), "1");
    } catch {
      // best-effort
    }
  }, [userId]);

  const close = useCallback(() => {
    markDone();
    setOpen(false);
  }, [markDone]);

  const roleChips = useMemo(() => ROLE_SUGGESTIONS.slice(0, 12), []);

  const toggleRole = (label: string) => {
    setRoles((prev) => {
      if (prev.includes(label)) return prev.filter((r) => r !== label);
      if (prev.length >= MAX_ROLES) return prev;
      return [...prev, label];
    });
  };

  const saveRolesThenNext = useCallback(async () => {
    if (roles.length > 0) {
      setSaving(true);
      try {
        const existing = (await fetchUserProfile()) ?? EMPTY_PROFILE;
        await upsertUserProfile({ ...existing, roles: roles.join(", ") });
      } catch {
        // Non-fatal — they can still pick a first action and set roles later.
      } finally {
        setSaving(false);
      }
    }
    setStep(2);
  }, [roles]);

  const go = useCallback(
    (view: "analyze" | "jobs") => {
      markDone();
      setOpen(false);
      router.push(`/?view=${view}`);
    },
    [markDone, router],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1.5 px-1 pt-1">
          {[1, 2].map((s) => (
            <span
              key={s}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? "var(--accent)" : "var(--surface2)" }}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4 px-1">
            <div className="flex flex-col gap-1.5">
              <DialogTitle className="text-lg font-semibold">Welcome to Resunova 👋</DialogTitle>
              <DialogDescription className="text-[14px] leading-relaxed">
                What roles are you targeting? We&apos;ll rank live job matches to the top of your
                feed. Pick up to {MAX_ROLES}. You can change these any time.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {roleChips.map((r) => {
                const selected = roles.includes(r.label);
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => toggleRole(r.label)}
                    aria-pressed={selected}
                    className={
                      selected
                        ? "rounded-full border border-accent bg-[var(--accent-bg)] px-3 py-1.5 text-[13px] font-medium text-accent transition-colors"
                        : "rounded-full border border-border bg-transparent px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-accent/60"
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={close}
                className="bg-transparent text-[13px] text-muted-foreground underline-offset-2 hover:underline"
              >
                Skip for now
              </button>
              <Button onClick={() => void saveRolesThenNext()} disabled={saving}>
                {saving ? "Saving…" : roles.length ? "Continue →" : "Skip role for now →"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 px-1">
            <div className="flex flex-col gap-1.5">
              <DialogTitle className="text-lg font-semibold">Let&apos;s get your first result</DialogTitle>
              <DialogDescription className="text-[14px] leading-relaxed">
                Scan your résumé to see your ATS score and fixes, or jump straight to live job
                matches{roles.length ? ` for ${roles[0]}` : ""}.
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2.5">
              <Button size="lg" className="w-full justify-center" onClick={() => go("analyze")}>
                Scan my résumé
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full justify-center"
                onClick={() => go("jobs")}
              >
                Browse job matches
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-transparent text-[13px] text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={close}
                className="bg-transparent text-[13px] text-muted-foreground underline-offset-2 hover:underline"
              >
                I&apos;ll explore on my own
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
