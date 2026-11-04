/**
 * The tailoring-mode default, in one place and with no dependencies.
 *
 * Aggressive is the default (founder-directed 2026-10-26). Before that, "never
 * chosen" meant honest, and the literal `?? "honest"` was written out at about a
 * dozen call sites, so changing the default meant finding all of them and any
 * one missed would have sent a different mode than the screen showed. Every
 * call site now asks `resolveTailoringMode`, and a source pin fails the build
 * if a hand-written honest default comes back.
 *
 * Kept free of imports on purpose: the pure helpers in `lib/` (fixEverything,
 * experienceTitle) need the default without dragging the Supabase client in.
 * The API has the mirror of this in `normalize_tailoring_mode`, and its test
 * suite pins the same value.
 */

export type TailoringMode = "honest" | "aggressive";

export const DEFAULT_TAILORING_MODE: TailoringMode = "aggressive";

/** A chosen mode wins. Anything missing or unrecognised is the default. */
export function resolveTailoringMode(mode: unknown): TailoringMode {
  return mode === "honest" || mode === "aggressive" ? mode : DEFAULT_TAILORING_MODE;
}
