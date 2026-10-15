import { ImageResponse } from "next/og";
import { blogPostBySlug } from "@/lib/atsBlogPosts";
import { OG_CONTENT_TYPE, OG_SIZE, blogOgImage } from "@/lib/ogImage";

export const dynamic = "force-static";
export const alt = "What 13,128 live S&P 100 job postings reveal about tech hiring";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const POST = blogPostBySlug("sp100-tech-hiring-2026");

export default function Image() {
  return new ImageResponse(
    blogOgImage({ kicker: "Data", title: "What S&P 100 job postings reveal about tech hiring", stat: POST?.stat }),
    size,
  );
}
