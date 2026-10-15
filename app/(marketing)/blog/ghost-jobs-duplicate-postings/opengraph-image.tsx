import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, blogOgImage } from "@/lib/ogImage";
import { blogPostBySlug } from "@/lib/atsBlogPosts";

export const dynamic = "force-static";
export const alt = "We 7x'd our job-board coverage overnight. 13,000 of the new postings were duplicates.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Title is card-specific (shorter than the post's h1), but the stat is read
// from the post data so this card and the blog index can't drift apart.
const POST = blogPostBySlug("ghost-jobs-duplicate-postings");

export default function Image() {
  return new ImageResponse(
    blogOgImage({
      kicker: "Data",
      title: "13,000 of the new postings were duplicates",
      stat: POST?.stat,
    }),
    size,
  );
}
