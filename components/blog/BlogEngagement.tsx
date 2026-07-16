"use client";

/**
 * Views + likes strip for a blog post. Views count for every visitor
 * (deduped per-browser per-post for 24h, see lib/blogEngagement.ts); liking
 * requires a signed-in session, enforced both here (no session -> sign-in
 * flow) and server-side (toggle_blog_like has no EXECUTE grant for anon).
 */

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/anonScan";
import {
  fetchBlogEngagement,
  recordBlogView,
  shouldRecordView,
  toggleBlogLike,
} from "@/lib/blogEngagement";

const EyeIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
);

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function BlogEngagement({ slug }: { slug: string }) {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [likedByMe, setLikedByMe] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (shouldRecordView(slug)) await recordBlogView(slug);

      try {
        const engagement = await fetchBlogEngagement(slug);
        if (cancelled) return;
        setViewCount(engagement.viewCount);
        setLikeCount(engagement.likeCount);
        setLikedByMe(engagement.likedByMe);
      } catch {
        if (!cancelled) {
          setViewCount(0);
          setLikeCount(0);
        }
      }

      try {
        const db = getSupabaseClient();
        const { data: { session } } = await db.auth.getSession();
        if (!cancelled) setSignedIn(!!session?.user);
      } catch {
        /* Supabase env not configured in this environment — treat as signed out */
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  async function handleLikeClick() {
    if (busy) return;
    if (!signedIn) {
      await signInWithGoogle();
      return;
    }
    setBusy(true);
    const prevLiked = likedByMe;
    const prevCount = likeCount ?? 0;
    // Optimistic update
    setLikedByMe(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));
    try {
      const result = await toggleBlogLike(slug);
      setLikedByMe(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      // Roll back on failure (e.g. session expired mid-click)
      setLikedByMe(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        margin: "8px 0 32px",
        paddingBottom: 24,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--dim)",
        }}
        title="Views"
      >
        {EyeIcon}
        {viewCount === null ? "—" : formatCount(viewCount)}
      </span>

      <button
        type="button"
        onClick={handleLikeClick}
        disabled={busy}
        aria-pressed={likedByMe}
        title={signedIn ? (likedByMe ? "Unlike" : "Like this post") : "Sign in to like this post"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: likedByMe ? "var(--red-ink, #d97757)" : "var(--dim)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: busy ? "default" : "pointer",
          fontFamily: "inherit",
        }}
      >
        <HeartIcon filled={likedByMe} />
        {likeCount === null ? "—" : formatCount(likeCount)}
      </button>
    </div>
  );
}
