import { getSupabaseClient } from "@/lib/supabase";

export type BlogEngagement = {
  viewCount: number;
  likeCount: number;
  likedByMe: boolean;
};

/** Reads view/like counts (and whether the current session already liked the post) via the get_blog_engagement RPC. */
export async function fetchBlogEngagement(slug: string): Promise<BlogEngagement> {
  const db = getSupabaseClient();
  const { data, error } = await db.rpc("get_blog_engagement", { p_slug: slug });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    viewCount: Number(row?.view_count ?? 0),
    likeCount: Number(row?.like_count ?? 0),
    likedByMe: Boolean(row?.liked_by_me ?? false),
  };
}

/** Records one view via the record_blog_view RPC. Fire-and-forget from the caller's perspective; errors are swallowed since a failed view count is not user-facing. */
export async function recordBlogView(slug: string): Promise<void> {
  try {
    const db = getSupabaseClient();
    await db.rpc("record_blog_view", { p_slug: slug });
  } catch {
    /* view counting is best-effort */
  }
}

/** Toggles the signed-in user's like via the toggle_blog_like RPC. Throws if the caller isn't authenticated (server-enforced, not just a UI gate) — callers should check auth state before calling this. */
export async function toggleBlogLike(slug: string): Promise<{ liked: boolean; likeCount: number }> {
  const db = getSupabaseClient();
  const { data, error } = await db.rpc("toggle_blog_like", { p_slug: slug });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { liked: Boolean(row?.liked), likeCount: Number(row?.like_count ?? 0) };
}

const VIEW_DEDUPE_PREFIX = "rn_blog_viewed_";
const VIEW_DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

/** True once per browser per post per 24h — cheap, non-authoritative dedupe so refreshes/re-visits don't inflate the count. Not bot- or multi-device-proof; it's an approximate count, not an audited metric. */
export function shouldRecordView(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = VIEW_DEDUPE_PREFIX + slug;
    const last = Number(window.localStorage.getItem(key) ?? 0);
    if (Date.now() - last < VIEW_DEDUPE_TTL_MS) return false;
    window.localStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    return true; // localStorage unavailable (private mode, etc.) — record anyway
  }
}
